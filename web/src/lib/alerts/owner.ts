import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { alerts } from "@/db/schema-alerts";
import { getSessionUser, secureCookies } from "@/lib/auth/session";
import { hashToken, newToken } from "@/lib/auth/tokens";

export const ALERT_OWNER_COOKIE = "btcs_alerts";

/** Who owns alerts in this request: a signed-in user, this browser's anonymous token, or nobody yet. */
export type Owner = { userId: number | null; tokenHash: string | null };

export async function getOwner(): Promise<Owner> {
  const user = await getSessionUser().catch(() => null);
  const token = (await cookies()).get(ALERT_OWNER_COOKIE)?.value;
  return { userId: user?.id ?? null, tokenHash: token ? hashToken(token) : null };
}

/** For route handlers that create alerts: ensure an anonymous browser has a token cookie. */
export async function getOrCreateOwner(): Promise<Owner & { userId: number | null; tokenHash: string }> {
  const o = await getOwner();
  if (o.tokenHash) return { ...o, tokenHash: o.tokenHash };
  const token = newToken();
  (await cookies()).set(ALERT_OWNER_COOKIE, token, {
    httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 400 * 86_400,
  });
  return { ...o, tokenHash: hashToken(token) };
}

/** SQL predicate: rows owned by this owner (user's alerts plus this browser's anonymous ones). */
export function ownedBy(o: Owner): SQL | null {
  const parts: SQL[] = [];
  if (o.userId != null) parts.push(eq(alerts.userId, o.userId));
  // A browser token only owns alerts that haven't been adopted into an account.
  if (o.tokenHash) parts.push(and(eq(alerts.ownerTokenHash, o.tokenHash), isNull(alerts.userId))!);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : or(...parts)!;
}

/** When signed in, adopt this browser's anonymous alerts into the account. */
export async function claimBrowserAlerts(o: Owner) {
  if (o.userId == null || !o.tokenHash) return;
  const d = await db();
  await d.update(alerts).set({ userId: o.userId }).where(and(eq(alerts.ownerTokenHash, o.tokenHash), isNull(alerts.userId)));
}

export function ipHash(req: Request): string | null {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(`${process.env.ALERTS_IP_SALT ?? "btcs-alerts"}:${ip}`).digest("base64url");
}
