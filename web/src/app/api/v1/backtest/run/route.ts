import { requirePro } from "@/lib/pay/access";
import { rateLimit } from "@/lib/ai/rate-limit";
import { runBacktest } from "@/lib/backtest/run";

/** Premium. Deterministic backtest of a validated rule spec over real Coinbase candles. */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  const limited = await rateLimit("backtest");
  if (limited) return limited;
  const r = await runBacktest(body);
  return Response.json(r.body, { status: r.status });
}
