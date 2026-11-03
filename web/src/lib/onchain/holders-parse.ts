/**
 * Holder-behaviour proxies from Coin Metrics community data. Pure.
 *
 * These are NOT HODL waves (supply by coin age). They're the closest honest
 * substitutes available without a paid feed: how much supply sits on
 * exchanges, which way it's flowing, and MVRV (market cap / realized cap).
 */

export type CmRow = Record<string, string | undefined> & { time: string };

export type HolderPoint = {
  time: number;
  supply: number;
  exchangeSupply: number | null;
  exchangeSharePct: number | null;
  inflow: number | null;
  outflow: number | null;
  mvrv: number | null;
  /** true when Coin Metrics marks the exchange values as preliminary ("flash") */
  flash: boolean;
};

const n = (v: string | undefined) => {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export function parseHolderRows(rows: CmRow[]): HolderPoint[] {
  const out: HolderPoint[] = [];
  for (const r of rows) {
    const time = Math.floor(Date.parse(r.time) / 1000);
    const supply = n(r.SplyCur);
    if (!Number.isFinite(time) || supply == null || supply <= 0) continue;
    const ex = n(r.SplyExNtv);
    out.push({
      time,
      supply,
      exchangeSupply: ex,
      exchangeSharePct: ex != null ? (ex / supply) * 100 : null,
      inflow: n(r.FlowInExNtv),
      outflow: n(r.FlowOutExNtv),
      mvrv: n(r.CapMVRVCur),
      flash: r["SplyExNtv-status"] === "flash" || r["FlowInExNtv-status"] === "flash",
    });
  }
  return out.sort((a, b) => a.time - b.time);
}

/** Rolling N-day net exchange flow (outflow − inflow, BTC). Positive = coins leaving exchanges. */
export function rollingNetOutflow(points: HolderPoint[], days: number): (number | null)[] {
  return points.map((_, i) => {
    if (i < days - 1) return null;
    let s = 0;
    for (let k = i - days + 1; k <= i; k++) {
      const p = points[k];
      if (p.inflow == null || p.outflow == null) return null;
      s += p.outflow - p.inflow;
    }
    return s;
  });
}

/** Value `days` ago vs latest for a field (null if missing). */
export function changeOver(points: HolderPoint[], days: number, pick: (p: HolderPoint) => number | null): number | null {
  const last = points.at(-1);
  const prev = points.at(-1 - days);
  if (!last || !prev) return null;
  const a = pick(last);
  const b = pick(prev);
  return a == null || b == null ? null : a - b;
}
