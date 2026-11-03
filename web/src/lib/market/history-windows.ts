/** Pure helpers for paginating Coinbase daily candles (max 300 rows per request). */

const DAY = 86400;

/** Coinbase BTC-USD order book opened 2015-07-20. */
export const COINBASE_BTC_USD_FIRST_DAY = Date.UTC(2015, 6, 20) / 1000;

/** [start, end] unix-second windows, each ≤ `maxDays` candles, covering start..end inclusive. */
export function dayWindows(start: number, end: number, maxDays = 300): [number, number][] {
  const out: [number, number][] = [];
  const s0 = Math.floor(start / DAY) * DAY;
  for (let s = s0; s <= end; s += maxDays * DAY) {
    out.push([s, Math.min(s + (maxDays - 1) * DAY, end)]);
  }
  return out;
}

/** Merge pages of `[time, close]`, dedupe by day, ascending. */
export function mergeDaily(pages: [number, number][][]): [number, number][] {
  const m = new Map<number, number>();
  for (const page of pages) for (const [t, c] of page) if (Number.isFinite(t) && c > 0) m.set(t, c);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}
