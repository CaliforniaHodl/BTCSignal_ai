import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (v: string) => createHash("sha256").update(v).digest();

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fails closed in
 * production; in local dev with no secret configured, requests are allowed.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (secret.length < 32) return false;
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(h.slice(7).trim()), digest(secret));
}
