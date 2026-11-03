/**
 * Monte Carlo resampling of REAL backtest outcomes (never synthetic prices).
 * Seeded, so the same inputs always produce the same ranges.
 */
import { maxDrawdown } from "./rules";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear-interpolated percentile of an unsorted array (p in 0..100). */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const k = ((s.length - 1) * p) / 100;
  const lo = Math.floor(k), hi = Math.ceil(k);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
}

export type McSummary = {
  runs: number;
  method: string;
  finalReturnPct: { p5: number; p25: number; p50: number; p75: number; p95: number };
  maxDrawdownPct: { p50: number; p95: number };
  probLossPct: number;
  /** Final-return histogram for charting */
  histogram: { from: number; to: number; count: number }[];
};

function summarise(finals: number[], dds: number[], method: string): McSummary {
  const q = (p: number) => percentile(finals, p);
  return {
    runs: finals.length,
    method,
    finalReturnPct: { p5: q(5), p25: q(25), p50: q(50), p75: q(75), p95: q(95) },
    maxDrawdownPct: { p50: percentile(dds, 50), p95: percentile(dds, 95) },
    probLossPct: (finals.filter((x) => x < 0).length / (finals.length || 1)) * 100,
    histogram: histogram(finals, 24),
  };
}

export function histogram(xs: number[], bins: number) {
  if (xs.length === 0) return [];
  const lo = percentile(xs, 1), hi = percentile(xs, 99);
  if (hi <= lo) return [{ from: lo, to: hi, count: xs.length }];
  const w = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ from: lo + i * w, to: lo + (i + 1) * w, count: 0 }));
  for (const x of xs) out[Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / w)))].count++;
  return out;
}

/**
 * Resample per-trade returns (% of equity) with replacement, same trade count,
 * compounding. Answers "how much of this result was the order/luck of trades?"
 * Drawdown here is trade-to-trade (intra-trade dips are not visible).
 */
export function resampleTrades(returnsPct: number[], { runs = 1000, seed = 42 } = {}): McSummary | null {
  const n = returnsPct.length;
  if (n < 5) return null;
  const rnd = mulberry32(seed);
  const finals: number[] = [], dds: number[] = [];
  for (let r = 0; r < runs; r++) {
    let eq = 1;
    const path = [1];
    for (let i = 0; i < n; i++) { eq *= Math.max(0, 1 + returnsPct[Math.floor(rnd() * n)] / 100); path.push(eq); }
    finals.push((eq - 1) * 100);
    dds.push(maxDrawdown(path));
  }
  return summarise(finals, dds, `${runs} resamples of ${n} real trade returns, with replacement`);
}

/**
 * Stationary-ish block bootstrap of per-period returns: stitch random contiguous
 * blocks of real history into paths of the same length. Keeps short-term
 * volatility clustering that per-day shuffling would destroy.
 */
export function blockBootstrap(periodReturns: number[], { runs = 1000, block = 20, seed = 42, length }: { runs?: number; block?: number; seed?: number; length?: number } = {}): McSummary | null {
  const n = periodReturns.length;
  if (n < block * 2) return null;
  const len = length ?? n;
  const rnd = mulberry32(seed);
  const finals: number[] = [], dds: number[] = [];
  for (let r = 0; r < runs; r++) {
    let eq = 1;
    const path = [1];
    while (path.length <= len) {
      const s = Math.floor(rnd() * (n - block + 1));
      for (let j = 0; j < block && path.length <= len; j++) { eq *= Math.max(0, 1 + periodReturns[s + j]); path.push(eq); }
    }
    finals.push((eq - 1) * 100);
    dds.push(maxDrawdown(path));
  }
  return summarise(finals, dds, `${runs} block-bootstrap paths (${block}-period blocks of real returns)`);
}
