import { cacheLife, cacheTag } from "next/cache";
import { datum } from "./http";
import * as src from "./sources";
import type { Candle, Datum, MarketSnapshot, Timeframe } from "./types";

/**
 * The single server-side market snapshot. Every page, API route, the signal
 * engine and the agent read from here, so the whole site agrees on one price.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 30, expire: 300 });
  cacheTag("market-snapshot");

  const [spot, spotCrossCheck, derivatives, fearGreed, fees, network, global] = await Promise.all([
    datum("Coinbase", src.coinbaseSpot),
    datum("Kraken", src.krakenSpot),
    datum("OKX · Deribit · Hyperliquid", src.derivatives),
    datum("alternative.me", src.fearGreed),
    datum("mempool.space", src.fees),
    datum("mempool.space", src.network),
    datum("CoinGecko", src.global),
  ]);

  return { generatedAt: Date.now(), spot, spotCrossCheck, derivatives, fearGreed, fees, network, global };
}

export async function getCandles(tf: Timeframe, limit = 300): Promise<Datum<Candle[]>> {
  "use cache";
  cacheLife(tf === "1d" ? { stale: 300, revalidate: 600, expire: 3600 } : { stale: 30, revalidate: 60, expire: 600 });
  cacheTag(`candles-${tf}`);
  return datum("Coinbase", () => src.coinbaseCandles(tf, limit));
}

export const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];
export function isTimeframe(v: string | null): v is Timeframe {
  return v != null && (TIMEFRAMES as string[]).includes(v);
}
