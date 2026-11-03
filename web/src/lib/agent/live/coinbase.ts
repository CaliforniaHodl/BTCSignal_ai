import "server-only";
import { createPrivateKey, randomBytes, randomUUID } from "node:crypto";
import { SignJWT } from "jose";

/**
 * Coinbase Advanced Trade client for the (future) live broker.
 *
 * Auth: CDP API key, ES256 (EC P-256). Ed25519 keys are not supported by Coinbase
 * for this API. One fresh JWT per request, 120 s lifetime.
 *   COINBASE_KEY_NAME     "organizations/{org}/apiKeys/{key}"
 *   COINBASE_PRIVATE_KEY  "-----BEGIN EC PRIVATE KEY-----\n..." (\n escapes allowed)
 *
 * SAFETY: this module never places an order unless LIVE_TRADING === "1" AND the
 * caller passes `confirmLive: true`. The default path is Coinbase's order
 * *preview* endpoint, which returns fees/slippage without trading. A hard
 * notional cap (LIVE_MAX_USD, default 100) is enforced here, below the agent.
 */
const HOST = "api.coinbase.com";
export const LIVE_MAX_USD = Number(process.env.LIVE_MAX_USD ?? 100);

export const liveConfigured = () => Boolean(process.env.COINBASE_KEY_NAME && process.env.COINBASE_PRIVATE_KEY);
export const liveTradingEnabled = () => process.env.LIVE_TRADING === "1";

async function jwtFor(method: string, path: string) {
  const name = process.env.COINBASE_KEY_NAME;
  const pem = process.env.COINBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!name || !pem) throw new Error("Coinbase API key not configured");
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ec") throw new Error("Coinbase key must be an ES256 (EC P-256) key; Ed25519 isn't supported for Advanced Trade");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uri: `${method} ${HOST}${path.split("?")[0]}` })
    .setProtectedHeader({ alg: "ES256", kid: name, nonce: randomBytes(16).toString("hex"), typ: "JWT" })
    .setSubject(name)
    .setIssuer("cdp")
    .setNotBefore(now)
    .setExpirationTime(now + 120)
    .sign(key);
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://${HOST}${path}`, {
    method,
    headers: { authorization: `Bearer ${await jwtFor(method, path)}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Coinbase ${method} ${path} HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

export async function balances() {
  const r = await call<{ accounts: { currency: string; available_balance: { value: string } }[] }>("GET", "/api/v3/brokerage/accounts?limit=250");
  const get = (c: string) => Number(r.accounts.find((a) => a.currency === c)?.available_balance.value ?? 0);
  return { usd: get("USD") + get("USDC"), btc: get("BTC") };
}

export type OrderIntent =
  | { side: "BUY"; quoteUsd: number; type: "market" }
  | { side: "SELL"; baseBtc: number; type: "market" }
  | { side: "BUY" | "SELL"; baseBtc: number; type: "limit"; limitPrice: number; postOnly: boolean };

function orderConfig(o: OrderIntent) {
  if (o.type === "market") {
    return { market_market_ioc: o.side === "BUY" ? { quote_size: (o as { quoteUsd: number }).quoteUsd.toFixed(2) } : { base_size: (o as { baseBtc: number }).baseBtc.toFixed(8) } };
  }
  return { limit_limit_gtc: { base_size: o.baseBtc.toFixed(8), limit_price: o.limitPrice.toFixed(2), post_only: o.postOnly } };
}

/** Refuse anything over the hard cap. Applied to every preview and order. */
export function assertWithinCap(o: OrderIntent, price: number) {
  const notional = o.type === "market" && o.side === "BUY" ? o.quoteUsd : ("baseBtc" in o ? o.baseBtc : 0) * price;
  if (!(notional > 0)) throw new Error("order size must be positive");
  if (notional > LIVE_MAX_USD) throw new Error(`order notional $${notional.toFixed(2)} exceeds LIVE_MAX_USD $${LIVE_MAX_USD}`);
  return notional;
}

/** Ask Coinbase what this order WOULD cost. Never trades. */
export async function previewOrder(o: OrderIntent, price: number) {
  const notional = assertWithinCap(o, price);
  const res = await call<Record<string, unknown>>("POST", "/api/v3/brokerage/orders/preview", { product_id: "BTC-USD", side: o.side, order_configuration: orderConfig(o) });
  return { notional, preview: res };
}

/** Places a REAL order. Requires LIVE_TRADING=1 and an explicit confirmLive flag from the caller. */
export async function placeOrder(o: OrderIntent, price: number, opts: { confirmLive: boolean; clientOrderId?: string }) {
  if (!liveTradingEnabled() || !opts.confirmLive) throw new Error("live trading is disabled");
  assertWithinCap(o, price);
  return call<Record<string, unknown>>("POST", "/api/v3/brokerage/orders", {
    client_order_id: opts.clientOrderId ?? randomUUID(), // idempotency key
    product_id: "BTC-USD",
    side: o.side,
    order_configuration: orderConfig(o),
  });
}
