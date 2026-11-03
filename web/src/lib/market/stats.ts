/**
 * Pure statistics on real series. No I/O. Every function returns null rather
 * than inventing a value when the input can't support the answer.
 */

export type DailyPoint = { day: string; value: number };

/** Pearson correlation. Null when fewer than `minN` pairs or zero variance. */
export function pearson(a: number[], b: number[], minN = 10): number | null {
  const n = Math.min(a.length, b.length);
  if (n < minN) return null;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    cov += da * db; va += da * da; vb += db * db;
  }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

/**
 * Correlation of daily log returns over the last `days` days on which BOTH
 * series have a close on that day and the previous shared day. Series are keyed
 * by UTC day (YYYY-MM-DD) so weekend gaps in one series are handled honestly.
 */
export function returnCorrelation(x: DailyPoint[], y: DailyPoint[], days: number): { r: number | null; n: number } {
  const ym = new Map(y.map((p) => [p.day, p.value]));
  const shared = x.filter((p) => ym.has(p.day) && p.value > 0 && (ym.get(p.day) as number) > 0).sort((p, q) => p.day.localeCompare(q.day));
  const rx: number[] = [], ry: number[] = [];
  for (let i = 1; i < shared.length; i++) {
    const a = shared[i - 1], b = shared[i];
    rx.push(Math.log(b.value / a.value));
    ry.push(Math.log((ym.get(b.day) as number) / (ym.get(a.day) as number)));
  }
  const tx = rx.slice(-days), ty = ry.slice(-days);
  return { r: pearson(tx, ty), n: tx.length };
}

/** Percent change from `from` to `to`, null if `from` isn't a usable number. */
export function pctChange(from: number | null | undefined, to: number | null | undefined): number | null {
  if (from == null || to == null || !Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / from) * 100;
}

/** Days from `now` until a Deribit future expiry, which settles at 08:00 UTC. */
export function deribitExpiry(instrument: string): number | null {
  const m = /^BTC-(\d{1,2})([A-Z]{3})(\d{2})$/.exec(instrument);
  if (!m) return null;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mon = months.indexOf(m[2]);
  if (mon < 0) return null;
  return Date.UTC(2000 + Number(m[3]), mon, Number(m[1]), 8, 0, 0);
}

/** Simple (non-compounded) annualised basis, in percent. */
export function annualisedBasisPct(futurePrice: number, indexPrice: number, msToExpiry: number): number | null {
  if (indexPrice <= 0 || msToExpiry <= 0) return null;
  const days = msToExpiry / 86_400_000;
  if (days < 1) return null; // annualising the last hours is noise
  return (futurePrice / indexPrice - 1) * (365 / days) * 100;
}

/** Mean of the last `n` values; null if there aren't `n` of them. */
export function trailingMean(values: number[], n: number): number | null {
  if (values.length < n || n <= 0) return null;
  const s = values.slice(-n);
  return s.reduce((a, b) => a + b, 0) / n;
}

/**
 * Puell multiple: today's issuance value (USD) / its 365-day moving average.
 * Requires a full year of daily issuance.
 */
export function puellMultiple(dailyIssuanceUsd: number[]): number | null {
  const ma = trailingMean(dailyIssuanceUsd, 365);
  const today = dailyIssuanceUsd[dailyIssuanceUsd.length - 1];
  return ma && today != null ? today / ma : null;
}

/** z-score of the last value vs the preceding `n` values. */
export function zScoreLast(values: number[], n: number): number | null {
  if (values.length < n + 1) return null;
  const hist = values.slice(-(n + 1), -1);
  const mean = hist.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(hist.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  if (sd === 0) return null;
  return (values[values.length - 1] - mean) / sd;
}

export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
