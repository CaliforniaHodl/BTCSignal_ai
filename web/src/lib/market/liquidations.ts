/**
 * Realized BTC perpetual liquidations from OKX's public feed (US-reachable).
 * Deribit only flags liquidations inside its general trade tape and Hyperliquid
 * has no public REST liquidation feed, so OKX is the one honest source here.
 */
import { cacheLife, cacheTag } from "next/cache";
import { datum, getJson, num } from "./http";
import type { Datum } from "./types";
import type { LiqEvent } from "@/lib/patterns/liquidations";

const OKX = "https://www.okx.com/api/v5/public/liquidation-orders";

/** Contract sizes (OKX /public/instruments): linear 0.01 BTC, inverse 100 USD. */
const FAMILIES = [
  { family: "BTC-USDT", inst: "BTC-USDT-SWAP", usd: (sz: number, px: number) => sz * 0.01 * px, pages: 10 },
  { family: "BTC-USD", inst: "BTC-USD-SWAP", usd: (sz: number) => sz * 100, pages: 3 },
] as const;

type OkxDetail = { bkPx: string; posSide: string; side: string; sz: string; ts: string };
type OkxResp = { code: string; msg?: string; data: { instId: string; details: OkxDetail[] }[] };

async function okxFamily(f: (typeof FAMILIES)[number], sinceMs: number) {
  const out: LiqEvent[] = [];
  let after: number | null = null;
  /** Oldest print seen when we stopped because of the page cap (coverage is partial). */
  let truncatedAt: number | null = null;
  for (let page = 0; page < f.pages; page++) {
    const url = `${OKX}?instType=SWAP&instFamily=${f.family}&state=filled&limit=100${after ? `&after=${after}` : ""}`;
    const r = await getJson<OkxResp>(url);
    if (r.code !== "0") throw new Error(`OKX ${r.code}: ${r.msg ?? ""}`);
    const details = r.data?.[0]?.details ?? [];
    if (details.length === 0) return { inst: f.inst, events: out, truncatedAt: null };
    for (const d of details) {
      const ts = num(d.ts, "okx liq ts");
      if (ts < sinceMs) continue;
      const price = num(d.bkPx, "okx bkPx");
      const sz = num(d.sz, "okx sz");
      // posSide is "long"/"short" in hedge mode; in net mode a sell order closes a long.
      const side = d.posSide === "long" || d.posSide === "short" ? d.posSide : d.side === "sell" ? "long" : "short";
      out.push({ ts, side, price, usd: f.usd(sz, price), venue: `OKX ${f.inst}` });
    }
    const oldest = Math.min(...details.map((d) => Number(d.ts)));
    if (oldest < sinceMs) return { inst: f.inst, events: out, truncatedAt: null };
    after = oldest;
    truncatedAt = oldest;
  }
  return { inst: f.inst, events: out, truncatedAt };
}

export type RealizedLiquidations = { events: LiqEvent[]; fromMs: number; toMs: number; coverageStartMs: number; instruments: string[]; missing: string[] };

/**
 * Up to the last 24h. OKX pages 100 prints at a time; we cap the number of pages,
 * so on very busy days coverage may start later than 24h ago (`coverageStartMs`).
 */
export async function getRealizedLiquidations(): Promise<Datum<RealizedLiquidations>> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 600 });
  cacheTag("liquidations");
  return datum("OKX liquidation-orders", async () => {
    const toMs = Date.now();
    const fromMs = toMs - 24 * 3600_000;
    const results = await Promise.allSettled(FAMILIES.map((f) => okxFamily(f, fromMs)));
    const ok = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (ok.length === 0) throw new Error((results[0] as PromiseRejectedResult).reason?.message ?? "OKX failed");
    // If a family hit the page cap, trim everything to the span all families cover.
    const coverageStartMs = Math.max(fromMs, ...ok.map((r) => r.truncatedAt ?? fromMs));
    const events = ok.flatMap((r) => r.events).filter((e) => e.ts >= coverageStartMs).sort((a, b) => a.ts - b.ts);
    const instruments = ok.map((r) => r.inst);
    const missing = FAMILIES.map((f) => f.inst).filter((i) => !instruments.includes(i));
    return { events, fromMs, toMs, coverageStartMs, instruments, missing };
  });
}
