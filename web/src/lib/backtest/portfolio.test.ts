import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { blockBootstrap, percentile, resampleTrades } from "./montecarlo";
import { buyHold, dca, portfolioMetrics, rebalance, trend } from "./portfolio";

const ZERO = { maker: 0, taker: 0, slippage: 0 };
const DAY = 86400;
// 2024-01-01 (a Monday) onwards
const T0 = Date.UTC(2024, 0, 1) / 1000;
const series = (prices: number[]): Candle[] => prices.map((p, i) => ({ time: T0 + i * DAY, open: p, high: p, low: p, close: p, volume: 1 }));

describe("percentile", () => {
  it("interpolates", () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
    expect(percentile([5, 1, 3], 0)).toBe(1);
  });
});

describe("Monte Carlo", () => {
  it("is deterministic for a seed and brackets the median", () => {
    const r = [5, -2, 3, -1, 4, -3, 2, 1, -2, 6];
    const a = resampleTrades(r, { seed: 1 })!, b = resampleTrades(r, { seed: 1 })!;
    expect(a).toEqual(b);
    expect(a.finalReturnPct.p5).toBeLessThan(a.finalReturnPct.p50);
    expect(a.finalReturnPct.p50).toBeLessThan(a.finalReturnPct.p95);
    expect(a.histogram.reduce((s, h) => s + h.count, 0)).toBe(1000);
  });
  it("needs enough data", () => {
    expect(resampleTrades([1, 2])).toBeNull();
    expect(blockBootstrap([0.01, 0.02], { block: 20 })).toBeNull();
  });
  it("constant returns give a degenerate distribution", () => {
    const m = blockBootstrap(new Array(100).fill(0.01), { block: 10, runs: 50 })!;
    expect(m.finalReturnPct.p5).toBeCloseTo(m.finalReturnPct.p95);
    expect(m.probLossPct).toBe(0);
  });
});

describe("presets", () => {
  const up = series(Array.from({ length: 60 }, (_, i) => 100 + i));

  it("buy & hold tracks price after one fee", () => {
    const r = buyHold(up, 0, 1000, { maker: 0, taker: 0.01, slippage: 0 });
    expect(r.curve[0].value).toBeCloseTo(1000 / 1.01);
    expect(r.curve.at(-1)!.value).toBeCloseTo((1000 / 1.01 / 100) * 159);
  });

  it("DCA buys once per week and ends fully invested", () => {
    const r = dca(up, 0, 900, "week", ZERO);
    expect(r.trades).toBe(9); // 60 days from a Monday = 9 ISO weeks
    const qty = r.curve.at(-1)!.value / 159;
    expect(r.curve.at(-1)!.value).toBeCloseTo(qty * 159);
    expect(r.curve[0].value).toBeCloseTo(900);
  });

  it("trend filter is in cash below the SMA", () => {
    const down = series([...Array.from({ length: 30 }, (_, i) => 200 - i), ...Array.from({ length: 30 }, () => 150)]);
    const r = trend(down, 11, 1000, 10, ZERO);
    expect(r.trades).toBe(0);
    expect(r.curve.at(-1)!.value).toBe(1000);
  });

  it("rebalance holds the target weight on calendar dates", () => {
    const zig = series(Array.from({ length: 120 }, (_, i) => (i % 2 ? 100 : 120)));
    const r = rebalance(zig, 0, 1000, 50, "month", 5, ZERO);
    expect(r.trades).toBeGreaterThanOrEqual(4); // initial + 3 month boundaries
    const m = portfolioMetrics(r, 1000);
    expect(m.maxDrawdownPct).toBeGreaterThan(0);
    expect(m.feesUsd).toBe(0);
  });

  it("band rebalancing trades only when drift exceeds the band", () => {
    const r = rebalance(series([100, 101, 102, 200, 200]), 0, 1000, 50, "band", 10, ZERO);
    expect(r.trades).toBe(2);
  });
});
