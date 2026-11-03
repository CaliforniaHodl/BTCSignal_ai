import { getCandles, isTimeframe, TIMEFRAMES } from "@/lib/market/snapshot";
import { requirePro } from "@/lib/pay/access";
import { detectPatterns } from "@/lib/patterns/chart-patterns";
import { fairValueGaps, orderBlocks } from "@/lib/patterns/smc";

export type PatternsResponse = {
  candles: Awaited<ReturnType<typeof getCandles>>;
  patterns: ReturnType<typeof detectPatterns>;
  fvgs: ReturnType<typeof fairValueGaps>;
  orderBlocks: ReturnType<typeof orderBlocks>;
};

/** Premium: chart patterns + FVG/order blocks on the exact candles returned alongside. */
export async function GET(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const tf = new URL(req.url).searchParams.get("tf") ?? "1h";
  if (!isTimeframe(tf)) return Response.json({ error: `tf must be one of ${TIMEFRAMES.join(", ")}` }, { status: 400 });
  const candles = await getCandles(tf, 300);
  const cs = candles.ok ? candles.value : [];
  const body: PatternsResponse = {
    candles,
    patterns: detectPatterns(cs),
    // Most recent unfilled gaps / live blocks only; older ones are history.
    fvgs: fairValueGaps(cs).filter((g) => g.status !== "filled").slice(-8),
    orderBlocks: orderBlocks(cs).filter((o) => o.status !== "invalidated").slice(-6),
  };
  return Response.json(body, { status: candles.ok ? 200 : 502, headers: { "cache-control": "private, no-store" } });
}
