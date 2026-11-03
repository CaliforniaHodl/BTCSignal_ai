import { preflight, publicError, publicJson } from "@/lib/api/public";
import { getCandles, isTimeframe, TIMEFRAMES } from "@/lib/market/snapshot";

/** GET /api/v1/candles?tf=1h&limit=300 — Coinbase BTC-USD OHLCV, ascending. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tf = url.searchParams.get("tf") ?? "1h";
  if (!isTimeframe(tf)) return publicError(`tf must be one of ${TIMEFRAMES.join(", ")}`);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 300) || 300, 10), 300);
  const candles = await getCandles(tf, limit);
  return publicJson(candles, { maxAge: candles.ok ? 15 : 5, swr: 60, status: candles.ok ? 200 : 502 });
}

export const OPTIONS = preflight;
