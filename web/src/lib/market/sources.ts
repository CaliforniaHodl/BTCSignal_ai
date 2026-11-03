/**
 * Source adapters. Each throws on failure; callers wrap with `datum()`.
 * All sources here are reachable from US IPs (Binance futures = 451, Bybit = 403).
 */
import { getJson, num } from "./http";
import type {
  Candle,
  Derivatives,
  FearGreed,
  Fees,
  FundingVenue,
  Global,
  Network,
  SpotStats,
  Timeframe,
} from "./types";

const COINBASE = "https://api.exchange.coinbase.com";
const MEMPOOL = "https://mempool.space/api";

// ---------- Spot ----------

export async function coinbaseSpot(): Promise<SpotStats> {
  const [ticker, stats] = await Promise.all([
    getJson<{ price: string }>(`${COINBASE}/products/BTC-USD/ticker`),
    getJson<{ open: string; high: string; low: string; volume: string }>(
      `${COINBASE}/products/BTC-USD/stats`
    ),
  ]);
  const price = num(ticker.price, "price");
  const open24h = num(stats.open, "open");
  return {
    price,
    open24h,
    high24h: num(stats.high, "high"),
    low24h: num(stats.low, "low"),
    volume24hBtc: num(stats.volume, "volume"),
    change24hPct: ((price - open24h) / open24h) * 100,
  };
}

export async function krakenSpot(): Promise<{ price: number }> {
  const r = await getJson<{ error: string[]; result: Record<string, { c: [string, string] }> }>(
    "https://api.kraken.com/0/public/Ticker?pair=XBTUSD"
  );
  if (r.error?.length) throw new Error(r.error.join(", "));
  const pair = Object.values(r.result)[0];
  return { price: num(pair?.c?.[0], "kraken last") };
}

// ---------- Candles ----------

const GRANULARITY: Record<Exclude<Timeframe, "4h">, number> = {
  "15m": 900,
  "1h": 3600,
  "1d": 86400,
};

/**
 * Coinbase returns rows as [time, LOW, HIGH, open, close, volume], newest first.
 * Normalised here to ascending Candle objects. Coinbase has no 4h granularity,
 * so 4h is aggregated from 1h candles aligned to UTC 00/04/08/...
 */
export async function coinbaseCandles(tf: Timeframe, limit = 300): Promise<Candle[]> {
  if (tf === "4h") {
    const hourly = await coinbaseCandles("1h", 300);
    return aggregate(hourly, 4 * 3600).slice(-limit);
  }
  const rows = await getJson<number[][]>(
    `${COINBASE}/products/BTC-USD/candles?granularity=${GRANULARITY[tf]}`
  );
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("no candles");
  return rows
    .map(([time, low, high, open, close, volume]) => ({ time, open, high, low, close, volume }))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

export function aggregate(candles: Candle[], bucketSeconds: number): Candle[] {
  const out: Candle[] = [];
  for (const c of candles) {
    const bucket = Math.floor(c.time / bucketSeconds) * bucketSeconds;
    const last = out[out.length - 1];
    if (last && last.time === bucket) {
      last.high = Math.max(last.high, c.high);
      last.low = Math.min(last.low, c.low);
      last.close = c.close;
      last.volume += c.volume;
    } else {
      out.push({ ...c, time: bucket });
    }
  }
  return out;
}

// ---------- Derivatives ----------

async function okx(): Promise<FundingVenue> {
  const [f, oi] = await Promise.all([
    getJson<{ data: { fundingRate: string }[] }>(
      "https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP"
    ),
    getJson<{ data: { oiUsd: string }[] }>(
      "https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP"
    ),
  ]);
  return {
    venue: "OKX",
    rate8h: num(f.data?.[0]?.fundingRate, "okx funding"), // 8h interval
    openInterestUsd: num(oi.data?.[0]?.oiUsd, "okx oi"),
  };
}

async function deribit(): Promise<FundingVenue> {
  const r = await getJson<{ result: { funding_8h: number; open_interest: number }[] }>(
    "https://www.deribit.com/api/v2/public/get_book_summary_by_instrument?instrument_name=BTC-PERPETUAL"
  );
  const s = r.result?.[0];
  return {
    venue: "Deribit",
    rate8h: num(s?.funding_8h, "deribit funding"),
    openInterestUsd: num(s?.open_interest, "deribit oi"), // BTC-PERPETUAL OI is USD-denominated
  };
}

async function hyperliquid(): Promise<FundingVenue> {
  const [meta, ctxs] = await getJson<
    [{ universe: { name: string }[] }, { funding: string; openInterest: string; markPx: string }[]]
  >("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
  });
  const i = meta.universe.findIndex((u) => u.name === "BTC");
  const c = ctxs[i];
  if (!c) throw new Error("BTC not in hyperliquid universe");
  return {
    venue: "Hyperliquid",
    rate8h: num(c.funding, "hl funding") * 8, // hourly funding
    openInterestUsd: num(c.openInterest, "hl oi") * num(c.markPx, "hl mark"),
  };
}

