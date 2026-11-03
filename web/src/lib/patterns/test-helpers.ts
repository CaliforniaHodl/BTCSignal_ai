import type { Candle } from "@/lib/market/types";

/** Linear legs between waypoints: legs([100, 120, 110], [20, 10]) → 31 closes. */
export function legs(points: number[], bars: number[] | number): number[] {
  const out = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const n = Array.isArray(bars) ? bars[k - 1] : bars;
    for (let j = 1; j <= n; j++) out.push(points[k - 1] + ((points[k] - points[k - 1]) * j) / n);
  }
  return out;
}

/** Candles from closes: open = previous close, wicks of ±`wick` beyond the body. */
export function fromCloses(closes: number[], { wick = 0.5, volume = (i: number) => 100 + 0 * i, t0 = 1_704_067_200, step = 3600 } = {}): Candle[] {
  return closes.map((c, i) => {
    const o = i === 0 ? c : closes[i - 1];
    return { time: t0 + i * step, open: o, high: Math.max(o, c) + wick, low: Math.min(o, c) - wick, close: c, volume: volume(i) };
  });
}

export const bar = (time: number, open: number, high: number, low: number, close: number, volume = 1): Candle => ({ time, open, high, low, close, volume });
