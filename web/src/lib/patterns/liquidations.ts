/**
 * Liquidation maths. Two separate things, never mixed:
 * 1. Realized liquidations — real exchange prints, aggregated by price and time.
 * 2. Estimated liquidation levels — a model from current OI and assumed leverage.
 */
import type { Candle } from "@/lib/market/types";

export type LiqEvent = {
  /** ms epoch */
  ts: number;
  /** The side of the position that was liquidated. */
  side: "long" | "short";
  price: number;
  usd: number;
  venue: string;
};

export type PriceBucket = { price: number; longUsd: number; shortUsd: number };
export type TimeBucket = { t: number; longUsd: number; shortUsd: number; count: number };

export function bucketByPrice(events: LiqEvent[], bucketUsd: number): PriceBucket[] {
  const m = new Map<number, PriceBucket>();
  for (const e of events) {
    const p = Math.floor(e.price / bucketUsd) * bucketUsd;
    const b = m.get(p) ?? { price: p, longUsd: 0, shortUsd: 0 };
    if (e.side === "long") b.longUsd += e.usd;
    else b.shortUsd += e.usd;
    m.set(p, b);
  }
  return [...m.values()].sort((a, b) => b.price - a.price);
}

export function bucketByTime(events: LiqEvent[], bucketMs: number, fromMs: number, toMs: number): TimeBucket[] {
  const start = Math.floor(fromMs / bucketMs) * bucketMs;
  const out: TimeBucket[] = [];
  for (let t = start; t <= toMs; t += bucketMs) out.push({ t, longUsd: 0, shortUsd: 0, count: 0 });
  for (const e of events) {
    const i = Math.floor((e.ts - start) / bucketMs);
    if (i < 0 || i >= out.length) continue;
    if (e.side === "long") out[i].longUsd += e.usd;
    else out[i].shortUsd += e.usd;
    out[i].count++;
  }
  return out;
}

export function totals(events: LiqEvent[]) {
  let longUsd = 0, shortUsd = 0, largest: LiqEvent | null = null;
  for (const e of events) {
    if (e.side === "long") longUsd += e.usd;
    else shortUsd += e.usd;
    if (!largest || e.usd > largest.usd) largest = e;
  }
  return { longUsd, shortUsd, count: events.length, largest };
}

export type LeverageTier = { leverage: number; weight: number };

/** Assumed leverage mix. Not observed — no venue publishes the distribution. */
export const DEFAULT_TIERS: LeverageTier[] = [
  { leverage: 5, weight: 0.15 },
  { leverage: 10, weight: 0.3 },
  { leverage: 25, weight: 0.3 },
  { leverage: 50, weight: 0.15 },
  { leverage: 100, weight: 0.1 },
];

export type ModelInput = {
  candles: Candle[];
  openInterestUsd: number;
  tiers?: LeverageTier[];
  /** Maintenance margin as a fraction of notional. */
  mmr?: number;
  /** Fraction of OI assumed long (rest short). */
  longShare?: number;
  bucketUsd: number;
  /** Only keep levels within ±rangePct of the last close. */
  rangePct?: number;
};

/**
 * Estimated liquidation levels:
 * - Current OI is spread across the window's candles in proportion to volume,
 *   entered at each candle's typical price.
 * - Each slice is split long/short (`longShare`) and across the leverage tiers.
 * - Isolated-margin liquidation ≈ entry × (1 ∓ 1/L ± mmr).
 * - A level is dropped if price has already traded through it after entry
 *   (those positions would be gone).
 */
export function estimateLiquidationLevels({
  candles,
  openInterestUsd,
  tiers = DEFAULT_TIERS,
  mmr = 0.005,
  longShare = 0.5,
  bucketUsd,
  rangePct = 0.15,
}: ModelInput) {
  const n = candles.length;
  if (n === 0 || openInterestUsd <= 0) return { buckets: [] as PriceBucket[], longUsd: 0, shortUsd: 0, droppedUsd: 0 };
  const totalVol = candles.reduce((s, c) => s + c.volume, 0);
  // Suffix extremes: lowest low / highest high strictly after bar i.
  const minAfter = new Array<number>(n).fill(Infinity);
  const maxAfter = new Array<number>(n).fill(-Infinity);
  for (let i = n - 2; i >= 0; i--) {
    minAfter[i] = Math.min(minAfter[i + 1], candles[i + 1].low);
    maxAfter[i] = Math.max(maxAfter[i + 1], candles[i + 1].high);
  }
  const close = candles[n - 1].close;
  const lo = close * (1 - rangePct);
  const hi = close * (1 + rangePct);
  const m = new Map<number, PriceBucket>();
  let longUsd = 0, shortUsd = 0, droppedUsd = 0;
  const add = (price: number, usd: number, side: "long" | "short") => {
    const p = Math.floor(price / bucketUsd) * bucketUsd;
    const b = m.get(p) ?? { price: p, longUsd: 0, shortUsd: 0 };
    if (side === "long") b.longUsd += usd;
    else b.shortUsd += usd;
    m.set(p, b);
  };
  for (let i = 0; i < n; i++) {
    const c = candles[i];
    const share = totalVol > 0 ? c.volume / totalVol : 1 / n;
    const entry = (c.high + c.low + c.close) / 3;
    for (const t of tiers) {
      const slice = openInterestUsd * share * t.weight;
      const longLiq = entry * (1 - 1 / t.leverage + mmr);
      const shortLiq = entry * (1 + 1 / t.leverage - mmr);
      const longUsdSlice = slice * longShare;
      const shortUsdSlice = slice * (1 - longShare);
      if (minAfter[i] <= longLiq) droppedUsd += longUsdSlice;
      else if (longLiq >= lo) { add(longLiq, longUsdSlice, "long"); longUsd += longUsdSlice; }
      if (maxAfter[i] >= shortLiq) droppedUsd += shortUsdSlice;
      else if (shortLiq <= hi) { add(shortLiq, shortUsdSlice, "short"); shortUsd += shortUsdSlice; }
    }
  }
  return { buckets: [...m.values()].sort((a, b) => b.price - a.price), longUsd, shortUsd, droppedUsd };
}

/** Continuous price ladder (highest first) so empty levels show as gaps, not missing rows. */
export function fillBuckets(buckets: PriceBucket[], bucketUsd: number, lo: number, hi: number): PriceBucket[] {
  const m = new Map(buckets.map((b) => [b.price, b]));
  const out: PriceBucket[] = [];
  const top = Math.floor(hi / bucketUsd) * bucketUsd;
  const bottom = Math.floor(lo / bucketUsd) * bucketUsd;
  for (let p = top; p >= bottom; p -= bucketUsd) out.push(m.get(p) ?? { price: p, longUsd: 0, shortUsd: 0 });
  return out;
}

/** A round bucket size giving roughly `target` rows across `span`. */
export function niceStep(span: number, target = 30): number {
  const raw = Math.max(span / target, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * pow) return m * pow;
  return 10 * pow;
}
