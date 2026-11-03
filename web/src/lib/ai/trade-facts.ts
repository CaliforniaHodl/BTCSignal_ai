/**
 * Objective facts about a planned trade, computed BEFORE Claude sees it.
 * Pure: market inputs are passed in. Claude critiques; it never computes these.
 */
import { z } from "zod";
import { atr, ema, keyLevels, last } from "@/lib/indicators";
import { RISK } from "@/lib/agent/risk";
import type { Candle } from "@/lib/market/types";

export const TradeInputSchema = z.object({
  side: z.enum(["long", "short"]),
  entry: z.number().positive(),
  stop: z.number().positive(),
  target: z.number().positive().nullable(),
  /** Position notional in USD */
  sizeUsd: z.number().positive().max(1e9).nullable(),
  accountUsd: z.number().positive().max(1e10).nullable(),
  timeframe: z.enum(["15m", "1h", "4h", "1d"]),
  thesis: z.string().trim().max(2000),
});
export type TradeInput = z.infer<typeof TradeInputSchema>;

export type TradeContext = {
  /** Candles of the trade's timeframe, closed bars, ascending */
  candles: Candle[] | null;
  daily: Candle[] | null;
  price: number | null;
  funding8h: number | null;
  fearGreed: { value: number; label: string } | null;
};

export type Level = { price: number; kind: "support" | "resistance"; touches: number };

export type TradeFacts = {
  rr: number | null;
  riskPct: number;
  rewardPct: number | null;
  atr: number | null;
  stopAtr: number | null;
  targetAtr: number | null;
  entryVsPricePct: number | null;
  entryVsPriceAtr: number | null;
  emas: { label: string; value: number; entryAbovePct: number }[];
  dailyTrend: "above 200D EMA" | "below 200D EMA" | null;
  levels: Level[];
  nearestSupportBelowEntry: number | null;
  nearestResistanceAboveEntry: number | null;
  obstacles: Level[];
  stopNearLevel: Level | null;
  fees: {
    makerPct: number; takerPct: number; slippagePct: number;
    /** entry taker + stop taker + slippage both legs, as % of notional */
    roundTripStopPct: number;
    /** entry taker + target maker + entry slippage */
    roundTripTargetPct: number;
    feesAsPctOfRisk: number;
    netRr: number | null;
    usdAtStop: number | null;
    usdAtTarget: number | null;
  };
  sizing: { qtyBtc: number; lossAtStopUsd: number; gainAtTargetUsd: number | null; accountRiskPct: number | null } | null;
  funding8hPct: number | null;
  fearGreed: { value: number; label: string } | null;
  flags: string[];
};

export function validateTrade(t: TradeInput): string | null {
  if (t.side === "long" && t.stop >= t.entry) return "For a long, the stop must be below the entry.";
  if (t.side === "short" && t.stop <= t.entry) return "For a short, the stop must be above the entry.";
  if (t.target != null && t.side === "long" && t.target <= t.entry) return "For a long, the target must be above the entry.";
  if (t.target != null && t.side === "short" && t.target >= t.entry) return "For a short, the target must be below the entry.";
  if (Math.abs(t.entry - t.stop) / t.entry > 0.5) return "The stop is more than 50% from entry — check the numbers.";
  return null;
}

