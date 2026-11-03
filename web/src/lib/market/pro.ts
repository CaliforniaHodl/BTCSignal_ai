/**
 * Cached getters for the extra (Pro / radar / public API) sources. Like
 * snapshot.ts, each is cached server-side so the third parties see a handful of
 * requests per minute regardless of traffic.
 */
import { cacheLife, cacheTag } from "next/cache";
import { keyLevels } from "@/lib/indicators";
import { datum } from "./http";
import { getCandles } from "./snapshot";
import * as p from "./sources-pro";
import type { DailyPoint } from "./stats";
import type { Datum, Timeframe } from "./types";

const FAST = { stale: 30, revalidate: 60, expire: 600 };
const SLOW = { stale: 300, revalidate: 900, expire: 3600 };
const DAILY = { stale: 1800, revalidate: 3600, expire: 21_600 };

export async function getFundingHistory(): Promise<Datum<p.FundingHistory>> {
  "use cache";
  cacheLife(SLOW);
  cacheTag("funding-history");
  return datum("OKX · Deribit · Hyperliquid", () => p.fundingHistory(30));
}

export async function getOiHistory(period: "1H" | "1D"): Promise<Datum<p.OiPoint[]>> {
  "use cache";
  cacheLife(period === "1H" ? FAST : SLOW);
  cacheTag(`oi-history-${period}`);
  return datum("OKX Rubik", () => p.okxOiHistory(period));
}

export async function getLongShort(): Promise<Datum<{ t: number; ratio: number }[]>> {
  "use cache";
  cacheLife(SLOW);
  cacheTag("long-short");
  return datum("OKX Rubik", p.okxLongShortRatio);
}

export async function getTermStructure(): Promise<Datum<p.TermStructure>> {
  "use cache";
  cacheLife(FAST);
  cacheTag("term-structure");
  return datum("Deribit", p.deribitTermStructure);
}

export async function getOnchainDaily(): Promise<Datum<p.OnchainDay[]>> {
  "use cache";
  cacheLife(DAILY);
  cacheTag("onchain-daily");
  return datum("Coin Metrics Community", () => p.coinMetricsDaily(400));
}

export type CrossAsset = { id: "btc" | "eth" | "spx" | "gold"; label: string; source: string; series: Datum<DailyPoint[]> };

export async function getCrossAssets(): Promise<CrossAsset[]> {
  "use cache";
  cacheLife(DAILY);
  cacheTag("cross-assets");
  const [btc, eth, spx, gold] = await Promise.all([
    datum("Coinbase BTC-USD", () => p.coinbaseDaily("BTC-USD")),
    datum("Coinbase ETH-USD", () => p.coinbaseDaily("ETH-USD")),
    datum("Hyperliquid xyz:SP500 perp", () => p.hyperliquidDaily("xyz:SP500", 200)),
    datum("Coinbase PAXG-USD", () => p.coinbaseDaily("PAXG-USD")),
  ]);
  return [
    { id: "btc", label: "BTC", source: btc.source, series: btc },
    { id: "eth", label: "ETH", source: eth.source, series: eth },
    { id: "spx", label: "S&P 500 (perp proxy)", source: spx.source, series: spx },
    { id: "gold", label: "Gold (PAXG)", source: gold.source, series: gold },
  ];
}

export async function getFearGreedHistory(): Promise<Datum<{ t: number; value: number; label: string }[]>> {
  "use cache";
  cacheLife(SLOW);
  cacheTag("fng-history");
  return datum("alternative.me", () => p.fearGreedHistory(31));
}

export async function getBlockFeeRates(): Promise<Datum<p.BlockFeeRate[]>> {
  "use cache";
  cacheLife(FAST);
  cacheTag("block-fee-rates");
  return datum("mempool.space", p.blockFeeRates24h);
}

export async function getMempoolStats(): Promise<Datum<p.MempoolStats>> {
  "use cache";
  cacheLife(FAST);
  cacheTag("mempool-stats");
  return datum("mempool.space", p.mempoolStats);
}

export async function getDominance24h(): Promise<Datum<{ dominancePct: number; dominance24hAgoPct: number }>> {
  "use cache";
  cacheLife(SLOW);
  cacheTag("dominance-24h");
  return datum("CoinGecko", p.coingeckoDominance24h);
}

// ---------- Key levels (derived from Coinbase candles) ----------

export type Level = { price: number; touches: number; kind: "support" | "resistance"; distancePct: number };
export type KeyLevels = { timeframe: Timeframe; price: number; candleTime: number; support: Level | null; resistance: Level | null; levels: Level[] };

export const LEVEL_METHOD = "Swing highs/lows (3 bars each side) clustered within 0.4%, ≥2 touches, last 300 candles";

export function computeKeyLevels(tf: Timeframe, candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]): KeyLevels {
  const last = candles[candles.length - 1];
  if (!last) throw new Error("no candles");
  const levels: Level[] = keyLevels(candles, { max: 12 }).map((l) => ({ ...l, distancePct: ((l.price - last.close) / last.close) * 100 }));
  const support = levels.filter((l) => l.kind === "support").sort((a, b) => b.price - a.price)[0] ?? null;
  const resistance = levels.filter((l) => l.kind === "resistance").sort((a, b) => a.price - b.price)[0] ?? null;
  return { timeframe: tf, price: last.close, candleTime: last.time, support, resistance, levels };
}

export async function getKeyLevels(tf: Timeframe): Promise<Datum<KeyLevels>> {
  const c = await getCandles(tf, 300);
  if (!c.ok) return c;
  try {
    return { ok: true, value: computeKeyLevels(tf, c.value), source: "Coinbase candles · swing clusters", fetchedAt: c.fetchedAt };
  } catch (e) {
    return { ok: false, source: "Coinbase candles · swing clusters", fetchedAt: c.fetchedAt, error: e instanceof Error ? e.message : String(e) };
  }
}
