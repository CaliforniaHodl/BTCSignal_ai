/**
 * Extra source adapters for the Pro dashboard, Alpha Radar and public API.
 * Same contract as sources.ts: each throws on failure; callers wrap with `datum()`.
 */
import { getJson, num } from "./http";
import { annualisedBasisPct, dayKey, deribitExpiry, type DailyPoint } from "./stats";

const COINBASE = "https://api.exchange.coinbase.com";
const MEMPOOL = "https://mempool.space/api";
const HL = "https://api.hyperliquid.xyz/info";
const CM = "https://community-api.coinmetrics.io/v4";

const hlPost = <T>(body: unknown) =>
  getJson<T>(HL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), timeoutMs: 8000 });

// ---------- Funding history (normalised to 8h rates) ----------

export type FundingPoint = { t: number; rate8h: number };
export type FundingHistory = { venue: "OKX" | "Deribit" | "Hyperliquid"; points: FundingPoint[] }[];

async function okxFundingHistory(): Promise<FundingPoint[]> {
  // 8h settlements, newest first, max 100 per page (~33 days)
  const r = await getJson<{ data: { fundingTime: string; realizedRate?: string; fundingRate: string }[] }>(
    "https://www.okx.com/api/v5/public/funding-rate-history?instId=BTC-USDT-SWAP&limit=100"
  );
  return r.data.map((d) => ({ t: num(d.fundingTime, "okx t"), rate8h: num(d.realizedRate || d.fundingRate, "okx rate") })).sort((a, b) => a.t - b.t);
}

async function deribitFundingHistory(days: number): Promise<FundingPoint[]> {
  const end = Date.now();
  const r = await getJson<{ result: { timestamp: number; interest_8h: number }[] }>(
    `https://www.deribit.com/api/v2/public/get_funding_rate_history?instrument_name=BTC-PERPETUAL&start_timestamp=${end - days * 86_400_000}&end_timestamp=${end}`,
    { timeoutMs: 8000 }
  );
  // Hourly rows; keep every 8th hour so all venues plot on the same cadence.
  return r.result
    .filter((x) => new Date(x.timestamp).getUTCHours() % 8 === 0)
    .map((x) => ({ t: x.timestamp, rate8h: num(x.interest_8h, "deribit 8h") }))
    .sort((a, b) => a.t - b.t);
}

async function hlFundingHistory(days: number): Promise<FundingPoint[]> {
  const rows: { time: number; fundingRate: string }[] = [];
  let start = Date.now() - days * 86_400_000;
  // Paginated at 500 rows (hourly)
  for (let page = 0; page < 3; page++) {
    const r = await hlPost<{ time: number; fundingRate: string }[]>({ type: "fundingHistory", coin: "BTC", startTime: start });
    if (!r.length) break;
    rows.push(...r);
    if (r.length < 500) break;
    start = r[r.length - 1].time + 1;
  }
  // Sum each 8h block of hourly payments so it is comparable to an 8h rate.
  const buckets = new Map<number, { sum: number; n: number }>();
  for (const x of rows) {
    const b = Math.floor(x.time / 28_800_000) * 28_800_000;
    const cur = buckets.get(b) ?? { sum: 0, n: 0 };
    cur.sum += num(x.fundingRate, "hl rate");
    cur.n++;
    buckets.set(b, cur);
  }
  return [...buckets.entries()]
    .filter(([, v]) => v.n >= 6) // drop the partial current block
    .map(([t, v]) => ({ t, rate8h: (v.sum / v.n) * 8 }))
    .sort((a, b) => a.t - b.t);
}

/** Succeeds if at least one venue responds. */
export async function fundingHistory(days = 30): Promise<FundingHistory> {
  const venues = ["OKX", "Deribit", "Hyperliquid"] as const;
  const res = await Promise.allSettled([okxFundingHistory(), deribitFundingHistory(days), hlFundingHistory(days)]);
  const out: FundingHistory = [];
  res.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length) out.push({ venue: venues[i], points: r.value });
    else if (r.status === "rejected") console.warn(`[market] funding history ${venues[i]} failed: ${String(r.reason)}`);
  });
  if (!out.length) throw new Error("no funding history from any venue");
  return out;
}

// ---------- Open interest / positioning (OKX Rubik, all OKX BTC contracts) ----------

