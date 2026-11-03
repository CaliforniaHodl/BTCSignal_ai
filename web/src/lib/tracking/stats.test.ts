import { describe, expect, it } from "vitest";
import { signalStats, tradeStats, type SignalRow } from "./stats";

const s = (o: Partial<SignalRow>): SignalRow => ({ direction: "long", confidence: 0.5, outcome: "target", returnPct: 1, directionCorrect: true, ...o });

describe("signalStats", () => {
  it("splits by direction and confidence, ignoring flat and pending", () => {
    const st = signalStats([
      s({}),
      s({ confidence: 0.3, outcome: "stop", returnPct: -1, directionCorrect: false }),
      s({ direction: "short", confidence: 0.75, outcome: "expired", returnPct: 0.4, directionCorrect: true }),
      s({ outcome: null, returnPct: null, directionCorrect: null }),
      s({ direction: "flat", outcome: "n/a", returnPct: null, directionCorrect: null }),
    ]);
    expect(st.total).toBe(5);
    expect(st.flat).toBe(1);
    expect(st.pending).toBe(1);
    expect(st.outcomes).toEqual({ target: 1, stop: 1, expired: 1 });
    expect(st.overall).toMatchObject({ resolved: 3, correct: 2 });
    expect(st.overall.avgReturnPct).toBeCloseTo(0.4 / 3);
    expect(st.byDirection[0]).toMatchObject({ label: "Long", resolved: 2, hitRatePct: 50 });
    expect(st.byDirection[1]).toMatchObject({ label: "Short", resolved: 1, hitRatePct: 100 });
    expect(st.byConfidence.map((b) => b.resolved)).toEqual([1, 1, 0, 1]);
    expect(st.byConfidence[2].hitRatePct).toBeNull();
  });
  it("is all-null on no data", () => {
    const st = signalStats([]);
    expect(st.overall.hitRatePct).toBeNull();
    expect(st.overall.avgReturnPct).toBeNull();
  });
});

describe("tradeStats", () => {
  it("computes net P&L, profit factor and a cumulative curve in close order", () => {
    const st = tradeStats([
      { closedAt: new Date("2026-01-02T00:00:00Z"), pnlUsd: -50, feesUsd: 5 },
      { closedAt: new Date("2026-01-01T00:00:00Z"), pnlUsd: 150, feesUsd: 6 },
      { closedAt: null, pnlUsd: null, feesUsd: 3 },
    ], 10_000);
    expect(st).toMatchObject({ trades: 2, wins: 1, losses: 1, winRatePct: 50, netPnlUsd: 100, feesUsd: 11, profitFactor: 3, best: 150, worst: -50 });
    expect(st.netPnlPct).toBeCloseTo(1);
    expect(st.curve.map((p) => p.cumPnlUsd)).toEqual([150, 100]);
  });
  it("has no profit factor without losses", () => {
    expect(tradeStats([], 10_000).profitFactor).toBeNull();
    expect(tradeStats([{ closedAt: new Date(), pnlUsd: 10, feesUsd: 1 }], 10_000).profitFactor).toBeNull();
  });
});
