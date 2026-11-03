import { settleInvoice } from "@/lib/pay/access";

/**
 * LNbits calls this when an invoice is paid. The body is NOT trusted: we only
 * take the payment hash from it and verify with the node ourselves. The webhook
 * never returns a recovery code (no claimant browser here).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { payment_hash?: string };
  const hash = body.payment_hash ?? "";
  if (/^[0-9a-f]{64}$/.test(hash)) {
    try { await settleInvoice(hash, null); } catch (e) { console.error("[pay] webhook settle failed", e); }
  }
  return new Response(null, { status: 204 });
}
