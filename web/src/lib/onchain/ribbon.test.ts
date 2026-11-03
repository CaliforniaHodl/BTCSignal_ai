import { describe, expect, it } from "vitest";
import { analyzeRibbon, dailyDifficulty, episodes, hashRibbon, percentileRank } from "./ribbon";

const DAY = 86400;

describe("dailyDifficulty", () => {
  it("steps exactly at retargets", () => {
    const epochs = [{ time: 0, difficulty: 1 }, { time: 2 * DAY + 3600, difficulty: 2 }];
    expect(dailyDifficulty(epochs, 4 * DAY).map((d) => d.difficulty)).toEqual([1, 1, 2, 2, 2]);
  });
  it("handles empty input", () => {
    expect(dailyDifficulty([], 10)).toEqual([]);
  });
});

describe("episodes", () => {
  it("finds runs and marks an open final run", () => {
    const t = [0, 1, 2, 3, 4, 5].map((x) => x * DAY);
    expect(episodes(t, [false, true, true, false, true, true])).toEqual([
      { start: DAY, end: 2 * DAY, days: 2 },
      { start: 4 * DAY, end: null, days: 2 },
    ]);
  });
  it("drops runs shorter than minDays and ignores null", () => {
    expect(episodes([0, 1, 2], [true, null, true], 2)).toEqual([]);
  });
});

describe("percentileRank", () => {
  it("ranks", () => {
    expect(percentileRank([1, 2, 3, 4], 2)).toBe(25);
  });
});

describe("analyzeRibbon", () => {
  const n = 400;
  const mk = (f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ time: i * DAY, difficulty: f(i) }));

  it("rising difficulty → short SMA above long, not inverted", () => {
    const r = analyzeRibbon(mk((i) => 100 + i), 0);
    expect(r.latest?.state).not.toBe("inverted");
    expect(r.latest!.shortVsLongPct).toBeGreaterThan(0);
    expect(r.latest!.smas).toHaveLength(8);
  });
  it("falling difficulty after a rise → inverted episode", () => {
    const r = analyzeRibbon(mk((i) => (i < 300 ? 100 + i : 400 - (i - 300) * 3)), 0);
    expect(r.latest?.state).toBe("inverted");
    expect(r.inversions.at(-1)?.end).toBeNull();
  });
  it("flat difficulty → zero width, compressed", () => {
    const r = analyzeRibbon(mk(() => 5), 0);
    expect(r.latest?.widthPct).toBe(0);
    expect(r.latest?.state).toBe("compressed");
  });
  it("null latest during warm-up", () => {
    expect(analyzeRibbon(mk(() => 5).slice(0, 50)).latest).toBeNull();
  });
});

describe("hashRibbon", () => {
  it("flags capitulation when 30d SMA drops under 60d", () => {
    const t = Array.from({ length: 120 }, (_, i) => i * DAY);
    const hr = t.map((_, i) => (i < 90 ? 100 : 50));
    const r = hashRibbon(t, hr);
    expect(r.latest?.capitulation).toBe(true);
    expect(r.latest?.daysSinceCross).toBeGreaterThan(0);
    expect(r.capitulations).toHaveLength(1);
  });
});
