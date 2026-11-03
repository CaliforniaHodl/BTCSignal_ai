import { describe, expect, it } from "vitest";
import { formatBtc, fromSats, parseAmount, toSats } from "./sats";

describe("sats", () => {
  it("parses user input", () => {
    expect(parseAmount("1,234.5")).toBe(1234.5);
    expect(parseAmount(" .5 ")).toBe(0.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("1e3")).toBeNull();
    expect(parseAmount(".")).toBeNull();
  });
  it("converts units to sats", () => {
    expect(toSats(1, "btc", 0)).toBe(100_000_000);
    expect(toSats(0.00000001, "btc", 0)).toBe(1);
    expect(toSats(50_000, "fiat", 100_000)).toBe(50_000_000);
    expect(() => toSats(1, "fiat", 0)).toThrow();
  });
  it("converts sats back", () => {
    expect(fromSats(21_000, 100_000)).toEqual({ sats: 21_000, btc: 0.00021, fiat: 21 });
  });
  it("formats BTC without exponent", () => {
    expect(formatBtc(0.00000001)).toBe("0.00000001");
    expect(formatBtc(1.5)).toBe("1.5");
    expect(formatBtc(0)).toBe("0");
  });
});
