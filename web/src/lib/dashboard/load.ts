import "server-only";
import { getAgentView } from "@/lib/agent/queries";
import { last, rsi } from "@/lib/indicators";
import { mapDatum } from "@/lib/api/public";
import { datum } from "@/lib/market/http";
import {
  getBlockFeeRates, getCrossAssets, getFundingHistory, getKeyLevels, getLongShort, getMempoolStats, getOiHistory, getOnchainDaily, getTermStructure, type KeyLevels,
} from "@/lib/market/pro";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";
import type { Datum, MarketSnapshot, Timeframe } from "@/lib/market/types";
import { computeOnchain, correlations, type Correlation, type ExportRow, type OnchainSummary } from "./compute";

export type AgentRead = {
  direction: string; score: number; confidence: number; reason: string; at: string; price: number;
  factors: { label: string; value: number | null; detail: string }[];
  openTrade: { side: string; entry: number; stop: number; target: number | null; openedAt: string } | null;
  lastDecision: { action: string; summary: string; at: string } | null;
  hitRatePct: number | null; resolved: number;
};

export type DashboardData = {
  generatedAt: number;
  snapshot: MarketSnapshot;
  fundingHistory: Awaited<ReturnType<typeof getFundingHistory>>;
  oiDaily: Awaited<ReturnType<typeof getOiHistory>>;
  longShort: Awaited<ReturnType<typeof getLongShort>>;
  term: Awaited<ReturnType<typeof getTermStructure>>;
  onchain: Datum<OnchainSummary>;
  correlations: Correlation[];
  correlationsFetchedAt: number;
  mempool: Awaited<ReturnType<typeof getMempoolStats>>;
  blockFees: Awaited<ReturnType<typeof getBlockFeeRates>>;
  technicals: { tf: Timeframe; rsi14: Datum<number | null>; levels: Datum<KeyLevels> }[];
  agent: Datum<AgentRead | null>;
};

const TFS: Timeframe[] = ["1h", "4h", "1d"];

export async function loadDashboard(): Promise<DashboardData> {
  const [snapshot, fundingHistory, oiDaily, longShort, term, onchainRaw, cross, mempool, blockFees, agent, ...tech] = await Promise.all([
    getMarketSnapshot(), getFundingHistory(), getOiHistory("1D"), getLongShort(), getTermStructure(), getOnchainDaily(), getCrossAssets(),
    getMempoolStats(), getBlockFeeRates(), datum("BTCSignal agent (DB)", loadAgent),
    ...TFS.map(async (tf) => {
      const [c, levels] = await Promise.all([getCandles(tf, 300), getKeyLevels(tf)]);
      return { tf, rsi14: mapDatum(c, (v) => last(rsi(v.map((x) => x.close), 14))), levels };
    }),
  ]);

  const onchain: Datum<OnchainSummary> = onchainRaw.ok
    ? (() => {
        try {
          return { ok: true as const, value: computeOnchain(onchainRaw.value), source: onchainRaw.source, fetchedAt: onchainRaw.fetchedAt };
        } catch (e) {
          return { ok: false as const, source: onchainRaw.source, fetchedAt: onchainRaw.fetchedAt, error: String(e) };
        }
      })()
    : onchainRaw;

  const btc = cross.find((c) => c.id === "btc")!;
  const corr = btc.series.ok
    ? correlations(btc.series.value, cross.filter((c) => c.id !== "btc").map((c) => ({ id: c.id, label: c.label, source: c.source, series: c.series.ok ? c.series.value : null, error: c.series.ok ? undefined : c.series.error })))
    : cross.filter((c) => c.id !== "btc").map((c) => ({ id: c.id, label: c.label, source: c.source, r30: null, n30: 0, r90: null, n90: 0, ok: false, error: "BTC daily series unavailable" }));

  return {
    generatedAt: Date.now(), snapshot, fundingHistory, oiDaily, longShort, term, onchain,
    correlations: corr, correlationsFetchedAt: btc.series.fetchedAt, mempool, blockFees,
    technicals: tech as DashboardData["technicals"], agent,
  };
}

