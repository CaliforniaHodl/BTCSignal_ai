/**
 * Event-driven backtest over precomputed engine factors. Uses the SAME combine(),
 * checkEntry() and broker functions as the live agent.
 *
 * Timeline per hourly bar i (decision time t = bar close):
 *   1. an open position is checked against bar i (stop first if both touched)
 *   2. the engine decides at t using only data closed by t
 *   3. entries fill at bar i close as taker orders
 */
import { combine, type Computed, type EngineConfig } from "@/lib/engine/signal";
import { checkEntry, RISK, shouldHalt, type RiskConfig } from "@/lib/agent/risk";
import * as broker from "@/lib/agent/broker";
import type { Candle } from "@/lib/market/types";

export type Step = { t: number; bar: Candle; computed: Computed | null };

export type SimTrade = { side: "long" | "short"; openT: number; closeT: number; entry: number; exit: number; pnlUsd: number; reason: string; feesUsd: number };

export type SimResult = {
  trades: SimTrade[];
  daily: { day: number; equity: number; price: number }[];
  finalEquity: number;
  maxDrawdownPct: number;
  exposurePct: number;
  haltedAt: number | null;
};

export function simulate(steps: Step[], eCfg: EngineConfig, rCfg: RiskConfig = RISK, startCash = 10_000): SimResult {
  let cash = startCash;
  let pos: (broker.Position & { openT: number }) | null = null;
  let peak = startCash, maxDd = 0, haltedAt: number | null = null, lastClose: number | null = null;
  const trades: SimTrade[] = [];
  const daily: SimResult["daily"] = [];
  const entries = new Map<number, number>();
  const dayStart = new Map<number, number>();
  let inPos = 0;
  let atr1d: number | null = null, atr4h: number | null = null;

  const exit = (price: number, reason: string, t: number) => {
    const c = broker.close(cash, pos!, price, rCfg, broker.exitLiquidity(reason));
    cash = c.cashUsd;
    trades.push({ side: pos!.side, openT: pos!.openT, closeT: t, entry: pos!.entryPrice, exit: c.fill, pnlUsd: c.pnlUsd, reason, feesUsd: pos!.openFeeUsd + c.feeUsd });
    pos = null;
    lastClose = t * 1000;
  };

  for (const { t, bar, computed } of steps) {
    const day = Math.floor(t / 86400);
    if (pos) {
      inPos++;
      const hit = broker.findExit(pos, [bar]);
      if (hit) exit(hit.price, hit.reason, t);
    }
    const eq = broker.equity(cash, pos, bar.close);
    if (!dayStart.has(day)) dayStart.set(day, eq);
    peak = Math.max(peak, eq);
    maxDd = Math.max(maxDd, (peak - eq) / peak);
    if (haltedAt == null && shouldHalt(eq, peak, rCfg)) haltedAt = t;
    const lastD = daily[daily.length - 1];
    if (!lastD || lastD.day !== day) daily.push({ day, equity: eq, price: bar.close });
    else { lastD.equity = eq; lastD.price = bar.close; }

    if (computed) { atr1d = computed.atr1d; atr4h = computed.atr4h; }
    if (pos && pos.target == null) {
      const openT: number = pos.openT;
      pos = { ...broker.trail(pos, bar.close, eCfg.stopBasis === "1d" ? atr1d : atr4h, eCfg.stopAtr), openT };
    }

    if (!computed) continue;
    const s = combine({ ...computed, price: bar.close }, eCfg);

    if (pos) {
      if (s.direction !== "flat" && s.direction !== pos.side) exit(bar.close, "signal", t);
      continue;
    }
    if (s.direction === "flat" || s.stop == null || (eCfg.exit === "target" && s.target == null)) continue;
    const startEq = dayStart.get(day) ?? cash;
    const r = checkEntry({
      enabled: haltedAt == null, equityUsd: cash, cashUsd: cash, peakEquityUsd: peak, hasOpenPosition: false,
      entriesToday: entries.get(day) ?? 0, pnlTodayPct: ((cash - startEq) / startEq) * 100, lastCloseAt: lastClose, now: t * 1000,
    }, { side: s.direction, price: bar.close, stop: s.stop, target: s.target }, 1, rCfg);
    if (!r.allowed) continue;
    const o = broker.open(cash, s.direction, r.qtyBtc, bar.close, rCfg, "taker");
    cash = o.cashUsd;
    pos = { side: s.direction, qtyBtc: r.qtyBtc, entryPrice: o.fill, stop: s.stop, target: s.target, openFeeUsd: o.feeUsd, openT: t };
    entries.set(day, (entries.get(day) ?? 0) + 1);
  }

  const lastBar = steps[steps.length - 1]?.bar;
  return {
    trades,
    daily,
    finalEquity: lastBar ? broker.equity(cash, pos, lastBar.close) : cash,
    maxDrawdownPct: maxDd * 100,
    exposurePct: steps.length ? (inPos / steps.length) * 100 : 0,
    haltedAt,
  };
}

export type Metrics = {
  returnPct: number; holdPct: number; trades: number; winRatePct: number; profitFactor: number;
  maxDrawdownPct: number; sharpe: number; exposurePct: number; feesUsd: number; avgTradePct: number;
};

export function metrics(r: SimResult, startCash = 10_000): Metrics {
  const wins = r.trades.filter((x) => x.pnlUsd > 0);
  const gw = wins.reduce((a, x) => a + x.pnlUsd, 0);
  const gl = -r.trades.filter((x) => x.pnlUsd <= 0).reduce((a, x) => a + x.pnlUsd, 0);
  const rets = r.daily.slice(1).map((d, i) => d.equity / r.daily[i].equity - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const p0 = r.daily[0]?.price, p1 = r.daily[r.daily.length - 1]?.price;
  return {
    returnPct: ((r.finalEquity - startCash) / startCash) * 100,
    holdPct: p0 && p1 ? ((p1 - p0) / p0) * 100 : 0,
    trades: r.trades.length,
    winRatePct: r.trades.length ? (wins.length / r.trades.length) * 100 : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? Infinity : 0,
    maxDrawdownPct: r.maxDrawdownPct,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(365) : 0,
    exposurePct: r.exposurePct,
    feesUsd: r.trades.reduce((a, x) => a + x.feesUsd, 0),
    avgTradePct: r.trades.length ? (r.trades.reduce((a, x) => a + x.pnlUsd, 0) / r.trades.length / startCash) * 100 : 0,
  };
}

/** The live-trading gate (thresholds inherited from the legacy strategy-validator). */
export const GATE = { minProfitFactor: 1.2, maxDrawdownPct: 35, minWinRatePct: 35, minSharpe: 0.5, minTrades: 20 };
export function gate(m: Metrics): string[] {
  const f = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "∞");
  return [
    m.trades < GATE.minTrades && `only ${m.trades} trades (need ${GATE.minTrades})`,
    m.profitFactor < GATE.minProfitFactor && `profit factor ${f(m.profitFactor)} < ${GATE.minProfitFactor}`,
    m.maxDrawdownPct > GATE.maxDrawdownPct && `drawdown ${f(m.maxDrawdownPct)}% > ${GATE.maxDrawdownPct}%`,
    m.winRatePct < GATE.minWinRatePct && `win rate ${f(m.winRatePct)}% < ${GATE.minWinRatePct}%`,
    m.sharpe < GATE.minSharpe && `Sharpe ${f(m.sharpe)} < ${GATE.minSharpe}`,
  ].filter((x): x is string => Boolean(x));
}
