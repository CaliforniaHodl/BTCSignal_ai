/** Chart specs for detected structures (patterns, FVGs, order blocks, liquidity zones). Pure. */
import type { Candle } from "@/lib/market/types";
import type { Pattern } from "@/lib/patterns/chart-patterns";
import type { Fvg, OrderBlock } from "@/lib/patterns/smc";
import type { Sweep, Zone } from "@/lib/patterns/liquidity";
import { C, type ChartSpec, type LineOverlay } from "./spec";

const biasColor = (b: Pattern["bias"]) => (b === "bullish" ? C.up : b === "bearish" ? C.down : C.blue);

function seg(key: string, t0: number, v0: number, t1: number, v1: number, color: string, extra: Partial<LineOverlay> = {}): LineOverlay | null {
  if (t0 === t1) return null;
  const [a, b] = t0 < t1 ? [{ time: t0, value: v0 }, { time: t1, value: v1 }] : [{ time: t1, value: v1 }, { time: t0, value: v0 }];
  return { kind: "line", key, points: [a, b], color, width: 2, quiet: true, lastValue: false, ...extra };
}

export function patternSpec(candles: Candle[], patterns: Pattern[], selected: string | null): ChartSpec {
  const spec: ChartSpec = { overlays: [], levels: [], markers: [] };
  for (const p of patterns) {
    const focus = selected == null || selected === p.id;
    if (!focus) continue;
    const color = biasColor(p.bias);
    p.lines.forEach((l, i) => {
      const s = seg(`${p.id}-${i}`, l.from.time, l.from.price, l.to.time, l.to.price, color, { dashed: l.label === "Neckline" });
      if (s) spec.overlays.push(s);
    });
    for (const pv of p.pivots) {
      spec.markers.push({ time: pv.time, position: pv.kind === "high" ? "aboveBar" : "belowBar", shape: "circle", color, text: "" });
    }
    if (selected === p.id && p.measuredMove != null) spec.levels.push({ price: p.measuredMove, color, title: "measured move", dashed: true });
  }
  return spec;
}

export function smcSpec(candles: Candle[], fvgs: Fvg[], obs: OrderBlock[]): ChartSpec {
  const spec: ChartSpec = { overlays: [], levels: [], markers: [] };
  const end = candles[candles.length - 1]?.time;
  if (end == null) return spec;
  for (const g of fvgs) {
    const color = g.kind === "bullish" ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)";
    for (const [k, v] of [["t", g.top], ["b", g.bottom]] as const) {
      const s = seg(`${g.id}-${k}`, g.time, v, end, v, color, { width: 1, dashed: true });
      if (s) spec.overlays.push(s);
    }
  }
  for (const o of obs) {
    const color = o.kind === "bullish" ? C.teal : C.pink;
    for (const [k, v] of [["t", o.top], ["b", o.bottom]] as const) {
      const s = seg(`${o.id}-${k}`, o.time, v, end, v, color, { width: 1 });
      if (s) spec.overlays.push(s);
    }
    spec.markers.push({ time: o.time, position: o.kind === "bullish" ? "belowBar" : "aboveBar", shape: "square", color, text: "OB" });
  }
  return spec;
}

const ZONE_SHORT: Record<Zone["kind"], string> = {
  equal_highs: "EQH", equal_lows: "EQL", swing_high: "SH", swing_low: "SL", pdh: "PDH", pdl: "PDL", pwh: "PWH", pwl: "PWL",
};

export function liquiditySpec(candles: Candle[], zones: Zone[], sweeps: Sweep[]): ChartSpec {
  const spec: ChartSpec = { overlays: [], levels: [], markers: [] };
  const first = candles[0]?.time ?? 0;
  for (const z of zones) {
    const htf = z.kind === "pdh" || z.kind === "pdl" || z.kind === "pwh" || z.kind === "pwl";
    const color = htf ? C.yellow : z.side === "above" ? C.down : C.up;
    spec.levels.push({
      price: z.price,
      color: z.swept ? C.grey : color,
      title: `${ZONE_SHORT[z.kind]}${z.touches > 1 ? ` ×${z.touches}` : ""}${z.swept ? " (taken)" : ""}`,
      dashed: z.kind === "swing_high" || z.kind === "swing_low",
      width: z.touches >= 2 ? 2 : 1,
    });
  }
  for (const s of sweeps) {
    if (s.sweptTime < first) continue;
    spec.markers.push({
      time: s.sweptTime,
      position: s.kind === "equal_highs" ? "aboveBar" : "belowBar",
      shape: s.kind === "equal_highs" ? "arrowDown" : "arrowUp",
      color: C.yellow,
      text: s.reclaimed ? "sweep+reclaim" : "sweep",
    });
  }
  return spec;
}
