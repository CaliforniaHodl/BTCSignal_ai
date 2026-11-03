/**
 * Optional Claude narration of the deterministic radar feed. Claude only sees
 * the computed items (no extra data) and may not introduce numbers of its own.
 * Cached for hours so it is not called per request. Follows lib/agent/review.ts.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { REVIEW_MODEL } from "@/lib/agent/review";
import { loadRadar } from "./load";

const SummarySchema = z.object({
  headline: z.string().describe("One sentence, under 20 words: the single most important change."),
  bullets: z.array(z.string()).describe("2-5 short bullets, each tied to a feed item and citing its numbers."),
  watch: z.string().describe("One sentence on what would confirm or invalidate the read. No price predictions."),
});

export type RadarSummary =
  | { status: "ok"; headline: string; bullets: string[]; watch: string; model: string; writtenAt: number; basedOnItems: number }
  | { status: "refused"; writtenAt: number; reason: string };

const SYSTEM = `You summarise a deterministic Bitcoin market-structure feed for traders.
Each feed item was computed from real exchange, on-chain and sentiment data with fixed thresholds; severity 2 = major, 1 = notable, 0 = quiet.
Rules:
- Use ONLY the numbers in the feed. Never invent figures, levels, or sources.
- Lead with major items. If nothing is notable, say the market is quiet and why that matters.
- Connect items when they genuinely relate (e.g. OI rising while funding climbs), but don't force a narrative.
- No predictions, no advice, no hype. Plain, concrete language.`;

export const summaryConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);

/**
 * Cached for hours. Transient failures throw (so they are NOT cached) and the
 * caller shows "unavailable"; a refusal is a real answer and is cached.
 */
export async function getRadarSummary(): Promise<RadarSummary> {
  "use cache";
  cacheLife("hours");
  cacheTag("radar-summary");

  const radar = await loadRadar();
  const feed = radar.items.map((i) => ({ category: i.category, window: i.window, severity: i.severity, title: i.title, detail: i.detail, source: i.source }));
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  try {
    const res = await client.beta.messages.parse({
      model: REVIEW_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(SummarySchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Feed generated ${new Date(radar.generatedAt).toISOString()}.\nUnavailable sources: ${radar.unavailable.join(", ") || "none"}.\nItems (JSON):\n${JSON.stringify(feed, null, 2)}` }],
    });
    if (res.stop_reason === "refusal") return { status: "refused", writtenAt: Date.now(), reason: res.stop_details?.category ?? "refusal" };
    const out = res.parsed_output;
    if (!out) throw new Error("no parseable summary");
    return { status: "ok", headline: out.headline, bullets: out.bullets.slice(0, 5), watch: out.watch, model: res.model, writtenAt: Date.now(), basedOnItems: feed.length };
  } catch (e) {
    let msg = e instanceof Error ? e.message : String(e);
    if (e instanceof Anthropic.RateLimitError) msg = "rate limited";
    else if (e instanceof Anthropic.AuthenticationError) msg = "authentication failed";
    else if (e instanceof Anthropic.APIError) msg = `API error ${e.status}`;
    console.error("[radar] summary failed:", msg);
    throw new Error(`summary unavailable (${msg})`);
  }
}
