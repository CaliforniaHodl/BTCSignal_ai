import { sameOrigin } from "@/lib/auth/session";
import { recoverWithCode } from "@/lib/pay/access";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (typeof code !== "string" || code.length > 64) return Response.json({ ok: false, error: "Enter your recovery code." }, { status: 400 });
  // Codes carry ~80 bits of entropy, so online guessing is infeasible; a small delay still blunts scripts.
  await new Promise((r) => setTimeout(r, 400));
  const r = await recoverWithCode(code);
  return Response.json(r, { status: r.ok ? 200 : 404 });
}
