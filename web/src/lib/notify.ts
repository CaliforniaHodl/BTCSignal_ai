import "server-only";

/**
 * Outbound announcements for agent trades. OFF unless NOTIFY_AGENT=1 (social is
 * paused during the rebuild). Channels activate individually by env:
 *   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID   (a channel the bot can post to)
 *   DISCORD_WEBHOOK_URL                     (https://discord.com/api/webhooks/...)
 * Failures are logged and swallowed: notifications never block trading.
 */
export async function announce(text: string) {
  if (process.env.NOTIFY_AGENT !== "1") return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const body = `${text}\n${site}/agent`;
  const jobs: Promise<unknown>[] = [];
  const tg = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (tg && chat) {
    jobs.push(fetch(`https://api.telegram.org/bot${tg}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: body, disable_web_page_preview: true }), signal: AbortSignal.timeout(8000),
    }));
  }
  const dc = process.env.DISCORD_WEBHOOK_URL;
  if (dc && /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(dc)) {
    jobs.push(fetch(dc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: body.slice(0, 1900), allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(8000) }));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === "rejected") console.warn("[notify] failed:", r.reason);
}
