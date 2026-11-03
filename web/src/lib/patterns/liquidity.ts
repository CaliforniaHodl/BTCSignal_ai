/**
 * Liquidity pools: price levels where resting stop orders conventionally cluster
 * (above swing highs / equal highs, below swing lows / equal lows, and prior
 * day/week extremes). Deterministic and descriptive — the only "rate" we show is
 * the observed base rate of past pools in the same window being swept.
 */
import { atr, last, swings } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";

export type ZoneKind = "equal_highs" | "equal_lows" | "swing_high" | "swing_low" | "pdh" | "pdl" | "pwh" | "pwl";

export type Zone = {
  id: string;
  kind: ZoneKind;
  label: string;
  side: "above" | "below";
  price: number;
  touches: number;
  firstTime: number;
  lastTime: number;
  distancePct: number;
  distanceAtr: number | null;
  /** HTF levels can already have been taken in the current day/week. */
  swept: boolean;
};

export type Sweep = {
  id: string;
  kind: ZoneKind;
  price: number;
  touches: number;
  formedTime: number;
  sweptTime: number;
  /** Wick through the level but closed back on the original side. */
  reclaimed: boolean;
};

export type SweepStat = { kind: "equal_highs" | "equal_lows"; formed: number; sweptWithin: number; horizonBars: number };

type Pool = { side: "high" | "low"; price: number; ref: number; touches: number; first: number; last: number; formed: number };

export const ZONE_LABELS: Record<ZoneKind, string> = {
  equal_highs: "Equal highs",
  equal_lows: "Equal lows",
  swing_high: "Swing high",
  swing_low: "Swing low",
  pdh: "Prior day high",
  pdl: "Prior day low",
  pwh: "Prior week high",
  pwl: "Prior week low",
};

/**
 * Walk the candles in order, maintaining unswept pools. A new swing within
 * `tolAtr` ATR of an active pool joins it (an "equal" high/low); otherwise any
 * bar trading beyond a pool sweeps it.
 */
export function scanPools(candles: Candle[], { lookback = 3, tolAtr = 0.25 } = {}) {
  const a = atr(candles, 14);
  const fallback = last(a);
  const { highs, lows } = swings(candles, lookback);
  const hiAt = new Map(highs.map((h) => [h.index, h.price]));
  const loAt = new Map(lows.map((l) => [l.index, l.price]));
  const active: Pool[] = [];
  const swept: (Pool & { sweptIndex: number; reclaimed: boolean })[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tol = tolAtr * (a[i] ?? fallback ?? c.close * 0.001);
    const newHigh = hiAt.get(i);
    const newLow = loAt.get(i);
    let mergedHigh = false;
    let mergedLow = false;
    // Join equal highs/lows before testing for sweeps, so a marginally higher equal high doesn't "sweep" its twin.
    for (const p of active) {
      if (newHigh != null && !mergedHigh && p.side === "high" && Math.abs(newHigh - p.ref) <= tol) {
        if (i - p.last > lookback) p.touches++; // tied adjacent bars are one touch
        p.price = Math.max(p.price, newHigh);
        p.last = i;
        p.formed = i + lookback;
        mergedHigh = true;
      }
      if (newLow != null && !mergedLow && p.side === "low" && Math.abs(newLow - p.ref) <= tol) {
        if (i - p.last > lookback) p.touches++; // tied adjacent bars are one touch
        p.price = Math.min(p.price, newLow);
        p.last = i;
        p.formed = i + lookback;
        mergedLow = true;
      }
    }
    for (let k = active.length - 1; k >= 0; k--) {
      const p = active[k];
      if (p.last === i) continue;
      const hit = p.side === "high" ? c.high > p.price : c.low < p.price;
      if (hit) {
        swept.push({ ...p, sweptIndex: i, reclaimed: p.side === "high" ? c.close < p.price : c.close > p.price });
        active.splice(k, 1);
      }
    }
    if (newHigh != null && !mergedHigh) active.push({ side: "high", price: newHigh, ref: newHigh, touches: 1, first: i, last: i, formed: i + lookback });
    if (newLow != null && !mergedLow) active.push({ side: "low", price: newLow, ref: newLow, touches: 1, first: i, last: i, formed: i + lookback });
  }
  return { active, swept };
}

