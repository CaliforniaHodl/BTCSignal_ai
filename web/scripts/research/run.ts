/**
 * Strategy research harness.  npm run research -- --days 1095
 *
 *  A. Baseline: current ENGINE_CONFIG, all 6 factors, reported Coinbase fees
 *  B. Fee sensitivity
 *  C. Factor ablation (drop each / each alone)
 *  D. Walk-forward: tune on a train window, trade the next unseen window, roll.
 *     The live gate is judged ONLY on stitched out-of-sample results.
 *
 * Writes research/latest.json for the /agent page.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { aggregate } from "@/lib/market/sources";
import { computeFactors, ENGINE_CONFIG, ENGINE_VERSION, FACTOR_NAMES, INTRADAY_V2_CONFIG, type EngineConfig, type FactorName } from "@/lib/engine/signal";
import { RISK, type RiskConfig } from "@/lib/agent/risk";
import { gate, metrics, simulate, type Metrics, type SimTrade, type Step } from "@/lib/backtest/sim";
import * as H from "./history";

const argv = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => s.trim().split(/\s+/)));
const DAYS = Number(argv.days ?? 1095);
const TRAIN_D = Number(argv.train ?? 270);
const TEST_D = Number(argv.test ?? 90);

const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "∞");
const row = (label: string, m: Metrics) =>
  `${label.padEnd(34)} ${f(m.returnPct, 1).padStart(7)}%  hold ${f(m.holdPct, 1).padStart(6)}%  n=${String(m.trades).padStart(3)}  win ${f(m.winRatePct, 0).padStart(3)}%  PF ${f(m.profitFactor).padStart(5)}  DD ${f(m.maxDrawdownPct, 1).padStart(5)}%  Sh ${f(m.sharpe).padStart(5)}  fees $${f(m.feesUsd, 0)}`;

async function buildSteps(): Promise<Step[]> {
  const now = Math.floor(Date.now() / 1000 / 3600) * 3600;
  const start = now - DAYS * 86400;
  process.stdout.write(`Loading ${DAYS}d history (cached after first run)… `);
  const [h1All, d1All, fng, fund] = await Promise.all([
    H.candles(3600, start - 400 * 3600, now),
    H.candles(86400, start - 320 * 86400, now),
    H.fearGreed(),
    H.funding(start - 86400, now),
  ]);
  console.log(`${h1All.length} hourly, ${d1All.length} daily, ${Object.keys(fng).length} F&G days, ${Object.keys(fund).length} funding hours.`);
  const h4All = aggregate(h1All, 14400);

  const steps: Step[] = [];
  let j4 = 0, jd = 0;
  for (let i = 0; i < h1All.length; i++) {
    const bar = h1All[i];
    const t = bar.time + 3600;
    if (t <= start) continue;
    while (j4 < h4All.length && h4All[j4].time + 14400 <= t) j4++;
    while (jd < d1All.length && d1All[jd].time + 86400 <= t) jd++;
    const h1 = h1All.slice(Math.max(0, i - 299), i + 1);
    const h4 = h4All.slice(Math.max(0, j4 - 120), j4);
    const d1 = d1All.slice(Math.max(0, jd - 300), jd);
    let computed = null;
    if (h4.length >= 60 && d1.length >= 200) {
      const fundHour = Math.floor((t - 1) / 3600) * 3600 - 3600; // last fully completed hour
      const fgDay = Math.floor(t / 86400) * 86400 - 86400; // yesterday's published value
      computed = computeFactors({ h1, h4, d1, funding8h: fund[fundHour] ?? null, fearGreed: fng[fgDay] ?? null });
    }
    steps.push({ t, bar, computed });
  }
  return steps;
}

/** Edge measurement runs without the drawdown halt — the halt is a live safety device, not part of the edge. */
const EDGE: RiskConfig = { ...RISK, maxDrawdownHaltPct: 100 };

const W0 = Object.fromEntries(FACTOR_NAMES.map((n) => [n, 0])) as Record<FactorName, number>;
export const PRESETS: Record<string, Pick<EngineConfig, "weights" | "stopBasis">> = {
  intraday: { weights: INTRADAY_V2_CONFIG.weights, stopBasis: "4h" },
  swing_trend: { weights: { ...W0, trend_1d: 0.4, momentum_1d: 0.4, fear_greed: 0.2 }, stopBasis: "1d" },
  swing_trend_funding: { weights: { ...W0, trend_1d: 0.35, momentum_1d: 0.35, fear_greed: 0.15, funding: 0.15 }, stopBasis: "1d" },
  swing_all: { weights: { ...INTRADAY_V2_CONFIG.weights, momentum_1d: 0.3 }, stopBasis: "1d" },
};

