import { describe, expect, it } from "vitest";
import { detectPatterns, strength } from "./chart-patterns";
import { fitLine, zigzag } from "./pivots";
import { fairValueGaps, orderBlocks } from "./smc";
import { bar, fromCloses, legs } from "./test-helpers";

describe("pivots", () => {
  it("zigzag alternates highs and lows", () => {
    const cs = fromCloses(legs([100, 110, 104, 114, 108, 118, 112], 6));
    const z = zigzag(cs, 3);
    expect(z.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < z.length; i++) expect(z[i].kind).not.toBe(z[i - 1].kind);
    expect(z.filter((p) => p.kind === "high").map((p) => p.price)).toEqual([110.5, 114.5, 118.5]);
  });
  it("fitLine recovers an exact line", () => {
    const f = fitLine([{ index: 0, price: 1 }, { index: 10, price: 21 }, { index: 5, price: 11 }]);
    expect(f.slope).toBeCloseTo(2, 10);
    expect(f.at(3)).toBeCloseTo(7, 10);
    expect(f.maxResidual).toBeCloseTo(0, 10);
  });
});

describe("double top / bottom", () => {
  it("detects and confirms a double top on a neckline break", () => {
    const cs = fromCloses(legs([100, 120, 110, 120, 104], [20, 10, 10, 16]));
    const dt = detectPatterns(cs).filter((p) => p.kind === "double_top");
    expect(dt).toHaveLength(1);
    const p = dt[0];
    expect(p.bias).toBe("bearish");
    expect(p.status).toBe("confirmed");
    expect(p.pivots.map((x) => x.price)).toEqual([120.5, 109.5, 120.5]);
    expect(p.measuredMove).toBeCloseTo(109.5 - 11, 6);
    expect(p.criteria.find((c) => c.label.startsWith("Prior"))?.met).toBe(true);
  });
  it("leaves it forming while price holds above the neckline", () => {
    const cs = fromCloses(legs([100, 120, 110, 120, 114], [20, 10, 10, 6]));
    expect(detectPatterns(cs).find((p) => p.kind === "double_top")?.status).toBe("forming");
  });
  it("invalidates when price clears the peaks", () => {
    const cs = fromCloses(legs([100, 120, 110, 120, 116, 126], [20, 10, 10, 4, 8]));
    expect(detectPatterns(cs).find((p) => p.kind === "double_top")?.status).toBe("invalidated");
  });
  it("rejects peaks that are not equal", () => {
    const cs = fromCloses(legs([100, 120, 110, 127, 104], [20, 10, 10, 16]));
    expect(detectPatterns(cs).some((p) => p.kind === "double_top")).toBe(false);
  });
  it("detects a mirrored double bottom", () => {
    const cs = fromCloses(legs([120, 100, 110, 100, 116], [20, 10, 10, 16]));
    const p = detectPatterns(cs).find((x) => x.kind === "double_bottom");
    expect(p?.status).toBe("confirmed");
    expect(p?.bias).toBe("bullish");
  });
});

describe("trendline patterns", () => {
  it("ascending triangle: flat highs, rising lows", () => {
    const cs = fromCloses(legs([100, 120, 106, 120, 110, 120, 114, 120, 117, 119], 6));
    const p = detectPatterns(cs).find((x) => x.kind.includes("triangle"));
    expect(p?.kind).toBe("ascending_triangle");
    expect(p?.bias).toBe("bullish");
    expect(p?.status).toBe("forming");
    expect(strength(p!).total).toBe(5);
  });
  it("ascending triangle breaks up on a close above the flat top", () => {
    const cs = fromCloses(legs([100, 120, 106, 120, 110, 120, 114, 120, 117, 126], [6, 6, 6, 6, 6, 6, 6, 6, 6]));
    const p = detectPatterns(cs).find((x) => x.kind === "ascending_triangle");
    expect(p?.status).toBe("broke_up");
    expect(p?.measuredMove).not.toBeNull();
  });
  it("descending triangle: falling highs, flat lows", () => {
    const cs = fromCloses(legs([120, 100, 114, 100, 110, 100, 106, 100, 103, 101], 6));
    expect(detectPatterns(cs).find((x) => x.kind.includes("triangle"))?.kind).toBe("descending_triangle");
  });
  it("rising channel: parallel rising lines", () => {
    const cs = fromCloses(legs([100, 110, 104, 114, 108, 118, 112, 122, 116, 119], 6));
    expect(detectPatterns(cs).find((x) => x.kind.startsWith("channel"))?.kind).toBe("channel_up");
  });
  it("rising wedge: both rising, converging", () => {
    const cs = fromCloses(legs([96, 110, 100, 114, 105, 117, 109, 119, 112, 114], 6));
    const p = detectPatterns(cs).find((x) => x.kind.endsWith("wedge"));
    expect(p?.kind).toBe("rising_wedge");
    expect(p?.bias).toBe("bearish");
  });
  it("finds nothing on a straight line", () => {
    const cs = fromCloses(legs([100, 160], 80));
    expect(detectPatterns(cs)).toEqual([]);
  });
  it("is deterministic", () => {
    const cs = fromCloses(legs([100, 120, 106, 120, 110, 120, 114, 120, 117, 119], 6));
    expect(detectPatterns(cs)).toEqual(detectPatterns(cs));
  });
});

describe("fair-value gaps", () => {
  it("finds a bullish gap and tracks partial fill", () => {
    const cs = [bar(0, 9, 10, 8, 9.5), bar(1, 10, 14, 10, 13.5), bar(2, 13, 15, 12, 14), bar(3, 14, 14.5, 11, 12)];
    const g = fairValueGaps(cs);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ kind: "bullish", top: 12, bottom: 10, status: "partial", index: 1 });
    expect(g[0].filled).toBeCloseTo(0.5, 10);
  });
  it("marks a bearish gap filled when price trades back through it", () => {
    const cs = [bar(0, 20, 21, 18, 19), bar(1, 19, 19, 14, 14.5), bar(2, 15, 16, 13, 13.5), bar(3, 14, 18.5, 13, 18)];
    const g = fairValueGaps(cs);
    expect(g[0]).toMatchObject({ kind: "bearish", top: 18, bottom: 16, status: "filled", filledIndex: 3 });
  });
});

describe("order blocks", () => {
  it("marks the last down candle before a displacement through a swing high", () => {
    // swing high at bar 3 (105), pullback, last red candle at 8, then displacement.
    const closes = [100, 102, 104, 104.5, 103, 102, 101, 100.5];
    const cs = closes.map((c, i) => bar(i, c - 0.3, i === 3 ? 105 : c + 0.5, c - 1, c));
    cs.push(bar(8, 100.5, 100.8, 99, 99.5)); // red OB candle
    cs.push(bar(9, 99.5, 107, 99.4, 106.8)); // displacement
    cs.push(bar(10, 106.8, 108, 102, 107.5)); // leaves FVG (low 102 > 100.8)
    cs.push(bar(11, 107.5, 108.5, 106, 108));
    const ob = orderBlocks(cs, { lookback: 3 });
    expect(ob).toHaveLength(1);
    expect(ob[0]).toMatchObject({ kind: "bullish", index: 8, top: 100.8, bottom: 99, brokeLevel: 105, status: "fresh" });
  });
});
