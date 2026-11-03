import { describe as group, expect, it } from "vitest";
import { AlertInput, decide, describe, evaluate, maskWebhook, priceHoursAgo, validateDiscordWebhook, type Readings } from "./rules";

const HOOK = "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_-0123456789";

group("validateDiscordWebhook", () => {
  it("accepts discord.com and discordapp.com webhooks", () => {
    expect(validateDiscordWebhook(HOOK)).toEqual({ ok: true, url: HOOK });
    expect(validateDiscordWebhook(HOOK.replace("discord.com", "DiscordApp.com")).ok).toBe(true);
  });
  it.each([
    ["http", HOOK.replace("https", "http")],
    ["other host", HOOK.replace("discord.com", "evil.com")],
    ["lookalike subdomain", HOOK.replace("discord.com", "discord.com.evil.com")],
    ["subdomain", HOOK.replace("discord.com", "x.discord.com")],
    ["userinfo", HOOK.replace("https://", "https://a:b@")],
    ["port", HOOK.replace("discord.com", "discord.com:8443")],
    ["wrong path", "https://discord.com/api/v10/channels/123/messages"],
    ["path traversal", "https://discord.com/api/webhooks/123456789012345678/../../users/@me"],
    ["query", HOOK + "?wait=true"],
    ["garbage", "not a url"],
  ])("rejects %s", (_, url) => {
    expect(validateDiscordWebhook(url).ok).toBe(false);
  });
  it("masks the token", () => {
    expect(maskWebhook(HOOK)).toBe("https://discord.com/api/webhooks/123456789012345678/••••");
  });
});

group("AlertInput", () => {
  it("requires a window for move alerts", () => {
    expect(AlertInput.safeParse({ kind: "move_pct", threshold: 3 }).success).toBe(false);
    expect(AlertInput.safeParse({ kind: "move_pct", threshold: 3, windowHours: 4 }).success).toBe(true);
  });
  it("bounds thresholds and cooldown", () => {
    expect(AlertInput.safeParse({ kind: "price_above", threshold: -1 }).success).toBe(false);
    expect(AlertInput.safeParse({ kind: "fear_greed_below", threshold: 101 }).success).toBe(false);
    expect(AlertInput.safeParse({ kind: "funding_above", threshold: 0.03, cooldownMinutes: 1 }).success).toBe(false);
  });
  it("rejects bad webhooks", () => {
    expect(AlertInput.safeParse({ kind: "price_above", threshold: 1, discordWebhookUrl: "https://example.com/x" }).success).toBe(false);
  });
});

group("evaluate", () => {
  const r: Readings = { price: 100_000, priceAgo: { 1: 99_000, 4: 104_000 }, funding8h: 0.0002, fearGreed: 20 };
  it("price thresholds", () => {
    expect(evaluate({ kind: "price_above", threshold: 99_000 }, r)).toEqual({ value: 100_000, met: true });
    expect(evaluate({ kind: "price_below", threshold: 99_000 }, r)?.met).toBe(false);
  });
  it("moves respect direction and window", () => {
    expect(evaluate({ kind: "move_pct", threshold: 1, windowHours: 1, direction: "up" }, r)?.met).toBe(true);
    expect(evaluate({ kind: "move_pct", threshold: 1, windowHours: 1, direction: "down" }, r)?.met).toBe(false);
    expect(evaluate({ kind: "move_pct", threshold: 3, windowHours: 4, direction: "either" }, r)?.met).toBe(true);
    expect(evaluate({ kind: "move_pct", threshold: 3, windowHours: 24 }, r)).toBeNull();
  });
  it("funding is compared in percent", () => {
    expect(evaluate({ kind: "funding_above", threshold: 0.01 }, r)?.met).toBe(true);
    expect(evaluate({ kind: "funding_below", threshold: 0 }, r)?.met).toBe(false);
  });
  it("missing sources are not evaluable", () => {
    expect(evaluate({ kind: "fear_greed_above", threshold: 50 }, { ...r, fearGreed: null })).toBeNull();
    expect(evaluate({ kind: "price_above", threshold: 1 }, { ...r, price: null })).toBeNull();
  });
});

group("decide", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  it("one-shot fires once and deactivates", () => {
    expect(decide({ mode: "once", armed: true, cooldownMinutes: 60, lastFiredAt: null }, true, now)).toEqual({ fire: true, armed: false, active: false });
  });
  it("repeat does not re-fire while the condition stays true", () => {
    const s = { mode: "repeat" as const, armed: false, cooldownMinutes: 60, lastFiredAt: new Date(now.getTime() - 5 * 3600_000) };
    expect(decide(s, true, now).fire).toBe(false);
  });
  it("re-arms when the condition clears, then honours cooldown", () => {
    const fired = new Date(now.getTime() - 10 * 60_000);
    const cleared = decide({ mode: "repeat", armed: false, cooldownMinutes: 60, lastFiredAt: fired }, false, now);
    expect(cleared).toEqual({ fire: false, armed: true, active: true });
    expect(decide({ mode: "repeat", armed: true, cooldownMinutes: 60, lastFiredAt: fired }, true, now).fire).toBe(false);
    expect(decide({ mode: "repeat", armed: true, cooldownMinutes: 5, lastFiredAt: fired }, true, now)).toEqual({ fire: true, armed: false, active: true });
  });
});

it("priceHoursAgo uses closed candles only", () => {
  const c = [0, 1, 2, 3, 4, 5].map((i) => ({ time: i * 3600, close: 100 + i }));
  // now = 6h30m: 1h ago = 5h30m → latest candle closed by then opened at 4h
  expect(priceHoursAgo(c, 6.5 * 3600, 1)).toBe(104);
  expect(priceHoursAgo(c, 6.5 * 3600, 4)).toBe(101);
  expect(priceHoursAgo(c, 6.5 * 3600, 24)).toBeUndefined();
});

it("describe", () => {
  expect(describe({ kind: "move_pct", threshold: 3, windowHours: 4, direction: "down" })).toBe("BTC moves down 3% within 4h");
  expect(describe({ kind: "price_above", threshold: 120000, label: "ATH" })).toBe("ATH (BTC ≥ $120,000)");
});
