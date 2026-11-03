import "server-only";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "btcs_session";
const SESSION_DAYS = 30;
export const secureCookies = () => process.env.NODE_ENV === "production";

export async function createSession(userId: number) {
  const token = newToken();
  const d = await db();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await d.insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export type SessionUser = { id: number; sub: string; email: string | null; isOwner: boolean };

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const d = await db();
  const [row] = await d
    .select({ id: schema.users.id, sub: schema.users.sub, email: schema.users.email })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())));
  return row ? { ...row, isOwner: isOwner(row.sub, row.email) } : null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const d = await db();
    await d.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Owner = a Gatekeep `sub` in OWNER_SUBS, or a verified email in OWNER_EMAILS. Fails closed when unset. */
export function isOwner(sub: string, email: string | null) {
  const subs = (process.env.OWNER_SUBS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const emails = (process.env.OWNER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return subs.includes(sub) || (email != null && emails.includes(email.toLowerCase()));
}

/** Reject cross-site state-changing requests (defense in depth on top of SameSite=Lax). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** Only same-site relative paths, to prevent open redirects. */
export function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "/account";
}
