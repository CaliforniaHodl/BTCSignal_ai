import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { mulberry32 } from "./montecarlo";
import { buildSeries, conditionLabel, ruleMetrics, runRules, validateSpec, warmupBars, type Condition, type Operand, type RuleSpec } from "./rules";

const bar = (i: number, o: number, h: number, l: number, c: number): Candle => ({ time: i * 86400, open: o, high: h, low: l, close: c, volume: 100 });
const flat = (i: number, p: number) => bar(i, p, p, p, p);
const close: Operand = { kind: "close", period: null, value: null };
const k = (v: number): Operand => ({ kind: "const", period: null, value: v });
const NONE = { type: "none" as const, value: null };
const spec = (over: Partial<RuleSpec> = {}): RuleSpec => ({
  side: "long", timeframe: "1d",
  entry: [{ left: close, op: "crosses_above", right: k(11) }],
  exit: [], stop: NONE, target: NONE, trailing: NONE, max_bars: null, ...over,
});
const ZERO = { maker: 0, taker: 0, slippage: 0 };
const at110 = { entry: [{ left: close, op: "crosses_above" as const, right: k(110) }] };

describe("conditions", () => {
  const candles = [10, 10, 12, 12, 9, 12, 11].map((p, i) => flat(i, p));
  const fire = (c: Condition) => candles.map((_, i) => buildSeries(candles, spec({ entry: [c] })).entry[0](i));

  it("crosses_above fires only on the bar that crosses", () => {
    expect(fire({ left: close, op: "crosses_above", right: k(11) })).toEqual([false, false, true, false, false, true, false]);
  });
  it("crosses_below fires only on the crossing bar; equal-to-level counts as not-yet-crossed", () => {
    expect(fire({ left: close, op: "crosses_below", right: k(11) })).toEqual([false, false, false, false, true, false, false]);
    // 12 → 11 touches the level (not below) — no cross
    expect(fire({ left: close, op: "crosses_below", right: k(11) })[6]).toBe(false);
  });
  it("above/below are strict and false during indicator warm-up", () => {
    expect(fire({ left: close, op: "above", right: k(11) })).toEqual([false, false, true, true, false, true, false]);
    const sma3: Operand = { kind: "sma", period: 3, value: null };
    expect(fire({ left: close, op: "above", right: sma3 }).slice(0, 2)).toEqual([false, false]);
  });
  it("labels read as English", () => {
    expect(conditionLabel({ left: { kind: "ema", period: 20, value: null }, op: "crosses_above", right: { kind: "sma", period: 50, value: null } }))
      .toBe("EMA(20) crosses above SMA(50)");
  });
});

describe("fills and fees", () => {
  it("enters at the NEXT bar's open, never the signal bar's close", () => {
    const c = [flat(0, 10), flat(1, 10), bar(2, 10, 12, 10, 12), bar(3, 13, 13, 13, 13), flat(4, 13)];
    const r = runRules(c, spec(), { fees: ZERO });
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0].entryTime).toBe(c[3].time);
    expect(r.trades[0].entryPrice).toBe(13);
  });

  it("charges taker on entry (with slippage) and maker on a target fill", () => {
    const fees = { maker: 0.005, taker: 0.01, slippage: 0.001 };
    const c = [flat(0, 100), flat(1, 100), bar(2, 100, 120, 100, 120), bar(3, 100, 100, 100, 100), bar(4, 100, 111, 100, 105), flat(5, 105)];
    const r = runRules(c, spec({ ...at110, target: { type: "percent", value: 10 } }), { fees, startCash: 1000 });
    const t = r.trades[0];
    const fill = 100 * 1.001;
    const qty = 1000 / (fill * 1.01);
    expect(t.entryPrice).toBeCloseTo(fill);
    expect(t.reason).toBe("target");
    expect(t.exitPrice).toBeCloseTo(fill * 1.1); // limit: no slippage
    const expectedFees = qty * fill * 0.01 + qty * fill * 1.1 * 0.005;
    expect(t.feesUsd).toBeCloseTo(expectedFees);
    expect(t.pnlUsd).toBeCloseTo(qty * (fill * 1.1 - fill) - expectedFees);
    expect(r.finalEquity).toBeCloseTo(1000 + t.pnlUsd);
  });

  it("a flat round trip loses exactly the fees", () => {
    const c = [flat(0, 10), flat(1, 10), bar(2, 10, 12, 10, 12), flat(3, 12), flat(4, 12), flat(5, 12)];
    const r = runRules(c, spec({ max_bars: 1 }), { fees: { maker: 0, taker: 0.01, slippage: 0 }, startCash: 1000 });
    expect(r.trades[0].reason).toBe("time");
    expect(r.trades[0].pnlUsd).toBeLessThan(0);
    expect(r.finalEquity).toBeCloseTo(1000 - r.trades[0].feesUsd);
  });
});