async function loadAgent(): Promise<AgentRead | null> {
  const v = await getAgentView();
  const s = v.latestSignal;
  if (!s) return null;
  const d = v.decisions[0];
  return {
    direction: s.direction, score: s.score, confidence: s.confidence, reason: s.detail.reason, at: s.createdAt.toISOString(), price: s.price,
    factors: s.detail.factors.map((f) => ({ label: f.label, value: f.value, detail: f.detail })),
    openTrade: v.openTrade ? { side: v.openTrade.side, entry: v.openTrade.entryPrice, stop: v.openTrade.stop, target: v.openTrade.target, openedAt: v.openTrade.openedAt.toISOString() } : null,
    lastDecision: d ? { action: d.action, summary: d.summary, at: d.createdAt.toISOString() } : null,
    hitRatePct: v.stats.signalHitRatePct, resolved: v.stats.signalsResolved,
  };
}

// ---------------------------------------------------------------- export

export const PANELS = [
  { id: "overview", section: "Market", title: "Price & sentiment" },
  { id: "venues", section: "Derivatives", title: "Funding & OI by venue" },
  { id: "funding-history", section: "Derivatives", title: "Funding history (30d)" },
  { id: "oi-history", section: "Derivatives", title: "Open interest (OKX, daily)" },
  { id: "basis", section: "Derivatives", title: "Futures basis (Deribit)" },
  { id: "valuation", section: "On-chain", title: "Valuation (MVRV, realized price, Puell)" },
  { id: "flows", section: "On-chain", title: "Exchange flows & activity" },
  { id: "network", section: "Network", title: "Network health" },
  { id: "correlation", section: "Macro", title: "Cross-asset correlation" },
  { id: "technicals", section: "Technicals", title: "RSI & key levels" },
  { id: "agent", section: "Agent", title: "Agent's current read" },
] as const;
export type PanelId = (typeof PANELS)[number]["id"];

