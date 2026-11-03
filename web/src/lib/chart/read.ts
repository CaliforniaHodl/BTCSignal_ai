/** Descriptive snapshot of where indicators sit right now. States facts; no forecast. */
import { bollinger, ema, keyLevels, last, macd, rsi } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";

export type Read = {
  close: number;
  rsi: number | null;
  rsiZone: "overbought" | "oversold" | "neutral" | null;
  emaTrend: "up" | "down" | "mixed" | null;
  vsEma200: "above" | "below" | null;
  macdHist: number | null;
  /** Bars since the MACD line last crossed its signal, and which way. */
  macdCross: { barsAgo: number; dir: "up" | "down" } | null;
  /** Bollinger %B: 0 = lower band, 1 = upper band. */
  percentB: number | null;
  support: number | null;
  resistance: number | null;
};

export function technicalRead(candles: Candle[]): Read | null {
  if (candles.length === 0) return null;
  const closes = candles.map((c) => c.close);
  const close = closes[closes.length - 1];
  const r = last(rsi(closes, 14));
  const e20 = last(ema(closes, 20));
  const e50 = last(ema(closes, 50));
  const e200 = last(ema(closes, 200));
  const m = macd(closes);
  let macdCross: Read["macdCross"] = null;
  for (let i = closes.length - 1; i > 0; i--) {
    const h = m.histogram[i], p = m.histogram[i - 1];
    if (h == null || p == null) break;
    if ((h >= 0) !== (p >= 0)) {
      macdCross = { barsAgo: closes.length - 1 - i, dir: h >= 0 ? "up" : "down" };
      break;
    }
  }
  const b = bollinger(closes, 20, 2);
  const u = last(b.upper), l = last(b.lower);
  const levels = keyLevels(candles, { lookback: 4, max: 8 });
  return {
    close,
    rsi: r,
    rsiZone: r == null ? null : r >= 70 ? "overbought" : r <= 30 ? "oversold" : "neutral",
    emaTrend: e20 == null || e50 == null ? null : close > e20 && e20 > e50 ? "up" : close < e20 && e20 < e50 ? "down" : "mixed",
    vsEma200: e200 == null ? null : close >= e200 ? "above" : "below",
    macdHist: last(m.histogram),
    macdCross,
    percentB: u != null && l != null && u !== l ? (close - l) / (u - l) : null,
    support: levels.find((x) => x.kind === "support")?.price ?? null,
    resistance: levels.find((x) => x.kind === "resistance")?.price ?? null,
  };
}
