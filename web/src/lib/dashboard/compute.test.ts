import { describe, expect, it } from "vitest";
import type { OnchainDay } from "@/lib/market/sources-pro";
import { computeOnchain, correlations, toCsv } from "./compute";

const day = (i: number, over: Partial<OnchainDay> = {}): OnchainDay => ({
  day: new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10),
  priceUsd: 100, marketCapUsd: 2000, mvrv: 2, supply: 20, issuanceUsd: 10, feesBtc: 1,
  activeAddresses: 1000, txCount: 500, exchangeInflowUsd: 50, exchangeOutflowUsd: 40, exchangeSupplyBtc: 3 - i * 0.001,
  ...over,
});

describe("computeOnchain", () => {
  const rows = Array.from({ length: 400 }, (_, i) => day(i));
  it("derives realized cap/price exactly from mcap and MVRV", () => {
    const s = computeOnchain(rows);
    expect(s.realizedCapUsd).toBe(1000);
    expect(s.realizedPriceUsd).toBe(50);
    expect(s.puell).toBeCloseTo(1);
    expect(s.feesUsd).toBe(100);
    expect(s.exchangeNetflowUsd).toBe(10);
    expect(s.exchangeNetflow30dSumUsd).toBe(300);
    expect(s.exchangeSupply30dChangeBtc).toBeCloseTo(-0.03);
    expect(s.series).toHaveLength(365);
  });
  it("skips a partial latest row for valuation", () => {
    const s = computeOnchain([...rows, day(400, { mvrv: null, marketCapUsd: null })]);
    expect(s.day).toBe(rows[399].day);
  });
  it("returns null puell without a year of data", () => {
    expect(computeOnchain(rows.slice(0, 100)).puell).toBeNull();
  });
});

it("correlations reports unavailable series honestly", () => {
  const btc = Array.from({ length: 100 }, (_, i) => ({ day: `2026-01-${String(i).padStart(3, "0")}`, value: 100 + Math.sin(i) }));
  const [a, b] = correlations(btc, [
    { id: "x", label: "X", source: "s", series: btc },
    { id: "y", label: "Y", source: "s", series: null, error: "down" },
  ]);
  expect(a.r30).toBeCloseTo(1);
  expect(a.n90).toBe(90);
  expect(b.ok).toBe(false);
  expect(b.r30).toBeNull();
});

it("toCsv escapes and blocks formula injection", () => {
  const csv = toCsv([{ panel: "p", metric: '=HYPERLINK("x")', value: -1.5, unit: "%", source: "a,b", asOf: "t" }]);
  expect(csv.split("\n")[1]).toBe(`p,"'=HYPERLINK(""x"")",-1.5,%,"a,b",t`);
});
