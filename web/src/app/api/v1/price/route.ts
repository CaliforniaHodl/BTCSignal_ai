import { connection } from "next/server";
import { mapDatum, preflight, publicDatum } from "@/lib/api/public";
import { getMarketSnapshot } from "@/lib/market/snapshot";

/** GET /api/v1/price — BTC/USD spot (Coinbase) with 24h stats and a Kraken cross-check. */
export async function GET() {
  await connection();
  const s = await getMarketSnapshot();
  const cross = s.spotCrossCheck.ok ? s.spotCrossCheck.value.price : null;
  return publicDatum(
    mapDatum(s.spot, (v) => ({
      symbol: "BTC-USD",
      price: v.price,
      open24h: v.open24h,
      high24h: v.high24h,
      low24h: v.low24h,
      change24hPct: v.change24hPct,
      volume24hBtc: v.volume24hBtc,
      crossCheck: cross != null ? { source: "Kraken", price: cross, spreadPct: ((cross - v.price) / v.price) * 100 } : null,
    })),
    10
  );
}

export const OPTIONS = preflight;
