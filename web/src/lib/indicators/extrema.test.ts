import { describe, expect, it } from "vitest";
import { highestHigh, lowestLow, stochK } from ".";
import type { Candle } from "@/lib/market/types";

const c = (high: number, low: number, close: number, i: number): Candle => ({ time: i * 60, open: close, high, low, close, volume: 1 });
const bars = [c(10, 5, 8, 0), c(12, 6, 11, 1), c(11, 4, 5, 2), c(15, 9, 14, 3)];

describe("highestHigh / lowestLow", () => {
  it("uses only prior bars (current bar excluded)", () => {
    expect(highestHigh(bars, 2)).toEqual([null, null, 12, 12]);
    expect(lowestLow(bars, 2)).toEqual([null, null, 5, 4]);
  });
  it("rejects bad periods", () => expect(() => highestHigh(bars, 0)).toThrow());
});

describe("stochK", () => {
  it("is the 0..100 position of the close in the window (current bar included)", () => {
    const k = stochK(bars, 2);
    expect(k[0]).toBeNull();
    expect(k[1]).toBeCloseTo(((11 - 5) / (12 - 5)) * 100);
    expect(k[3]).toBeCloseTo(((14 - 4) / (15 - 4)) * 100);
  });
  it("returns 50 on a flat range", () => {
    expect(stochK([c(5, 5, 5, 0), c(5, 5, 5, 1)], 2)[1]).toBe(50);
  });
});
