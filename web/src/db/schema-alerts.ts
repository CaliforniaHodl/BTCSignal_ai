import { boolean, doublePrecision, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * A user-defined market alert. Owned by a signed-in user OR an anonymous
 * browser (only the SHA-256 of its cookie token is stored). Soft-deleted so
 * creation rate limits can't be dodged by delete/re-create.
 */
export const alerts = pgTable(
  "alerts",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    ownerTokenHash: text("owner_token_hash"),
    /** SHA-256 of client IP + server salt; only used for creation rate limits. */
    creatorIpHash: text("creator_ip_hash"),
    /** "price_above" | "price_below" | "move_pct" | "funding_above" | "funding_below" | "fear_greed_above" | "fear_greed_below" */
    kind: text("kind").notNull(),
    /** USD for price, percent for move_pct / funding (per 8h), index points for fear & greed. */
    threshold: doublePrecision("threshold").notNull(),
    /** move_pct only: lookback in hours (1 | 4 | 24). */
    windowHours: integer("window_hours"),
    /** move_pct only: "up" | "down" | "either". */
    direction: text("direction"),
    label: text("label"),
    /** "once" = disable after firing; "repeat" = re-arm after the condition clears and the cooldown passes. */
    mode: text("mode").notNull().default("once"),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(60),
    /** Discord webhook (validated host/path). Null = in-app history only. */
    discordWebhookUrl: text("discord_webhook_url"),
    active: boolean("active").notNull().default(true),
    /** False after firing until the condition is observed false again (prevents re-firing every check). */
    armed: boolean("armed").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastValue: doublePrecision("last_value"),
    lastFiredAt: timestamp("last_fired_at", { withTimezone: true }),
    fireCount: integer("fire_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("alerts_user_idx").on(t.userId),
    index("alerts_owner_token_idx").on(t.ownerTokenHash),
    index("alerts_active_idx").on(t.active),
    index("alerts_created_idx").on(t.createdAt),
  ]
);

/** Every time an alert fired, what it saw, and whether delivery worked. */
export const alertEvents = pgTable(
  "alert_events",
  {
    id: serial("id").primaryKey(),
    alertId: integer("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
    firedAt: timestamp("fired_at", { withTimezone: true }).notNull().defaultNow(),
    observedValue: doublePrecision("observed_value").notNull(),
    message: text("message").notNull(),
    source: text("source").notNull(),
    /** "in_app" (no webhook) | "sent" | "failed" */
    delivery: text("delivery").notNull(),
    deliveryError: text("delivery_error"),
  },
  (t) => [index("alert_events_alert_idx").on(t.alertId), index("alert_events_fired_idx").on(t.firedAt)]
);

export type Alert = typeof alerts.$inferSelect;
export type AlertEvent = typeof alertEvents.$inferSelect;