describe("stops, targets, trailing", () => {
  it("assumes the stop when stop and target are both inside one bar", () => {
    const c = [flat(0, 100), flat(1, 100), bar(2, 100, 120, 100, 120), flat(3, 100), bar(4, 100, 115, 90, 100), flat(5, 100)];
    const r = runRules(c, spec({ ...at110, stop: { type: "percent", value: 5 }, target: { type: "percent", value: 10 } }), { fees: ZERO });
    expect(r.trades[0].reason).toBe("stop");
    expect(r.trades[0].exitPrice).toBeCloseTo(95);
    expect(r.trades[0].r).toBeCloseTo(-1);
  });

  it("a gap through the stop fills at the open, not the stop", () => {
    const c = [flat(0, 100), flat(1, 100), bar(2, 100, 120, 100, 120), flat(3, 100), bar(4, 80, 82, 78, 80), flat(5, 80)];
    const r = runRules(c, spec({ ...at110, stop: { type: "percent", value: 5 } }), { fees: ZERO });
    expect(r.trades[0].exitPrice).toBe(80);
  });

  it("R-multiple targets use the stop distance", () => {
    const c = [flat(0, 100), flat(1, 100), bar(2, 100, 120, 100, 120), flat(3, 100), bar(4, 100, 111, 99, 105), flat(5, 105)];
    const r = runRules(c, spec({ ...at110, stop: { type: "percent", value: 5 }, target: { type: "r_multiple", value: 2 } }), { fees: ZERO });
    expect(r.trades[0].exitPrice).toBeCloseTo(110);
    expect(r.trades[0].r).toBeCloseTo(2);
  });

  it("trailing stop only tightens and exits as 'trail'", () => {
    const closes = [100, 100, 120, 100, 110, 120, 115, 113, 105];
    const c = closes.map((p, i) => flat(i, p));
    c[2] = bar(2, 100, 120, 100, 120);
    c[7] = bar(7, 116, 116, 113, 113); // opens above the trail, trades through it
    const r = runRules(c, spec({ ...at110, trailing: { type: "percent", value: 5 } }), { fees: ZERO });
    // entry 100 @ bar3; best close 120 @ bar5 → trail 114; bar7 low 113 ≤ 114 → exit at 114
    expect(r.trades[0].reason).toBe("trail");
    expect(r.trades[0].exitPrice).toBeCloseTo(114);
  });

  it("exit conditions fill at the next open", () => {
    const c = [flat(0, 10), flat(1, 10), bar(2, 10, 12, 10, 12), flat(3, 12), bar(4, 12, 12, 9, 9), bar(5, 8, 8, 8, 8), flat(6, 8)];
    const r = runRules(c, spec({ exit: [{ left: close, op: "below", right: k(10) }] }), { fees: ZERO });
    expect(r.trades[0].reason).toBe("signal");
    expect(r.trades[0].exitTime).toBe(c[5].time);
    expect(r.trades[0].exitPrice).toBe(8);
  });

  it("shorts profit when price falls", () => {
    const c = [flat(0, 12), flat(1, 12), bar(2, 12, 12, 9, 9), flat(3, 10), flat(4, 8), flat(5, 8)];
    const r = runRules(c, spec({ side: "short", entry: [{ left: close, op: "crosses_below", right: k(11) }], max_bars: 2 }), { fees: ZERO, startCash: 1000 });
    expect(r.trades[0].side).toBe("short");
    expect(r.trades[0].pnlUsd).toBeCloseTo(1000 / 10 * 2); // 100 units × (10 − 8)
  });
});

