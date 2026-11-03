/**
 * Extra indicators for the chart workbench. Same contract as ./index:
 * pure functions, output length === input length, warm-up values are `null`.
 */
import type { Candle } from "@/lib/market/types";
import { atr, ema, sma, trueRange, type Series } from "./index";

const typical = (c: Candle) => (c.high + c.low + c.close) / 3;

/**
 * Session VWAP anchored to each UTC day (resets at 00:00 UTC), using typical price.
 * On daily candles every bar is its own session, so VWAP equals the typical price.
 */
export function vwap(candles: Candle[], sessionSeconds = 86_400): Series {
  const out: Series = new Array(candles.length).fill(null);
  let session = -1;
  let pv = 0;
  let vol = 0;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const s = Math.floor(c.time / sessionSeconds);
    if (s !== session) {
      session = s;
      pv = 0;
      vol = 0;
    }
    pv += typical(c) * c.volume;
    vol += c.volume;
    out[i] = vol > 0 ? pv / vol : typical(c);
  }
  return out;
}

/** Slow stochastic: %K = SMA(raw %K, smoothK), %D = SMA(%K, d). Flat window → 50. */
export function stochastic(candles: Candle[], period = 14, smoothK = 3, d = 3) {
  const raw: Series = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    raw[i] = hi === lo ? 50 : ((candles[i].close - lo) / (hi - lo)) * 100;
  }
  const k = smoothNullable(raw, smoothK);
  return { k, d: smoothNullable(k, d) };
}

/** On-balance volume, starting at 0 on the first bar. */
export function obv(candles: Candle[]): Series {
  let acc = 0;
  return candles.map((c, i) => {
    if (i > 0) {
      const pc = candles[i - 1].close;
      if (c.close > pc) acc += c.volume;
      else if (c.close < pc) acc -= c.volume;
    }
    return acc;
  });
}

/** Williams %R in [-100, 0]. */
export function williamsR(candles: Candle[], period = 14): Series {
  const out: Series = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const win = candles.slice(i - period + 1, i + 1);
    const hi = Math.max(...win.map((c) => c.high));
    const lo = Math.min(...win.map((c) => c.low));
    out[i] = hi === lo ? -50 : -((hi - candles[i].close) / (hi - lo)) * 100 || 0; // `|| 0` avoids -0
  }
  return out;
}

/** Commodity Channel Index with the standard 0.015 constant and mean absolute deviation. */
export function cci(candles: Candle[], period = 20): Series {
  const tp = candles.map(typical);
  const mean = sma(tp, period);
  return tp.map((v, i) => {
    const m = mean[i];
    if (m == null) return null;
    let dev = 0;
    for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - m);
    dev /= period;
    return dev === 0 ? 0 : (v - m) / (0.015 * dev);
  });
}

/** Money Flow Index (volume-weighted RSI on typical price). */
export function mfi(candles: Candle[], period = 14): Series {
  const out: Series = new Array(candles.length).fill(null);
  const tp = candles.map(typical);
  for (let i = period; i < candles.length; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const flow = tp[j] * candles[j].volume;
      if (tp[j] > tp[j - 1]) pos += flow;
      else if (tp[j] < tp[j - 1]) neg += flow;
    }
    out[i] = neg === 0 ? (pos === 0 ? 50 : 100) : 100 - 100 / (1 + pos / neg);
  }
  return out;
}

/** Donchian channel: highest high / lowest low over `period` bars, plus midline. */
export function donchian(candles: Candle[], period = 20) {
  const upper: Series = new Array(candles.length).fill(null);
  const lower: Series = new Array(candles.length).fill(null);
  const middle: Series = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const win = candles.slice(i - period + 1, i + 1);
    upper[i] = Math.max(...win.map((c) => c.high));
    lower[i] = Math.min(...win.map((c) => c.low));
    middle[i] = (upper[i]! + lower[i]!) / 2;
  }
  return { upper, middle, lower };
}

/** Keltner channel: EMA(close) ± mult × ATR (Wilder). */
export function keltner(candles: Candle[], period = 20, mult = 2, atrPeriod = 10) {
  const mid = ema(candles.map((c) => c.close), period);
  const a = atr(candles, atrPeriod);
  const upper: Series = mid.map((m, i) => (m != null && a[i] != null ? m + mult * a[i]! : null));
  const lower: Series = mid.map((m, i) => (m != null && a[i] != null ? m - mult * a[i]! : null));
  return { upper, middle: mid, lower };
}

/** Wilder's ADX with +DI / -DI. First ADX value lands at index 2·period − 1. */
export function adx(candles: Candle[], period = 14) {
  const n = candles.length;
  const plusDI: Series = new Array(n).fill(null);
  const minusDI: Series = new Array(n).fill(null);
  const adxOut: Series = new Array(n).fill(null);
  if (n <= period) return { adx: adxOut, plusDI, minusDI };
  const tr = trueRange(candles);
  const pdm: number[] = [0];
  const mdm: number[] = [0];
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const dn = candles[i - 1].low - candles[i].low;
    pdm.push(up > dn && up > 0 ? up : 0);
    mdm.push(dn > up && dn > 0 ? dn : 0);
  }
  // Wilder smoothing over bars 1..period, then recursive.
  let sTr = 0, sP = 0, sM = 0;
  for (let i = 1; i <= period; i++) {
    sTr += tr[i];
    sP += pdm[i];
    sM += mdm[i];
  }
  const dx: Series = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    if (i > period) {
      sTr = sTr - sTr / period + tr[i];
      sP = sP - sP / period + pdm[i];
      sM = sM - sM / period + mdm[i];
    }
    const p = sTr === 0 ? 0 : (100 * sP) / sTr;
    const m = sTr === 0 ? 0 : (100 * sM) / sTr;
    plusDI[i] = p;
    minusDI[i] = m;
    dx[i] = p + m === 0 ? 0 : (100 * Math.abs(p - m)) / (p + m);
  }
  const first = 2 * period - 1;
  if (n > first) {
    let prev = 0;
    for (let i = period; i <= first; i++) prev += dx[i]!;
    prev /= period;
    adxOut[first] = prev;
    for (let i = first + 1; i < n; i++) {
      prev = (prev * (period - 1) + dx[i]!) / period;
      adxOut[i] = prev;
    }
  }
  return { adx: adxOut, plusDI, minusDI };
}

/** SMA over a series that has a null warm-up prefix. */
function smoothNullable(s: Series, period: number): Series {
  const out: Series = new Array(s.length).fill(null);
  const start = s.findIndex((v) => v != null);
  if (start < 0) return out;
  const tail = sma(s.slice(start) as number[], period);
  tail.forEach((v, j) => (out[start + j] = v));
  return out;
}
