import "server-only";
import { desc, gt, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBlockFeeRates, getDominance24h, getFearGreedHistory, getFundingHistory, getOiHistory, getOnchainDaily } from "@/lib/market/pro";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";
import type { FundingPoint } from "@/lib/market/sources-pro";
import { buildRadar, type RadarInputs, type RadarItem } from "./build";

const H = 3600_000;

/** Value of the point closest to `t` (within `tol`). */
function at<T extends { t: number }>(pts: T[], t: number, tol: number): T | null {
  let best: T | null = null;
  for (const p of pts) if (Math.abs(p.t - t) <= tol && (!best || Math.abs(p.t - t) < Math.abs(best.t - t))) best = p;
  return best;
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type Radar = { generatedAt: number; items: RadarItem[]; inputs: RadarInputs; unavailable: string[] };

export async function loadRadar(): Promise<Radar> {
  const now = Date.now();
  const [snap, h1, fundHist, oi, dom, fees, fng, onchain, agent] = await Promise.all([
    getMarketSnapshot(),
    getCandles("1h", 48),
    getFundingHistory(),
    getOiHistory("1H"),
    getDominance24h(),
    getBlockFeeRates(),
    getFearGreedHistory(),
    getOnchainDaily(),
    loadAgent(now).catch((e) => {
      console.warn("[radar] agent data unavailable", e);
      return null;
    }),
  ]);
  const inputs: RadarInputs = {};
  const unavailable: string[] = [];

  if (snap.spot.ok && h1.ok) {
    const c = h1.value;
    const closeAt = (ms: number) => [...c].reverse().find((x) => (x.time + 3600) * 1000 <= ms)?.close ?? null;
    inputs.price = { now: snap.spot.value.price, ago1h: closeAt(now - H), ago24h: closeAt(now - 24 * H), source: "Coinbase", fetchedAt: snap.spot.fetchedAt };
  } else unavailable.push("Price (Coinbase)");

  if (snap.derivatives.ok) {
    const venues = snap.derivatives.value.venues.map((v) => ({ venue: v.venue, now: v.rate8h }));
    let avgAgo24h: number | null = null;
    let avgNow = venues.reduce((s, v) => s + v.now, 0) / venues.length;
    if (fundHist.ok) {
      const pairs = venues.flatMap((v) => {
        const h = fundHist.value.find((x) => x.venue === v.venue);
        const p = h ? at<FundingPoint>(h.points, now - 24 * H, 6 * H) : null;
        return p ? [{ now: v.now, ago: p.rate8h }] : [];
      });
      if (pairs.length) {
        avgNow = pairs.reduce((s, p) => s + p.now, 0) / pairs.length;
        avgAgo24h = pairs.reduce((s, p) => s + p.ago, 0) / pairs.length;
      }
    }
    inputs.funding = { avgNow, avgAgo24h, venues, source: "OKX · Deribit · Hyperliquid", fetchedAt: snap.derivatives.fetchedAt };
  } else unavailable.push("Funding");

  if (oi.ok && oi.value.length) {
    const last = oi.value[oi.value.length - 1];
    inputs.oi = { now: last.oiUsd, ago1h: at(oi.value, last.t - H, 20 * 60_000)?.oiUsd ?? null, ago24h: at(oi.value, last.t - 24 * H, 2 * H)?.oiUsd ?? null, source: "OKX Rubik", fetchedAt: oi.fetchedAt };
  } else unavailable.push("Open interest (OKX)");

  if (dom.ok) inputs.dominance = { now: dom.value.dominancePct, ago24h: dom.value.dominance24hAgoPct, source: dom.source, fetchedAt: dom.fetchedAt };
  else unavailable.push("Dominance (CoinGecko)");

  if (snap.fees.ok && fees.ok) {
    inputs.fees = { fastestNow: snap.fees.value.fastest, blockMedian24h: median(fees.value.map((b) => b.median)), recentBlockMedian: median(fees.value.slice(-6).map((b) => b.median)), source: "mempool.space", fetchedAt: fees.fetchedAt };
  } else unavailable.push("Fees (mempool.space)");

  if (fng.ok && fng.value.length >= 2) {
    const [prev, cur] = fng.value.slice(-2);
    inputs.fearGreed = { now: cur.value, prev: prev.value, label: cur.label, source: fng.source, fetchedAt: fng.fetchedAt };
  } else unavailable.push("Fear & Greed");

  if (onchain.ok) {
    const rows = onchain.value.filter((d) => d.exchangeInflowUsd != null && d.exchangeOutflowUsd != null);
    const nets = rows.map((d) => d.exchangeInflowUsd! - d.exchangeOutflowUsd!);
    if (nets.length >= 31) {
      const hist = nets.slice(-31, -1);
      const mean30 = hist.reduce((a, b) => a + b, 0) / 30;
      const sd30 = Math.sqrt(hist.reduce((a, b) => a + (b - mean30) ** 2, 0) / 30);
      inputs.flows = { day: rows[rows.length - 1].day, netflowUsd: nets[nets.length - 1], mean30, sd30, source: "Coin Metrics Community", fetchedAt: onchain.fetchedAt };
    }
  } else unavailable.push("Exchange flows (Coin Metrics)");

  if (agent) inputs.agent = agent;
  else unavailable.push("Agent signals (database)");

  return { generatedAt: now, items: buildRadar(inputs, now), inputs, unavailable };
}

async function loadAgent(now: number): Promise<RadarInputs["agent"]> {
  const d = await db();
  const dayAgo = new Date(now - 24 * H);
  const [latest] = await d.select().from(schema.signals).orderBy(desc(schema.signals.createdAt)).limit(1);
  const [prior] = await d.select().from(schema.signals).where(lte(schema.signals.createdAt, dayAgo)).orderBy(desc(schema.signals.createdAt)).limit(1);
  const decisions = await d.select().from(schema.agentDecisions).where(gt(schema.agentDecisions.createdAt, dayAgo)).orderBy(desc(schema.agentDecisions.createdAt)).limit(50);
  return {
    source: "BTCSignal agent (DB)",
    fetchedAt: now,
    latest: latest ? { direction: latest.direction, score: latest.score, confidence: latest.confidence, at: latest.createdAt.getTime() } : null,
    prior: prior ? { direction: prior.direction, at: prior.createdAt.getTime() } : null,
    decisions24h: decisions.map((x) => ({ action: x.action, summary: x.summary, at: x.createdAt.getTime() })),
  };
}
