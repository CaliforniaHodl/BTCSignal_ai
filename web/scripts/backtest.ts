/**
 * Replays history through the SAME engine, risk limits and paper broker the live
 * agent uses. Claude review is stubbed to "approve" (rules-only), and funding /
 * Fear & Greed are unavailable historically, so the engine runs at 75% coverage.
 *
 *   npm run backtest -- --days 365
 */
import { aggregate } from "@/lib/market/sources";
import type { Candle } from "@/lib/market/types";
import { closedOnly, evaluate } from "@/lib/engine/signal";
import { checkEntry, RISK, shouldHalt } from "@/lib/agent/risk";
import * as broker from "@/lib/agent/broker";

const args = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => s.trim().split(/\s+/)));
const DAYS = Number(args.days ?? 365);
const START_CASH = 10_000;

// Gate inherited from the legacy strategy-validator, required before any live trading.
const GATE = { minProfitFactor: 1.2, maxDrawdownPct: 35, minWinRatePct: 35, minSharpe: 0.5, minOosTrades: 20 };

async function fetchCandles(granularity: number, from: number, to: number): Promise<Candle[]> {
  const out: Candle[] = [];
  const span = granularity * 300;
  for (let s = from; s < to; s += span) {
    const e = Math.min(to, s + span);
    const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${granularity}&start=${new Date(s * 1000).toISOString()}&end=${new Date(e * 1000).toISOString()}`;
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(url, { headers: { "user-agent": "btcsignal-backtest" } });
      if (r.ok) {
        const rows = (await r.json()) as number[][];
        for (const [time, low, high, open, close, volume] of rows) out.push({ time, open, high, low, close, volume });
        break;
      }
      if (attempt > 4) throw new Error(`coinbase ${r.status} for ${url}`);
      await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    }
    await new Promise((res) => setTimeout(res, 120)); // stay well under public rate limits
  }
  const uniq = new Map(out.map((c) => [c.time, c]));
  return [...uniq.values()].sort((a, b) => a.time - b.time);
}

type Trade = { side: string; openT: number; closeT: number; entry: number; exit: number; pnl: number; reason: string };

async function main() {
  const now = Math.floor(Date.now() / 1000 / 3600) * 3600; // seconds, aligned to the hour
  const testStart = now - DAYS * 86400;
  process.stdout.write(`Fetching ${DAYS}d of 1h + daily candles from Coinbase… `);
  const h1All = await fetchCandles(3600, testStart - 400 * 3600, now);
  const d1All = await fetchCandles(86400, testStart - 320 * 86400, now);
  console.log(`${h1All.length} hourly, ${d1All.length} daily.`);

  let cash = START_CASH;
  let pos: (broker.Position & { openT: number }) | null = null;
  let peak = START_CASH, maxDd = 0, halted: number | null = null, lastClose: number | null = null;
  const trades: Trade[] = [];
  const daily: { day: number; equity: number }[] = [];
  const entriesByDay = new Map<number, number>();
  const dayStartEq = new Map<number, number>();
  let exposureHours = 0, hours = 0;

  const startIdx = h1All.findIndex((c) => c.time >= testStart);
  for (let i = startIdx; i < h1All.length; i++) {
    const bar = h1All[i];
    const t = bar.time + 3600; // decision time = this bar's close
    const day = Math.floor(t / 86400);
    hours++;

    // exits on this bar
    if (pos) {
      exposureHours++;
      const hit = broker.findExit(pos, [bar]);
      if (hit) {
        const c = broker.close(cash, pos, hit.price);
        cash = c.cashUsd;
        trades.push({ side: pos.side, openT: pos.openT, closeT: t, entry: pos.entryPrice, exit: c.fill, pnl: c.pnlUsd, reason: hit.reason });
        pos = null;
        lastClose = t * 1000;
      }
    }

    const eqNow = broker.equity(cash, pos, bar.close);
    if (!dayStartEq.has(day)) dayStartEq.set(day, eqNow);
    peak = Math.max(peak, eqNow);
    maxDd = Math.max(maxDd, (peak - eqNow) / peak);
    if (halted == null && shouldHalt(eqNow, peak)) halted = t;
    const lastDaily = daily[daily.length - 1];
    if (!lastDaily || lastDaily.day !== day) daily.push({ day, equity: eqNow });
    else lastDaily.equity = eqNow;

    const h1 = closedOnly(h1All.slice(Math.max(0, i - 299), i + 1), 3600, t);
    const h4 = closedOnly(aggregate(h1All.slice(Math.max(0, i - 1199), i + 1), 14400), 14400, t);
    const d1 = closedOnly(d1All.filter((c) => c.time < t).slice(-300), 86400, t);
    if (h4.length < 60 || d1.length < 200) continue;
    const s = evaluate({ h1, h4, d1 });

    if (pos) {
      if (s.direction !== "flat" && s.direction !== pos.side) {
        const c = broker.close(cash, pos, bar.close);
        cash = c.cashUsd;
        trades.push({ side: pos.side, openT: pos.openT, closeT: t, entry: pos.entryPrice, exit: c.fill, pnl: c.pnlUsd, reason: "signal" });
        pos = null;
        lastClose = t * 1000;
      }
      continue;
    }
    if (s.direction === "flat" || s.stop == null || s.target == null) continue;

    const eqFlat = cash;
    const startEq = dayStartEq.get(day) ?? eqFlat;
    const r = checkEntry({
      enabled: halted == null, equityUsd: eqFlat, cashUsd: cash, peakEquityUsd: peak, hasOpenPosition: false,
      entriesToday: entriesByDay.get(day) ?? 0, pnlTodayPct: ((eqFlat - startEq) / startEq) * 100, lastCloseAt: lastClose, now: t * 1000,
    }, { side: s.direction, price: bar.close, stop: s.stop, target: s.target });
    if (!r.allowed) continue;
    const o = broker.open(cash, s.direction, r.qtyBtc, bar.close);
    cash = o.cashUsd;
    pos = { side: s.direction, qtyBtc: r.qtyBtc, entryPrice: o.fill, stop: s.stop, target: s.target, openFeeUsd: o.feeUsd, openT: t };
    entriesByDay.set(day, (entriesByDay.get(day) ?? 0) + 1);
  }

  const lastPrice = h1All[h1All.length - 1].close;
  const finalEq = broker.equity(cash, pos, lastPrice);
  const firstPrice = h1All[startIdx].close;
  const rets = daily.slice(1).map((d, i) => d.equity / daily[i].equity - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const sharpe = sd > 0 ? (mean / sd) * Math.sqrt(365) : 0;

  const summarize = (ts: Trade[]) => {
    const wins = ts.filter((x) => x.pnl > 0);
    const gw = wins.reduce((a, x) => a + x.pnl, 0);
    const gl = -ts.filter((x) => x.pnl <= 0).reduce((a, x) => a + x.pnl, 0);
    return { n: ts.length, winRate: ts.length ? (wins.length / ts.length) * 100 : 0, pf: gl > 0 ? gw / gl : gw > 0 ? Infinity : 0, pnl: ts.reduce((a, x) => a + x.pnl, 0) };
  };
  const split = testStart + Math.floor((now - testStart) * 0.7);
  const all = summarize(trades), is = summarize(trades.filter((x) => x.openT < split)), oos = summarize(trades.filter((x) => x.openT >= split));
  const byReason = trades.reduce<Record<string, number>>((m, x) => ((m[x.reason] = (m[x.reason] ?? 0) + 1), m), {});

  const f = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "∞");
  console.log(`\n=== Backtest: ${DAYS} days, rules-only, engine at 75% coverage ===`);
  console.log(`Period          ${new Date(testStart * 1000).toISOString().slice(0, 10)} → ${new Date(now * 1000).toISOString().slice(0, 10)}`);
  console.log(`Agent return    ${f(((finalEq - START_CASH) / START_CASH) * 100)}%   ($${f(finalEq)})`);
  console.log(`Buy & hold BTC  ${f(((lastPrice - firstPrice) / firstPrice) * 100)}%`);
  console.log(`Trades          ${all.n}  (${Object.entries(byReason).map(([k, v]) => `${k} ${v}`).join(", ")})`);
  console.log(`Win rate        ${f(all.winRate, 1)}%`);
  console.log(`Profit factor   ${f(all.pf)}`);
  console.log(`Max drawdown    ${f(maxDd * 100)}%`);
  console.log(`Sharpe (daily)  ${f(sharpe)}`);
  console.log(`Exposure        ${f((exposureHours / hours) * 100, 1)}% of hours in a position`);
  console.log(`In-sample       ${is.n} trades, PF ${f(is.pf)}, win ${f(is.winRate, 1)}%`);
  console.log(`Out-of-sample   ${oos.n} trades, PF ${f(oos.pf)}, win ${f(oos.winRate, 1)}%`);
  if (halted) console.log(`HALTED          drawdown limit hit ${new Date(halted * 1000).toISOString().slice(0, 10)}`);

  const failures = [
    all.pf < GATE.minProfitFactor && `profit factor ${f(all.pf)} < ${GATE.minProfitFactor}`,
    maxDd * 100 > GATE.maxDrawdownPct && `drawdown ${f(maxDd * 100)}% > ${GATE.maxDrawdownPct}%`,
    all.winRate < GATE.minWinRatePct && `win rate ${f(all.winRate, 1)}% < ${GATE.minWinRatePct}%`,
    sharpe < GATE.minSharpe && `Sharpe ${f(sharpe)} < ${GATE.minSharpe}`,
    oos.n < GATE.minOosTrades && `only ${oos.n} out-of-sample trades (need ${GATE.minOosTrades})`,
    oos.pf < 1 && `out-of-sample PF ${f(oos.pf)} < 1`,
  ].filter(Boolean);
  console.log(`\nLive-trading gate: ${failures.length ? "FAIL" : "PASS"}`);
  for (const x of failures) console.log(`  ✗ ${x}`);
  console.log(`\nCosts modeled: ${(RISK.feeRate * 100).toFixed(2)}% fee + ${(RISK.slippage * 100).toFixed(2)}% slippage per fill; stops assumed before targets within a bar.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
