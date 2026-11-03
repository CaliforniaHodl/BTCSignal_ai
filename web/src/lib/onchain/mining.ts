/** Full difficulty + hashrate history from mempool.space, reduced to chart payloads. */
import { cacheLife, cacheTag } from "next/cache";
import { getJson, num } from "@/lib/market/http";
import type { Datum } from "@/lib/market/types";
import { cachedDatum, stamp, type Stamped } from "./cached";
import { analyzeRibbon, dailyDifficulty, hashRibbon, type Episode, type RibbonAnalysis, type HashRibbon } from "./ribbon";

const MEMPOOL = "https://mempool.space/api";

/** Columnar series: `t` unix seconds, other arrays aligned to it. */
export type RibbonSeries = { t: number[]; d: number[]; s: (number | null)[][] };
export type HashSeries = { t: number[]; h: number[]; s30: (number | null)[]; s60: (number | null)[] };

export type MiningView = {
  ribbonDaily: RibbonSeries;
  ribbonWeekly: RibbonSeries;
  hash: HashSeries;
  ribbon: NonNullable<RibbonAnalysis["latest"]>;
  inversions: Episode[];
  hashLatest: NonNullable<HashRibbon["latest"]>;
  capitulations: Episode[];
  lastRetarget: { time: number; height: number; difficulty: number; changePct: number };
  firstDay: number;
};

/** Daily ribbon points sent to the client; longer ranges use the weekly sample. */
const DAILY_DAYS = 365;
const HASH_DAYS = 2 * 365;
const sig = (x: number | null) => (x == null ? null : Number(x.toPrecision(4)));

async function fetchMining(): Promise<Stamped<MiningView>> {
  "use cache";
  cacheLife({ stale: 1800, revalidate: 3600, expire: 86400 });
  cacheTag("mining-history");
  return stamp(async () => {
    const r = await getJson<{
      hashrates: { timestamp: number; avgHashrate: number }[];
      difficulty: { time: number; height: number; difficulty: number; adjustment: number }[];
    }>(`${MEMPOOL}/v1/mining/hashrate/all`, { timeoutMs: 15000 });
    if (!Array.isArray(r.hashrates) || !Array.isArray(r.difficulty) || r.difficulty.length < 50) {
      throw new Error("mining history incomplete");
    }
    const epochs = r.difficulty.map((e) => ({ time: num(e.time, "epoch time"), difficulty: num(e.difficulty, "difficulty") }));
    const last = r.difficulty.reduce((a, b) => (b.time > a.time ? b : a));
    const hr = r.hashrates.map((h) => ({ t: num(h.timestamp, "hr ts"), h: num(h.avgHashrate, "hr") / 1e18 }));
    const until = hr.length ? hr[hr.length - 1].t : Math.floor(Date.now() / 1000);

    const daily = dailyDifficulty(epochs, until);
    const a = analyzeRibbon(daily);
    if (!a.latest) throw new Error("not enough difficulty history");

    const pick = (idx: number[]): RibbonSeries => ({
      t: idx.map((i) => a.times[i]),
      d: idx.map((i) => sig(a.difficulty[i])!),
      s: a.smas.map((s) => idx.map((i) => sig(s[i]))),
    });
    const n = a.times.length;
    const dailyIdx = Array.from({ length: Math.min(DAILY_DAYS, n) }, (_, k) => n - Math.min(DAILY_DAYS, n) + k);
    // weekly sample from 2010-07 (first GPU era) to keep log-scale readable; always include the last day
    const from = Date.UTC(2010, 6, 1) / 1000;
    const weeklyIdx = a.times.flatMap((t, i) => (t >= from && ((n - 1 - i) % 7 === 0) ? [i] : []));

    const hrb = hashRibbon(hr.map((x) => x.t), hr.map((x) => x.h));
    if (!hrb.latest) throw new Error("not enough hashrate history");
    const hn = hr.length;
    const hFrom = Math.max(0, hn - HASH_DAYS);

    return {
      ribbonDaily: pick(dailyIdx),
      ribbonWeekly: pick(weeklyIdx),
      hash: {
        t: hr.slice(hFrom).map((x) => x.t),
        h: hr.slice(hFrom).map((x) => sig(x.h)!),
        s30: hrb.sma30.slice(hFrom).map(sig),
        s60: hrb.sma60.slice(hFrom).map(sig),
      },
      ribbon: a.latest,
      inversions: a.inversions,
      hashLatest: hrb.latest,
      capitulations: hrb.capitulations,
      lastRetarget: {
        time: num(last.time, "time"),
        height: num(last.height, "height"),
        difficulty: num(last.difficulty, "difficulty"),
        changePct: (num(last.adjustment, "adjustment") - 1) * 100,
      },
      firstDay: a.times[0],
    };
  });
}

export function getMining(): Promise<Datum<MiningView>> {
  return cachedDatum("mempool.space", fetchMining);
}
