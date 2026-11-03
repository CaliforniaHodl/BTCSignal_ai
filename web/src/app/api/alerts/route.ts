import { connection } from "next/server";
import { claimBrowserAlerts, getOrCreateOwner, getOwner, ipHash } from "@/lib/alerts/owner";
import { AlertInput } from "@/lib/alerts/rules";
import { createAlert, listAlerts } from "@/lib/alerts/store";
import { sameOrigin } from "@/lib/auth/session";

const noStore = { "cache-control": "no-store" };

export async function GET() {
  await connection();
  const o = await getOwner();
  await claimBrowserAlerts(o);
  return Response.json({ alerts: await listAlerts(o) }, { headers: noStore });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const parsed = AlertInput.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: issue?.message ?? "Invalid alert", field: issue?.path?.[0] }, { status: 400 });
  }
  const owner = await getOrCreateOwner();
  const r = await createAlert(owner, parsed.data, ipHash(req));
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status, headers: noStore });
  return Response.json({ alert: r.alert }, { status: 201, headers: noStore });
}
