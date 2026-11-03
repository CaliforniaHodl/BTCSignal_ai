import { getCandles, isTimeframe, TIMEFRAMES } from "@/lib/market/snapshot";
import { requirePro } from "@/lib/pay/access";
import { liquidityMap } from "@/lib/patterns/liquidity";

export type LiquidityResponse = {
  candles: Awaited<ReturnType<typeof getCandles>>;
  daily: { ok: boolean; source: string; fetchedAt: number };
  map: ReturnType<typeof liquidityMap>;
  horizonBars: number;
};

const HORIZON: Record<string, number> = { "15m": 96, "1h": 48, "4h": 30, "1d": 20 };

/** Premium: deterministic sweep-zone map on the candles returned alongside. */
export async function GET(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const tf = new URL(req.url).searchParams.get("tf") ?? "1h";
  if (!isTimeframe(tf)) return Response.json({ error: `tf must be one of ${TIMEFRAMES.join(", ")}` }, { status: 400 });
  const [candles, daily] = await Promise.all([getCandles(tf, 300), getCandles("1d", 30)]);
  const horizonBars = HORIZON[tf];
  const body: LiquidityResponse = {
    candles,
    daily: { ok: daily.ok, source: daily.source, fetchedAt: daily.fetchedAt },
    map: candles.ok ? liquidityMap(candles.value, { daily: daily.ok ? daily.value : undefined, horizonBars }) : null,
    horizonBars,
  };
  return Response.json(body, { status: candles.ok ? 200 : 502, headers: { "cache-control": "private, no-store" } });
}
