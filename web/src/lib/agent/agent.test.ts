import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { close, equity, findExit, open, type Position } from "./broker";
import { checkEntry, RISK, type RiskState } from "./risk";
import { closedOnly, evaluate } from "@/lib/engine/signal";

const cfg = { ...RISK, feeRate: 0.001, slippage: 0 };
const base: RiskState = {
  enabled: true, equityUsd: 10_000, cashUsd: 10_000, peakEquityUsd: 10_000, hasOpenPosition: false,
  entriesToday: 0, pnlTodayPct: 0, lastCloseAt: null, now: Date.UTC(2026, 0, 1),
};
const long = { side: "long" as const, price: 100_000, stop: 98_000, target: 104_000 };

describe("risk", () => {
  it("sizes by risk: 1% of equity / stop distance, capped by max position", () => {
    const r = checkEntry(base, long, 1, cfg);
    expect(r.allowed).toBe(true);
    // risk $100 / $2000 stop = 0.05 BTC = $5000 notional (< 50% cap)
    expect(r.qtyBtc).toBeCloseTo(0.05, 6);
  });
  it("caps notional at maxPositionPct when the stop is tight", () => {
    const r = checkEntry(base, { ...long, stop: 99_900, target: 100_300 }, 1, cfg);
    expect(r.notionalUsd).toBeLessThanOrEqual(5_000 + 1e-6);
  });
  it("Claude can only shrink size", () => {
    expect(checkEntry(base, long, 0.5, cfg).qtyBtc).toBeCloseTo(0.025, 6);
    expect(checkEntry(base, long, 3, cfg).qtyBtc).toBeCloseTo(0.05, 6); // clamped to 1
  });
  it("blocks on kill switch, open position, shorts, daily loss, drawdown, cooldown, bad R:R", () => {
    const blocked = (s: Partial<RiskState>, p = long) => !checkEntry({ ...base, ...s }, p, 1, cfg).allowed;
    expect(blocked({ enabled: false })).toBe(true);
    expect(blocked({ hasOpenPosition: true })).toBe(true);
    expect(blocked({}, { side: "short", price: 100_000, stop: 102_000, target: 96_000 } as never)).toBe(true);
    expect(blocked({ pnlTodayPct: -3.5 })).toBe(true);
    expect(blocked({ peakEquityUsd: 12_000 })).toBe(true); // 16.7% drawdown
    expect(blocked({ lastCloseAt: base.now - 3_600_000 })).toBe(true);
    expect(blocked({ entriesToday: 3 })).toBe(true);
    expect(blocked({}, { ...long, target: 101_000 })).toBe(true); // R:R 0.5
  });
});

const c = (time: number, o: number, h: number, l: number, cl: number): Candle => ({ time, open: o, high: h, low: l, close: cl, volume: 1 });

describe("broker", () => {
  it("round-trips a long with fees", () => {
    const o = open(10_000, "long", 0.05, 100_000, cfg);
    expect(o.cashUsd).toBeCloseTo(10_000 - 5_000 - 5, 6);
    const pos: Position = { side: "long", qtyBtc: 0.05, entryPrice: o.fill, stop: 98_000, target: 104_000, openFeeUsd: o.feeUsd };
    expect(equity(o.cashUsd, pos, 102_000)).toBeCloseTo(4_995 + 5_100, 6);
    const cl = close(o.cashUsd, pos, 104_000, cfg);
    expect(cl.pnlUsd).toBeCloseTo(200 - 5 - 5.2, 6);
    expect(cl.cashUsd).toBeCloseTo(10_000 + cl.pnlUsd, 6);
  });
  it("assumes the stop when a candle spans both levels, and fills gaps at the open", () => {
    const pos: Position = { side: "long", qtyBtc: 1, entryPrice: 100, stop: 95, target: 110, openFeeUsd: 0 };
    expect(findExit(pos, [c(1, 100, 111, 94, 105)])).toMatchObject({ reason: "stop", price: 95 });
    expect(findExit(pos, [c(1, 90, 92, 88, 91)])).toMatchObject({ reason: "stop", price: 90 });
    expect(findExit(pos, [c(1, 100, 104, 99, 103), c(2, 103, 112, 102, 111)])).toMatchObject({ reason: "target", time: 2 });
  });
});

describe("engine", () => {
  const series = (n: number, step: number, f: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => { const p = f(i); return c(i * step, p, p * 1.004, p * 0.996, p); });

  it("goes long in a steady uptrend and flat in a flat market", () => {
    const up = (i: number) => 50_000 * Math.pow(1.0015, i) * (1 + 0.004 * Math.sin(i));
    const s = evaluate({ h1: series(300, 3600, up), h4: series(300, 14400, up), d1: series(300, 86400, (i) => 30_000 * Math.pow(1.004, i)) });
    expect(s.direction).toBe("long");
    expect(s.stop!).toBeLessThan(s.price);
    expect(s.target!).toBeGreaterThan(s.price);
    expect(s.coverage).toBeCloseTo(0.75, 6); // funding + F&G missing
    const flat = (i: number) => 50_000 * (1 + 0.002 * Math.sin(i / 3));
    expect(evaluate({ h1: series(300, 3600, flat), h4: series(300, 14400, flat), d1: series(300, 86400, flat) }).direction).toBe("flat");
  });
  it("closedOnly drops a forming candle", () => {
    const cs = [c(0, 1, 1, 1, 1), c(3600, 1, 1, 1, 1)];
    expect(closedOnly(cs, 3600, 3600 + 100)).toHaveLength(1);
    expect(closedOnly(cs, 3600, 7200)).toHaveLength(2);
  });
});
