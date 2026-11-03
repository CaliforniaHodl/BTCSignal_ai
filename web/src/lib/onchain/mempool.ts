/** Mempool backlog and projected blocks from mempool.space. */
import { cacheLife, cacheTag } from "next/cache";
import { getJson, num } from "@/lib/market/http";
import type { Datum } from "@/lib/market/types";
import { cachedDatum, stamp, type Stamped } from "./cached";

const MEMPOOL = "https://mempool.space/api";

export type ProjectedBlock = {
  nTx: number;
  vsize: number;
  medianFee: number;
  minFee: number;
  maxFee: number;
};

export type MempoolState = {
  count: number;
  /** total virtual size of unconfirmed txs, vB */
  vsize: number;
  totalFeeSats: number;
  /** Next blocks as mempool.space would build them from the current mempool. */
  projected: ProjectedBlock[];
};

async function fetchMempool(): Promise<Stamped<MempoolState>> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 30, expire: 300 });
  cacheTag("mempool-state");
  return stamp(async () => {
    const [m, blocks] = await Promise.all([
      getJson<{ count: number; vsize: number; total_fee: number }>(`${MEMPOOL}/mempool`),
      getJson<{ nTx: number; blockVSize: number; medianFee: number; feeRange: number[] }[]>(`${MEMPOOL}/v1/fees/mempool-blocks`),
    ]);
    if (!Array.isArray(blocks)) throw new Error("bad mempool-blocks");
    return {
      count: num(m.count, "count"),
      vsize: num(m.vsize, "vsize"),
      totalFeeSats: num(m.total_fee, "total_fee"),
      projected: blocks.map((b) => ({
        nTx: num(b.nTx, "nTx"),
        vsize: num(b.blockVSize, "blockVSize"),
        medianFee: num(b.medianFee, "medianFee"),
        minFee: num(b.feeRange?.[0], "feeRange min"),
        maxFee: num(b.feeRange?.[b.feeRange.length - 1], "feeRange max"),
      })),
    };
  });
}

export function getMempool(): Promise<Datum<MempoolState>> {
  return cachedDatum("mempool.space", fetchMempool);
}
