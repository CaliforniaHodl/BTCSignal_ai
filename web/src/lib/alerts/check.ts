import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { alertEvents, alerts } from "@/db/schema-alerts";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";
import { sendDiscord } from "./discord";
import { decide, describe, evaluate, formatValue, priceHoursAgo, type AlertKind, type AlertRule, type Readings } from "./rules";

const SOURCE: Record<string, string> = {
  price: "Coinbase",
  move: "Coinbase 1h candles",
  funding: "OKX · Deribit · Hyperliquid (OI-weighted)",
  fear: "alternative.me",
};
const sourceFor = (k: string) => (k.startsWith("price_") ? SOURCE.price : k === "move_pct" ? SOURCE.move : k.startsWith("funding_") ? SOURCE.funding : SOURCE.fear);

export type CheckResult = { checked: number; skipped: number; fired: number; delivered: number; failed: number; sources: Record<string, boolean> };

/** One pass over all active alerts. Safe to run concurrently: each fire is claimed with a conditional update. */
export async function runAlertCheck(now = new Date()): Promise<CheckResult> {
  const [snap, hourly] = await Promise.all([getMarketSnapshot(), getCandles("1h", 48)]);
  const nowSec = Math.floor(now.getTime() / 1000);
  const readings: Readings = {
    price: snap.spot.ok ? snap.spot.value.price : null,
    priceAgo: hourly.ok ? { 1: priceHoursAgo(hourly.value, nowSec, 1), 4: priceHoursAgo(hourly.value, nowSec, 4), 24: priceHoursAgo(hourly.value, nowSec, 24) } : {},
    funding8h: snap.derivatives.ok ? snap.derivatives.value.avgRate8h : null,
    fearGreed: snap.fearGreed.ok ? snap.fearGreed.value.value : null,
  };

  const d = await db();
  const rows = await d.select().from(alerts).where(and(eq(alerts.active, true), isNull(alerts.deletedAt))).limit(5000);
  const out: CheckResult = { checked: 0, skipped: 0, fired: 0, delivered: 0, failed: 0, sources: { spot: snap.spot.ok, candles1h: hourly.ok, derivatives: snap.derivatives.ok, fearGreed: snap.fearGreed.ok } };

  for (const a of rows) {
    const rule = { kind: a.kind as AlertKind, threshold: a.threshold, windowHours: (a.windowHours ?? undefined) as AlertRule["windowHours"], direction: (a.direction ?? undefined) as AlertRule["direction"] };
    const ev = evaluate(rule, readings);
    if (!ev) {
      out.skipped++;
      continue;
    }
    out.checked++;
    const next = decide({ mode: a.mode as "once" | "repeat", armed: a.armed, cooldownMinutes: a.cooldownMinutes, lastFiredAt: a.lastFiredAt }, ev.met, now);

    if (!next.fire) {
      await d.update(alerts).set({ armed: next.armed, lastCheckedAt: now, lastValue: ev.value }).where(eq(alerts.id, a.id));
      continue;
    }
    // Claim the fire: only one concurrent run can flip armed → false.
    const claimed = await d
      .update(alerts)
      .set({ armed: false, active: next.active, lastCheckedAt: now, lastValue: ev.value, lastFiredAt: now, fireCount: a.fireCount + 1 })
      .where(and(eq(alerts.id, a.id), eq(alerts.armed, true), eq(alerts.active, true)))
      .returning({ id: alerts.id });
    if (!claimed.length) continue;
    out.fired++;

    const title = `Alert: ${describe({ ...rule, label: a.label })}`;
    const message = `${title} — now ${formatValue(rule.kind, ev.value)}${a.mode === "once" ? " (one-shot, now off)" : ""}`;
    let delivery: "in_app" | "sent" | "failed" = "in_app";
    let deliveryError: string | null = null;
    if (a.discordWebhookUrl) {
      const r = await sendDiscord(a.discordWebhookUrl, {
        title,
        description: `Observed **${formatValue(rule.kind, ev.value)}** (${sourceFor(a.kind)}).`,
        color: 0xf7931a,
        footer: "BTCSignal.ai · not financial advice",
      });
      if (r.ok) {
        delivery = "sent";
        out.delivered++;
      } else {
        delivery = "failed";
        deliveryError = r.error;
        out.failed++;
        if (r.dead) await d.update(alerts).set({ discordWebhookUrl: null }).where(eq(alerts.id, a.id));
      }
    }
    await d.insert(alertEvents).values({ alertId: a.id, firedAt: now, observedValue: ev.value, message, source: sourceFor(a.kind), delivery, deliveryError });
  }
  return out;
}
