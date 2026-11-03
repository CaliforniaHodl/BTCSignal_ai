/**
 * Paper broker: position accounting with fees + adverse slippage.
 * Pure functions shared by the live agent and the backtester.
 * A future live broker (Coinbase CDP) implements the same open/close contract.
 */
import type { Candle } from "@/lib/market/types";
import { fillPrice, RISK, type RiskConfig } from "./risk";

export type Side = "long" | "short";
export type Position = { side: Side; qtyBtc: number; entryPrice: number; stop: number; target: number; openFeeUsd: number };

export function open(cashUsd: number, side: Side, qtyBtc: number, price: number, cfg: RiskConfig = RISK) {
  const fill = fillPrice(side, "open", price, cfg);
  const fee = qtyBtc * fill * cfg.feeRate;
  const cash = side === "long" ? cashUsd - qtyBtc * fill - fee : cashUsd - fee;
  return { cashUsd: cash, fill, feeUsd: fee };
}

export function close(cashUsd: number, pos: Position, price: number, cfg: RiskConfig = RISK) {
  const fill = fillPrice(pos.side, "close", price, cfg);
  const fee = pos.qtyBtc * fill * cfg.feeRate;
  const gross = pos.side === "long" ? (fill - pos.entryPrice) * pos.qtyBtc : (pos.entryPrice - fill) * pos.qtyBtc;
  const cash = pos.side === "long" ? cashUsd + pos.qtyBtc * fill - fee : cashUsd + gross - fee;
  return { cashUsd: cash, fill, feeUsd: fee, pnlUsd: gross - fee - pos.openFeeUsd };
}

export function equity(cashUsd: number, pos: Position | null, price: number) {
  if (!pos) return cashUsd;
  return pos.side === "long" ? cashUsd + pos.qtyBtc * price : cashUsd + (pos.entryPrice - price) * pos.qtyBtc;
}

/**
 * Walk candles in order; return the first stop/target touch. If one candle spans
 * both levels we can't know which hit first, so assume the stop (conservative).
 */
export function findExit(pos: Position, candles: Candle[]): { reason: "stop" | "target"; price: number; time: number } | null {
  for (const c of candles) {
    const hitStop = pos.side === "long" ? c.low <= pos.stop : c.high >= pos.stop;
    const hitTarget = pos.side === "long" ? c.high >= pos.target : c.low <= pos.target;
    if (hitStop) {
      // Gap through the stop fills at the open, not the stop.
      const gapped = pos.side === "long" ? c.open < pos.stop : c.open > pos.stop;
      return { reason: "stop", price: gapped ? c.open : pos.stop, time: c.time };
    }
    if (hitTarget) return { reason: "target", price: pos.target, time: c.time };
  }
  return null;
}
