/**
 * The one indicator library. Pure functions, no I/O, safe on server and client.
 * Every series output has the same length as its input; warm-up values are `null`.
 */
import type { Candle } from "@/lib/market/types";

export type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with the SMA of the first `period` values (standard convention). */
export function ema(values: number[], period: number): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. First value lands at index `period`. */
export function rsi(values: number[], period = 14): Series {
  assertPeriod(period);
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = toRsi(gain, loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = toRsi(gain, loss);
  }
  return out;
}

function toRsi(gain: number, loss: number): number {
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line: Series = values.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const start = line.findIndex((v) => v != null);
  const sig: Series = new Array(values.length).fill(null);
  if (start >= 0) {
    const tail = ema(line.slice(start) as number[], signal);
    tail.forEach((v, j) => (sig[start + j] = v));
  }
  const histogram: Series = line.map((v, i) => (v != null && sig[i] != null ? v - sig[i]! : null));
  return { line, signal: sig, histogram };
}

/** Bollinger Bands using population standard deviation (TradingView convention). */
export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const m = mid[i]!;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) v += (values[j] - m) ** 2;
    const sd = Math.sqrt(v / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { upper, middle: mid, lower };
}

export function trueRange(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
}

/** Wilder's ATR. First value at index `period - 1`. */
export function atr(candles: Candle[], period = 14): Series {
  assertPeriod(period);
  const tr = trueRange(candles);
  const out: Series = new Array(candles.length).fill(null);
  if (candles.length < period) return out;
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** Swing highs/lows: a bar whose high (low) is the extreme of `lookback` bars on each side. */
export function swings(candles: Candle[], lookback = 3) {
  const highs: { index: number; time: number; price: number }[] = [];
  const lows: { index: number; time: number; price: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const win = candles.slice(i - lookback, i + lookback + 1);
    if (candles[i].high === Math.max(...win.map((c) => c.high)))
      highs.push({ index: i, time: candles[i].time, price: candles[i].high });
    if (candles[i].low === Math.min(...win.map((c) => c.low)))
      lows.push({ index: i, time: candles[i].time, price: candles[i].low });
  }
  return { highs, lows };
}

/**
 * Support/resistance: cluster swing points within `tolerancePct` of each other,
 * rank by touches. Returns levels nearest the current price first.
 */
export function keyLevels(candles: Candle[], { lookback = 3, tolerancePct = 0.4, max = 6 } = {}) {
  if (candles.length === 0) return [];
  const { highs, lows } = swings(candles, lookback);
  const points = [...highs, ...lows].map((p) => p.price).sort((a, b) => a - b);
  const clusters: { price: number; touches: number }[] = [];
  for (const p of points) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p - last.price) / last.price <= tolerancePct / 100) {
      last.price = (last.price * last.touches + p) / (last.touches + 1);
      last.touches++;
    } else clusters.push({ price: p, touches: 1 });
  }
  const close = candles[candles.length - 1].close;
  return clusters
    .filter((c) => c.touches >= 2)
    .map((c) => ({ ...c, kind: c.price >= close ? ("resistance" as const) : ("support" as const) }))
    .sort((a, b) => Math.abs(a.price - close) - Math.abs(b.price - close))
    .slice(0, max);
}

export const last = (s: Series): number | null => {
  for (let i = s.length - 1; i >= 0; i--) if (s[i] != null) return s[i];
  return null;
};

function assertPeriod(p: number) {
  if (!Number.isInteger(p) || p < 1) throw new Error(`invalid period ${p}`);
}

/**
 * Highest high of the `period` bars BEFORE bar i (bar i excluded), so
 * `close > highestHigh(20)` is a breakout with no look-ahead. First value at index `period`.
 */
export function highestHigh(candles: Candle[], period: number): Series {
  assertPeriod(period);
  return candles.map((_, i) => {
    if (i < period) return null;
    let m = -Infinity;
    for (let j = i - period; j < i; j++) m = Math.max(m, candles[j].high);
    return m;
  });
}

/** Lowest low of the `period` bars BEFORE bar i (bar i excluded). First value at index `period`. */
export function lowestLow(candles: Candle[], period: number): Series {
  assertPeriod(period);
  return candles.map((_, i) => {
    if (i < period) return null;
    let m = Infinity;
    for (let j = i - period; j < i; j++) m = Math.min(m, candles[j].low);
    return m;
  });
}

/** Stochastic %K (unsmoothed): where the close sits in the last `period` bars' range (bar i included), 0–100. */
export function stochK(candles: Candle[], period = 14): Series {
  assertPeriod(period);
  return candles.map((c, i) => {
    if (i < period - 1) return null;
    let hi = -Infinity, lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) { hi = Math.max(hi, candles[j].high); lo = Math.min(lo, candles[j].low); }
    return hi === lo ? 50 : ((c.close - lo) / (hi - lo)) * 100;
  });
}
