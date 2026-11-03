/**
 * Pure transforms for the Pro dashboard: on-chain valuation from Coin Metrics
 * community data, cross-asset correlations, and the flat export rows.
 */
import type { OnchainDay } from "@/lib/market/sources-pro";
import { puellMultiple, returnCorrelation, trailingMean, type DailyPoint } from "@/lib/market/stats";

export type OnchainSummary = {
  day: string;
  /** Coin Metrics marks recent exchange-flow values as "flash" (revisable) */
  mvrv: number | null;
  marketCapUsd: number | null;
  /** = market cap / MVRV (definitionally exact) */
  realizedCapUsd: number | null;
  realizedPriceUsd: number | null;
  puell: number | null;
  activeAddresses: number | null;
  activeAddresses30dAvg: number | null;
  txCount: number | null;
  feesUsd: number | null;
  exchangeNetflowUsd: number | null;
  exchangeNetflow30dSumUsd: number | null;
  exchangeSupplyBtc: number | null;
  exchangeSupply30dChangeBtc: number | null;
  series: { day: string; price: number | null; realizedPrice: number | null; mvrv: number | null }[];
  flows: { day: string; netflowUsd: number }[];
};

const nn = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);

export function computeOnchain(rows: OnchainDay[]): OnchainSummary {
  if (!rows.length) throw new Error("no on-chain rows");
  // Latest day where the core valuation metrics are present (today's row can be partial).
  const core = [...rows].reverse().find((r) => r.mvrv != null && r.marketCapUsd != null && r.supply != null) ?? rows[rows.length - 1];
  const realized = (r: OnchainDay) => (r.marketCapUsd != null && r.mvrv ? r.marketCapUsd / r.mvrv : null);
  const realizedCap = realized(core);
  const flowRows = rows.filter((r) => r.exchangeInflowUsd != null && r.exchangeOutflowUsd != null);
  const nets = flowRows.map((r) => ({ day: r.day, netflowUsd: r.exchangeInflowUsd! - r.exchangeOutflowUsd! }));
  const exSupply = rows.filter((r) => r.exchangeSupplyBtc != null);
  const lastEx = exSupply[exSupply.length - 1];
  const ex30 = exSupply[exSupply.length - 31];
  const aa = nn(rows.map((r) => r.activeAddresses));
  const issuance = nn(rows.map((r) => r.issuanceUsd));
  return {
    day: core.day,
    mvrv: core.mvrv,
    marketCapUsd: core.marketCapUsd,
    realizedCapUsd: realizedCap,
    realizedPriceUsd: realizedCap != null && core.supply ? realizedCap / core.supply : null,
    puell: puellMultiple(issuance),
    activeAddresses: core.activeAddresses,
    activeAddresses30dAvg: trailingMean(aa, 30),
    txCount: core.txCount,
    feesUsd: core.feesBtc != null && core.priceUsd != null ? core.feesBtc * core.priceUsd : null,
    exchangeNetflowUsd: nets.length ? nets[nets.length - 1].netflowUsd : null,
    exchangeNetflow30dSumUsd: nets.length >= 30 ? nets.slice(-30).reduce((s, n) => s + n.netflowUsd, 0) : null,
    exchangeSupplyBtc: lastEx?.exchangeSupplyBtc ?? null,
    exchangeSupply30dChangeBtc: lastEx && ex30 ? lastEx.exchangeSupplyBtc! - ex30.exchangeSupplyBtc! : null,
    series: rows.slice(-365).map((r) => {
      const rc = realized(r);
      return { day: r.day, price: r.priceUsd, mvrv: r.mvrv, realizedPrice: rc != null && r.supply ? rc / r.supply : null };
    }),
    flows: nets.slice(-60),
  };
}

export type Correlation = { id: string; label: string; source: string; r30: number | null; n30: number; r90: number | null; n90: number; ok: boolean; error?: string };

export function correlations(btc: DailyPoint[], others: { id: string; label: string; source: string; series: DailyPoint[] | null; error?: string }[]): Correlation[] {
  return others.map((o) => {
    if (!o.series) return { id: o.id, label: o.label, source: o.source, r30: null, n30: 0, r90: null, n90: 0, ok: false, error: o.error };
    const a = returnCorrelation(btc, o.series, 30), b = returnCorrelation(btc, o.series, 90);
    return { id: o.id, label: o.label, source: o.source, r30: a.r, n30: a.n, r90: b.r, n90: b.n, ok: true };
  });
}

/** One row per exported number. Panels map to the dashboard layout so export follows what's shown. */
export type ExportRow = { panel: string; metric: string; value: number | string | null; unit: string; source: string; asOf: string };

export function toCsv(rows: ExportRow[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Quote and neutralise spreadsheet formula injection.
    const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["panel", "metric", "value", "unit", "source", "as_of"];
  return [head.join(","), ...rows.map((r) => [r.panel, r.metric, r.value, r.unit, r.source, r.asOf].map(esc).join(","))].join("\n") + "\n";
}
