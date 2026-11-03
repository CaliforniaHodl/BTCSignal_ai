import { cookies } from "next/headers";
import { CLAIM_COOKIE, settleInvoice } from "@/lib/pay/access";

export async function GET(req: Request) {
  const hash = new URL(req.url).searchParams.get("hash") ?? "";
  if (!/^[0-9a-f]{64}$/.test(hash)) return Response.json({ error: "bad hash" }, { status: 400 });
  try {
    const r = await settleInvoice(hash, (await cookies()).get(CLAIM_COOKIE)?.value ?? null);
    return Response.json(r, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[pay] status failed", e);
    return Response.json({ status: "pending" }, { headers: { "cache-control": "no-store" } });
  }
}
