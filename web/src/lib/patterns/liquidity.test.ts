import { describe, expect, it } from "vitest";
import { bucketByPrice, bucketByTime, estimateLiquidationLevels, fillBuckets, niceStep, totals, type LiqEvent } from "./liquidations";
import { htfLevels, liquidityMap, scanPools } from "./liquidity";
import { bar, fromCloses, legs } from "./test-helpers";

describe("liquidity pools", () => {
  it("clusters equal highs above price and keeps them unswept", () => {
    const cs = fromCloses(legs([100, 120, 110, 120.1, 108, 112], [10, 6, 6, 8, 4]));
    const m = liquidityMap(cs)!;
    const eq = m.zones.find((z) => z.kind === "equal_highs");
    expect(eq).toBeDefined();
    expect(eq!.touches).toBe(2);
    expect(eq!.price).toBeCloseTo(120.6, 6);
    expect(eq!.side).toBe("above");
    expect(eq!.distancePct).toBeCloseTo(((120.6 - 112) / 112) * 100, 6);
    // the 108 low is a single swing low below price
    expect(m.zones.some((z) => z.kind === "swing_low" && z.side === "below")).toBe(true);
  });

  it("records a sweep (with reclaim) when a bar wicks through equal highs and closes back below", () => {
    const cs = fromCloses(legs([100, 120, 110, 120.1, 108, 118], [10, 6, 6, 8, 6]));
    const t = cs[cs.length - 1].time + 3600;
    cs.push(bar(t, 118, 122, 117, 119)); // wick above 120.6, close below
    cs.push(bar(t + 3600, 119, 119.5, 115, 116));
    const m = liquidityMap(cs)!;
    expect(m.zones.some((z) => z.kind === "equal_highs")).toBe(false);
    expect(m.sweeps).toHaveLength(1);
    expect(m.sweeps[0]).toMatchObject({ kind: "equal_highs", touches: 2, reclaimed: true, sweptTime: t });
  });

  it("does not treat a marginally higher equal high as a sweep of its twin", () => {
    const cs = fromCloses(legs([100, 120, 110, 120.2, 105], [10, 6, 6, 8]));
    const { active, swept } = scanPools(cs, { tolAtr: 0.25 });
    expect(swept.filter((p) => p.side === "high")).toHaveLength(0);
    expect(active.find((p) => p.side === "high")?.touches).toBe(2);
  });

  it("computes the observed sweep base rate only over pools with full follow-up", () => {
    // equal highs at ~120 swept ~10 bars after forming, then a long tail of bars.
    const cs = fromCloses(legs([100, 120, 110, 120.1, 112, 125, 115, 118], [10, 6, 6, 4, 10, 20, 40]));
    const m = liquidityMap(cs, { horizonBars: 24 })!;
    const s = m.stats.find((x) => x.kind === "equal_highs")!;
    expect(s.formed).toBe(1);
    expect(s.sweptWithin).toBe(1);
  });
});

describe("prior day / week levels", () => {
  // 2024-01-01 is a Monday.
  const MON = 1_704_067_200;
  const D = 86_400;
  const days = Array.from({ length: 10 }, (_, i) => bar(MON + i * D, 100, 110 + i, 90 - i, 100));
  it("uses yesterday and the previous Monday-aligned week", () => {
    const h = htfLevels(days)!;
    // today = Wed Jan 10 (index 9); yesterday index 8
    expect(h.pdh.price).toBe(118);
    expect(h.pdl.price).toBe(82);
    expect(h.pdh.swept).toBe(true); // today's high 119 > 118
    // previous week = Jan 1..7 (indices 0..6)
    expect(h.pwh!.price).toBe(116);
    expect(h.pwl!.price).toBe(84);
    expect(h.pwh!.time).toBe(MON);
  });
});

describe("realized liquidation aggregation", () => {
  const ev: LiqEvent[] = [
    { ts: 0, side: "long", price: 100_050, usd: 1000, venue: "OKX" },
    { ts: 1_000, side: "long", price: 100_090, usd: 500, venue: "OKX" },
    { ts: 3_700_000, side: "short", price: 101_010, usd: 2000, venue: "OKX" },
  ];
  it("buckets by price and time", () => {
    expect(bucketByPrice(ev, 100)).toEqual([
      { price: 101_000, longUsd: 0, shortUsd: 2000 },
      { price: 100_000, longUsd: 1500, shortUsd: 0 },
    ]);
    const t = bucketByTime(ev, 3_600_000, 0, 7_200_000);
    expect(t.map((b) => [b.longUsd, b.shortUsd, b.count])).toEqual([[1500, 0, 2], [0, 2000, 1], [0, 0, 0]]);
  });
  it("totals", () => {
    const s = totals(ev);
    expect(s).toMatchObject({ longUsd: 1500, shortUsd: 2000, count: 3 });
    expect(s.largest?.usd).toBe(2000);
  });
});

describe("estimated liquidation levels (model)", () => {
  const flat = (i: number, p: number) => bar(i, p, p, p, p, 1);
  it("places isolated-margin liquidation prices at entry × (1 ∓ 1/L ± mmr)", () => {
    const r = estimateLiquidationLevels({ candles: [flat(0, 100)], openInterestUsd: 1000, tiers: [{ leverage: 10, weight: 1 }], mmr: 0, bucketUsd: 1 });
    expect(r.buckets).toEqual([
      { price: 110, longUsd: 0, shortUsd: 500 },
      { price: 90, longUsd: 500, shortUsd: 0 },
    ]);
    expect(r.longUsd + r.shortUsd).toBe(1000);
  });
  it("drops levels price has already traded through", () => {
    const cs = [flat(0, 100), bar(1, 100, 100, 89, 95, 0)];
    const r = estimateLiquidationLevels({ candles: cs, openInterestUsd: 1000, tiers: [{ leverage: 10, weight: 1 }], mmr: 0, bucketUsd: 1, rangePct: 0.5 });
    expect(r.longUsd).toBe(0);
    expect(r.droppedUsd).toBe(500);
    expect(r.shortUsd).toBe(500);
  });
  it("returns nothing without OI", () => {
    expect(estimateLiquidationLevels({ candles: [flat(0, 100)], openInterestUsd: 0, bucketUsd: 1 }).buckets).toEqual([]);
  });
});

describe("bucket helpers", () => {
  it("fills a continuous ladder and picks round steps", () => {
    const f = fillBuckets([{ price: 200, longUsd: 1, shortUsd: 0 }], 100, 50, 320);
    expect(f.map((b) => b.price)).toEqual([300, 200, 100, 0]);
    expect(f[1].longUsd).toBe(1);
    expect(niceStep(3000, 30)).toBe(100);
    expect(niceStep(11_000, 40)).toBe(500);
    expect(niceStep(0)).toBe(1);
  });
});
