import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema-ai";
import { getSessionUser } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";
import { ACCESS_COOKIE } from "@/lib/pay/access";

/** Requests per rolling hour, per pass/account. */
export const LIMITS = {
  "trade-coach": 20,
  "setup-grader": 12,
  analyze: 12,
  "strategy-parse": 20,
  backtest: 60,
  portfolio: 60,
} as const;
export type Feature = keyof typeof LIMITS;

/** Stable, non-reversible key for whoever holds the Pro access on this request. */
async function identity(): Promise<string | null> {
  const user = await getSessionUser().catch(() => null);
  if (user) return sha(`user:${user.id}`);
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  return token ? sha(`pass:${hashToken(token)}`) : null;
}
const sha = (s: string) => createHash("sha256").update(s).digest("base64url");

/**
 * Call AFTER requirePro() and input validation, right before the expensive work.
 * Returns a 429 Response when over the limit, else null (and records the use).
 */
export async function rateLimit(feature: Feature): Promise<Response | null> {
  const id = await identity();
  if (!id) return Response.json({ error: "No access identity on this request" }, { status: 402 });
  const d = await db();
  const since = new Date(Date.now() - 3600_000);
  const [{ n }] = await d.select({ n: count() }).from(aiUsage)
    .where(and(eq(aiUsage.identity, id), eq(aiUsage.feature, feature), gt(aiUsage.createdAt, since)));
  const limit = LIMITS[feature];
  if (n >= limit) {
    return Response.json(
      { error: `Rate limit: ${limit} ${feature} requests per hour per pass. Try again later.` },
      { status: 429, headers: { "retry-after": "600" } }
    );
  }
  await d.insert(aiUsage).values({ identity: id, feature });
  // ~1% of requests prune day-old rows.
  if (Math.random() < 0.01) await d.delete(aiUsage).where(lt(aiUsage.createdAt, new Date(Date.now() - 86_400_000))).catch(() => {});
  return null;
}
