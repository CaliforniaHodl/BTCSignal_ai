import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { adx, cci, donchian, keltner, last, mfi, obv, stochastic, vwap, williamsR } from "./index";

const c = (time: number, o: number, h: number, l: number, cl: number, v = 1): Candle => ({
  time, open: o, high: h, low: l, close: cl, volume: v,
});

describe("vwap", () => {
  it("is the volume-weighted typical price and resets each UTC day", () => {
    const day = 86_400;
    const cs = [
      c(0, 10, 12, 8, 10, 1), // tp 10
      c(3600, 10, 22, 18, 20, 3), // tp 20
      c(day, 50, 51, 49, 50, 5), // new session, tp 50
    ];
    const v = vwap(cs);
    expect(v[0]).toBe(10);
    expect(v[1]).toBeCloseTo((10 * 1 + 20 * 3) / 4, 10);
    expect(v[2]).toBe(50);
  });
  it("falls back to typical price on zero volume", () => {
    expect(vwap([c(0, 1, 3, 1, 2, 0)])[0]).toBe(2);
  });
});

describe("stochastic / williams %R", () => {
  const rising = Array.from({ length: 30 }, (_, i) => c(i, i, i + 1, i - 1, i + 1));
  it("pins %K to 100 when closing at the high of the window", () => {
    const s = stochastic(rising, 14, 3, 3);
    expect(s.k[14 + 1]).toBe(100);
    expect(s.k[14]).toBeNull(); // 13 = first raw, +2 for 3-bar smoothing
    expect(s.k[15]).not.toBeNull();
    expect(last(s.d)).toBe(100);
    expect(last(williamsR(rising, 14))).toBe(0);
  });
  it("returns the midpoint on a flat window", () => {
    const flat = Array.from({ length: 20 }, (_, i) => c(i, 5, 5, 5, 5));
    expect(last(stochastic(flat).k)).toBe(50);
    expect(last(williamsR(flat))).toBe(-50);
  });
});

describe("obv", () => {
  it("adds volume on up closes, subtracts on down, ignores unchanged", () => {
    const cs = [c(0, 1, 1, 1, 10, 5), c(1, 1, 1, 1, 11, 2), c(2, 1, 1, 1, 9, 3), c(3, 1, 1, 1, 9, 7)];
    expect(obv(cs)).toEqual([0, 2, -1, -1]);
  });
});

describe("cci / mfi", () => {
  it("cci is 0 on a flat series and positive at the top of a rally", () => {
    const flat = Array.from({ length: 25 }, (_, i) => c(i, 5, 6, 4, 5));
    expect(last(cci(flat, 20))).toBe(0);
    const up = Array.from({ length: 25 }, (_, i) => c(i, i, i + 1, i - 1, i));
    expect(last(cci(up, 20))!).toBeGreaterThan(100);
  });
  it("mfi is 100 when every bar's typical price rises", () => {
    const up = Array.from({ length: 20 }, (_, i) => c(i, i, i + 1, i - 1, i, 10));
    const m = mfi(up, 14);
    expect(m[13]).toBeNull();
    expect(m[14]).toBe(100);
  });
});

describe("channels", () => {
  it("donchian tracks the window extremes", () => {
    const cs = Array.from({ length: 10 }, (_, i) => c(i, 5, 5 + i, 5 - i, 5));
    const d = donchian(cs, 3);
    expect(d.upper[9]).toBe(14);
    expect(d.lower[9]).toBe(-4);
    expect(d.middle[9]).toBe(5);
    expect(d.upper[1]).toBeNull();
  });
  it("keltner = ema ± mult·atr", () => {
    const cs = Array.from({ length: 30 }, (_, i) => c(i, 10, 12, 8, 10));
    const k = keltner(cs, 20, 2, 10);
    expect(last(k.middle)).toBe(10);
    expect(last(k.upper)).toBe(18); // atr = 4
    expect(last(k.lower)).toBe(2);
  });
});

describe("adx", () => {
  it("reads a strong trend in a clean rally, with +DI above -DI", () => {
    const up = Array.from({ length: 60 }, (_, i) => c(i, 100 + i * 2, 101 + i * 2, 99 + i * 2, 100.5 + i * 2));
    const a = adx(up, 14);
    expect(a.adx[26]).toBeNull();
    expect(a.adx[27]).not.toBeNull();
    expect(last(a.adx)!).toBeGreaterThan(90);
    expect(last(a.plusDI)!).toBeGreaterThan(last(a.minusDI)!);
  });
  it("returns all nulls for short input", () => {
    expect(adx([c(0, 1, 2, 0, 1)], 14).adx).toEqual([null]);
  });
});