export type OiPoint = { t: number; oiUsd: number; volumeUsd: number };

export async function okxOiHistory(period: "1H" | "1D"): Promise<OiPoint[]> {
  const r = await getJson<{ code: string; data: [string, string, string][] }>(
    `https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume?ccy=BTC&period=${period}`
  );
  if (r.code !== "0" || !r.data?.length) throw new Error("okx rubik oi: empty");
  return r.data.map(([t, oi, vol]) => ({ t: num(t, "t"), oiUsd: num(oi, "oi"), volumeUsd: num(vol, "vol") })).sort((a, b) => a.t - b.t);
}

export async function okxLongShortRatio(): Promise<{ t: number; ratio: number }[]> {
  const r = await getJson<{ code: string; data: [string, string][] }>(
    "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=1H"
  );
  if (r.code !== "0" || !r.data?.length) throw new Error("okx long/short: empty");
  return r.data.map(([t, v]) => ({ t: num(t, "t"), ratio: num(v, "ratio") })).sort((a, b) => a.t - b.t);
}

// ---------- Deribit futures term structure ----------

export type BasisRow = {
  instrument: string;
  expiry: number;
  daysToExpiry: number;
  markPrice: number;
  premiumPct: number;
  annualisedPct: number | null;
  openInterestUsd: number;
};
export type TermStructure = { indexPrice: number; rows: BasisRow[] };

export async function deribitTermStructure(): Promise<TermStructure> {
  const r = await getJson<{ result: { instrument_name: string; mark_price: number; estimated_delivery_price: number; open_interest: number }[] }>(
    "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=future"
  );
  const now = Date.now();
  let indexPrice = 0;
  const rows: BasisRow[] = [];
  for (const x of r.result ?? []) {
    indexPrice = num(x.estimated_delivery_price, "deribit index");
    const expiry = deribitExpiry(x.instrument_name);
    if (expiry == null || expiry <= now) continue;
    const mark = num(x.mark_price, "mark");
    rows.push({
      instrument: x.instrument_name,
      expiry,
      daysToExpiry: (expiry - now) / 86_400_000,
      markPrice: mark,
      premiumPct: (mark / indexPrice - 1) * 100,
      annualisedPct: annualisedBasisPct(mark, indexPrice, expiry - now),
      openInterestUsd: num(x.open_interest, "oi"), // BTC futures OI on Deribit is USD-denominated
    });
  }
  if (!rows.length) throw new Error("no dated futures");
  return { indexPrice, rows: rows.sort((a, b) => a.expiry - b.expiry) };
}

// ---------- Coin Metrics community (free, attributed) ----------

export type OnchainDay = {
  day: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  mvrv: number | null;
  supply: number | null;
  issuanceUsd: number | null;
  feesBtc: number | null;
  activeAddresses: number | null;
  txCount: number | null;
  exchangeInflowUsd: number | null;
  exchangeOutflowUsd: number | null;
  exchangeSupplyBtc: number | null;
};

const CM_METRICS = "PriceUSD,CapMrktCurUSD,CapMVRVCur,SplyCur,IssTotUSD,FeeTotNtv,AdrActCnt,TxCnt,FlowInExUSD,FlowOutExUSD,SplyExNtv";

const opt = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Daily BTC on-chain metrics, ascending. Only metrics Coin Metrics marks as community (free). */
export async function coinMetricsDaily(days = 400): Promise<OnchainDay[]> {
  const start = dayKey(Date.now() - days * 86_400_000);
  const r = await getJson<{ data: Record<string, string>[] }>(
    `${CM}/timeseries/asset-metrics?assets=btc&metrics=${CM_METRICS}&frequency=1d&start_time=${start}&page_size=${days + 5}`,
    { timeoutMs: 12000 }
  );
  if (!r.data?.length) throw new Error("coin metrics: empty");
  return r.data.map((d) => ({
    day: d.time.slice(0, 10),
    priceUsd: opt(d.PriceUSD),
    marketCapUsd: opt(d.CapMrktCurUSD),
    mvrv: opt(d.CapMVRVCur),
    supply: opt(d.SplyCur),
    issuanceUsd: opt(d.IssTotUSD),
    feesBtc: opt(d.FeeTotNtv),
    activeAddresses: opt(d.AdrActCnt),
    txCount: opt(d.TxCnt),
    exchangeInflowUsd: opt(d.FlowInExUSD),
    exchangeOutflowUsd: opt(d.FlowOutExUSD),
    exchangeSupplyBtc: opt(d.SplyExNtv),
  }));
}

