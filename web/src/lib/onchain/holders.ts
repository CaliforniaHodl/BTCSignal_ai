/**
 * Coin Metrics Community API (no key). Exchange supply/flows and MVRV.
 * Age-band supply (SplyAct*) is NOT in the community tier — verified: the API
 * returns 403 "not available with supplied credentials" for every SplyAct* metric.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getJson } from "@/lib/market/http";
import type { Datum } from "@/lib/market/types";
import { cachedDatum, stamp, type Stamped } from "./cached";
import { parseHolderRows, type CmRow, type HolderPoint } from "./holders-parse";

const CM = "https://community-api.coinmetrics.io/v4";
const METRICS = ["SplyCur", "SplyExNtv", "FlowInExNtv", "FlowOutExNtv", "CapMVRVCur"];
const YEARS = 4;

async function fetchHolders(): Promise<Stamped<HolderPoint[]>> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 6 * 3600, expire: 86400 });
  cacheTag("coinmetrics-holders");
  return stamp(async () => {
    const start = new Date(Date.now() - YEARS * 365 * 86400_000).toISOString().slice(0, 10);
    const url = `${CM}/timeseries/asset-metrics?assets=btc&metrics=${METRICS.join(",")}&frequency=1d&start_time=${start}&page_size=10000`;
    const r = await getJson<{ data?: CmRow[]; error?: { message: string } }>(url, { timeoutMs: 15000 });
    if (!Array.isArray(r.data)) throw new Error(r.error?.message ?? "no data");
    const points = parseHolderRows(r.data);
    if (points.length < 60) throw new Error("too little history");
    return points;
  });
}

export function getHolders(): Promise<Datum<HolderPoint[]>> {
  return cachedDatum("Coin Metrics Community", fetchHolders);
}
