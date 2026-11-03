import "server-only";
/**
 * Shared Claude call for the premium AI tools. Same contract as
 * src/lib/agent/review.ts: claude-opus-5-5, beta.messages.parse +
 * betaZodOutputFormat, adaptive thinking, explicit effort, server-side
 * fallbacks, refusal check, typed errors. Never fabricates an answer: every
 * failure is returned as an error the route turns into an honest HTTP status.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";

export const AI_MODEL = "claude-opus-5-5";

export type AiOk<T> = { ok: true; data: T; model: string; usage: { input: number; output: number } };
export type AiErr = { ok: false; status: number; error: string };

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

/** For routes: 503 when no credentials, so the UI can say "not configured" instead of faking an answer. */
export function notConfigured(): Response | null {
  return aiConfigured()
    ? null
    : Response.json({ error: "AI analysis is not configured on this server (ANTHROPIC_API_KEY missing)." }, { status: 503 });
}

export async function runStructured<S extends z.ZodType>(args: {
  schema: S;
  system: string;
  content: string | BetaContentBlockParam[];
  effort: "low" | "medium" | "high";
  maxTokens?: number;
  tag: string;
}): Promise<AiOk<z.infer<S>> | AiErr> {
  try {
    const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
    const res = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: args.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: args.effort, format: betaZodOutputFormat(args.schema) },
      system: args.system,
      messages: [{ role: "user", content: args.content }],
    });
    if (res.stop_reason === "refusal") {
      return { ok: false, status: 422, error: `Claude declined this request (${res.stop_details?.category ?? "refusal"}).` };
    }
    if (res.stop_reason === "max_tokens") return { ok: false, status: 502, error: "The analysis was cut off before finishing. Try again." };
    const out = res.parsed_output;
    if (!out) return { ok: false, status: 502, error: "Claude returned no parseable result. Try again." };
    return { ok: true, data: out as z.infer<S>, model: res.model, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
  } catch (e) {
    let status = 502;
    let msg = e instanceof Error ? e.message : String(e);
    if (e instanceof Anthropic.RateLimitError) { status = 503; msg = "The AI provider is rate limiting us. Try again in a minute."; }
    else if (e instanceof Anthropic.AuthenticationError) { status = 503; msg = "AI analysis is misconfigured on this server (authentication failed)."; }
    else if (e instanceof Anthropic.BadRequestError) { status = 400; msg = "The AI provider rejected this input (for example, an image it can't read)."; }
    else if (e instanceof Anthropic.APIConnectionTimeoutError) { status = 504; msg = "The analysis timed out. Try again."; }
    else if (e instanceof Anthropic.APIError) { msg = `AI provider error ${e.status ?? ""}`.trim(); }
    else if (e instanceof Anthropic.AnthropicError) { msg = "Claude's answer didn't match the expected format. Try again."; }
    console.error(`[ai:${args.tag}] failed:`, e instanceof Error ? e.message : e);
    return { ok: false, status, error: msg };
  }
}

/** Route helper: AiErr → Response. */
export const errorResponse = (e: AiErr) => Response.json({ error: e.error }, { status: e.status });
