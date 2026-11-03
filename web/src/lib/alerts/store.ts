import "server-only";
import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { alertEvents, alerts, type Alert } from "@/db/schema-alerts";
import { ownedBy, type Owner } from "./owner";
import { LIMITS, maskWebhook, validateDiscordWebhook, type AlertInput } from "./rules";

/** What the browser is allowed to see about an alert (never the webhook token). */
export type AlertView = Omit<Alert, "discordWebhookUrl" | "ownerTokenHash" | "creatorIpHash" | "userId" | "deletedAt"> & { webhook: string | null };

export const toView = (a: Alert): AlertView => ({
  id: a.id, createdAt: a.createdAt, kind: a.kind, threshold: a.threshold, windowHours: a.windowHours, direction: a.direction, label: a.label,
  mode: a.mode, cooldownMinutes: a.cooldownMinutes, active: a.active, armed: a.armed, lastCheckedAt: a.lastCheckedAt, lastValue: a.lastValue,
  lastFiredAt: a.lastFiredAt, fireCount: a.fireCount, webhook: maskWebhook(a.discordWebhookUrl),
});

export async function listAlerts(o: Owner): Promise<AlertView[]> {
  const where = ownedBy(o);
  if (!where) return [];
  const d = await db();
  const rows = await d.select().from(alerts).where(and(where, isNull(alerts.deletedAt))).orderBy(desc(alerts.createdAt)).limit(100);
  return rows.map(toView);
}

export type CreateResult = { ok: true; alert: AlertView } | { ok: false; status: number; error: string };

export async function createAlert(o: Owner & { tokenHash: string }, input: AlertInput, ipHash: string | null): Promise<CreateResult> {
  const d = await db();
  const hourAgo = new Date(Date.now() - 3600_000);
  const where = ownedBy(o)!;

  const [[active], [recent], ipRecent] = await Promise.all([
    d.select({ n: count() }).from(alerts).where(and(where, eq(alerts.active, true), isNull(alerts.deletedAt))),
    d.select({ n: count() }).from(alerts).where(and(where, gt(alerts.createdAt, hourAgo))),
    ipHash ? d.select({ n: count() }).from(alerts).where(and(eq(alerts.creatorIpHash, ipHash), gt(alerts.createdAt, hourAgo))) : Promise.resolve([{ n: 0 }]),
  ]);
  if ((active?.n ?? 0) >= LIMITS.maxActivePerOwner) return { ok: false, status: 429, error: `You can have at most ${LIMITS.maxActivePerOwner} active alerts. Delete one first.` };
  if ((recent?.n ?? 0) >= LIMITS.createsPerOwnerPerHour || (ipRecent[0]?.n ?? 0) >= LIMITS.createsPerIpPerHour) {
    return { ok: false, status: 429, error: "Too many alerts created in the last hour. Try again later." };
  }

  const webhook = input.discordWebhookUrl ? validateDiscordWebhook(input.discordWebhookUrl) : null;
  if (webhook && !webhook.ok) return { ok: false, status: 400, error: webhook.error };

  const [row] = await d
    .insert(alerts)
    .values({
      userId: o.userId,
      ownerTokenHash: o.tokenHash,
      creatorIpHash: ipHash,
      kind: input.kind,
      threshold: input.threshold,
      windowHours: input.kind === "move_pct" ? (input.windowHours ?? null) : null,
      direction: input.kind === "move_pct" ? (input.direction ?? "either") : null,
      label: input.label || null,
      mode: input.mode,
      cooldownMinutes: input.cooldownMinutes,
      discordWebhookUrl: webhook?.ok ? webhook.url : null,
    })
    .returning();
  return { ok: true, alert: toView(row) };
}

/** Soft delete (so rate limits still count it). Returns whether a row was removed. */
export async function deleteAlert(o: Owner, id: number): Promise<boolean> {
  const where = ownedBy(o);
  if (!where) return false;
  const d = await db();
  const r = await d.update(alerts).set({ deletedAt: new Date(), active: false }).where(and(where, eq(alerts.id, id), isNull(alerts.deletedAt))).returning({ id: alerts.id });
  return r.length > 0;
}

/** Pause/resume. Resuming re-arms so a one-shot can be reused. */
export async function setActive(o: Owner, id: number, active: boolean): Promise<AlertView | null> {
  const where = ownedBy(o);
  if (!where) return null;
  const d = await db();
  if (active) {
    const [n] = await d.select({ n: count() }).from(alerts).where(and(where, eq(alerts.active, true), isNull(alerts.deletedAt)));
    if ((n?.n ?? 0) >= LIMITS.maxActivePerOwner) return null;
  }
  const [row] = await d.update(alerts).set({ active, armed: true }).where(and(where, eq(alerts.id, id), isNull(alerts.deletedAt))).returning();
  return row ? toView(row) : null;
}

export type HistoryRow = { id: number; alertId: number; firedAt: Date; observedValue: number; message: string; source: string; delivery: string; deliveryError: string | null; kind: string; deleted: boolean };

export async function listHistory(o: Owner, limit = 200): Promise<HistoryRow[]> {
  const where = ownedBy(o);
  if (!where) return [];
  const d = await db();
  const mine = await d.select({ id: alerts.id, kind: alerts.kind, deletedAt: alerts.deletedAt }).from(alerts).where(where);
  if (!mine.length) return [];
  const meta = new Map(mine.map((a) => [a.id, a]));
  const ev = await d.select().from(alertEvents).where(inArray(alertEvents.alertId, [...meta.keys()])).orderBy(desc(alertEvents.firedAt)).limit(limit);
  return ev.map((e) => ({ ...e, kind: meta.get(e.alertId)?.kind ?? "?", deleted: meta.get(e.alertId)?.deletedAt != null }));
}
