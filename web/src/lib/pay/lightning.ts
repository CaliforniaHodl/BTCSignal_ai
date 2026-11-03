import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Lightning provider. Production: the owner's LNbits node.
 *   LNBITS_URL          e.g. https://lnbits.mynode.local
 *   LNBITS_INVOICE_KEY  the wallet's *invoice/read* key (never the admin key)
 *
 * Payment status is ONLY ever trusted from a server-side lookup against the node.
 * Webhook bodies and client claims are treated as hints to go check.
 *
 * LIGHTNING_MOCK=1 (dev only) simulates a node that marks invoices paid after ~8s.
 */
export type CreatedInvoice = { paymentHash: string; bolt11: string; expiresAt: Date };

export interface LightningProvider {
  name: string;
  createInvoice(a: { sats: number; memo: string; expirySec: number; webhookUrl?: string }): Promise<CreatedInvoice>;
  isPaid(paymentHash: string): Promise<boolean>;
}

class LNbits implements LightningProvider {
  name = "lnbits";
  constructor(private base: string, private key: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { "X-Api-Key": this.key, "content-type": "application/json", ...init.headers },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`LNbits ${path} HTTP ${r.status}`);
    return (await r.json()) as T;
  }

  async createInvoice(a: { sats: number; memo: string; expirySec: number; webhookUrl?: string }) {
    const res = await this.req<{ payment_hash: string; payment_request?: string; bolt11?: string }>("/api/v1/payments", {
      method: "POST",
      body: JSON.stringify({ out: false, amount: a.sats, memo: a.memo, expiry: a.expirySec, ...(a.webhookUrl ? { webhook: a.webhookUrl } : {}) }),
    });
    const bolt11 = res.payment_request ?? res.bolt11;
    if (!res.payment_hash || !bolt11) throw new Error("LNbits returned no invoice");
    return { paymentHash: res.payment_hash, bolt11, expiresAt: new Date(Date.now() + a.expirySec * 1000) };
  }

  async isPaid(hash: string) {
    if (!/^[0-9a-f]{64}$/.test(hash)) return false;
    const res = await this.req<{ paid?: boolean; status?: string }>(`/api/v1/payments/${hash}`);
    return res.paid === true || res.status === "success";
  }
}

/** Dev-only fake node. Never usable in production. */
class MockNode implements LightningProvider {
  name = "mock";
  private created = new Map<string, number>();
  async createInvoice(a: { sats: number; expirySec: number }) {
    const preimage = randomBytes(32);
    const hash = createHash("sha256").update(preimage).digest("hex");
    this.created.set(hash, Date.now());
    return { paymentHash: hash, bolt11: `lnbcrt${a.sats}n1mock${hash.slice(0, 40)}`, expiresAt: new Date(Date.now() + a.expirySec * 1000) };
  }
  async isPaid(hash: string) {
    const t = this.created.get(hash);
    return t != null && Date.now() - t > 8000;
  }
}

const g = globalThis as unknown as { __ln?: LightningProvider | null };
export function lightning(): LightningProvider | null {
  if (g.__ln !== undefined) return g.__ln;
  if (process.env.LIGHTNING_MOCK === "1") {
    if (process.env.NODE_ENV === "production") throw new Error("LIGHTNING_MOCK is not allowed in production");
    return (g.__ln = new MockNode());
  }
  const url = process.env.LNBITS_URL?.replace(/\/$/, "");
  const key = process.env.LNBITS_INVOICE_KEY;
  return (g.__ln = url && key ? new LNbits(url, key) : null);
}
