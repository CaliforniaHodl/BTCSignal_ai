/**
 * Deterministic classical chart-pattern detection from swing pivots.
 * Every detection lists which textbook criteria it meets; there is no
 * probability or accuracy figure, because we have not measured one.
 */
import { atr, last } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";
import { fitLine, zigzag, type Pivot } from "./pivots";

export type PatternKind =
  | "double_top"
  | "double_bottom"
  | "ascending_triangle"
  | "descending_triangle"
  | "symmetrical_triangle"
  | "rising_wedge"
  | "falling_wedge"
  | "channel_up"
  | "channel_down"
  | "range";

export type PatternStatus = "forming" | "confirmed" | "invalidated" | "broke_up" | "broke_down";

export type Anchor = { index: number; time: number; price: number };
export type PatternLine = { label: string; from: Anchor; to: Anchor };

export type Pattern = {
  id: string;
  kind: PatternKind;
  name: string;
  bias: "bullish" | "bearish" | "neutral";
  status: PatternStatus;
  /** Bar index of the event that set `status` (break/confirmation), if any. */
  statusIndex: number | null;
  startIndex: number;
  endIndex: number;
  lines: PatternLine[];
  pivots: Pivot[];
  criteria: { label: string; met: boolean }[];
  /** Textbook measured-move objective. A convention, not a forecast. */
  measuredMove: number | null;
};

export const PATTERN_NAMES: Record<PatternKind, string> = {
  double_top: "Double top",
  double_bottom: "Double bottom",
  ascending_triangle: "Ascending triangle",
  descending_triangle: "Descending triangle",
  symmetrical_triangle: "Symmetrical triangle",
  rising_wedge: "Rising wedge",
  falling_wedge: "Falling wedge",
  channel_up: "Rising channel",
  channel_down: "Falling channel",
  range: "Horizontal range",
};

export type DetectOptions = {
  /** Swing lookback (bars each side). */
  lookback?: number;
  /** Peaks/troughs count as "equal" within this many ATRs. */
  equalTolAtr?: number;
  /** Minimum depth between the two peaks of a double top/bottom, in ATRs. */
  minDepthAtr?: number;
  /** Minimum bars between the two peaks. */
  minSeparation?: number;
  /** Pivots must sit within this many ATRs of a fitted trendline. */
  fitTolAtr?: number;
  /** Trendline patterns: only use pivots from the last N bars. */
  windowBars?: number;
};

const DEFAULTS: Required<DetectOptions> = {
  lookback: 3,
  equalTolAtr: 0.75,
  minDepthAtr: 2,
  minSeparation: 6,
  fitTolAtr: 0.6,
  windowBars: 120,
};

export function detectPatterns(candles: Candle[], opts: DetectOptions = {}): Pattern[] {
  const o = { ...DEFAULTS, ...opts };
  if (candles.length < 30) return [];
  const a = atr(candles, 14);
  const atrNow = last(a);
  if (atrNow == null || atrNow <= 0) return [];
  const atrAt = (i: number) => a[i] ?? atrNow;
  const pivots = zigzag(candles, o.lookback);
  return [
    ...doubles(candles, pivots, atrAt, o),
    ...trendlinePattern(candles, pivots, atrAt, o),
  ].sort((x, y) => y.endIndex - x.endIndex);
}

const anchor = (c: Candle[], index: number, price: number): Anchor => ({ index, time: c[index].time, price });

