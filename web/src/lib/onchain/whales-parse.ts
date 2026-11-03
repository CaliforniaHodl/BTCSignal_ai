/** Pure helpers for large-transaction filtering. */

/** Row of mempool.space `/api/v1/block/:hash/summary` or `/api/mempool/recent`. */
export type TxSummaryRow = { txid: string; value: number; fee: number; vsize: number };

export type WhaleTx = {
  txid: string;
  /** Sum of all outputs in sats — includes any change returned to the sender. */
  valueSats: number;
  feeSats: number;
  vsize: number;
  /** null = still unconfirmed */
  blockHeight: number | null;
  /** block timestamp, or fetch time for unconfirmed (unix seconds) */
  time: number;
};

export const WHALE_THRESHOLDS_BTC = [10, 50, 100, 500, 1000] as const;
export const MIN_WHALE_BTC = WHALE_THRESHOLDS_BTC[0];

/**
 * Keep txs whose total output ≥ minBtc. In a block summary the first row is the
 * coinbase (new issuance + fees, not a transfer), so it's skipped when `isBlock`.
 */
export function largeTxs(
  rows: TxSummaryRow[],
  minBtc: number,
  meta: { blockHeight: number | null; time: number; isBlock: boolean }
): WhaleTx[] {
  const minSats = minBtc * 1e8;
  const out: WhaleTx[] = [];
  rows.forEach((r, i) => {
    if (meta.isBlock && i === 0) return;
    if (!r || typeof r.txid !== "string" || !Number.isFinite(r.value)) return;
    if (r.value < minSats) return;
    out.push({ txid: r.txid, valueSats: r.value, feeSats: r.fee, vsize: r.vsize, blockHeight: meta.blockHeight, time: meta.time });
  });
  return out;
}

/** Dedupe by txid (confirmed wins over unconfirmed), newest first, then largest first. */
export function mergeWhales(lists: WhaleTx[][]): WhaleTx[] {
  const byId = new Map<string, WhaleTx>();
  for (const tx of lists.flat()) {
    const prev = byId.get(tx.txid);
    if (!prev || (prev.blockHeight == null && tx.blockHeight != null)) byId.set(tx.txid, tx);
  }
  return [...byId.values()].sort((a, b) => b.time - a.time || b.valueSats - a.valueSats);
}
