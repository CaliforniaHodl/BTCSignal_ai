/** Large BTC transactions from recent blocks + the mempool's newest arrivals (mempool.space). */
import { cacheLife, cacheTag } from "next/cache";
import { getJson, num } from "@/lib/market/http";
import type { Datum } from "@/lib/market/types";
import { cachedDatum, stamp, type Stamped } from "./cached";
import { largeTxs, mergeWhales, MIN_WHALE_BTC, type TxSummaryRow, type WhaleTx } from "./whales-parse";

const MEMPOOL = "https://mempool.space/api";
export const WHALE_BLOCKS = 6;

/** A block's txs never change once mined (barring a rare reorg), so cache per hash for a long time. */
async function blockWhales(hash: string, height: number, time: number): Promise<WhaleTx[]> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 86400, expire: 7 * 86400 });
  cacheTag(`block-${hash}`);
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error("bad block hash");
  const rows = await getJson<TxSummaryRow[]>(`${MEMPOOL}/v1/block/${hash}/summary`, { timeoutMs: 15000 });
  if (!Array.isArray(rows)) throw new Error("bad block summary");
  return largeTxs(rows, MIN_WHALE_BTC, { blockHeight: height, time, isBlock: true });
}

export type WhaleView = {
  txs: WhaleTx[];
  /** `scanned: false` = that block's summary failed to load, so its txs are missing. */
  blocks: { height: number; time: number; txCount: number; scanned: boolean }[];
  /** How many of the newest mempool arrivals were scanned (mempool.space exposes only the last ~10). */
  mempoolScanned: number;
};

async function fetchWhales(): Promise<Stamped<WhaleView>> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 300 });
  cacheTag("whales");
  return stamp(async () => {
    const [blocks, recent] = await Promise.all([
      getJson<{ id: string; height: number; timestamp: number; tx_count: number }[]>(`${MEMPOOL}/v1/blocks`),
      getJson<TxSummaryRow[]>(`${MEMPOOL}/mempool/recent`).catch(() => [] as TxSummaryRow[]),
    ]);
    if (!Array.isArray(blocks) || blocks.length === 0) throw new Error("no blocks");
    const latest = blocks.slice(0, WHALE_BLOCKS);
    const settled = await Promise.allSettled(
      latest.map((b) => blockWhales(b.id, num(b.height, "height"), num(b.timestamp, "timestamp")))
    );
    if (settled.every((r) => r.status === "rejected")) throw new Error("no block summaries");
    const perBlock = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
    const now = Math.floor(Date.now() / 1000);
    const pending = largeTxs(Array.isArray(recent) ? recent : [], MIN_WHALE_BTC, { blockHeight: null, time: now, isBlock: false });
    return {
      txs: mergeWhales([pending, ...perBlock]),
      blocks: latest.map((b, i) => ({ height: b.height, time: b.timestamp, txCount: b.tx_count, scanned: settled[i].status === "fulfilled" })),
      mempoolScanned: Array.isArray(recent) ? recent.length : 0,
    };
  });
}

export function getWhales(): Promise<Datum<WhaleView>> {
  return cachedDatum("mempool.space", fetchWhales);
}
