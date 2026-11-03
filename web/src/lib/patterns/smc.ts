/**
 * "Smart money" structures with explicit, mechanical definitions:
 * - Fair-value gap (FVG): a three-candle imbalance where candle 1's high is
 *   below candle 3's low (bullish) or candle 1's low is above candle 3's high (bearish).
 * - Order block (OB): the last opposite-colour candle before a displacement
 *   that leaves an FVG and closes beyond the most recent confirmed swing.
 */
import { atr, last, swings } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";

export type Fvg = {
  id: string;
  kind: "bullish" | "bearish";
  /** Middle (displacement) candle. */
  index: number;
  time: number;
  top: number;
  bottom: number;
  /** 0..1: how much of the gap later price has traded back into. */
  filled: number;
  status: "open" | "partial" | "filled";
  filledIndex: number | null;
};

export function fairValueGaps(candles: Candle[], { minAtr = 0.1 } = {}): Fvg[] {
  const a = atr(candles, 14);
  const fallback = last(a) ?? 0;
  const out: Fvg[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    const min = minAtr * (a[i] ?? fallback);
    let kind: Fvg["kind"] | null = null;
    let top = 0;
    let bottom = 0;
    if (c3.low - c1.high > min) {
      kind = "bullish";
      top = c3.low;
      bottom = c1.high;
    } else if (c1.low - c3.high > min) {
      kind = "bearish";
      top = c1.low;
      bottom = c3.high;
    }
    if (!kind) continue;
    let filled = 0;
    let filledIndex: number | null = null;
    const size = top - bottom;
    for (let j = i + 1; j < candles.length; j++) {
      const into = kind === "bullish" ? top - candles[j].low : candles[j].high - bottom;
      filled = Math.max(filled, Math.min(1, Math.max(0, into / size)));
      if (filled >= 1) {
        filledIndex = j;
        break;
      }
    }
    out.push({
      id: `fvg-${kind}-${candles[i - 1].time}`,
      kind,
      index: i - 1,
      time: candles[i - 1].time,
      top,
      bottom,
      filled,
      status: filled >= 1 ? "filled" : filled > 0 ? "partial" : "open",
      filledIndex,
    });
  }
  return out;
}

export type OrderBlock = {
  id: string;
  kind: "bullish" | "bearish";
  index: number;
  time: number;
  top: number;
  bottom: number;
  /** Swing level the displacement closed beyond. */
  brokeLevel: number;
  status: "fresh" | "tested" | "invalidated";
  statusIndex: number | null;
};

export function orderBlocks(candles: Candle[], { lookback = 3, searchBack = 5 } = {}): OrderBlock[] {
  const gaps = fairValueGaps(candles);
  const { highs, lows } = swings(candles, lookback);
  const out: OrderBlock[] = [];
  const seen = new Set<number>();
  for (const g of gaps) {
    const m = g.index; // displacement candle
    const bull = g.kind === "bullish";
    // Last opposite-colour candle before the displacement.
    let ob = -1;
    for (let j = m - 1; j >= Math.max(0, m - searchBack); j--) {
      const c = candles[j];
      if (bull ? c.close < c.open : c.close > c.open) {
        ob = j;
        break;
      }
    }
    if (ob < 0 || seen.has(ob)) continue;
    // Most recent swing confirmed (lookback bars elapsed) before the OB candle.
    const pool = bull ? highs : lows;
    const sw = [...pool].reverse().find((s) => s.index + lookback <= ob);
    if (!sw) continue;
    const after = candles.slice(m, Math.min(candles.length, m + 4));
    const broke = after.some((c) => (bull ? c.close > sw.price : c.close < sw.price));
    if (!broke) continue;
    seen.add(ob);
    const top = candles[ob].high;
    const bottom = candles[ob].low;
    let status: OrderBlock["status"] = "fresh";
    let statusIndex: number | null = null;
    for (let j = m + 2; j < candles.length; j++) {
      const c = candles[j];
      if (bull ? c.close < bottom : c.close > top) {
        status = "invalidated";
        statusIndex = j;
        break;
      }
      if (status === "fresh" && (bull ? c.low <= top : c.high >= bottom)) {
        status = "tested";
        statusIndex = j;
      }
    }
    out.push({ id: `ob-${g.kind}-${candles[ob].time}`, kind: g.kind, index: ob, time: candles[ob].time, top, bottom, brokeLevel: sw.price, status, statusIndex });
  }
  return out;
}
