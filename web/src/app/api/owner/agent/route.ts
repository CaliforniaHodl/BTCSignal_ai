import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser, sameOrigin } from "@/lib/auth/session";
import { runTick } from "@/lib/agent/tick";

export const maxDuration = 300;

/** Owner-only controls: kill switch and manual tick. Requires a Gatekeep session whose sub/email is in OWNER_*. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await getSessionUser();
  if (!user?.isOwner) return Response.json({ error: "owner only" }, { status: 403 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const d = await db();
  if (action === "disable") {
    await d.update(schema.agentAccount).set({ enabled: false, haltedReason: `Kill switch by owner (${user.email ?? user.sub})` }).where(eq(schema.agentAccount.id, 1));
    return Response.json({ ok: true });
  }
  if (action === "enable") {
    await d.update(schema.agentAccount).set({ enabled: true, haltedReason: null }).where(eq(schema.agentAccount.id, 1));
    return Response.json({ ok: true });
  }
  if (action === "tick") return Response.json(await runTick({ force: true }));
  return Response.json({ error: "unknown action" }, { status: 400 });
}