function doubles(candles: Candle[], pv: Pivot[], atrAt: (i: number) => number, o: Required<DetectOptions>): Pattern[] {
  const out: Pattern[] = [];
  for (let j = 2; j < pv.length; j++) {
    const [p1, mid, p2] = [pv[j - 2], pv[j - 1], pv[j]];
    if (p1.kind !== p2.kind || mid.kind === p1.kind) continue;
    const top = p1.kind === "high";
    const atrV = atrAt(p2.index);
    const tol = o.equalTolAtr * atrV;
    if (Math.abs(p1.price - p2.price) > tol) continue;
    if (p2.index - p1.index < o.minSeparation) continue;
    const extreme = top ? Math.max(p1.price, p2.price) : Math.min(p1.price, p2.price);
    const inner = top ? Math.min(p1.price, p2.price) : Math.max(p1.price, p2.price);
    const depth = top ? inner - mid.price : mid.price - inner;
    if (depth < o.minDepthAtr * atrV) continue;
    // No bar between the peaks may exceed them (the swing lookback can miss these).
    const between = candles.slice(p1.index + 1, p2.index);
    if (between.some((c) => (top ? c.high > extreme : c.low < extreme))) continue;

    const neck = mid.price;
    let status: PatternStatus = "forming";
    let statusIndex: number | null = null;
    for (let i = p2.index + 1; i < candles.length; i++) {
      const c = candles[i];
      if (top ? c.close < neck : c.close > neck) {
        status = "confirmed";
        statusIndex = i;
        break;
      }
      if (top ? c.high > extreme + tol : c.low < extreme - tol) {
        status = "invalidated";
        statusIndex = i;
        break;
      }
    }

    const volNear = (i: number) => {
      const w = candles.slice(Math.max(0, i - 1), i + 2);
      return w.reduce((s, c) => s + c.volume, 0) / w.length;
    };
    const priorIdx = p1.index - 20;
    const priorTrend =
      priorIdx >= 0 ? (top ? candles[priorIdx].close < p1.price - depth / 2 : candles[priorIdx].close > p1.price + depth / 2) : false;
    const lastIdx = statusIndex ?? candles.length - 1;
    out.push({
      id: `${top ? "dt" : "db"}-${p1.time}-${p2.time}`,
      kind: top ? "double_top" : "double_bottom",
      name: PATTERN_NAMES[top ? "double_top" : "double_bottom"],
      bias: top ? "bearish" : "bullish",
      status,
      statusIndex,
      startIndex: p1.index,
      endIndex: p2.index,
      pivots: [p1, mid, p2],
      lines: [
        { label: top ? "Peaks" : "Troughs", from: anchor(candles, p1.index, p1.price), to: anchor(candles, p2.index, p2.price) },
        { label: "Neckline", from: anchor(candles, mid.index, neck), to: anchor(candles, lastIdx, neck) },
      ],
      criteria: [
        { label: `${top ? "Peaks" : "Troughs"} within ${o.equalTolAtr} ATR of each other`, met: true },
        { label: `Pullback between them ≥ ${o.minDepthAtr} ATR`, met: true },
        { label: `Prior ${top ? "up" : "down"}trend into the first ${top ? "peak" : "trough"}`, met: priorTrend },
        { label: `Lighter volume on the second ${top ? "peak" : "trough"}`, met: volNear(p2.index) < volNear(p1.index) },
        { label: "Neckline broken on a close", met: status === "confirmed" },
      ],
      measuredMove: top ? neck - (inner - neck) : neck + (neck - inner),
    });
  }
  return out;
}

/** Triangles, wedges, channels and ranges from the most recent pivots. */
function trendlinePattern(candles: Candle[], pv: Pivot[], atrAt: (i: number) => number, o: Required<DetectOptions>): Pattern[] {
  const n = candles.length;
  const recent = pv.filter((p) => p.index >= n - o.windowBars);
  for (const k of [4, 3, 2]) {
    const highs = recent.filter((p) => p.kind === "high").slice(-k);
    const lows = recent.filter((p) => p.kind === "low").slice(-k);
    if (highs.length < 2 || lows.length < 2) continue;
    if (highs.length !== k && lows.length !== k) continue;
    const p = fitTrendlines(candles, highs, lows, atrAt, o);
    if (p) return [p];
  }
  return [];
}

