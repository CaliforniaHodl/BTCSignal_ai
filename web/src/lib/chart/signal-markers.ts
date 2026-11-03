import type { Candle } from "@/lib/market/types";
import { C, type Marker } from "./spec";

export type SignalMarker = {
  /** unix seconds */
  time: number;
  direction: "long" | "short";
  price: number;
  confidence: number;
  outcome: string | null;
  directionCorrect: boolean | null;
};

/**
 * Snap each signal to the candle whose interval contains it; keep the latest
 * signal per candle so lower timeframes don't stack markers.
 */
export function signalChartMarkers(candles: Candle[], signals: SignalMarker[]): Marker[] {
  if (candles.length === 0) return [];
  const step = candles.length > 1 ? candles[1].time - candles[0].time : 3600;
  const first = candles[0].time;
  const end = candles[candles.length - 1].time + step;
  const byBar = new Map<number, SignalMarker>();
  for (const s of signals) {
    if (s.time < first || s.time >= end) continue;
    // binary search for the last candle with time <= s.time
    let lo = 0, hi = candles.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (candles[mid].time <= s.time) lo = mid;
      else hi = mid - 1;
    }
    const t = candles[lo].time;
    const prev = byBar.get(t);
    if (!prev || prev.time < s.time) byBar.set(t, s);
  }
  return [...byBar.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, s]) => ({
      time,
      position: s.direction === "long" ? "belowBar" : "aboveBar",
      shape: s.direction === "long" ? "arrowUp" : "arrowDown",
      color: s.direction === "long" ? C.up : C.down,
      // Confidence is the engine's factor-agreement score (0..1), not a win probability.
      text: `${s.direction === "long" ? "L" : "S"} ${s.confidence.toFixed(2)}${s.directionCorrect == null ? "" : s.directionCorrect ? " ✓" : " ✗"}`,
    }));
}
