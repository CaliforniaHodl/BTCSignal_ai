/**
 * Pure alert logic: input validation, condition evaluation, fire/re-arm rules.
 * No I/O so it can be tested exhaustively.
 */
import { z } from "zod";

export const ALERT_KINDS = ["price_above", "price_below", "move_pct", "funding_above", "funding_below", "fear_greed_above", "fear_greed_below"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const KIND_LABEL: Record<AlertKind, string> = {
  price_above: "Price rises above",
  price_below: "Price falls below",
  move_pct: "Price moves by %",
  funding_above: "Funding (8h) above",
  funding_below: "Funding (8h) below",
  fear_greed_above: "Fear & Greed above",
  fear_greed_below: "Fear & Greed below",
};

export const LIMITS = {
  maxActivePerOwner: 20,
  createsPerOwnerPerHour: 10,
  createsPerIpPerHour: 30,
  minCooldownMinutes: 15,
  maxCooldownMinutes: 7 * 24 * 60,
};

/** Discord webhook URLs only: https, discord.com / discordapp.com, /api/webhooks/<id>/<token>. */
export function validateDiscordWebhook(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return { ok: false, error: "Not a valid URL." };
  }
  if (u.protocol !== "https:") return { ok: false, error: "Webhook must use https." };
  if (u.username || u.password || u.port) return { ok: false, error: "Webhook URL must not include credentials or a port." };
  if (!["discord.com", "discordapp.com"].includes(u.hostname.toLowerCase())) return { ok: false, error: "Webhook host must be discord.com or discordapp.com." };
  if (!/^\/api\/webhooks\/\d{5,25}\/[A-Za-z0-9_-]{20,120}$/.test(u.pathname)) return { ok: false, error: "Path must be /api/webhooks/<id>/<token>." };
  if (u.search || u.hash) return { ok: false, error: "Webhook URL must not include a query or fragment." };
  return { ok: true, url: `https://${u.hostname.toLowerCase()}${u.pathname}` };
}

/** Show enough of a webhook to recognise it without exposing the token. */
export const maskWebhook = (url: string | null) => (url ? url.replace(/(\/api\/webhooks\/\d+\/).+$/, (_, p: string) => `${p}••••`) : null);

export const AlertInput = z
  .object({
    kind: z.enum(ALERT_KINDS),
    threshold: z.number().finite(),
    windowHours: z.union([z.literal(1), z.literal(4), z.literal(24)]).optional(),
    direction: z.enum(["up", "down", "either"]).optional(),
    label: z.string().trim().max(80).optional(),
    mode: z.enum(["once", "repeat"]).default("once"),
    cooldownMinutes: z.number().int().min(LIMITS.minCooldownMinutes).max(LIMITS.maxCooldownMinutes).default(60),
    discordWebhookUrl: z.string().trim().max(300).optional(),
  })
  .superRefine((v, ctx) => {
    const bad = (message: string, path: string) => ctx.addIssue({ code: "custom", message, path: [path] });
    if (v.kind.startsWith("price_") && (v.threshold <= 0 || v.threshold > 10_000_000)) bad("Price must be between $0 and $10M.", "threshold");
    if (v.kind === "move_pct") {
      if (v.threshold <= 0 || v.threshold > 50) bad("Move must be between 0 and 50%.", "threshold");
      if (!v.windowHours) bad("Pick a window (1h, 4h or 24h).", "windowHours");
    }
    if (v.kind.startsWith("funding_") && Math.abs(v.threshold) > 1) bad("Funding threshold is a percent per 8h, between -1% and 1%.", "threshold");
    if (v.kind.startsWith("fear_greed_") && (v.threshold < 0 || v.threshold > 100)) bad("Fear & Greed runs 0–100.", "threshold");
    if (v.discordWebhookUrl) {
      const w = validateDiscordWebhook(v.discordWebhookUrl);
      if (!w.ok) bad(w.error, "discordWebhookUrl");
    }
  });
export type AlertInput = z.infer<typeof AlertInput>;