describe("no look-ahead", () => {
  it("decisions up to bar k don't depend on bars after k", () => {
    const rnd = mulberry32(3);
    let p = 100;
    const c: Candle[] = Array.from({ length: 400 }, (_, i) => {
      const o = p;
      p = Math.max(1, p * (1 + (rnd() - 0.5) * 0.06));
      return bar(i, o, Math.max(o, p) * 1.01, Math.min(o, p) * 0.99, p);
    });
    const s = spec({
      entry: [{ left: { kind: "ema", period: 10, value: null }, op: "crosses_above", right: { kind: "sma", period: 30, value: null } }],
      exit: [{ left: { kind: "rsi", period: 14, value: null }, op: "above", right: k(70) }],
      stop: { type: "atr", value: 2 }, trailing: { type: "atr", value: 3 },
    });
    const full = runRules(c, s, { startIndex: warmupBars(s) });
    for (const cut of [120, 250, 333]) {
      const pre = runRules(c.slice(0, cut), s, { startIndex: warmupBars(s) });
      // Everything before the prefix's final (force-closed) bar must match.
      expect(pre.equity.slice(0, cut - 1)).toEqual(full.equity.slice(0, cut - 1));
      const closedBefore = (r: typeof full) => r.trades.filter((t) => t.exitTime < c[cut - 1].time);
      expect(closedBefore(pre)).toEqual(closedBefore(full));
    }
    expect(full.trades.length).toBeGreaterThan(0);
  });

  it("never signals on the last bar (nothing to fill at)", () => {
    const c = [flat(0, 10), flat(1, 10), bar(2, 10, 12, 10, 12)];
    expect(runRules(c, spec()).trades).toHaveLength(0);
  });
});

describe("validateSpec", () => {
  it("accepts and normalises a good spec", () => {
    const v = validateSpec(spec({ entry: [{ left: close, op: "above", right: { kind: "sma", period: 49.6, value: 3 } }] }));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.spec.entry[0].right).toEqual({ kind: "sma", period: 50, value: null });
  });
  it("rejects missing periods, const-vs-const, r-multiple without stop, empty entry", () => {
    const bad = validateSpec(spec({
      entry: [{ left: { kind: "rsi", period: null, value: null }, op: "below", right: k(30) }, { left: k(1), op: "above", right: k(2) }],
      target: { type: "r_multiple", value: 2 },
    }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(" ")).toMatch(/needs a period.*two constants.*needs a stop/);
    expect(validateSpec(spec({ entry: [] })).ok).toBe(false);
    expect(validateSpec({ side: "sideways" }).ok).toBe(false);
  });
  it("warns on mixed scales and shorts", () => {
    const v = validateSpec(spec({ side: "short", entry: [{ left: { kind: "rsi", period: 14, value: null }, op: "above", right: close }] }));
    expect(v.warnings.join(" ")).toMatch(/oscillator to price/);
    expect(v.warnings.join(" ")).toMatch(/Coinbase spot/);
  });
});

describe("metrics", () => {
  it("computes win rate, profit factor and buy & hold", () => {
    const c = [flat(0, 10), flat(1, 10), bar(2, 10, 12, 10, 12), flat(3, 12), flat(4, 15), flat(5, 15)];
    const r = runRules(c, spec({ max_bars: 2 }), { fees: ZERO, startCash: 1000 });
    const m = ruleMetrics(r, 365, 1000, ZERO);
    expect(m.trades).toBe(1);
    expect(m.winRatePct).toBe(100);
    expect(m.returnPct).toBeCloseTo(25);
    expect(m.profitFactor).toBe(Infinity);
    expect(m.buyHoldPct).toBeCloseTo(50);
  });
});
