import { swings } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";

export type Pivot = { index: number; time: number; price: number; kind: "high" | "low" };

/**
 * Alternating swing pivots (a zig-zag) built from `swings()`. When two pivots of the
 * same kind are adjacent, the more extreme one is kept, so highs and lows alternate.
 */
export function zigzag(candles: Candle[], lookback = 3): Pivot[] {
  const { highs, lows } = swings(candles, lookback);
  const all: Pivot[] = [
    ...highs.map((p) => ({ ...p, kind: "high" as const })),
    ...lows.map((p) => ({ ...p, kind: "low" as const })),
  ].sort((a, b) => a.index - b.index || (a.kind === "high" ? -1 : 1));
  const out: Pivot[] = [];
  for (const p of all) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === p.kind) {
      const better = p.kind === "high" ? p.price > prev.price : p.price < prev.price;
      if (better) out[out.length - 1] = p;
    } else out.push(p);
  }
  return out;
}

/** Least-squares line through points (x = bar index). */
export function fitLine(points: { index: number; price: number }[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.index, 0) / n;
  const my = points.reduce((s, p) => s + p.price, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.index - mx) * (p.price - my);
    den += (p.index - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  const at = (x: number) => intercept + slope * x;
  const maxResidual = Math.max(...points.map((p) => Math.abs(p.price - at(p.index))));
  return { slope, intercept, at, maxResidual };
}
