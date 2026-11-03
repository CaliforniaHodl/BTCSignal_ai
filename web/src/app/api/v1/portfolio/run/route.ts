import { requirePro } from "@/lib/pay/access";
import { rateLimit } from "@/lib/ai/rate-limit";
import { runPortfolio } from "@/lib/backtest/portfolio-run";

/** Premium. Preset portfolio strategies over real Coinbase daily history, with Monte Carlo ranges. */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  const limited = await rateLimit("portfolio");
  if (limited) return limited;
  const r = await runPortfolio(body);
  return Response.json(r.body, { status: r.status });
}
