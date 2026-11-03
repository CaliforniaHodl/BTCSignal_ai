/**
 * Difficulty ribbon (Willy Woo) and hash ribbon (Charles Edwards), computed
 * from real mempool.space history. Pure — no I/O.
 *
 * Difficulty only changes at a retarget, so the daily difficulty series is an
 * exact step function of the retarget history, not an interpolation.
 */
import { sma, type Series } from "@/lib/indicators";

export const RIBBON_PERIODS = [9, 14, 25, 40, 60, 90, 128, 200] as const;
const DAY = 86400;

export type Epoch = { time: number; difficulty: number };

/** Daily (UTC midnight) difficulty in effect at the end of each day, from first epoch through `until`. */
export function dailyDifficulty(epochs: Epoch[], until: number): { time: number; difficulty: number }[] {
  const sorted = [...epochs].sort((a, b) => a.time - b.time);
  if (sorted.length === 0) return [];
  const out: { time: number; difficulty: number }[] = [];
  let j = 0;
  for (let d = Math.floor(sorted[0].time / DAY) * DAY; d <= until; d += DAY) {
    while (j + 1 < sorted.length && sorted[j + 1].time < d + DAY) j++;
    out.push({ time: d, difficulty: sorted[j].difficulty });
  }
  return out;
}

export type Episode = { start: number; end: number | null; days: number };

/** Contiguous runs where `cond[i]` is true, ignoring runs shorter than `minDays`. Open run → end null. */
export function episodes(times: number[], cond: (boolean | null)[], minDays = 1): Episode[] {
  const out: Episode[] = [];
  let start = -1;
  for (let i = 0; i <= cond.length; i++) {
    const on = i < cond.length && cond[i] === true;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      const len = i - start;
      if (len >= minDays) out.push({ start: times[start], end: i < cond.length ? times[i - 1] : null, days: len });
      start = -1;
    }
  }
  return out;
}

/** Percent of `xs` strictly below x (0–100): 0 = narrowest ever seen. */
export function percentileRank(xs: number[], x: number): number {
  if (xs.length === 0) return NaN;
  return (xs.filter((v) => v < x).length / xs.length) * 100;
}

export type RibbonState = "inverted" | "compressed" | "expanding";

export type RibbonAnalysis = {
  times: number[];
  difficulty: number[];
  smas: Series[];
  /** (max SMA − min SMA) / min SMA, % — null during warm-up. */
  width: (number | null)[];
  latest: {
    time: number;
    difficulty: number;
    smas: number[];
    widthPct: number;
    widthPercentile: number;
    /** SMA 9 vs SMA 200, % */
    shortVsLongPct: number;
    state: RibbonState;
  } | null;
  inversions: Episode[];
};

/** Bottom-quantile width that counts as "compressed". */
export const COMPRESSED_PERCENTILE = 15;

export function analyzeRibbon(daily: { time: number; difficulty: number }[], minHistoryFrom = Date.UTC(2011, 0, 1) / 1000): RibbonAnalysis {
  const times = daily.map((d) => d.time);
  const difficulty = daily.map((d) => d.difficulty);
  const smas = RIBBON_PERIODS.map((p) => sma(difficulty, p));
  const width = times.map((_, i) => {
    const vals = smas.map((s) => s[i]);
    if (vals.some((v) => v == null)) return null;
    const nums = vals as number[];
    const lo = Math.min(...nums);
    return ((Math.max(...nums) - lo) / lo) * 100;
  });
  const short = smas[0];
  const long = smas[smas.length - 1];
  const inverted = times.map((_, i) => (short[i] == null || long[i] == null ? null : short[i]! < long[i]!));

  // Percentile reference: history once the network had real mining (excludes the 2009–10 CPU era).
  const ref = width.filter((w, i): w is number => w != null && times[i] >= minHistoryFrom);
  const i = times.length - 1;
  let latest: RibbonAnalysis["latest"] = null;
  if (i >= 0 && width[i] != null) {
    const widthPct = width[i]!;
    const widthPercentile = percentileRank(ref, widthPct);
    const isInv = inverted[i] === true;
    latest = {
      time: times[i],
      difficulty: difficulty[i],
      smas: smas.map((s) => s[i]!),
      widthPct,
      widthPercentile,
      shortVsLongPct: ((short[i]! - long[i]!) / long[i]!) * 100,
      state: isInv ? "inverted" : widthPercentile <= COMPRESSED_PERCENTILE ? "compressed" : "expanding",
    };
  }
  return { times, difficulty, smas, width, latest, inversions: episodes(times, inverted, 7) };
}

export type HashRibbon = {
  sma30: Series;
  sma60: Series;
  latest: { time: number; hashrate: number; sma30: number; sma60: number; capitulation: boolean; daysSinceCross: number } | null;
  capitulations: Episode[];
};

/** Hash ribbon: 30-day vs 60-day SMA of daily hashrate. Capitulation while 30d < 60d. */
export function hashRibbon(times: number[], hashrate: number[]): HashRibbon {
  const sma30 = sma(hashrate, 30);
  const sma60 = sma(hashrate, 60);
  const cap = times.map((_, i) => (sma30[i] == null || sma60[i] == null ? null : sma30[i]! < sma60[i]!));
  const i = times.length - 1;
  let latest: HashRibbon["latest"] = null;
  if (i >= 0 && sma60[i] != null) {
    let k = i;
    while (k > 0 && cap[k - 1] === cap[i]) k--;
    latest = {
      time: times[i],
      hashrate: hashrate[i],
      sma30: sma30[i]!,
      sma60: sma60[i]!,
      capitulation: cap[i] === true,
      daysSinceCross: Math.round((times[i] - times[k]) / DAY),
    };
  }
  return { sma30, sma60, latest, capitulations: episodes(times, cap, 7) };
}