const withWeights = (w: Partial<Record<FactorName, number>>): EngineConfig => ({ ...ENGINE_CONFIG, weights: { ...ENGINE_CONFIG.weights, ...w } });
// Factor ablation drops each factor from the LIVE config.
const only = (name: FactorName): EngineConfig =>
  ({ ...ENGINE_CONFIG, weights: Object.fromEntries(FACTOR_NAMES.map((n) => [n, n === name ? 1 : 0])) as Record<FactorName, number> });

function grid(): (EngineConfig & { preset: string })[] {
  const out: (EngineConfig & { preset: string })[] = [];
  for (const [preset, p] of Object.entries(PRESETS))
    for (const enterScore of [0.15, 0.25, 0.35])
      for (const minConfidence of [0.25, 0.4]) {
        for (const stopAtr of [1.5, 2, 3])
          for (const targetAtr of [3, 4.5, 6])
            if (targetAtr / stopAtr >= 1.5) out.push({ ...ENGINE_CONFIG, ...p, exit: "target", enterScore, minConfidence, stopAtr, targetAtr, preset });
        for (const stopAtr of [2, 3, 4])
          out.push({ ...ENGINE_CONFIG, ...p, exit: "trail", enterScore, minConfidence, stopAtr, targetAtr: 0, preset: `${preset}+trail` });
      }
  return out;
}

function walkForward(steps: Step[], rCfg: RiskConfig) {
  const t0 = steps[0].t, tEnd = steps[steps.length - 1].t;
  const candidates = grid();
  const folds: { trainFrom: string; testFrom: string; chosen: { preset: string; enterScore: number; minConfidence: number; stopAtr: number; targetAtr: number } | null; train: Metrics; test: Metrics }[] = [];
  const oosTrades: SimTrade[] = [];
  const stitched: { day: number; equity: number; price: number }[] = [];
  let scale = 1;
  for (let s = t0; s + (TRAIN_D + TEST_D) * 86400 <= tEnd + 86400; s += TEST_D * 86400) {
    const trainSteps = steps.filter((x) => x.t >= s && x.t < s + TRAIN_D * 86400);
    const testSteps = steps.filter((x) => x.t >= s + TRAIN_D * 86400 && x.t < s + (TRAIN_D + TEST_D) * 86400);
    let best: { cfg: EngineConfig & { preset: string }; m: Metrics; obj: number } | null = null;
    for (const cfg of candidates) {
      const m = metrics(simulate(trainSteps, cfg, rCfg));
      // objective: Sharpe, but require a minimum sample and a positive PF
      const obj = m.trades >= 8 && m.profitFactor > 1 ? m.sharpe : -Infinity;
      if (!best || obj > best.obj) best = { cfg, m, obj };
    }
    const chosen = best!.obj === -Infinity ? null : best!.cfg;
    // If nothing qualifies on train, the honest move is to stand aside for the test window.
    const testRes = chosen ? simulate(testSteps, chosen, rCfg) : simulate(testSteps, { ...ENGINE_CONFIG, enterScore: 99 }, rCfg);
    const tm = metrics(testRes);
    oosTrades.push(...testRes.trades);
    for (const d of testRes.daily) stitched.push({ day: d.day, equity: d.equity * scale, price: d.price });
    scale *= testRes.finalEquity / 10_000;
    folds.push({
      trainFrom: new Date(s * 1000).toISOString().slice(0, 10),
      testFrom: new Date((s + TRAIN_D * 86400) * 1000).toISOString().slice(0, 10),
      chosen: chosen ? { preset: chosen.preset, enterScore: chosen.enterScore, minConfidence: chosen.minConfidence, stopAtr: chosen.stopAtr, targetAtr: chosen.targetAtr } : null,
      train: best!.m,
      test: tm,
    });
  }
  // stitched OOS metrics
  let peak = 10_000, dd = 0;
  for (const d of stitched) { peak = Math.max(peak, d.equity); dd = Math.max(dd, (peak - d.equity) / peak); }
  const oos = metrics({ trades: oosTrades, daily: stitched, finalEquity: 10_000 * scale, maxDrawdownPct: dd * 100, exposurePct: NaN, haltedAt: null });
  return { folds, oos };
}

