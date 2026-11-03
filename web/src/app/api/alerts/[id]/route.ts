import { getOwner } from "@/lib/alerts/owner";
import { deleteAlert, setActive } from "@/lib/alerts/store";
import { sameOrigin } from "@/lib/auth/session";

const parseId = (s: string) => (/^\d{1,10}$/.test(s) ? Number(s) : null);

export async function DELETE(req: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  if (!sameOrigin(req)) return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
  const id = parseId((await ctx.params).id);
  if (id == null) return Response.json({ error: "Bad id" }, { status: 400 });
  const ok = await deleteAlert(await getOwner(), id);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/alerts/[id]">) {
  if (!sameOrigin(req)) return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
  const id = parseId((await ctx.params).id);
  if (id == null) return Response.json({ error: "Bad id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { active?: unknown } | null;
  if (typeof body?.active !== "boolean") return Response.json({ error: "Body must be {active: boolean}" }, { status: 400 });
  const a = await setActive(await getOwner(), id, body.active);
  return a ? Response.json({ alert: a }) : Response.json({ error: "Not found or active-alert limit reached" }, { status: 404 });
}
