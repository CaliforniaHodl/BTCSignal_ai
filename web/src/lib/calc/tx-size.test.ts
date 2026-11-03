import { describe, expect, it } from "vitest";
import { feeCost, txVbytes, txWeight } from "./tx-size";

describe("txVbytes", () => {
  // Widely-cited reference sizes (e.g. bitcoinops.org size calculator)
  it("P2WPKH 1-in 2-out ≈ 141 vB", () => {
    expect(txVbytes({ inputs: 1, inputType: "p2wpkh", outputs: 2, outputType: "p2wpkh" })).toBe(141);
  });
  it("P2PKH 1-in 2-out = 226 vB", () => {
    expect(txVbytes({ inputs: 1, inputType: "p2pkh", outputs: 2, outputType: "p2pkh" })).toBe(226);
  });
  it("P2TR 1-in 2-out = 154 vB", () => {
    expect(txVbytes({ inputs: 1, inputType: "p2tr", outputs: 2, outputType: "p2tr" })).toBe(154);
  });
  it("P2SH-P2WPKH 1-in 2-out ≈ 166 vB", () => {
    expect(txVbytes({ inputs: 1, inputType: "p2sh-p2wpkh", outputs: 2, outputType: "p2sh-p2wpkh" })).toBe(166);
  });
  it("legacy has no witness discount", () => {
    expect(txWeight({ inputs: 2, inputType: "p2pkh", outputs: 1, outputType: "p2pkh" }) % 4).toBe(0);
  });
  it("uses 3-byte varint at 253+ inputs", () => {
    const a = txWeight({ inputs: 252, inputType: "p2pkh", outputs: 1, outputType: "p2pkh" });
    const b = txWeight({ inputs: 253, inputType: "p2pkh", outputs: 1, outputType: "p2pkh" });
    expect(b - a).toBe(148 * 4 + 2 * 4);
  });
  it("rejects bad counts", () => {
    expect(() => txVbytes({ inputs: 0, inputType: "p2wpkh", outputs: 1, outputType: "p2wpkh" })).toThrow();
    expect(() => txVbytes({ inputs: 1.5, inputType: "p2wpkh", outputs: 1, outputType: "p2wpkh" })).toThrow();
  });
});

describe("feeCost", () => {
  it("rounds sats up and converts to USD", () => {
    const c = feeCost(141, 2.5, 100_000);
    expect(c.sats).toBe(353);
    expect(c.usd).toBeCloseTo(0.353);
  });
  it("returns null USD without a price", () => {
    expect(feeCost(141, 1, null).usd).toBeNull();
  });
});