// ---------- Cross-asset daily closes ----------

/** Coinbase daily closes keyed by UTC day (up to 300 days). */
export async function coinbaseDaily(product: string): Promise<DailyPoint[]> {
  const rows = await getJson<number[][]>(`${COINBASE}/products/${product}/candles?granularity=86400`);
  if (!Array.isArray(rows) || !rows.length) throw new Error(`no candles for ${product}`);
  return rows.map(([t, , , , close]) => ({ day: dayKey(t * 1000), value: close })).sort((a, b) => a.day.localeCompare(b.day));
}

/** Hyperliquid daily closes (perps incl. HIP-3 markets such as xyz:SP500). */
export async function hyperliquidDaily(coin: string, days = 200): Promise<DailyPoint[]> {
  const end = Date.now();
  const rows = await hlPost<{ t: number; c: string }[]>({
    type: "candleSnapshot",
    req: { coin, interval: "1d", startTime: end - days * 86_400_000, endTime: end },
  });
  if (!Array.isArray(rows) || !rows.length) throw new Error(`no candles for ${coin}`);
  return rows.map((r) => ({ day: dayKey(r.t), value: num(r.c, "close") }));
}

// ---------- Sentiment / mempool history ----------

export async function fearGreedHistory(limit = 31): Promise<{ t: number; value: number; label: string }[]> {
  const r = await getJson<{ data: { value: string; value_classification: string; timestamp: string }[] }>(
    `https://api.alternative.me/fng/?limit=${limit}`,
    { timeoutMs: 8000 }
  );
  if (!r.data?.length) throw new Error("fng: empty");
  return r.data.map((d) => ({ t: num(d.timestamp, "ts") * 1000, value: num(d.value, "v"), label: d.value_classification })).sort((a, b) => a.t - b.t);
}

export type BlockFeeRate = { t: number; height: number; median: number; p90: number };

/** Per-block fee-rate percentiles for the last 24h (sat/vB). */
export async function blockFeeRates24h(): Promise<BlockFeeRate[]> {
  const r = await getJson<{ timestamp: number; avgHeight: number; avgFee_50: number; avgFee_90: number }[]>(
    `${MEMPOOL}/v1/mining/blocks/fee-rates/24h`
  );
  if (!r.length) throw new Error("fee rates: empty");
  return r.map((b) => ({ t: b.timestamp * 1000, height: b.avgHeight, median: num(b.avgFee_50, "p50"), p90: num(b.avgFee_90, "p90") }));
}

export type MempoolStats = { count: number; vsizeVb: number; totalFeeBtc: number };

export async function mempoolStats(): Promise<MempoolStats> {
  const r = await getJson<{ count: number; vsize: number; total_fee: number }>(`${MEMPOOL}/mempool`);
  return { count: num(r.count, "count"), vsizeVb: num(r.vsize, "vsize"), totalFeeBtc: num(r.total_fee, "fee") / 1e8 };
}

/** BTC's own 24h change from CoinGecko, used with /global to back out yesterday's dominance. */
export async function coingeckoDominance24h(): Promise<{ dominancePct: number; dominance24hAgoPct: number }> {
  const key = process.env.COINGECKO_API_KEY ? { headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } } : {};
  const [g, p] = await Promise.all([
    getJson<{ data: { market_cap_percentage: { btc: number }; market_cap_change_percentage_24h_usd: number } }>("https://api.coingecko.com/api/v3/global", key),
    getJson<{ bitcoin: { usd_24h_change: number } }>("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true", key),
  ]);
  const dom = num(g.data?.market_cap_percentage?.btc, "dom");
  const totalChg = num(g.data?.market_cap_change_percentage_24h_usd, "total chg") / 100;
  const btcChg = num(p.bitcoin?.usd_24h_change, "btc chg") / 100;
  // dominance = btc/total, so 24h ago = dom × (1 + totalChg) / (1 + btcChg)
  return { dominancePct: dom, dominance24hAgoPct: (dom * (1 + totalChg)) / (1 + btcChg) };
}