function fitTrendlines(
  candles: Candle[],
  highs: Pivot[],
  lows: Pivot[],
  atrAt: (i: number) => number,
  o: Required<DetectOptions>
): Pattern | null {
  const start = Math.min(highs[0].index, lows[0].index);
  const end = Math.max(highs[highs.length - 1].index, lows[lows.length - 1].index);
  // Highs and lows must interleave, otherwise it's two separate moves.
  if (highs[0].index > lows[lows.length - 1].index || lows[0].index > highs[highs.length - 1].index) return null;
  const span = end - start;
  if (span < 10) return null;
  const atrV = atrAt(end);
  const up = fitLine(highs);
  const lo = fitLine(lows);
  if (up.maxResidual > o.fitTolAtr * atrV || lo.maxResidual > o.fitTolAtr * atrV) return null;
  const w0 = up.at(start) - lo.at(start);
  const w1 = up.at(end) - lo.at(end);
  if (w0 <= 0 || w1 <= 0) return null;
  // Price must have respected the lines between the first and last pivot.
  const slack = 0.5 * atrV;
  for (let i = start; i <= end; i++) {
    const c = candles[i].close;
    if (c > up.at(i) + slack || c < lo.at(i) - slack) return null;
  }

  const mUp = (up.slope * span) / atrV;
  const mLo = (lo.slope * span) / atrV;
  const flat = (m: number) => Math.abs(m) < 1;
  const converging = w1 < 0.75 * w0;
  const parallel = Math.abs(w1 - w0) / w0 <= 0.3;

  let kind: PatternKind | null = null;
  if (flat(mUp) && mLo >= 1 && converging) kind = "ascending_triangle";
  else if (mUp <= -1 && flat(mLo) && converging) kind = "descending_triangle";
  else if (mUp <= -1 && mLo >= 1 && converging) kind = "symmetrical_triangle";
  else if (mUp >= 1 && mLo >= 1) kind = converging ? "rising_wedge" : parallel ? "channel_up" : null;
  else if (mUp <= -1 && mLo <= -1) kind = converging ? "falling_wedge" : parallel ? "channel_down" : null;
  else if (flat(mUp) && flat(mLo) && parallel) kind = "range";
  if (!kind) return null;

  const bias: Pattern["bias"] =
    kind === "ascending_triangle" || kind === "falling_wedge" ? "bullish"
    : kind === "descending_triangle" || kind === "rising_wedge" ? "bearish"
    : "neutral";

  let status: PatternStatus = "forming";
  let statusIndex: number | null = null;
  const breakBuf = 0.25 * atrV;
  for (let i = end + 1; i < candles.length; i++) {
    const c = candles[i].close;
    if (c > up.at(i) + breakBuf) { status = "broke_up"; statusIndex = i; break; }
    if (c < lo.at(i) - breakBuf) { status = "broke_down"; statusIndex = i; break; }
  }
  const lastIdx = statusIndex ?? candles.length - 1;
  const half = Math.floor((start + end) / 2);
  const avgVol = (a: number, b: number) => {
    const w = candles.slice(a, b);
    return w.length ? w.reduce((s, c) => s + c.volume, 0) / w.length : 0;
  };
  const brokeWithBias = (bias === "bullish" && status === "broke_up") || (bias === "bearish" && status === "broke_down");
  const criteria = [
    { label: `${highs.length} touches on the upper line (3+ is stronger)`, met: highs.length >= 3 },
    { label: `${lows.length} touches on the lower line (3+ is stronger)`, met: lows.length >= 3 },
    { label: `Pivots within ${o.fitTolAtr} ATR of the lines, closes contained`, met: true },
    { label: "Volume contracting through the pattern", met: avgVol(half, end + 1) < avgVol(start, half) },
    {
      label: bias === "neutral" ? "Decisive close outside the lines" : `Breakout in the textbook direction (${bias === "bullish" ? "up" : "down"})`,
      met: bias === "neutral" ? status !== "forming" : brokeWithBias,
    },
  ];
  const height = w0;
  const measuredMove =
    status === "broke_up" ? up.at(statusIndex!) + height : status === "broke_down" ? lo.at(statusIndex!) - height : null;

  return {
    id: `${kind}-${candles[start].time}-${candles[end].time}`,
    kind,
    name: PATTERN_NAMES[kind],
    bias,
    status,
    statusIndex,
    startIndex: start,
    endIndex: end,
    pivots: [...highs, ...lows].sort((a, b) => a.index - b.index),
    lines: [
      { label: "Upper", from: anchor(candles, start, up.at(start)), to: anchor(candles, lastIdx, up.at(lastIdx)) },
      { label: "Lower", from: anchor(candles, start, lo.at(start)), to: anchor(candles, lastIdx, lo.at(lastIdx)) },
    ],
    criteria,
    measuredMove,
  };
}

/** Plain-language strength summary from met criteria. Never a probability. */
export function strength(p: Pattern): { met: number; total: number; label: "textbook" | "partial" | "weak" } {
  const met = p.criteria.filter((c) => c.met).length;
  const total = p.criteria.length;
  const r = met / total;
  return { met, total, label: r >= 0.8 ? "textbook" : r >= 0.6 ? "partial" : "weak" };
}
