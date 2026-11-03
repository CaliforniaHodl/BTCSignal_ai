import { describe, expect, it } from "vitest";
import { annualisedBasisPct, deribitExpiry, pctChange, pearson, puellMultiple, returnCorrelation, trailingMean, zScoreLast } from "./stats";

describe("pearson", () => {
  it("is 1 for perfectly correlated and -1 for inverse", () => {
    const a = Array.from({ length: 20 }, (_, i) => i);
    expect(pearson(a, a.map((x) => 2 * x + 3))).toBeCloseTo(1);
    expect(pearson(a, a.map((x) => -x))).toBeCloseTo(-1);
  });
  it("returns null with too little data or zero variance", () => {
    expect(pearson([1, 2], [1, 2])).toBeNull();
    expect(pearson(Array(20).fill(1), Array.from({ length: 20 }, (_, i) => i))).toBeNull();
  });
});

describe("returnCorrelation", () => {
  const days = Array.from({ length: 40 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
  const x = days.map((day, i) => ({ day, value: 100 * Math.exp(0.01 * Math.sin(i)) }));
  it("aligns on shared days only", () => {
    const y = x.filter((_, i) => i % 7 !== 5).map((p) => ({ ...p, value: p.value * 3 }));
    const { r, n } = returnCorrelation(x, y, 90);
    expect(r).toBeCloseTo(1);
    expect(n).toBe(y.length - 1);
  });
  it("respects the window", () => {
    expect(returnCorrelation(x, x, 15).n).toBe(15);
  });
});

describe("basis", () => {
  it("parses Deribit expiries at 08:00 UTC", () => {
    expect(new Date(deribitExpiry("BTC-27NOV26")!).toISOString()).toBe("2026-11-27T08:00:00.000Z");
    expect(new Date(deribitExpiry("BTC-4NOV26")!).toISOString()).toBe("2026-11-04T08:00:00.000Z");
    expect(deribitExpiry("BTC-PERPETUAL")).toBeNull();
  });
  it("annualises simply and refuses sub-day expiries", () => {
    expect(annualisedBasisPct(101, 100, 36.5 * 86_400_000)).toBeCloseTo(10);
    expect(annualisedBasisPct(101, 100, 3_600_000)).toBeNull();
  });
});

describe("misc", () => {
  it("pctChange", () => {
    expect(pctChange(100, 110)).toBeCloseTo(10);
    expect(pctChange(0, 1)).toBeNull();
    expect(pctChange(null, 1)).toBeNull();
  });
  it("puell needs a full year", () => {
    expect(puellMultiple(Array(364).fill(1))).toBeNull();
    expect(puellMultiple([...Array(364).fill(1), 2])).toBeCloseTo(2 / (366 / 365));
  });
  it("trailingMean / zScore", () => {
    expect(trailingMean([1, 2, 3, 4], 2)).toBe(3.5);
    expect(zScoreLast([1, 3, 1, 3, 10], 4)).toBeCloseTo(8);
    expect(zScoreLast([1, 1, 1], 2)).toBeNull();
  });
});