/** Prior completed UTC day and Monday-aligned week extremes from daily candles. */
export function htfLevels(daily: Candle[]) {
  if (daily.length < 2) return null;
  const today = daily[daily.length - 1];
  const yday = daily[daily.length - 2];
  const WEEK = 7 * 86_400;
  const MONDAY_OFFSET = 4 * 86_400; // 1970-01-01 was a Thursday
  const weekOf = (t: number) => Math.floor((t - MONDAY_OFFSET) / WEEK) * WEEK + MONDAY_OFFSET;
  const thisWeek = weekOf(today.time);
  const prevWeek = daily.filter((d) => weekOf(d.time) === thisWeek - WEEK);
  const curWeek = daily.filter((d) => weekOf(d.time) === thisWeek);
  return {
    pdh: { price: yday.high, time: yday.time, swept: today.high > yday.high },
    pdl: { price: yday.low, time: yday.time, swept: today.low < yday.low },
    pwh: prevWeek.length
      ? { price: Math.max(...prevWeek.map((d) => d.high)), time: prevWeek[0].time, swept: Math.max(...curWeek.map((d) => d.high)) > Math.max(...prevWeek.map((d) => d.high)) }
      : null,
    pwl: prevWeek.length
      ? { price: Math.min(...prevWeek.map((d) => d.low)), time: prevWeek[0].time, swept: Math.min(...curWeek.map((d) => d.low)) < Math.min(...prevWeek.map((d) => d.low)) }
      : null,
  };
}

export function liquidityMap(
  candles: Candle[],
  { daily, lookback = 3, tolAtr = 0.25, horizonBars = 48, maxZones = 16 }: { daily?: Candle[]; lookback?: number; tolAtr?: number; horizonBars?: number; maxZones?: number } = {}
) {
  if (candles.length < 20) return null;
  const close = candles[candles.length - 1].close;
  const atrNow = last(atr(candles, 14));
  const { active, swept } = scanPools(candles, { lookback, tolAtr });
  const dist = (price: number) => ({
    distancePct: ((price - close) / close) * 100,
    distanceAtr: atrNow ? (price - close) / atrNow : null,
  });

  const zones: Zone[] = active.map((p) => {
    const kind: ZoneKind = p.side === "high" ? (p.touches >= 2 ? "equal_highs" : "swing_high") : p.touches >= 2 ? "equal_lows" : "swing_low";
    return {
      id: `${kind}-${candles[p.first].time}`,
      kind,
      label: ZONE_LABELS[kind],
      side: p.price >= close ? "above" : "below",
      price: p.price,
      touches: p.touches,
      firstTime: candles[p.first].time,
      lastTime: candles[p.last].time,
      ...dist(p.price),
      swept: false,
    };
  });

  const htf = daily ? htfLevels(daily) : null;
  if (htf) {
    for (const k of ["pdh", "pdl", "pwh", "pwl"] as const) {
      const l = htf[k];
      if (!l) continue;
      zones.push({
        id: `${k}-${l.time}`,
        kind: k,
        label: ZONE_LABELS[k],
        side: l.price >= close ? "above" : "below",
        price: l.price,
        touches: 1,
        firstTime: l.time,
        lastTime: l.time,
        ...dist(l.price),
        swept: l.swept,
      });
    }
  }

  // Keep every equal-high/low and HTF level, then fill with the nearest single swings.
  const priority = zones.filter((z) => z.kind !== "swing_high" && z.kind !== "swing_low");
  const singles = zones
    .filter((z) => z.kind === "swing_high" || z.kind === "swing_low")
    .sort((x, y) => Math.abs(x.distancePct) - Math.abs(y.distancePct))
    .slice(0, Math.max(0, maxZones - priority.length));
  const ordered = [...priority, ...singles].sort((x, y) => y.price - x.price);

  const sweeps: Sweep[] = swept
    .filter((p) => p.touches >= 2)
    .map((p) => ({
      id: `sweep-${candles[p.first].time}-${candles[p.sweptIndex].time}`,
      kind: p.side === "high" ? ("equal_highs" as const) : ("equal_lows" as const),
      price: p.price,
      touches: p.touches,
      formedTime: candles[p.last].time,
      sweptTime: candles[p.sweptIndex].time,
      reclaimed: p.reclaimed,
    }))
    .sort((x, y) => y.sweptTime - x.sweptTime);

  return { close, atr: atrNow, zones: ordered, sweeps, stats: sweepStats(candles.length, active, swept, horizonBars) };
}

/**
 * Observed base rate in this window: of equal-high/low pools that had at least
 * `horizonBars` bars of follow-up, how many were swept within that horizon.
 */
export function sweepStats(
  n: number,
  active: Pool[],
  swept: (Pool & { sweptIndex: number })[],
  horizonBars: number
): SweepStat[] {
  return (["high", "low"] as const).map((side) => {
    let formed = 0;
    let sweptWithin = 0;
    const all: (Pool & { sweptIndex?: number })[] = [...active, ...swept];
    for (const p of all) {
      if (p.side !== side || p.touches < 2) continue;
      if (p.formed + horizonBars > n - 1) continue; // not enough follow-up yet
      formed++;
      if (p.sweptIndex != null && p.sweptIndex - p.formed <= horizonBars) sweptWithin++;
    }
    return { kind: side === "high" ? "equal_highs" : "equal_lows", formed, sweptWithin, horizonBars };
  });
}
