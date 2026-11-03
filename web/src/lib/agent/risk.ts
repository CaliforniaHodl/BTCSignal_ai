/**
 * Hard risk limits. Pure functions. Claude's review can only shrink or veto a
 * trade that already passed these checks — it can never loosen them.
 */
import type { Direction } from "@/lib/engine/signal";

export const RISK = {
  /** Equity at risk if the stop is hit */
  riskPerTradePct: 1,
  /** Max notional of one position as % of equity (no leverage) */
  maxPositionPct: 50,
  maxEntriesPerDay: 3,
  /** Stop opening new trades for the UTC day after this loss (realized + open) */
  dailyLossStopPct: 3,
  /** Halt the agent (kill switch) at this drawdown from peak equity */
  maxDrawdownHaltPct: 15,
  cooldownHoursAfterClose: 4,
  /** Long-only by default: the planned live venue (Coinbase spot) can't short */
  allowShort: false,
  feeRate: 0.004,
  slippage: 0.0005,
  /** Ignore trades smaller than this notional */
  minNotionalUsd: 25,
};
export type RiskConfig = typeof RISK;

export type RiskState = {
  enabled: boolean;
  equityUsd: number;
  cashUsd: number;
  peakEquityUsd: number;
  hasOpenPosition: boolean;
  entriesToday: number;
  /** Today's P&L (realized + unrealized) as % of start-of-day equity */
  pnlTodayPct: number;
  /** ms epoch of the last close, if any */
  lastCloseAt: number | null;
  now: number;
};

export type EntryProposal = { side: Exclude<Direction, "flat">; price: number; stop: number; target: number };

export type RiskCheck = { name: string; ok: boolean; detail: string };
export type RiskResult = { allowed: boolean; checks: RiskCheck[]; qtyBtc: number; notionalUsd: number; riskUsd: number };

export function checkEntry(s: RiskState, p: EntryProposal, sizeMultiplier = 1, cfg: RiskConfig = RISK): RiskResult {
  const checks: RiskCheck[] = [];
  const c = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  const ddPct = s.peakEquityUsd > 0 ? ((s.peakEquityUsd - s.equityUsd) / s.peakEquityUsd) * 100 : 0;
  const stopDist = Math.abs(p.price - p.stop);
  const rr = stopDist > 0 ? Math.abs(p.target - p.price) / stopDist : 0;
  const hoursSinceClose = s.lastCloseAt == null ? Infinity : (s.now - s.lastCloseAt) / 3_600_000;

  c("enabled", s.enabled, s.enabled ? "Agent enabled" : "Kill switch is on");
  c("flat", !s.hasOpenPosition, s.hasOpenPosition ? "Already in a position (no pyramiding)" : "No open position");
  c("side", p.side === "long" || cfg.allowShort, p.side === "short" && !cfg.allowShort ? "Shorts disabled (spot venue)" : `${p.side} allowed`);
  c("stop", p.side === "long" ? p.stop < p.price : p.stop > p.price, `Stop ${stopDist.toFixed(0)} away`);
  c("reward_risk", rr >= 1.5, `Reward:risk ${rr.toFixed(2)} (min 1.5)`);
  c("entries_today", s.entriesToday < cfg.maxEntriesPerDay, `${s.entriesToday}/${cfg.maxEntriesPerDay} entries today`);
  c("daily_loss", s.pnlTodayPct > -cfg.dailyLossStopPct, `Today ${s.pnlTodayPct.toFixed(2)}% (stop at -${cfg.dailyLossStopPct}%)`);
  c("drawdown", ddPct < cfg.maxDrawdownHaltPct, `Drawdown ${ddPct.toFixed(2)}% (halt at ${cfg.maxDrawdownHaltPct}%)`);
  c("cooldown", hoursSinceClose >= cfg.cooldownHoursAfterClose,
    hoursSinceClose === Infinity ? "No recent close" : `${hoursSinceClose.toFixed(1)}h since last close (min ${cfg.cooldownHoursAfterClose}h)`);

  const mult = Math.min(1, Math.max(0, sizeMultiplier));
  const riskUsd = s.equityUsd * (cfg.riskPerTradePct / 100) * mult;
  const fill = fillPrice(p.side, "open", p.price, cfg);
  let qty = stopDist > 0 ? riskUsd / stopDist : 0;
  qty = Math.min(qty, (s.equityUsd * (cfg.maxPositionPct / 100)) / fill);
  if (p.side === "long") qty = Math.min(qty, s.cashUsd / (fill * (1 + cfg.feeRate)));
  qty = Math.max(0, Math.floor(qty * 1e8) / 1e8);
  const notionalUsd = qty * fill;
  c("size", notionalUsd >= cfg.minNotionalUsd, `Size ${qty.toFixed(6)} BTC ≈ $${notionalUsd.toFixed(0)}${mult < 1 ? ` (×${mult.toFixed(2)})` : ""}`);

  return { allowed: checks.every((x) => x.ok), checks, qtyBtc: qty, notionalUsd, riskUsd: qty * stopDist };
}

/** Slippage always works against us. */
export function fillPrice(side: "long" | "short", leg: "open" | "close", price: number, cfg: RiskConfig = RISK) {
  const buying = (side === "long") === (leg === "open");
  return price * (buying ? 1 + cfg.slippage : 1 - cfg.slippage);
}

export function shouldHalt(equityUsd: number, peakEquityUsd: number, cfg: RiskConfig = RISK) {
  return peakEquityUsd > 0 && ((peakEquityUsd - equityUsd) / peakEquityUsd) * 100 >= cfg.maxDrawdownHaltPct;
}
