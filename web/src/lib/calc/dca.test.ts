import { describe, expect, it } from "vitest";
import { schedule, simulateDca, type DailyPrice } from "./dca";

const DAY = 86400;
const T0 = Date.UTC(2024, 0, 1) / 1000;
const days = (closes: number[]): DailyPrice[] => closes.map((c, i) => [T0 + i * DAY, c]);

describe("schedule", () => {
  it("weekly steps 7 days", () => {
    expect(schedule(T0, T0 + 20 * DAY, "weekly")).toEqual([T0, T0 + 7 * DAY, T0 + 14 * DAY]);
  });
  it("monthly clamps the 31st", () => {
    const jan31 = Date.UTC(2024, 0, 31) / 1000;
    const s = schedule(jan31, Date.UTC(2024, 3, 30) / 1000, "monthly").map((t) => new Date(t * 1000).toISOString().slice(0, 10));
    expect(s).toEqual(["2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30"]);
  });
  it("empty when end < start", () => {
    expect(schedule(T0 + DAY, T0, "daily")).toEqual([]);
  });
});

describe("simulateDca", () => {
  it("daily DCA averages cost; lump sum buys at the start", () => {
    const r = simulateDca({ prices: days([100, 200, 400]), start: T0, end: T0 + 2 * DAY, amountUsd: 100, frequency: "daily", feePct: 0 });
    expect(r.buys).toHaveLength(3);
    expect(r.dca.invested).toBe(300);
    expect(r.dca.btc).toBeCloseTo(1 + 0.5 + 0.25);
    expect(r.dca.value).toBeCloseTo(700);
    expect(r.dca.avgCost).toBeCloseTo(300 / 1.75);
    expect(r.lump.btc).toBeCloseTo(3);
    expect(r.lump.value).toBeCloseTo(1200);
    expect(r.lump.returnPct).toBeCloseTo(300);
    expect(r.series.at(-1)).toEqual({ time: T0 + 2 * DAY, invested: 300, dcaValue: 700, lumpValue: 1200 });
  });

  it("applies fee to each purchase", () => {
    const r = simulateDca({ prices: days([100, 100]), start: T0, end: T0 + DAY, amountUsd: 100, frequency: "daily", feePct: 1 });
    expect(r.dca.btc).toBeCloseTo(1.98);
    expect(r.dca.fees).toBeCloseTo(2);
    expect(r.dca.returnPct).toBeCloseTo(-1);
  });

  it("buys on the next available day across gaps without double-buying", () => {
    const prices: DailyPrice[] = [[T0, 100], [T0 + 3 * DAY, 200]];
    const r = simulateDca({ prices, start: T0, end: T0 + 3 * DAY, amountUsd: 10, frequency: "daily", feePct: 0 });
    expect(r.buys.map((b) => b.time)).toEqual([T0, T0 + 3 * DAY]);
  });

  it("throws on empty range or bad inputs", () => {
    expect(() => simulateDca({ prices: days([1]), start: T0 + 10 * DAY, end: T0 + 11 * DAY, amountUsd: 1, frequency: "daily", feePct: 0 })).toThrow();
    expect(() => simulateDca({ prices: days([1]), start: T0, end: T0, amountUsd: 0, frequency: "daily", feePct: 0 })).toThrow();
  });
});
