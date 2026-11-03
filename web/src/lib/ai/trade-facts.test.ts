import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/types";
import { computeTradeFacts, validateTrade, type TradeInput } from "./trade-facts";

const cfg = { makerFee: 0.005, takerFee: 0.009, slippage: 0.0005 } as Parameters<typeof computeTradeFacts>[2];
const base: TradeInput = { side: "long", entry: 100_000, stop: 98_000, target: 106_000, sizeUsd: 10_000, accountUsd: 50_000, timeframe: "4h", thesis: "" };
const empty = { candles: null, daily: null, price: null, funding8h: null, fearGreed: null };

// Oscillating candles with a constant 1,000 true range → ATR = 1000; swings near 99k/101k.
const candles: Candle[] = Array.from({ length: 60 }, (_, i) => {
  const mid = i % 8 < 4 ? 100_000 + (i % 4) * 250 : 100_750 - (i % 4) * 250;
  return { time: i * 14400, open: mid, high: mid + 500, low: mid - 500, close: mid, volume: 1 };
});

describe("validateTrade", () => {
  it("rejects stops/targets on the wrong side", () => {
    expect(validateTrade({ ...base, stop: 101_000 })).toMatch(/below/);
    expect(validateTrade({ ...base, target: 99_000 })).toMatch(/above/);
    expect(validateTrade({ ...base, side: "short", stop: 99_000 })).toMatch(/above/);
    expect(validateTrade(base)).toBeNull();
  });
});

describe("computeTradeFacts", () => {
  it("computes R:R, fee drag and sizing from Coinbase fees", () => {
    const f = computeTradeFacts(base, empty, cfg);
    expect(f.rr).toBeCloseTo(3);
    expect(f.riskPct).toBeCloseTo(2);
    expect(f.fees.roundTripStopPct).toBeCloseTo(0.9 * 2 + 0.05 * 2);
    expect(f.fees.roundTripTargetPct).toBeCloseTo(0.9 + 0.5 + 0.05);
    expect(f.fees.netRr).toBeCloseTo((6 - 1.45) / (2 + 1.9));
    expect(f.sizing!.qtyBtc).toBeCloseTo(0.1);
    expect(f.sizing!.lossAtStopUsd).toBeCloseTo(200 + 190);
    expect(f.sizing!.accountRiskPct).toBeCloseTo((390 / 50_000) * 100);
    expect(f.flags.join(" ")).toMatch(/Fees and slippage cut R:R/);
  });

  it("measures the stop in ATR and flags tight stops", () => {
    const f = computeTradeFacts({ ...base, stop: 99_500 }, { ...empty, candles, price: 100_000 }, cfg);
    expect(f.atr).toBeCloseTo(1000, -1);
    expect(f.stopAtr).toBeCloseTo(0.5, 1);
    expect(f.flags.join(" ")).toMatch(/inside normal 4h noise/);
    expect(f.entryVsPricePct).toBeCloseTo(0);
  });

  it("flags missing target, crowded funding and shorts on spot", () => {
    const f = computeTradeFacts({ ...base, target: null }, { ...empty, funding8h: 0.0005 }, cfg);
    expect(f.rr).toBeNull();
    expect(f.flags.join(" ")).toMatch(/No target/);
    expect(f.flags.join(" ")).toMatch(/longs are crowded/);
    const s = computeTradeFacts({ ...base, side: "short", stop: 102_000, target: 94_000 }, empty, cfg);
    expect(s.flags.join(" ")).toMatch(/can't short/);
  });
});
