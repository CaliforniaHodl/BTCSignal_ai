/**
 * Claude as risk reviewer. It sees the rule-based proposal and market context and
 * may APPROVE, REDUCE (size multiplier < 1) or VETO. It cannot add size, move
 * stops, or open trades the rules didn't propose. Any failure = veto (fail-safe).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { EngineSignal } from "@/lib/engine/signal";
import type { MarketSnapshot } from "@/lib/market/types";
import type { RiskResult } from "./risk";

export const REVIEW_MODEL = "claude-opus-5-5";

const ReviewSchema = z.object({
  decision: z.enum(["approve", "reduce", "veto"]),
  size_multiplier: z.number().describe("1.0 for approve; between 0.25 and 0.9 for reduce; 0 for veto"),
  reasoning: z.string().describe("2-4 plain sentences for a public trade log. No hype, no certainty."),
  key_risks: z.array(z.string()).describe("Up to 4 short phrases"),
});

export type Review = {
  mode: "claude" | "rules-only";
  decision: "approve" | "reduce" | "veto";
  sizeMultiplier: number;
  reasoning: string;
  keyRisks: string[];
  model?: string;
  usage?: { input: number; output: number };
  error?: string;
};

const SYSTEM = `You are the risk reviewer for a Bitcoin paper-trading agent whose every decision is published.
A deterministic rules engine has proposed a trade and it has already passed hard risk limits.
Your only powers: approve it, reduce its size, or veto it. You cannot increase size, change stops/targets, or flip direction.

Review like a skeptical desk risk manager:
- Does the market context (derivatives positioning, sentiment, volatility, nearby levels, recent agent losses) undermine the setup?
- Are the factors driving the signal in genuine agreement, or is one factor carrying a weak case?
- Is the stop placed somewhere obvious given nearby levels?
Veto when the context clearly contradicts the trade. Reduce when the case is real but has a specific, nameable weakness. Approve otherwise; do not veto just because markets are uncertain — they always are.
Write the reasoning for the public log: concrete, cite the numbers you used, 2-4 sentences.`;

export async function reviewTrade(args: {
  signal: EngineSignal;
  risk: RiskResult;
  snapshot: MarketSnapshot;
  recent: { summary: string; at: string }[];
  levels: { price: number; kind: string; touches: number }[];
}): Promise<Review> {
  if (process.env.AGENT_REVIEW === "rules" || !hasAnthropicCredentials()) {
    return {
      mode: "rules-only",
      decision: "approve",
      sizeMultiplier: 1,
      reasoning: "Claude review is not configured; rules engine and hard risk limits only.",
      keyRisks: [],
    };
  }

  const { signal, risk, snapshot, recent, levels } = args;
  const context = {
    proposal: {
      side: signal.direction,
      entry: round(signal.price),
      stop: round(signal.stop),
      target: round(signal.target),
      reward_to_risk: signal.stop && signal.target ? +(Math.abs(signal.target - signal.price) / Math.abs(signal.price - signal.stop)).toFixed(2) : null,
      size_btc: risk.qtyBtc,
      notional_usd: round(risk.notionalUsd),
      risk_usd: round(risk.riskUsd),
      horizon_hours: signal.horizonHours,
    },
    signal: {
      score: +signal.score.toFixed(3),
      confidence: +signal.confidence.toFixed(3),
      data_coverage: +signal.coverage.toFixed(2),
      factors: signal.factors.map((f) => ({ factor: f.label, value: f.value == null ? null : +f.value.toFixed(2), weight: f.weight, detail: f.detail })),
    },
    market: {
      spot: snapshot.spot.ok ? { price: round(snapshot.spot.value.price), change_24h_pct: +snapshot.spot.value.change24hPct.toFixed(2), high_24h: round(snapshot.spot.value.high24h), low_24h: round(snapshot.spot.value.low24h) } : "unavailable",
      derivatives: snapshot.derivatives.ok
        ? { avg_funding_8h_pct: +(snapshot.derivatives.value.avgRate8h * 100).toFixed(4), open_interest_usd: round(snapshot.derivatives.value.totalOpenInterestUsd), venues: snapshot.derivatives.value.venues.map((v) => `${v.venue} ${(v.rate8h * 100).toFixed(4)}%`) }
        : "unavailable",
      fear_greed: snapshot.fearGreed.ok ? snapshot.fearGreed.value : "unavailable",
      btc_dominance_pct: snapshot.global.ok ? +snapshot.global.value.btcDominancePct.toFixed(1) : "unavailable",
      atr_4h: round(signal.atr4h),
      key_levels_1h: levels.map((l) => `${l.kind} ${round(l.price)} (${l.touches} touches)`),
    },
    recent_agent_activity: recent,
  };

  try {
    const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
    const res = await client.beta.messages.parse({
      model: REVIEW_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: "high", format: betaZodOutputFormat(ReviewSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Review this proposed trade. Context (JSON):\n${JSON.stringify(context, null, 2)}` }],
    });

    if (res.stop_reason === "refusal") return veto(`Review declined (${res.stop_details?.category ?? "refusal"}); treating as veto.`, res.model);
    const out = res.parsed_output;
    if (!out) return veto("Review returned no parseable decision; treating as veto.", res.model);

    // Enforce the contract in code, not just in the prompt.
    let mult = out.decision === "veto" ? 0 : out.decision === "approve" ? 1 : Math.min(0.9, Math.max(0.25, out.size_multiplier));
    if (!Number.isFinite(mult)) mult = 0;
    return {
      mode: "claude",
      decision: out.decision,
      sizeMultiplier: mult,
      reasoning: out.reasoning,
      keyRisks: out.key_risks.slice(0, 4),
      model: res.model,
      usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    };
  } catch (e) {
    let msg = e instanceof Error ? e.message : String(e);
    if (e instanceof Anthropic.RateLimitError) msg = "rate limited";
    else if (e instanceof Anthropic.AuthenticationError) msg = "authentication failed";
    else if (e instanceof Anthropic.APIError) msg = `API error ${e.status}`;
    console.error("[agent] review failed:", msg);
    return { ...veto(`Review unavailable (${msg}); fail-safe veto.`), error: msg };
  }
}

function veto(reasoning: string, model?: string): Review {
  return { mode: "claude", decision: "veto", sizeMultiplier: 0, reasoning, keyRisks: [], model };
}

function hasAnthropicCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

const round = (n: number | null | undefined) => (n == null ? null : Math.round(n));
