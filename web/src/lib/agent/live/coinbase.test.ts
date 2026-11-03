import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { assertWithinCap, placeOrder } from "./coinbase";

describe("live broker safety", () => {
  it("enforces the hard notional cap", () => {
    expect(assertWithinCap({ side: "BUY", type: "market", quoteUsd: 50 }, 100_000)).toBe(50);
    expect(() => assertWithinCap({ side: "BUY", type: "market", quoteUsd: 150 }, 100_000)).toThrow(/exceeds/);
    expect(() => assertWithinCap({ side: "SELL", type: "market", baseBtc: 0.002 }, 100_000)).toThrow(/exceeds/); // $200
    expect(() => assertWithinCap({ side: "BUY", type: "market", quoteUsd: 0 }, 100_000)).toThrow(/positive/);
  });
  it("refuses to place real orders unless LIVE_TRADING=1 and confirmLive", async () => {
    delete process.env.LIVE_TRADING;
    await expect(placeOrder({ side: "BUY", type: "market", quoteUsd: 5 }, 100_000, { confirmLive: true })).rejects.toThrow(/disabled/);
    process.env.LIVE_TRADING = "1";
    await expect(placeOrder({ side: "BUY", type: "market", quoteUsd: 5 }, 100_000, { confirmLive: false })).rejects.toThrow(/disabled/);
    delete process.env.LIVE_TRADING;
  });
});
