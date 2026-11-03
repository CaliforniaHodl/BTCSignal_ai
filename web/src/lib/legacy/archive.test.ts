import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { mergeLedger, recheckCall, summariseRecheck, summariseRecorded, type LegacyCall } from "./archive";

const call = (o: Partial<LegacyCall> = {}): LegacyCall => ({
  date: "2025-12-07T17:00:48.409Z", direction: "up", confidence: 70, price: 100, targetPrice: 102, stopLoss: 99,
  callResult: "win", excludeFromStats: false, archiveNote: null, ...o,
});

const H0 = Math.floor(new Date("2025-12-07T17:00:00Z").getTime() / 1000);
const bar = (i: number, o: number, h: number, l: number, c: number): Candle => ({ time: H0 + i * 3600, open: o, high: h, low: l, close: c, volume: 1 });
const flat = (from: number, to: number, px = 100) => Array.from({ length: to - from }, (_, k) => bar(from + k, px, px + 0.5, px - 0.5, px));

describe("summariseRecorded", () => {
  it("excludes flagged posts and unresolved calls from hit rate", () => {
    const s = summariseRecorded([
      call(), call({ callResult: "loss" }), call({ direction: "down", callResult: "win" }),
      call({ callResult: null }), call({ excludeFromStats: true, callResult: "win" }),
    ]);
    expect(s.total).toBe(5);
    expect(s.excluded).toBe(1);
    expect(s.unresolved).toBe(1);
    expect(s.all).toEqual({ wins: 2, losses: 1, hitRatePct: (2 / 3) * 100 });
    expect(s.up.wins).toBe(1);
    expect(s.down.hitRatePct).toBe(100);
  });
  it("gives null hit rate with no resolved calls", () => {
    expect(summariseRecorded([]).all.hitRatePct).toBeNull();
  });
});

describe("mergeLedger", () => {
  it("matches on exact timestamp and converts confidence to percent", () => {
    const [a, b] = mergeLedger([call(), call({ date: "2025-12-08T17:00:00Z" })], [
      { date: "2025-12-07T17:00:48.409Z", confidence: 0.6, actualResult: "loss", pnlPercent: -0.59 },
    ]);
    expect(a.ledger).toEqual({ confidencePct: 60, result: "loss", pnlPct: -0.59 });
    expect(b.ledger).toBeNull();
  });
});

describe("recheckCall", () => {
  it("reports no-data when candles are missing", () => {
    expect(recheckCall(call(), []).status).toBe("no-data");
  });
  it("flags a recorded price far from the market", () => {
    const r = recheckCall(call({ price: 110, targetPrice: 112, stopLoss: 109 }), [bar(0, 100, 101, 99, 100), ...flat(1, 26)]);
    expect(r.status).toBe("price-mismatch");
  });
  it("finds the target when it is hit first, ignoring the entry hour", () => {
    // entry-hour bar spikes through target: must NOT count (look-ahead)
    const candles = [bar(0, 100, 103, 99.5, 100), ...flat(1, 5), bar(5, 100, 102.5, 99.5, 102), ...flat(6, 26, 102)];
    const r = recheckCall(call(), candles);
    expect(r).toMatchObject({ status: "target", exitPrice: 102 });
    if ("returnPct" in r) expect(r.returnPct).toBeCloseTo(2);
  });
  it("stop wins when both are touched in the same bar; shorts are mirrored", () => {
    const r = recheckCall(call({ direction: "down", targetPrice: 98, stopLoss: 101 }), [bar(0, 100, 100, 100, 100), bar(1, 100, 101.5, 97, 99), ...flat(2, 26)]);
    expect(r).toMatchObject({ status: "stop", exitPrice: 101 });
    if ("returnPct" in r) expect(r.returnPct).toBeCloseTo(-1);
  });
  it("marks to the last close when neither level is hit in 24h", () => {
    const r = recheckCall(call(), [bar(0, 100, 100, 100, 100), ...flat(1, 24), bar(24, 100, 100.6, 100, 100.5), ...flat(25, 30, 90)]);
    expect(r).toMatchObject({ status: "neither", exitPrice: 100.5 });
  });
});

describe("summariseRecheck", () => {
  it("counts outcomes and rates", () => {
    const s = summariseRecheck([
      { status: "target", exitPrice: 1, returnPct: 2, hitAt: 1 },
      { status: "stop", exitPrice: 1, returnPct: -1, hitAt: 1 },
      { status: "neither", exitPrice: 1, returnPct: 0.5, hitAt: null },
      { status: "price-mismatch", marketClose: 1, diffPct: 9 },
      { status: "no-data" },
    ]);
    expect(s).toMatchObject({ checked: 3, targets: 1, stops: 1, neither: 1, mismatched: 1, noData: 1, targetRatePct: 50 });
    expect(s.positivePct).toBeCloseTo((2 / 3) * 100);
    expect(s.avgReturnPct).toBeCloseTo(0.5);
  });
});