export function computeTradeFacts(t: TradeInput, ctx: TradeContext, cfg = RISK): TradeFacts {
  const long = t.side === "long";
  const risk = Math.abs(t.entry - t.stop);
  const reward = t.target != null ? Math.abs(t.target - t.entry) : null;
  const rr = reward != null ? reward / risk : null;
  const c = ctx.candles && ctx.candles.length >= 20 ? ctx.candles : null;
  const a = c ? last(atr(c, 14)) : null;
  const closes = c?.map((x) => x.close) ?? [];
  const emas = c
    ? [20, 50, 200].flatMap((p) => {
        const v = closes.length >= p ? last(ema(closes, p)) : null;
        return v == null ? [] : [{ label: `${p} EMA (${t.timeframe})`, value: v, entryAbovePct: ((t.entry - v) / v) * 100 }];
      })
    : [];
  const d = ctx.daily && ctx.daily.length >= 200 ? last(ema(ctx.daily.map((x) => x.close), 200)) : null;
  const dailyTrend = d == null ? null : t.entry >= d ? "above 200D EMA" as const : "below 200D EMA" as const;

  const levels: Level[] = c ? keyLevels(c, { max: 10 }).map((l) => ({ price: l.price, touches: l.touches, kind: l.price >= t.entry ? "resistance" : "support" })) : [];
  const below = levels.filter((l) => l.price < t.entry).sort((x, y) => y.price - x.price);
  const above = levels.filter((l) => l.price > t.entry).sort((x, y) => x.price - y.price);
  const obstacles = t.target == null ? [] : levels.filter((l) => (long ? l.price > t.entry && l.price < t.target! : l.price < t.entry && l.price > t.target!));
  const nearTol = a != null ? 0.3 * a : t.entry * 0.002;
  const stopNearLevel = levels.find((l) => Math.abs(l.price - t.stop) <= nearTol) ?? null;

  const takerPct = cfg.takerFee * 100, makerPct = cfg.makerFee * 100, slippagePct = cfg.slippage * 100;
  const roundTripStopPct = 2 * takerPct + 2 * slippagePct;
  const roundTripTargetPct = takerPct + makerPct + slippagePct;
  const riskPct = (risk / t.entry) * 100;
  const rewardPct = reward != null ? (reward / t.entry) * 100 : null;
  const netRr = rewardPct != null ? (rewardPct - roundTripTargetPct) / (riskPct + roundTripStopPct) : null;

  let sizing: TradeFacts["sizing"] = null;
  let usdAtStop: number | null = null, usdAtTarget: number | null = null;
  if (t.sizeUsd != null) {
    const qty = t.sizeUsd / t.entry;
    usdAtStop = (t.sizeUsd * roundTripStopPct) / 100;
    usdAtTarget = (t.sizeUsd * roundTripTargetPct) / 100;
    const lossAtStopUsd = qty * risk + usdAtStop;
    const gainAtTargetUsd = reward != null ? qty * reward - usdAtTarget : null;
    sizing = { qtyBtc: qty, lossAtStopUsd, gainAtTargetUsd, accountRiskPct: t.accountUsd ? (lossAtStopUsd / t.accountUsd) * 100 : null };
  }

  const entryVsPricePct = ctx.price ? ((t.entry - ctx.price) / ctx.price) * 100 : null;
  const facts: TradeFacts = {
    rr, riskPct, rewardPct, atr: a,
    stopAtr: a ? risk / a : null,
    targetAtr: a && reward != null ? reward / a : null,
    entryVsPricePct,
    entryVsPriceAtr: a && ctx.price ? (t.entry - ctx.price) / a : null,
    emas, dailyTrend, levels,
    nearestSupportBelowEntry: below[0]?.price ?? null,
    nearestResistanceAboveEntry: above[0]?.price ?? null,
    obstacles, stopNearLevel,
    fees: { makerPct, takerPct, slippagePct, roundTripStopPct, roundTripTargetPct, feesAsPctOfRisk: (roundTripStopPct / riskPct) * 100, netRr, usdAtStop, usdAtTarget },
    sizing,
    funding8hPct: ctx.funding8h != null ? ctx.funding8h * 100 : null,
    fearGreed: ctx.fearGreed,
    flags: [],
  };
  facts.flags = flags(t, facts);
  return facts;
}

function flags(t: TradeInput, f: TradeFacts): string[] {
  const out: string[] = [];
  const long = t.side === "long";
  if (t.target == null) out.push("No target: the plan has no defined reward, so R:R can't be judged.");
  else if (f.rr != null && f.rr < 1.5) out.push(`Reward:risk ${f.rr.toFixed(2)} is below 1.5.`);
  if (f.fees.netRr != null && f.rr != null && f.rr - f.fees.netRr > 0.25) out.push(`Fees and slippage cut R:R from ${f.rr.toFixed(2)} to ${f.fees.netRr.toFixed(2)}.`);
  if (f.fees.feesAsPctOfRisk > 20) out.push(`A stop-out costs ${f.fees.feesAsPctOfRisk.toFixed(0)}% extra in fees on top of the planned risk (stop is tight relative to Coinbase fees).`);
  if (f.stopAtr != null && f.stopAtr < 0.75) out.push(`Stop is only ${f.stopAtr.toFixed(2)}× ATR away — inside normal ${t.timeframe} noise.`);
  if (f.stopAtr != null && f.stopAtr > 4) out.push(`Stop is ${f.stopAtr.toFixed(1)}× ATR away — wide for a ${t.timeframe} trade.`);
  if (f.stopNearLevel) out.push(`Stop sits right at a visible ${f.stopNearLevel.kind} (~${Math.round(f.stopNearLevel.price)}) where stops tend to cluster.`);
  if (f.obstacles.length) out.push(`${f.obstacles.length} key level(s) between entry and target (first ~${Math.round(f.obstacles[0].price)}).`);
  if (f.entryVsPriceAtr != null && Math.abs(f.entryVsPriceAtr) > 2) out.push(`Entry is ${Math.abs(f.entryVsPriceAtr).toFixed(1)}× ATR ${f.entryVsPriceAtr > 0 ? "above" : "below"} the current price.`);
  if (f.dailyTrend === "below 200D EMA" && long) out.push("Long below the daily 200 EMA (counter to the higher-timeframe trend).");
  if (f.dailyTrend === "above 200D EMA" && !long) out.push("Short above the daily 200 EMA (counter to the higher-timeframe trend).");
  if (f.sizing?.accountRiskPct != null && f.sizing.accountRiskPct > 2) out.push(`Risks ${f.sizing.accountRiskPct.toFixed(1)}% of the account if stopped (common guideline: 0.5–2%).`);
  if (f.funding8hPct != null && long && f.funding8hPct > 0.03) out.push(`Funding is elevated (+${f.funding8hPct.toFixed(4)}%/8h): longs are crowded.`);
  if (f.funding8hPct != null && !long && f.funding8hPct < -0.01) out.push(`Funding is negative (${f.funding8hPct.toFixed(4)}%/8h): shorts are crowded.`);
  if (f.fearGreed && long && f.fearGreed.value >= 80) out.push(`Fear & Greed is ${f.fearGreed.value} (extreme greed).`);
  if (f.fearGreed && !long && f.fearGreed.value <= 20) out.push(`Fear & Greed is ${f.fearGreed.value} (extreme fear).`);
  if (!long) out.push("Coinbase spot can't short; this needs a derivatives venue (funding applies).");
  return out;
}
