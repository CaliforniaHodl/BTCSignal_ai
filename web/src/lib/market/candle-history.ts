import { cacheLife, cacheTag } from "next/cache";
import { datum, getJson } from "./http";
import { aggregate } from "./sources";
import type { Candle, Datum } from "./types";

/**
 * Long Coinbase BTC-USD history for backtests (the live snapshot only keeps
 * 300 bars). Paginated 300 bars per request, cached for an hour. Only CLOSED
 * bars are returned — the in-progress bar is dropped so backtests never see a
 * partial candle.
 */
export type HistoryTf = "1h" | "4h" | "1d";
export const HISTORY_MAX_DAYS: Record<HistoryTf, number> = { "1h": 365, "4h": 730, "1d": 4000 };
const GRAN = { "1h": 3600, "4h": 3600, "1d": 86400 } as const;
const COINBASE = "https://api.exchange.coinbase.com";

export async function getHistory(tf: HistoryTf, days: number): Promise<Datum<Candle[]>> {
  const d = Math.min(Math.max(1, Math.round(days)), HISTORY_MAX_DAYS[tf]);
  const r = await datum("Coinbase", () => cachedHistory(tf, d));
  // Report the age of the cached fetch, not of this call.
  return r.ok ? { ok: true, value: r.value.candles, source: r.source, fetchedAt: r.value.fetchedAt } : r;
}

/** Throws on failure so a failed fetch is never cached. */
async function cachedHistory(tf: HistoryTf, days: number) {
  "use cache";
  cacheLife({ stale: 900, revalidate: 3600, expire: 86400 });
  cacheTag(`history-${tf}`);
  return { candles: await fetchHistory(tf, days), fetchedAt: Date.now() };
}

async function fetchHistory(tf: HistoryTf, days: number): Promise<Candle[]> {
  const g = GRAN[tf];
  const now = Math.floor(Date.now() / 1000);
  const end = Math.floor(now / g) * g; // start of the in-progress bar
  const start = end - days * 86400;
  const span = g * 300;
  const windows: [number, number][] = [];
  for (let s = start; s < end; s += span) windows.push([s, Math.min(end, s + span)]);

  const rows = new Map<number, Candle>();
  // 3 requests at a time keeps us well under Coinbase's public rate limit.
  for (let i = 0; i < windows.length; i += 3) {
    const batch = await Promise.all(windows.slice(i, i + 3).map(([s, e]) =>
      getJson<number[][]>(`${COINBASE}/products/BTC-USD/candles?granularity=${g}&start=${iso(s)}&end=${iso(e - 1)}`, { timeoutMs: 10_000 })));
    for (const list of batch) {
      if (!Array.isArray(list)) throw new Error("bad candles response");
      for (const [time, low, high, open, close, volume] of list) if (time < end) rows.set(time, { time, open, high, low, close, volume });
    }
  }
  const out = [...rows.values()].sort((a, b) => a.time - b.time);
  if (out.length < 10) throw new Error("not enough history returned");
  if (tf !== "4h") return out;
  // 4h from closed 1h bars; drop a trailing 4h bucket that isn't complete yet.
  const h4 = aggregate(out, 14400);
  const lastBucket = h4[h4.length - 1];
  return lastBucket && lastBucket.time + 14400 > end ? h4.slice(0, -1) : h4;
}

const iso = (s: number) => new Date(s * 1000).toISOString();
