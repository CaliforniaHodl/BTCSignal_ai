import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { exchangeCode } from "@/lib/auth/oidc";
import { createSession } from "@/lib/auth/session";
import { claimAnonymousPass } from "@/lib/pay/access";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const raw = jar.get("btcs_oidc")?.value;
  jar.delete({ name: "btcs_oidc", path: "/api/auth" });
  const fail = (msg: string) => Response.redirect(`${url.origin}/account?error=${encodeURIComponent(msg)}`, 302);

  if (url.searchParams.get("error")) return fail("Sign-in was cancelled.");
  if (!raw) return fail("Sign-in session expired. Please try again.");
  let st: { s: string; n: string; v: string; next: string };
  try { st = JSON.parse(raw); } catch { return fail("Invalid sign-in state."); }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== st.s) return fail("Sign-in state mismatch.");

  try {
    const id = await exchangeCode({ code, verifier: st.v, nonce: st.n, redirectUri: `${url.origin}/api/auth/callback` });
    const d = await db();
    const [existing] = await d.select().from(schema.users).where(eq(schema.users.sub, id.sub));
    const user = existing
      ? (await d.update(schema.users).set({ email: id.email ?? existing.email, lastLoginAt: new Date() }).where(eq(schema.users.id, existing.id)).returning())[0]
      : (await d.insert(schema.users).values({ sub: id.sub, email: id.email, lastLoginAt: new Date() }).returning())[0];
    await createSession(user.id);
    await claimAnonymousPass(user.id); // attach a pass bought in this browser before signing in
    return Response.redirect(`${url.origin}${st.next}`, 302);
  } catch (e) {
    console.error("[auth] callback failed", e);
    return fail("Could not complete sign-in.");
  }
}
