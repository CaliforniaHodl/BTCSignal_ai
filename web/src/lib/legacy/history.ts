/**
 * Historical Coinbase hourly candles for re-checking the legacy v1 calls.
 * Past candles never change, so successful fetches are cached for the max
 * lifetime. Failures throw inside the cached function (so they aren't cached)
 * and are wrapped as an unavailable Datum outside it.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { datum, getJson } from "@/lib/market/http";
import type { Candle, Datum } from "@/lib/market/types";

const COINBASE = "https://api.exchange.coinbase.com";

async function hourlyRange(startSec: number, hours: number): Promise<Candle[]> {
  "use cache";
  cacheLife("max");
  cacheTag("legacy-history");
  const start = new Date(startSec * 1000).toISOString();
  const end = new Date((startSec + hours * 3600) * 1000).toISOString();
  const rows = await getJson<number[][]>(`${COINBASE}/products/BTC-USD/candles?granularity=3600&start=${start}&end=${end}`, { timeoutMs: 8000 });
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("no candles");
  return rows.map(([time, low, high, open, close, volume]) => ({ time, open, high, low, close, volume })).sort((a, b) => a.time - b.time);
}

/** Hourly candles covering [hour of `iso`, +hours]. */
export function candlesAround(iso: string, hours: number): Promise<Datum<Candle[]>> {
  const t = Math.floor(new Date(iso).getTime() / 1000);
  return datum("Coinbase", () => hourlyRange(t - (t % 3600), hours));
}

/** Run fetches a few at a time to stay well under Coinbase's public rate limit. */
export async function inBatches<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}
