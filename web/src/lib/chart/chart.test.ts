import { describe, expect, it } from "vitest";
import { fromCloses, legs } from "@/lib/patterns/test-helpers";
import { indicatorSpec, INDICATORS } from "./indicator-overlays";
import { technicalRead } from "./read";
import { drawingsSpec, parseDrawings, type Drawings } from "./drawings";

const cs = fromCloses(legs([100, 140, 120, 160, 130], 60));

describe("indicatorSpec", () => {
  it("builds every indicator with sorted, finite points", () => {
    const spec = indicatorSpec(cs, INDICATORS.map((d) => d.id));
    expect(spec.overlays.length).toBeGreaterThan(20);
    for (const o of spec.overlays) {
      expect(o.points.length).toBeGreaterThan(0);
      for (let i = 0; i < o.points.length; i++) {
        expect(Number.isFinite(o.points[i].value)).toBe(true);
        if (i) expect(o.points[i].time).toBeGreaterThan(o.points[i - 1].time);
      }
    }
  });
  it("puts oscillators in named panes and overlays on price", () => {
    const spec = indicatorSpec(cs, ["ema20", "rsi", "macd"]);
    expect(spec.overlays.find((o) => o.key === "ema20")?.pane).toBeUndefined();
    expect(spec.overlays.find((o) => o.key === "rsi")?.pane).toBe("rsi");
    expect(spec.overlays.filter((o) => o.pane === "macd")).toHaveLength(3);
    expect(Object.keys(spec.paneHeights!)).toEqual(["rsi", "macd"]);
  });
  it("is empty for no candles", () => {
    expect(indicatorSpec([], ["ema20"]).overlays).toEqual([]);
  });
});

describe("technicalRead", () => {
  it("describes a falling market as down-trending below short EMAs", () => {
    const r = technicalRead(fromCloses(legs([200, 100], 120)))!;
    expect(r.emaTrend).toBe("down");
    expect(r.rsiZone).toBe("oversold");
    expect(r.macdHist).not.toBeNull();
  });
});

describe("drawings", () => {
  it("parses only well-formed drawings from storage", () => {
    const raw = JSON.stringify({ hlines: [{ id: "a", price: 100 }, { id: "b", price: "x" }], trends: [{ id: "t", a: { time: 1, price: 2 }, b: { time: 3, price: 4 } }, { id: "bad" }] });
    const d = parseDrawings(raw);
    expect(d.hlines).toHaveLength(1);
    expect(d.trends).toHaveLength(1);
    expect(parseDrawings("not json")).toEqual({ hlines: [], trends: [] });
    expect(parseDrawings(null)).toEqual({ hlines: [], trends: [] });
  });
  it("orders trendline points by time for the chart", () => {
    const d: Drawings = { hlines: [{ id: "h", price: 5 }], trends: [{ id: "t", a: { time: 9, price: 1 }, b: { time: 3, price: 2 } }] };
    const s = drawingsSpec(d);
    expect(s.levels).toHaveLength(1);
    expect(s.overlays[0].points.map((p) => p.time)).toEqual([3, 9]);
  });
});
