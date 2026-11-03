import { describe, expect, it } from "vitest";
import { aggregate } from "@/lib/market/sources";
import type { Candle } from "@/lib/market/types";
import { atr, bollinger, ema, keyLevels, last, macd, rsi, sma } from "./index";

// StockCharts Wilder RSI worked example. StockCharts rounds intermediate averages
// (published 70.53, 66.32, 66.55); exact values below were cross-checked in Python.
const WILDER = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
  46.0, 46.03, 46.41, 46.22, 45.64,
];

describe("sma / ema", () => {
  it("sma aligns output and nulls warm-up", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it("ema seeds with sma then smooths", () => {
    const e = ema([1, 2, 3, 4, 5], 3);
    expect(e.slice(0, 2)).toEqual([null, null]);
    expect(e[2]).toBe(2);
    expect(e[3]).toBe(3); // 4*0.5 + 2*0.5
    expect(e[4]).toBe(4);
  });
  it("handles input shorter than period", () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
    expect(rsi([1, 2], 14)).toEqual([null, null]);
  });
  it("rejects bad periods", () => {
    expect(() => sma([1], 0)).toThrow();
  });
});

describe("rsi (Wilder)", () => {
  it("matches exact Wilder values on the StockCharts series", () => {
    const r = rsi(WILDER, 14);
    expect(r[13]).toBeNull();
    expect(r[14]).toBeCloseTo(70.464, 2);
    expect(r[15]).toBeCloseTo(66.25, 2);
    expect(r[16]).toBeCloseTo(66.481, 2);
  });
  it("is 100 on a straight rally and 50 on a flat line", () => {
    expect(last(rsi([1, 2, 3, 4, 5, 6], 3))).toBe(100);
    expect(last(rsi([5, 5, 5, 5, 5], 3))).toBe(50);
  });
});

describe("macd / bollinger", () => {
  it("macd histogram = line - signal once warm", () => {
    const xs = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 4) * 5 + i * 0.2);
    const m = macd(xs);
    const i = 59;
    expect(m.histogram[i]).toBeCloseTo(m.line[i]! - m.signal[i]!, 10);
    expect(m.signal[25 + 7]).toBeNull();
    expect(m.signal[25 + 8]).not.toBeNull();
  });
  it("bollinger collapses on a flat series", () => {
    const b = bollinger(new Array(25).fill(10), 20, 2);
    expect(b.upper[24]).toBe(10);
    expect(b.lower[24]).toBe(10);
  });
});

const candle = (time: number, o: number, h: number, l: number, c: number): Candle => ({
  time, open: o, high: h, low: l, close: c, volume: 1,
});

describe("atr / aggregate / levels", () => {
  it("atr of constant-range bars equals the range", () => {
    const cs = Array.from({ length: 20 }, (_, i) => candle(i, 10, 12, 8, 10));
    expect(last(atr(cs, 14))).toBe(4);
  });
  it("aggregates 1h into UTC-aligned 4h buckets", () => {
    const base = 1_700_006_400; // divisible by 14400
    const hours = Array.from({ length: 8 }, (_, i) => candle(base + i * 3600, i, i + 1, i - 1, i + 0.5));
    const four = aggregate(hours, 14400);
    expect(four).toHaveLength(2);
    expect(four[0]).toMatchObject({ time: base, open: 0, high: 4, low: -1, close: 3.5, volume: 4 });
  });
  it("finds a twice-touched resistance", () => {
    const highs = [10, 11, 15, 11, 10, 9, 10, 11, 15.02, 11, 10, 9, 10, 11, 12];
    const cs = highs.map((h, i) => candle(i, h - 1, h, h - 2, h - 0.5));
    const lv = keyLevels(cs, { lookback: 2 });
    expect(lv.some((l) => l.kind === "resistance" && Math.abs(l.price - 15.01) < 0.05)).toBe(true);
  });
});
