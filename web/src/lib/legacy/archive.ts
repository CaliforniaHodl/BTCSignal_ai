/**
 * Legacy v1 call archive: what the retired v1 bot recorded, plus an independent
 * re-check against Coinbase hourly candles. Pure functions (tested).
 */
import { findExit, type Position } from "@/lib/agent/broker";
import type { Candle } from "@/lib/market/types";

export type LegacyCall = {
  date: string; // ISO
  direction: "up" | "down";
  /** 0..100 as published */
  confidence: number;
  price: number;
  targetPrice: number;
  stopLoss: number;
  /** What v1 recorded; null = never resolved */
  callResult: "win" | "loss" | null;
  /** Set on posts whose recorded price doesn't match the market (see post frontmatter). */
  excludeFromStats: boolean;
  archiveNote: string | null;
};

export type LedgerEntry = { date: string; confidence: number; actualResult: string; pnlPercent: number | null };

export type ArchiveRow<C extends LegacyCall = LegacyCall> = C & {
  /** v1's separate P&L ledger (historical-calls.json), matched on exact timestamp */
  ledger: { confidencePct: number; result: string; pnlPct: number | null } | null;
};

export function mergeLedger<C extends LegacyCall>(calls: C[], ledger: LedgerEntry[]): ArchiveRow<C>[] {
  const byDate = new Map(ledger.map((l) => [new Date(l.date).toISOString(), l]));
  return calls.map((c) => {
    const l = byDate.get(new Date(c.date).toISOString());
    return { ...c, ledger: l ? { confidencePct: Math.round(l.confidence * 100), result: l.actualResult, pnlPct: l.pnlPercent } : null };
  });
}

export type Tally = { wins: number; losses: number; hitRatePct: number | null };
const tally = (rs: { callResult: "win" | "loss" | null }[]): Tally => {
  const wins = rs.filter((r) => r.callResult === "win").length;
  const losses = rs.filter((r) => r.callResult === "loss").length;
  return { wins, losses, hitRatePct: wins + losses ? (wins / (wins + losses)) * 100 : null };
};

/** Recorded record, excluding flagged posts. */
export function summariseRecorded(calls: LegacyCall[]) {
  const counted = calls.filter((c) => !c.excludeFromStats);
  return {
    total: calls.length,
    excluded: calls.length - counted.length,
    unresolved: counted.filter((c) => c.callResult == null).length,
    all: tally(counted),
    up: tally(counted.filter((c) => c.direction === "up")),
    down: tally(counted.filter((c) => c.direction === "down")),
  };
}

export const RECHECK_HORIZON_H = 24;
/** Recorded entry this far from the market's hourly close is treated as not a real price. */
export const PRICE_MISMATCH_PCT = 2;

export type Recheck =
  | { status: "no-data" }
  | { status: "price-mismatch"; marketClose: number; diffPct: number }
  | { status: "target" | "stop" | "neither"; exitPrice: number; returnPct: number; hitAt: number | null };

/**
 * Re-resolve a v1 call against real candles: from the first full hour after the
 * post, for 24h, whichever of target/stop is touched first (stop wins a tie,
 * gaps fill at the open — same rule as the live resolver). If neither, mark to
 * the last close.
 */
export function recheckCall(c: Pick<LegacyCall, "date" | "direction" | "price" | "targetPrice" | "stopLoss">, hourly: Candle[], horizonH = RECHECK_HORIZON_H): Recheck {
  const t = Math.floor(new Date(c.date).getTime() / 1000);
  const hourOpen = t - (t % 3600);
  const entryBar = hourly.find((k) => k.time === hourOpen);
  const start = hourOpen + 3600;
  const window = hourly.filter((k) => k.time >= start && k.time < start + horizonH * 3600);
  if (!entryBar || window.length < horizonH * 0.75) return { status: "no-data" };

  const diffPct = ((c.price - entryBar.close) / entryBar.close) * 100;
  if (Math.abs(diffPct) > PRICE_MISMATCH_PCT) return { status: "price-mismatch", marketClose: entryBar.close, diffPct };

  const side = c.direction === "up" ? "long" : "short";
  const pos: Position = { side, qtyBtc: 1, entryPrice: c.price, stop: c.stopLoss, target: c.targetPrice, openFeeUsd: 0 };
  const hit = findExit(pos, window);
  const exitPrice = hit ? hit.price : window[window.length - 1].close;
  const returnPct = ((exitPrice - c.price) / c.price) * 100 * (side === "long" ? 1 : -1);
  return { status: hit ? hit.reason : "neither", exitPrice, returnPct, hitAt: hit?.time ?? null };
}

export function summariseRecheck(checks: Recheck[]) {
  const resolved = checks.filter((r): r is Extract<Recheck, { returnPct: number }> => "returnPct" in r);
  const targets = resolved.filter((r) => r.status === "target").length;
  const stops = resolved.filter((r) => r.status === "stop").length;
  const positive = resolved.filter((r) => r.returnPct > 0).length;
  return {
    checked: resolved.length,
    targets,
    stops,
    neither: resolved.length - targets - stops,
    mismatched: checks.filter((r) => r.status === "price-mismatch").length,
    noData: checks.filter((r) => r.status === "no-data").length,
    /** target hits / (target + stop hits) */
    targetRatePct: targets + stops ? (targets / (targets + stops)) * 100 : null,
    positivePct: resolved.length ? (positive / resolved.length) * 100 : null,
    avgReturnPct: resolved.length ? resolved.reduce((s, r) => s + r.returnPct, 0) / resolved.length : null,
  };
}
