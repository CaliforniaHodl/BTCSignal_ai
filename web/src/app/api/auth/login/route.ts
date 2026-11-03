import { cookies } from "next/headers";
import { authConfigured, authorizeUrl, newAuthRequest } from "@/lib/auth/oidc";
import { safeNext, secureCookies } from "@/lib/auth/session";

export async function GET(req: Request) {
  if (!authConfigured()) return new Response("Sign-in is not configured (GATEKEEP_ISSUER).", { status: 503 });
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const a = newAuthRequest();
  const redirectUri = `${url.origin}/api/auth/callback`;
  (await cookies()).set("btcs_oidc", JSON.stringify({ s: a.state, n: a.nonce, v: a.verifier, next }), {
    httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/api/auth", maxAge: 600,
  });
  try {
    return Response.redirect(await authorizeUrl({ ...a, redirectUri }), 302);
  } catch (e) {
    console.error("[auth] authorize failed", e);
    return new Response("Sign-in provider is unavailable. Try again shortly.", { status: 503 });
  }
}
