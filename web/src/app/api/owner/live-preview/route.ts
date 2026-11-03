import { getSessionUser, sameOrigin } from "@/lib/auth/session";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { balances, LIVE_MAX_USD, liveConfigured, previewOrder } from "@/lib/agent/live/coinbase";

/**
 * Owner-only DRY RUN against the real Coinbase account: reads balances and asks
 * Coinbase to preview a small market buy (fees, slippage). Never places an order.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user?.isOwner) return Response.json({ error: "owner only" }, { status: 403 });
  if (!liveConfigured()) return Response.json({ error: "Set COINBASE_KEY_NAME and COINBASE_PRIVATE_KEY (ES256 CDP key, View + Trade scope) to run a dry run." }, { status: 503 });
  const snap = await getMarketSnapshot();
  if (!snap.spot.ok) return Response.json({ error: "price unavailable" }, { status: 502 });
  const { usd } = (await req.json().catch(() => ({}))) as { usd?: number };
  const quoteUsd = Math.min(Math.max(Number(usd) || 10, 1), LIVE_MAX_USD);
  try {
    const [bal, pv] = await Promise.all([balances(), previewOrder({ side: "BUY", type: "market", quoteUsd }, snap.spot.value.price)]);
    return Response.json({ ok: true, dryRun: true, price: snap.spot.value.price, balances: bal, order: { side: "BUY", quoteUsd }, preview: pv.preview });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
