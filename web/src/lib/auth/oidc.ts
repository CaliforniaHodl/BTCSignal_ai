import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Minimal OIDC client for Gatekeep (authorization code + PKCE S256, public client,
 * EdDSA id_tokens). Config:
 *   GATEKEEP_ISSUER     e.g. http://localhost:8788 or https://auth.example.com
 *   GATEKEEP_CLIENT_ID  must match a [clients.<id>] entry in gatekeep's clients.toml
 */
export const issuer = () => process.env.GATEKEEP_ISSUER?.replace(/\/$/, "") ?? null;
export const clientId = () => process.env.GATEKEEP_CLIENT_ID ?? "btcsignal";
export const authConfigured = () => Boolean(issuer());

type Discovery = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
let discovery: { at: number; d: Discovery } | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function discover(): Promise<Discovery> {
  const iss = issuer();
  if (!iss) throw new Error("GATEKEEP_ISSUER not configured");
  if (discovery && Date.now() - discovery.at < 3600_000) return discovery.d;
  const r = await fetch(`${iss}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!r.ok) throw new Error(`gatekeep discovery HTTP ${r.status}`);
  const d = (await r.json()) as Discovery;
  if (d.issuer !== iss) throw new Error("gatekeep discovery issuer mismatch");
  discovery = { at: Date.now(), d };
  jwks = createRemoteJWKSet(new URL(d.jwks_uri));
  return d;
}

const b64url = (b: Buffer) => b.toString("base64url");

export function newAuthRequest() {
  const verifier = b64url(randomBytes(32));
  return {
    state: b64url(randomBytes(16)),
    nonce: b64url(randomBytes(16)),
    verifier,
    challenge: b64url(createHash("sha256").update(verifier).digest()),
  };
}

export async function authorizeUrl(a: { state: string; nonce: string; challenge: string; redirectUri: string }) {
  const d = await discover();
  const u = new URL(d.authorization_endpoint);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: a.redirectUri,
    scope: "openid email",
    state: a.state,
    nonce: a.nonce,
    code_challenge: a.challenge,
    code_challenge_method: "S256",
  }).toString();
  return u.toString();
}

export async function exchangeCode(a: { code: string; verifier: string; redirectUri: string; nonce: string }) {
  const d = await discover();
  const r = await fetch(d.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: a.code,
      redirect_uri: a.redirectUri,
      client_id: clientId(),
      code_verifier: a.verifier,
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`token endpoint HTTP ${r.status}`);
  const tok = (await r.json()) as { id_token?: string };
  if (!tok.id_token) throw new Error("no id_token in token response");
  const { payload } = await jwtVerify(tok.id_token, jwks!, {
    issuer: d.issuer,
    audience: clientId(),
    algorithms: ["EdDSA"],
  });
  if (payload.nonce !== a.nonce) throw new Error("id_token nonce mismatch");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("id_token missing sub");
  return {
    sub: payload.sub,
    email: typeof payload.email === "string" && payload.email_verified === true ? payload.email : null,
  };
}
