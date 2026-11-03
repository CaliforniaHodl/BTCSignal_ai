import { requirePro } from "@/lib/pay/access";
import { aiConfigured } from "@/lib/ai/claude";
import { coachTrade } from "@/lib/ai/features";
import { rateLimit } from "@/lib/ai/rate-limit";
import { computeTradeFacts, TradeInputSchema, validateTrade } from "@/lib/ai/trade-facts";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";

/** Premium. Objective facts first (always), then Claude's critique when configured. */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;

  const body = await req.json().catch(() => null);
  const parsed = TradeInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the trade fields: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ") }, { status: 400 });
  const input = parsed.data;
  const bad = validateTrade(input);
  if (bad) return Response.json({ error: bad }, { status: 400 });

  const [snap, tfCandles, daily] = await Promise.all([getMarketSnapshot(), getCandles(input.timeframe, 300), getCandles("1d", 300)]);
  const facts = computeTradeFacts(input, {
    candles: tfCandles.ok ? tfCandles.value : null,
    daily: daily.ok ? daily.value : null,
    price: snap.spot.ok ? snap.spot.value.price : null,
    funding8h: snap.derivatives.ok ? snap.derivatives.value.avgRate8h : null,
    fearGreed: snap.fearGreed.ok ? { value: snap.fearGreed.value.value, label: snap.fearGreed.value.label } : null,
  });
  const sources = [
    { name: `Coinbase ${input.timeframe} candles`, ok: tfCandles.ok, fetchedAt: tfCandles.fetchedAt },
    { name: "Coinbase daily candles", ok: daily.ok, fetchedAt: daily.fetchedAt },
    { name: "Coinbase spot", ok: snap.spot.ok, fetchedAt: snap.spot.fetchedAt },
    { name: snap.derivatives.source + " funding", ok: snap.derivatives.ok, fetchedAt: snap.derivatives.fetchedAt },
    { name: "alternative.me Fear & Greed", ok: snap.fearGreed.ok, fetchedAt: snap.fearGreed.fetchedAt },
  ];

  if (!aiConfigured()) {
    return Response.json({ facts, sources, coach: null, error: "AI critique is not configured on this server (ANTHROPIC_API_KEY missing). The computed facts above are still valid." }, { status: 503 });
  }
  const limited = await rateLimit("trade-coach");
  if (limited) return limited;

  const r = await coachTrade(input, facts);
  if (!r.ok) return Response.json({ facts, sources, coach: null, error: r.error }, { status: r.status });
  return Response.json({ facts, sources, coach: r.data, model: r.model });
}
