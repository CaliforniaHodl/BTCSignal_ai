import { getCandles, isTimeframe, TIMEFRAMES } from "@/lib/market/snapshot";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tf = url.searchParams.get("tf") ?? "1h";
  if (!isTimeframe(tf)) {
    return Response.json({ error: `tf must be one of ${TIMEFRAMES.join(", ")}` }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 300) || 300, 10), 300);
  const candles = await getCandles(tf, limit);
  return Response.json(candles, {
    status: candles.ok ? 200 : 502,
    headers: { "cache-control": "public, max-age=15, stale-while-revalidate=60" },
  });
}
