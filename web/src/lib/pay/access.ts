import "server-only";
import { cookies } from "next/headers";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser, secureCookies } from "@/lib/auth/session";
import { hashToken, newRecoveryCode, newToken, normaliseRecoveryCode } from "@/lib/auth/tokens";
import { lightning } from "./lightning";
import { TIERS, type TierId } from "./tiers";

export const ACCESS_COOKIE = "btcs_access";
export const CLAIM_COOKIE = "btcs_claim";

export type Access = { tier: TierId; expiresAt: Date; via: "account" | "pass" } | null;

/** The one server-side access check. Every premium page and API calls this. */
export async function getAccess(): Promise<Access> {
  const d = await db();
  const now = new Date();
  const user = await getSessionUser();
  if (user?.isOwner) return { tier: "year", expiresAt: new Date(Date.now() + 365 * 86_400_000), via: "account" };
  if (user) {
    const [e] = await d.select().from(schema.entitlements)
      .where(and(eq(schema.entitlements.userId, user.id), gt(schema.entitlements.expiresAt, now)))
      .orderBy(desc(schema.entitlements.expiresAt)).limit(1);
    if (e) return { tier: e.tier as TierId, expiresAt: e.expiresAt, via: "account" };
  }
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (token) {
    const [e] = await d.select().from(schema.entitlements)
      .where(and(eq(schema.entitlements.accessTokenHash, hashToken(token)), gt(schema.entitlements.expiresAt, now)));
    if (e) return { tier: e.tier as TierId, expiresAt: e.expiresAt, via: "pass" };
  }
  return null;
}

export const hasPro = async () => (await getAccess()) != null;

/**
 * Check an invoice against the node and, if paid, grant exactly one pass
 * (idempotent on payment_hash). Returns the recovery code ONLY on the call that
 * created the pass, and only to the browser holding the matching claim cookie.
 */
export async function settleInvoice(paymentHash: string, claimToken: string | null) {
  const d = await db();
  const [inv] = await d.select().from(schema.invoices).where(eq(schema.invoices.paymentHash, paymentHash));
  if (!inv) return { status: "unknown" as const };
  const isClaimant = claimToken != null && hashToken(claimToken) === inv.claimTokenHash;

  if (inv.status === "pending") {
    const ln = lightning();
    if (!ln) return { status: "pending" as const };
    const paid = await ln.isPaid(paymentHash);
    if (!paid) {
      if (inv.expiresAt < new Date()) {
        await d.update(schema.invoices).set({ status: "expired" }).where(eq(schema.invoices.paymentHash, paymentHash));
        return { status: "expired" as const };
      }
      return { status: "pending" as const };
    }
    await d.update(schema.invoices).set({ status: "paid", paidAt: new Date() }).where(and(eq(schema.invoices.paymentHash, paymentHash), eq(schema.invoices.status, "pending")));
  } else if (inv.status === "expired") {
    return { status: "expired" as const };
  }

  // Paid. Grant once.
  const [existing] = await d.select().from(schema.entitlements).where(eq(schema.entitlements.paymentHash, paymentHash));
  if (existing) {
    if (!isClaimant) return { status: "paid" as const, tier: existing.tier, expiresAt: existing.expiresAt };
    // The buying browser is asking again (e.g. the first response was lost): rotate and re-deliver.
    const code = newRecoveryCode(), tok = newToken();
    await d.update(schema.entitlements).set({ recoveryCodeHash: hashToken(code), accessTokenHash: hashToken(tok) }).where(eq(schema.entitlements.id, existing.id));
    (await cookies()).set(ACCESS_COOKIE, tok, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: existing.expiresAt });
    return { status: "paid" as const, tier: existing.tier, expiresAt: existing.expiresAt, recoveryCode: code };
  }
  // Anonymous purchase: only the buying browser may create the pass, otherwise nobody would ever see its recovery code.
  if (!isClaimant && inv.userId == null) return { status: "paid" as const, awaitingClaim: true };

  const recoveryCode = newRecoveryCode();
  const accessToken = newToken();
  const tier = TIERS[inv.tier as TierId];
  // Stack on top of any pass this user/browser already has, so renewing early never loses time.
  const start = await currentExpiry(inv.userId);
  const startsAt = start && start > new Date() ? start : new Date();
  const expiresAt = new Date(startsAt.getTime() + tier.hours * 3600_000);
  try {
    await d.insert(schema.entitlements).values({
      paymentHash, tier: inv.tier, userId: inv.userId, recoveryCodeHash: hashToken(recoveryCode),
      accessTokenHash: isClaimant ? hashToken(accessToken) : null, startsAt, expiresAt,
    });
  } catch {
    // Lost a race with a concurrent settle (webhook vs poll): the other call granted it.
    const [e] = await d.select().from(schema.entitlements).where(eq(schema.entitlements.paymentHash, paymentHash));
    return { status: "paid" as const, tier: e?.tier, expiresAt: e?.expiresAt };
  }
  if (isClaimant) {
    (await cookies()).set(ACCESS_COOKIE, accessToken, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: expiresAt });
  }
  return { status: "paid" as const, tier: inv.tier, expiresAt, recoveryCode: isClaimant ? recoveryCode : undefined };
}

async function currentExpiry(userId: number | null) {
  const a = userId == null ? await getAccess() : null;
  if (a) return a.expiresAt;
  if (userId == null) return null;
  const d = await db();
  const [e] = await d.select().from(schema.entitlements)
    .where(and(eq(schema.entitlements.userId, userId), gt(schema.entitlements.expiresAt, new Date())))
    .orderBy(desc(schema.entitlements.expiresAt)).limit(1);
  return e?.expiresAt ?? null;
}

/** Recovery code → re-issue this browser's access token. Rotating it signs out the previous browser. */
export async function recoverWithCode(input: string) {
  const code = normaliseRecoveryCode(input);
  if (!code) return { ok: false as const, error: "That doesn't look like a recovery code." };
  const d = await db();
  const [e] = await d.select().from(schema.entitlements).where(eq(schema.entitlements.recoveryCodeHash, hashToken(code)));
  if (!e) return { ok: false as const, error: "No pass found for that code." };
  if (e.expiresAt < new Date()) return { ok: false as const, error: `That pass expired on ${e.expiresAt.toISOString().slice(0, 10)}.` };
  const token = newToken();
  await d.update(schema.entitlements).set({ accessTokenHash: hashToken(token) }).where(eq(schema.entitlements.id, e.id));
  (await cookies()).set(ACCESS_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: e.expiresAt });
  return { ok: true as const, tier: e.tier, expiresAt: e.expiresAt };
}

/** After sign-in: attach the anonymous pass held by this browser to the account. */
export async function claimAnonymousPass(userId: number) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return;
  const d = await db();
  await d.update(schema.entitlements).set({ userId })
    .where(and(eq(schema.entitlements.accessTokenHash, hashToken(token)), isNull(schema.entitlements.userId)));
}