export function exportRows(d: DashboardData, panels?: Set<string>): ExportRow[] {
  const rows: ExportRow[] = [];
  const iso = (t: number) => new Date(t).toISOString();
  const add = (panel: PanelId, metric: string, value: number | string | null, unit: string, source: string, at: number) => {
    if (!panels || panels.has(panel)) rows.push({ panel, metric, value, unit, source, asOf: iso(at) });
  };
  const s = d.snapshot;
  if (s.spot.ok) {
    add("overview", "btc_price", s.spot.value.price, "USD", s.spot.source, s.spot.fetchedAt);
    add("overview", "change_24h", +s.spot.value.change24hPct.toFixed(4), "%", s.spot.source, s.spot.fetchedAt);
    add("overview", "volume_24h", s.spot.value.volume24hBtc, "BTC", s.spot.source, s.spot.fetchedAt);
  }
  if (s.spotCrossCheck.ok) add("overview", "kraken_price", s.spotCrossCheck.value.price, "USD", s.spotCrossCheck.source, s.spotCrossCheck.fetchedAt);
  if (s.fearGreed.ok) add("overview", "fear_greed", s.fearGreed.value.value, "index", s.fearGreed.source, s.fearGreed.fetchedAt);
  if (s.global.ok) {
    add("overview", "btc_dominance", s.global.value.btcDominancePct, "%", s.global.source, s.global.fetchedAt);
    add("overview", "total_crypto_mcap", s.global.value.totalMarketCapUsd, "USD", s.global.source, s.global.fetchedAt);
  }
  if (s.derivatives.ok) {
    add("venues", "avg_funding_8h", s.derivatives.value.avgRate8h, "fraction", s.derivatives.source, s.derivatives.fetchedAt);
    add("venues", "total_oi", s.derivatives.value.totalOpenInterestUsd, "USD", s.derivatives.source, s.derivatives.fetchedAt);
    for (const v of s.derivatives.value.venues) {
      add("venues", `${v.venue.toLowerCase()}_funding_8h`, v.rate8h, "fraction", v.venue, s.derivatives.fetchedAt);
      add("venues", `${v.venue.toLowerCase()}_oi`, v.openInterestUsd, "USD", v.venue, s.derivatives.fetchedAt);
    }
  }
  if (d.longShort.ok) {
    const l = d.longShort.value[d.longShort.value.length - 1];
    if (l) add("venues", "okx_long_short_accounts", l.ratio, "ratio", d.longShort.source, l.t);
  }
  if (d.fundingHistory.ok) for (const h of d.fundingHistory.value) for (const p of h.points) add("funding-history", `${h.venue.toLowerCase()}_funding_8h`, p.rate8h, "fraction", h.venue, p.t);
  if (d.oiDaily.ok) for (const p of d.oiDaily.value) add("oi-history", "okx_oi", p.oiUsd, "USD", d.oiDaily.source, p.t);
  if (d.term.ok) {
    add("basis", "deribit_index", d.term.value.indexPrice, "USD", d.term.source, d.term.fetchedAt);
    for (const r of d.term.value.rows) {
      add("basis", `${r.instrument}_premium`, +r.premiumPct.toFixed(4), "%", d.term.source, d.term.fetchedAt);
      add("basis", `${r.instrument}_annualised`, r.annualisedPct != null ? +r.annualisedPct.toFixed(3) : null, "%/yr", d.term.source, d.term.fetchedAt);
    }
  }
  if (d.onchain.ok) {
    const o = d.onchain.value, src = `${d.onchain.source} (${o.day})`, at = d.onchain.fetchedAt;
    add("valuation", "mvrv", o.mvrv, "ratio", src, at);
    add("valuation", "realized_cap", o.realizedCapUsd, "USD", src, at);
    add("valuation", "realized_price", o.realizedPriceUsd, "USD", src, at);
    add("valuation", "puell_multiple", o.puell, "ratio", src, at);
    add("flows", "exchange_netflow_1d", o.exchangeNetflowUsd, "USD", src, at);
    add("flows", "exchange_netflow_30d", o.exchangeNetflow30dSumUsd, "USD", src, at);
    add("flows", "exchange_supply", o.exchangeSupplyBtc, "BTC", src, at);
    add("flows", "active_addresses", o.activeAddresses, "count", src, at);
    add("flows", "tx_count", o.txCount, "count", src, at);
    add("flows", "fees_1d", o.feesUsd, "USD", src, at);
  }
  if (s.network.ok) {
    const n = s.network.value;
    add("network", "block_height", n.blockHeight, "height", s.network.source, s.network.fetchedAt);
    add("network", "hashrate", n.hashrateEhs, "EH/s", s.network.source, s.network.fetchedAt);
    add("network", "difficulty_change_est", n.difficultyChangePct, "%", s.network.source, s.network.fetchedAt);
  }
  if (s.fees.ok) add("network", "fee_fastest", s.fees.value.fastest, "sat/vB", s.fees.source, s.fees.fetchedAt);
  if (d.mempool.ok) {
    add("network", "mempool_tx_count", d.mempool.value.count, "count", d.mempool.source, d.mempool.fetchedAt);
    add("network", "mempool_vsize", d.mempool.value.vsizeVb, "vB", d.mempool.source, d.mempool.fetchedAt);
  }
  for (const c of d.correlations) {
    add("correlation", `btc_${c.id}_r30`, c.r30, "pearson", c.source, d.correlationsFetchedAt);
    add("correlation", `btc_${c.id}_r90`, c.r90, "pearson", c.source, d.correlationsFetchedAt);
  }
  for (const t of d.technicals) {
    if (t.rsi14.ok) add("technicals", `rsi14_${t.tf}`, t.rsi14.value, "index", t.rsi14.source, t.rsi14.fetchedAt);
    if (t.levels.ok) {
      add("technicals", `support_${t.tf}`, t.levels.value.support?.price ?? null, "USD", t.levels.source, t.levels.fetchedAt);
      add("technicals", `resistance_${t.tf}`, t.levels.value.resistance?.price ?? null, "USD", t.levels.source, t.levels.fetchedAt);
    }
  }
  if (d.agent.ok && d.agent.value) {
    const a = d.agent.value;
    add("agent", "signal_direction", a.direction, "", d.agent.source, Date.parse(a.at));
    add("agent", "signal_score", a.score, "-1..1", d.agent.source, Date.parse(a.at));
    add("agent", "signal_confidence", a.confidence, "0..1", d.agent.source, Date.parse(a.at));
  }
  return rows;
}