async function main() {
  const steps = await buildSteps();
  const from = new Date(steps[0].t * 1000).toISOString().slice(0, 10);
  const to = new Date(steps[steps.length - 1].t * 1000).toISOString().slice(0, 10);
  console.log(`\nEngine v${ENGINE_VERSION} · ${from} → ${to} · long-only · fees ${f(RISK.makerFee * 100)}% maker / ${f(RISK.takerFee * 100)}% taker + ${f(RISK.slippage * 100)}% slip\n`);

  console.log("A. Baseline (edge = drawdown halt off)");
  const baseHalt = metrics(simulate(steps, ENGINE_CONFIG, RISK));
  console.log(row("live config, halt ON", baseHalt));
  const base = metrics(simulate(steps, ENGINE_CONFIG, EDGE));
  console.log(row("live config", base));
  const v2 = metrics(simulate(steps, INTRADAY_V2_CONFIG, EDGE));
  console.log(row("old v2.0 intraday config", v2));
  const baseTech = metrics(simulate(steps, withWeights({ funding: 0, fear_greed: 0 }), EDGE));
  console.log(row("technical factors only", baseTech));
  const presetRows: { label: string; m: Metrics }[] = [];
  for (const [name, p] of Object.entries(PRESETS)) {
    for (const [stopAtr, targetAtr] of [[2, 4], [3, 6]] as const) {
      const m = metrics(simulate(steps, { ...ENGINE_CONFIG, ...p, exit: "target", stopAtr, targetAtr, minConfidence: 0.25 }, EDGE));
      presetRows.push({ label: `${name} s${stopAtr}/t${targetAtr}`, m });
      console.log(row(`${name} s${stopAtr}/t${targetAtr}`, m));
    }
    for (const stopAtr of [3, 4]) {
      const m = metrics(simulate(steps, { ...ENGINE_CONFIG, ...p, exit: "trail", stopAtr, minConfidence: 0.25 }, EDGE));
      presetRows.push({ label: `${name} trail ${stopAtr}`, m });
      console.log(row(`${name} trail ${stopAtr}×ATR`, m));
    }
  }

  console.log("\nB. Fee sensitivity (live config)");
  const feeRows: { label: string; m: Metrics }[] = [];
  for (const [label, mk, tk] of [["no fees", 0, 0], ["0.10/0.15 ($250k+ tier)", 0.001, 0.0015], ["0.25/0.40 (Kraken entry)", 0.0025, 0.004], ["0.40/0.60 (old CB entry)", 0.004, 0.006], ["0.50/0.90 (CB entry, Sep-26)", 0.005, 0.009]] as const) {
    const m = metrics(simulate(steps, ENGINE_CONFIG, { ...EDGE, makerFee: mk, takerFee: tk }));
    feeRows.push({ label, m });
    console.log(row(label, m));
  }

  console.log("\nC. Factor ablation (live config)");
  const ablation: { label: string; m: Metrics }[] = [];
  for (const n of FACTOR_NAMES) {
    const m = metrics(simulate(steps, withWeights({ [n]: 0 }), EDGE));
    ablation.push({ label: `without ${n}`, m });
    console.log(row(`without ${n}`, m));
  }
  for (const n of FACTOR_NAMES) {
    const m = metrics(simulate(steps, only(n), EDGE));
    ablation.push({ label: `only ${n}`, m });
    console.log(row(`only ${n}`, m));
  }

  console.log(`\nD. Walk-forward (train ${TRAIN_D}d → test ${TEST_D}d, ${grid().length} configs per fold)`);
  const wf = walkForward(steps, EDGE);
  for (const fo of wf.folds) {
    const c = fo.chosen;
    const cs = !c ? "stand aside (nothing qualified)" : `${c.preset} e${c.enterScore} c${c.minConfidence} s${c.stopAtr}${c.targetAtr ? ` t${c.targetAtr}` : ""}`;
    console.log(`  test ${fo.testFrom}  ${cs.padEnd(40)} train PF ${f(fo.train.profitFactor)} → test ${f(fo.test.returnPct, 1)}% (n=${fo.test.trades}, PF ${f(fo.test.profitFactor)})`);
  }
  console.log(row("STITCHED OUT-OF-SAMPLE", wf.oos));

  const fails = gate(wf.oos);
  console.log(`\nLive-trading gate (out-of-sample): ${fails.length ? "FAIL" : "PASS"}`);
  for (const x of fails) console.log(`  ✗ ${x}`);

  const out = {
    generatedAt: new Date().toISOString(), engineVersion: ENGINE_VERSION, period: { from, to, days: DAYS },
    fees: { maker: RISK.makerFee, taker: RISK.takerFee, slippage: RISK.slippage },
    liveConfig: { ...ENGINE_CONFIG }, baseline: base, baselineWithHalt: baseHalt, intradayV2: v2, technicalOnly: baseTech, presets: presetRows, feeSensitivity: feeRows, ablation,
    walkForward: { trainDays: TRAIN_D, testDays: TEST_D, folds: wf.folds, oos: wf.oos },
    gate: { pass: fails.length === 0, failures: fails },
  };
  const dir = path.join(process.cwd(), "research");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "latest.json"), JSON.stringify(out, (_, v) => (typeof v === "number" && !Number.isFinite(v) ? null : v), 2));
  console.log("\nWrote research/latest.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