/** Market readings the checker has this run; a missing value means "source down — skip, don't guess". */
export type Readings = {
  price: number | null;
  /** close N hours ago, keyed by hours */
  priceAgo: Partial<Record<1 | 4 | 24, number>>;
  /** OI-weighted average funding per 8h, as a fraction */
  funding8h: number | null;
  fearGreed: number | null;
};

/** Close of the latest 1h candle that had closed `hours` ago (so "4h move" compares against a real print). */
export function priceHoursAgo(hourly: { time: number; close: number }[], nowSec: number, hours: number): number | undefined {
  const target = nowSec - hours * 3600;
  for (let i = hourly.length - 1; i >= 0; i--) if (hourly[i].time + 3600 <= target) return hourly[i].close;
  return undefined;
}

export type AlertRule =Pick<AlertInput, "kind" | "threshold" | "windowHours" | "direction">;

/** The observed value and whether the condition holds. `null` = not evaluable this run. */
export function evaluate(rule: AlertRule, r: Readings): { value: number; met: boolean } | null {
  switch (rule.kind) {
    case "price_above":
      return r.price == null ? null : { value: r.price, met: r.price >= rule.threshold };
    case "price_below":
      return r.price == null ? null : { value: r.price, met: r.price <= rule.threshold };
    case "move_pct": {
      const ago = rule.windowHours ? r.priceAgo[rule.windowHours as 1 | 4 | 24] : undefined;
      if (r.price == null || ago == null || ago <= 0) return null;
      const move = ((r.price - ago) / ago) * 100;
      const dir = rule.direction ?? "either";
      const met = dir === "up" ? move >= rule.threshold : dir === "down" ? move <= -rule.threshold : Math.abs(move) >= rule.threshold;
      return { value: move, met };
    }
    case "funding_above":
    case "funding_below": {
      if (r.funding8h == null) return null;
      const pct = r.funding8h * 100;
      return { value: pct, met: rule.kind === "funding_above" ? pct >= rule.threshold : pct <= rule.threshold };
    }
    case "fear_greed_above":
      return r.fearGreed == null ? null : { value: r.fearGreed, met: r.fearGreed >= rule.threshold };
    case "fear_greed_below":
      return r.fearGreed == null ? null : { value: r.fearGreed, met: r.fearGreed <= rule.threshold };
  }
}

export type AlertState = { mode: "once" | "repeat"; armed: boolean; cooldownMinutes: number; lastFiredAt: Date | null };

/**
 * Fire only on a fresh crossing: the alert must be armed (it re-arms once the
 * condition is seen false), and for repeat alerts the cooldown must have passed.
 */
export function decide(state: AlertState, met: boolean, now: Date): { fire: boolean; armed: boolean; active: boolean } {
  if (!met) return { fire: false, armed: true, active: true };
  const cooled = !state.lastFiredAt || now.getTime() - state.lastFiredAt.getTime() >= state.cooldownMinutes * 60_000;
  if (state.armed && cooled) return { fire: true, armed: false, active: state.mode === "repeat" };
  return { fire: false, armed: state.armed, active: true };
}

export function describe(rule: AlertRule & { label?: string | null }): string {
  const t = rule.threshold;
  const base = (() => {
    switch (rule.kind) {
      case "price_above": return `BTC ≥ $${t.toLocaleString("en-US")}`;
      case "price_below": return `BTC ≤ $${t.toLocaleString("en-US")}`;
      case "move_pct": {
        const d = rule.direction === "up" ? "up" : rule.direction === "down" ? "down" : "up or down";
        return `BTC moves ${d} ${t}% within ${rule.windowHours}h`;
      }
      case "funding_above": return `Funding ≥ ${t}% / 8h`;
      case "funding_below": return `Funding ≤ ${t}% / 8h`;
      case "fear_greed_above": return `Fear & Greed ≥ ${t}`;
      case "fear_greed_below": return `Fear & Greed ≤ ${t}`;
    }
  })();
  return rule.label ? `${rule.label} (${base})` : base;
}

export function formatValue(kind: AlertKind, v: number): string {
  if (kind.startsWith("price_")) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (kind === "move_pct") return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
  if (kind.startsWith("funding_")) return `${v > 0 ? "+" : ""}${v.toFixed(4)}% / 8h`;
  return String(Math.round(v));
}
