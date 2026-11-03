import { describe, expect, it } from "vitest";
import { buildRadar, oiRead } from "./build";

const s = { source: "test", fetchedAt: 1 };

describe("buildRadar", () => {
  it("returns nothing when no sources are available", () => {
    expect(buildRadar({})).toEqual([]);
  });

  it("grades price moves and sorts major first", () => {
    const items = buildRadar({ price: { ...s, now: 103_000, ago1h: 102_900, ago24h: 95_000 } });
    expect(items[0].id).toBe("price-24h");
    expect(items[0].severity).toBe(2); // +8.4%
    expect(items.find((i) => i.id === "price-1h")?.severity).toBe(0);
  });

  it("flags funding flips even when small", () => {
    const [f] = buildRadar({ funding: { ...s, avgNow: 0.00001, avgAgo24h: -0.00001, venues: [] } });
    expect(f.title).toMatch(/flipped positive/);
    expect(f.severity).toBe(1);
  });

  it("flags elevated funding and venue divergence", () => {
    const ids = buildRadar({ funding: { ...s, avgNow: 0.0004, avgAgo24h: 0.0004, venues: [{ venue: "A", now: 0.0001 }, { venue: "B", now: 0.0005 }] } }).map((i) => i.id);
    expect(ids).toContain("funding-level");
    expect(ids).toContain("funding-spread");
  });

  it("explains OI with price", () => {
    const items = buildRadar({ oi: { ...s, now: 110, ago1h: 109, ago24h: 100 }, price: { ...s, now: 95, ago1h: 95, ago24h: 100 } });
    const oi = items.find((i) => i.id === "oi-24h")!;
    expect(oi.severity).toBe(2);
    expect(oi.detail).toMatch(/shorts pressing/);
  });

  it("uses z-scores for exchange flows", () => {
    const [f] = buildRadar({ flows: { ...s, day: "2026-11-02", netflowUsd: 900e6, mean30: 0, sd30: 300e6 } });
    expect(f.severity).toBe(2);
    expect(f.tone).toBe("down");
  });

  it("marks extreme-sentiment crossings", () => {
    const [g] = buildRadar({ fearGreed: { ...s, now: 24, prev: 27, label: "Extreme Fear" } });
    expect(g.severity).toBe(1);
    expect(g.title).toMatch(/extreme fear/);
  });

  it("detects agent signal flips", () => {
    const items = buildRadar({ agent: { ...s, latest: { direction: "long", score: 0.4, confidence: 0.6, at: 0 }, prior: { direction: "flat", at: 0 }, decisions24h: [{ action: "open_long", summary: "Opened", at: 5 }, { action: "hold", summary: "x", at: 6 }] } }, 60_000);
    expect(items[0].severity).toBe(2);
    expect(items.filter((i) => i.category === "Agent")).toHaveLength(2);
  });
});

it("ignores fee multiples at trivially low fee levels", () => {
  expect(buildRadar({ fees: { ...s, fastestNow: 3, blockMedian24h: 1, recentBlockMedian: 1 } })[0].severity).toBe(0);
  expect(buildRadar({ fees: { ...s, fastestNow: 40, blockMedian24h: 8, recentBlockMedian: 30 } })[0].severity).toBe(2);
});

it("marks derived dominance as modeled", () => {
  expect(buildRadar({ dominance: { ...s, now: 59, ago24h: 58 } })[0].modeled).toBeTruthy();
});

it("oiRead quadrants", () => {
  expect(oiRead(5, 2)).toMatch(/new leverage/);
  expect(oiRead(-5, 2)).toMatch(/short covering/);
  expect(oiRead(-5, -2)).toMatch(/deleveraging/);
  expect(oiRead(0.5, -2)).toMatch(/unchanged/);
});
