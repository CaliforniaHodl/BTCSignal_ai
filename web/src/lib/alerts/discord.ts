import "server-only";
import { validateDiscordWebhook } from "./rules";

export type DeliveryResult = { ok: true } | { ok: false; error: string; /** webhook is gone — stop using it */ dead: boolean };

/** Post a plain embed to a Discord webhook. Re-validates the URL at send time; never follows redirects. */
export async function sendDiscord(url: string, msg: { title: string; description: string; color: number; footer: string }): Promise<DeliveryResult> {
  const v = validateDiscordWebhook(url);
  if (!v.ok) return { ok: false, error: v.error, dead: true };
  try {
    const res = await fetch(v.url, {
      method: "POST",
      redirect: "error",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(6000),
      body: JSON.stringify({
        username: "BTCSignal.ai alerts",
        allowed_mentions: { parse: [] },
        embeds: [{ title: msg.title.slice(0, 250), description: msg.description.slice(0, 2000), color: msg.color, footer: { text: msg.footer.slice(0, 200) }, timestamp: new Date().toISOString() }],
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Discord HTTP ${res.status}`, dead: res.status === 401 || res.status === 403 || res.status === 404 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), dead: false };
  }
}
