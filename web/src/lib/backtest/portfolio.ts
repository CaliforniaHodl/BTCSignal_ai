/**
 * Preset portfolio strategies over real daily candles. Pure, no I/O.
 * Every preset starts with the same fixed capital at bar `startIndex` (earlier
 * bars are indicator warm-up) so curves are directly comparable. Uninvested
 * cash earns 0%. All buys/sells are taker orders with slippage.
 */
import type { Candle } from "@/lib/market/types";
import { blockBootstrap, type McSummary } from "./montecarlo";
import { DEFAULT_FEES, maxDrawdown, runRules, type Fees, type RuleSpec } from "./rules";

export type PresetId = "buy_hold" | "dca" | "trend" | "rebalance";

export type PortfolioParams =
  | { preset: "buy_hold" }
  | { preset: "dca"; every: "week" | "month" }
  | { preset: "trend"; smaPeriod: number }
  | { preset: "rebalance"; btcWeightPct: number; rule: "month" | "quarter" | "band"; bandPct: number };

export type Curve = { time: number; value: number; price: number }[];
export type PortfolioRun = { curve: Curve; feesUsd: number; trades: number };

export type PortfolioMetrics = {
  finalUsd: number; returnPct: number; cagrPct: number | null; maxDrawdownPct: number;
  volatilityPct: number; sharpe: number; feesUsd: number; trades: number;
};

const buyPx = (p: number, f: Fees) => p * (1 + f.slippage);
const sellPx = (p: number, f: Fees) => p * (1 - f.slippage);

export function buyHold(c: Candle[], start: number, cash: number, f: Fees = DEFAULT_FEES): PortfolioRun {
  const px = buyPx(c[start].close, f);
  const qty = cash / (px * (1 + f.taker));
  const fee = qty * px * f.taker;
  return { curve: c.slice(start).map((b) => ({ time: b.time, value: qty * b.close, price: b.close })), feesUsd: fee, trades: 1 };
}

const periodKey = (t: number, every: "week" | "month" | "quarter") => {
  const d = new Date(t * 1000);
  if (every === "week") return Math.floor((t / 86400 + 3) / 7); // ISO weeks start Monday (epoch day 0 = Thursday)
  const m = d.getUTCFullYear() * 12 + d.getUTCMonth();
  return every === "month" ? m : Math.floor(m / 3);
};

/** Equal buys on the first bar of each week/month, spread over the whole window. */
export function dca(c: Candle[], start: number, capital: number, every: "week" | "month", f: Fees = DEFAULT_FEES): PortfolioRun {
  const bars = c.slice(start);
  const buyIdx: number[] = [];
  bars.forEach((b, i) => { if (i === 0 || periodKey(b.time, every) !== periodKey(bars[i - 1].time, every)) buyIdx.push(i); });
  const per = capital / buyIdx.length;
  const buys = new Set(buyIdx);
  let cash = capital, qty = 0, fees = 0;
  const curve: Curve = bars.map((b, i) => {
    if (buys.has(i)) {
      const amt = Math.min(per, cash);
      const px = buyPx(b.close, f);
      const q = amt / (px * (1 + f.taker));
      qty += q; fees += q * px * f.taker; cash -= amt;
    }
    return { time: b.time, value: cash + qty * b.close, price: b.close };
  });
  return { curve, feesUsd: fees, trades: buyIdx.length };
}

/** Hold BTC while the daily close is above its SMA, else cash. Runs on the rules engine. */
export function trend(c: Candle[], start: number, capital: number, smaPeriod: number, f: Fees = DEFAULT_FEES): PortfolioRun {
  const sma = { kind: "sma" as const, period: smaPeriod, value: null };
  const close = { kind: "close" as const, period: null, value: null };
  const spec: RuleSpec = {
    side: "long", timeframe: "1d",
    entry: [{ left: close, op: "above", right: sma }],
    exit: [{ left: close, op: "below", right: sma }],
    stop: { type: "none", value: null }, target: { type: "none", value: null }, trailing: { type: "none", value: null }, max_bars: null,
  };
  const r = runRules(c, spec, { startIndex: start, startCash: capital, fees: f });
  return {
    curve: r.equity.slice(start).map((e) => ({ time: e.time, value: e.equity, price: e.price })),
    feesUsd: r.trades.reduce((a, t) => a + t.feesUsd, 0),
    trades: r.trades.length,
  };
}

/** Target BTC weight, rebalanced on the calendar or when drift exceeds a band. */
export function rebalance(c: Candle[], start: number, capital: number, weightPct: number, rule: "month" | "quarter" | "band", bandPct: number, f: Fees = DEFAULT_FEES): PortfolioRun {
  const w = Math.min(100, Math.max(0, weightPct)) / 100;
  let cash = capital, qty = 0, fees = 0, trades = 0;
  const bars = c.slice(start);
  const trade = (price: number) => {
    const value = cash + qty * price;
    const want = value * w;
    const have = qty * price;
    const delta = want - have;
    if (Math.abs(delta) < 1e-9 * value || Math.abs(delta) < 1) return;
    if (delta > 0) {
      const px = buyPx(price, f);
      const q = Math.min(delta, cash) / (px * (1 + f.taker));
      qty += q; cash -= q * px * (1 + f.taker); fees += q * px * f.taker;
    } else {
      const px = sellPx(price, f);
      const q = Math.min(qty, -delta / price);
      qty -= q; cash += q * px * (1 - f.taker); fees += q * px * f.taker;
    }
    trades++;
  };
  const curve: Curve = bars.map((b, i) => {
    if (i === 0) trade(b.close);
    else if (rule === "band") {
      const v = cash + qty * b.close;
      if (v > 0 && Math.abs((qty * b.close) / v - w) * 100 > bandPct) trade(b.close);
    } else if (periodKey(b.time, rule) !== periodKey(bars[i - 1].time, rule)) trade(b.close);
    return { time: b.time, value: cash + qty * b.close, price: b.close };
  });
  return { curve, feesUsd: fees, trades };
}

export function runPreset(c: Candle[], start: number, capital: number, p: PortfolioParams, f: Fees = DEFAULT_FEES): PortfolioRun {
  switch (p.preset) {
    case "buy_hold": return buyHold(c, start, capital, f);
    case "dca": return dca(c, start, capital, p.every, f);
    case "trend": return trend(c, start, capital, p.smaPeriod, f);
    case "rebalance": return rebalance(c, start, capital, p.btcWeightPct, p.rule, p.bandPct, f);
  }
}

export function portfolioMetrics(run: PortfolioRun, capital: number): PortfolioMetrics {
  const v = run.curve.map((x) => x.value);
  const rets = dailyReturns(run.curve);
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const final = v[v.length - 1] ?? capital;
  const years = (v.length - 1) / 365;
  return {
    finalUsd: final,
    returnPct: ((final - capital) / capital) * 100,
    cagrPct: years >= 0.5 && final > 0 ? (Math.pow(final / capital, 1 / years) - 1) * 100 : null,
    maxDrawdownPct: maxDrawdown(v),
    volatilityPct: sd * Math.sqrt(365) * 100,
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(365) : 0,
    feesUsd: run.feesUsd,
    trades: run.trades,
  };
}

export const dailyReturns = (curve: Curve) => curve.slice(1).map((x, i) => (curve[i].value > 0 ? x.value / curve[i].value - 1 : 0));

export function portfolioMonteCarlo(run: PortfolioRun, seed = 7): McSummary | null {
  return blockBootstrap(dailyReturns(run.curve), { block: 30, seed, runs: 1000 });
}
