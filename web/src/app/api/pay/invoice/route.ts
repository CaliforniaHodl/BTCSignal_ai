import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { getSessionUser, sameOrigin, secureCookies } from "@/lib/auth/session";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { lightning } from "@/lib/pay/lightning";
import { CLAIM_COOKIE } from "@/lib/pay/access";
import { isTier, TIERS } from "@/lib/pay/tiers";

const EXPIRY_SEC = 15 * 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { tier?: unknown };
  if (!isTier(body.tier)) return Response.json({ error: "unknown tier" }, { status: 400 });
  const ln = lightning();
  if (!ln) return Response.json({ error: "Lightning payments aren't configured yet." }, { status: 503 });

  const tier = TIERS[body.tier];
  const jar = await cookies();
  let claim = jar.get(CLAIM_COOKIE)?.value;
  if (!claim) {
    claim = newToken();
    jar.set(CLAIM_COOKIE, claim, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const user = await getSessionUser();
  const origin = new URL(req.url).origin;
  try {
    const inv = await ln.createInvoice({
      sats: tier.sats,
      memo: `BTCSignal.ai ${tier.label}`,
      expirySec: EXPIRY_SEC,
      webhookUrl: origin.startsWith("https://") ? `${origin}/api/pay/webhook` : undefined,
    });
    const d = await db();
    await d.insert(schema.invoices).values({
      paymentHash: inv.paymentHash, bolt11: inv.bolt11, tier: body.tier, amountSats: tier.sats,
      userId: user?.id ?? null, claimTokenHash: hashToken(claim), expiresAt: inv.expiresAt,
    });
    return Response.json({ paymentHash: inv.paymentHash, bolt11: inv.bolt11, sats: tier.sats, expiresAt: inv.expiresAt, mock: ln.name === "mock" });
  } catch (e) {
    console.error("[pay] create invoice failed", e);
    return Response.json({ error: "Couldn't reach the Lightning node. Try again." }, { status: 502 });
  }
}