/** Succeeds if at least one venue responds. */
export async function derivatives(): Promise<Derivatives> {
  const results = await Promise.allSettled([okx(), deribit(), hyperliquid()]);
  const venues = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (venues.length === 0) throw new Error("all derivatives venues failed");
  const withOi = venues.filter((v) => v.openInterestUsd != null);
  const totalOpenInterestUsd = withOi.reduce((s, v) => s + (v.openInterestUsd ?? 0), 0);
  const avgRate8h =
    totalOpenInterestUsd > 0
      ? withOi.reduce((s, v) => s + v.rate8h * (v.openInterestUsd ?? 0), 0) / totalOpenInterestUsd
      : venues.reduce((s, v) => s + v.rate8h, 0) / venues.length;
  return { venues, avgRate8h, totalOpenInterestUsd };
}

// ---------- Sentiment / on-chain / global ----------

export async function fearGreed(): Promise<FearGreed> {
  const r = await getJson<{ data: { value: string; value_classification: string; timestamp: string }[] }>(
    "https://api.alternative.me/fng/?limit=1",
    { timeoutMs: 8000 }
  );
  const d = r.data?.[0];
  return {
    value: num(d?.value, "fng"),
    label: d?.value_classification ?? "Unknown",
    updatedAt: num(d?.timestamp, "fng ts") * 1000,
  };
}

export async function fees(): Promise<Fees> {
  const r = await getJson<Record<string, number>>(`${MEMPOOL}/v1/fees/recommended`);
  return {
    fastest: num(r.fastestFee, "fastest"),
    halfHour: num(r.halfHourFee, "halfHour"),
    hour: num(r.hourFee, "hour"),
    economy: num(r.economyFee, "economy"),
  };
}

export async function network(): Promise<Network> {
  const [height, hr, diff] = await Promise.all([
    getJson<number>(`${MEMPOOL}/blocks/tip/height`),
    getJson<{ currentHashrate: number; currentDifficulty: number }>(`${MEMPOOL}/v1/mining/hashrate/3d`),
    getJson<{ difficultyChange: number; progressPercent: number; remainingBlocks: number }>(
      `${MEMPOOL}/v1/difficulty-adjustment`
    ),
  ]);
  return {
    blockHeight: num(height, "height"),
    hashrateEhs: num(hr.currentHashrate, "hashrate") / 1e18,
    difficulty: num(hr.currentDifficulty, "difficulty"),
    difficultyChangePct: num(diff.difficultyChange, "diff change"),
    retargetProgressPct: num(diff.progressPercent, "progress"),
    blocksUntilRetarget: num(diff.remainingBlocks, "remaining"),
  };
}

export async function global(): Promise<Global> {
  const r = await getJson<{ data: { market_cap_percentage: { btc: number }; total_market_cap: { usd: number } } }>(
    "https://api.coingecko.com/api/v3/global",
    process.env.COINGECKO_API_KEY
      ? { headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } }
      : {}
  );
  return {
    btcDominancePct: num(r.data?.market_cap_percentage?.btc, "dominance"),
    totalMarketCapUsd: num(r.data?.total_market_cap?.usd, "mcap"),
  };
}
