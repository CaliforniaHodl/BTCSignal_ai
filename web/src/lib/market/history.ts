/**
 * Full BTC-USD daily close history from Coinbase (2015-07-20 → today),
 * paginated server-side and cached. Used by the DCA calculator.
 */
import { cacheLife, cacheTag } from "next/cache";
import { cachedDatum, stamp, type Stamped } from "@/lib/onchain/cached";
import { getJson } from "./http";
import { COINBASE_BTC_USD_FIRST_DAY, dayWindows, mergeDaily } from "./history-windows";
import type { Datum } from "./types";

const COINBASE = "https://api.exchange.coinbase.com";
const CONCURRENCY = 3; // Coinbase public limit is ~10 req/s

async function page(start: number, end: number): Promise<[number, number][]> {
  const iso = (t: number) => new Date(t * 1000).toISOString();
  const rows = await getJson<number[][]>(
    `${COINBASE}/products/BTC-USD/candles?granularity=86400&start=${iso(start)}&end=${iso(end)}`,
    { timeoutMs: 10000 }
  );
  if (!Array.isArray(rows)) throw new Error("bad candles page");
  // rows: [time, low, high, open, close, volume]
  return rows.map((r) => [r[0], r[4]] as [number, number]);
}

async function fetchDailyCloses(): Promise<Stamped<[number, number][]>> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 86400 });
  cacheTag("btc-daily-history");
  return stamp(async () => {
    const windows = dayWindows(COINBASE_BTC_USD_FIRST_DAY, Math.floor(Date.now() / 1000));
    const pages: [number, number][][] = [];
    for (let i = 0; i < windows.length; i += CONCURRENCY) {
      const batch = await Promise.all(windows.slice(i, i + CONCURRENCY).map(([s, e]) => page(s, e)));
      pages.push(...batch);
    }
    const closes = mergeDaily(pages);
    if (closes.length < 365) throw new Error("incomplete history");
    return closes;
  });
}

/** `[unixSecondsUtcMidnight, close]` ascending. The last row is today's still-forming candle. */
export function getDailyCloses(): Promise<Datum<[number, number][]>> {
  return cachedDatum("Coinbase", fetchDailyCloses);
}
