import { requirePro } from "@/lib/pay/access";
import { errorResponse, notConfigured } from "@/lib/ai/claude";
import { parseStrategy } from "@/lib/ai/features";
import { rateLimit } from "@/lib/ai/rate-limit";

/** Premium. { text } → a strict rule spec for the user to confirm/edit. Never runs the backtest. */
export async function POST(req: Request) {
  const deny = await requirePro();
  if (deny) return deny;
  const off = notConfigured();
  if (off) return off;

  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 10) return Response.json({ error: "Describe the strategy in at least a sentence." }, { status: 400 });
  if (text.length > 2000) return Response.json({ error: "Keep the description under 2,000 characters." }, { status: 400 });

  const limited = await rateLimit("strategy-parse");
  if (limited) return limited;

  const r = await parseStrategy(text);
  if (!r.ok) return errorResponse(r);
  return Response.json({ ...r.data, model: r.model });
}
