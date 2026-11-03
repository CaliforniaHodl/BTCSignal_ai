/** Starter rule specs for building strategies without Claude. */
import type { Operand, RuleSpec } from "./rules";

const o = (kind: Operand["kind"], period: number | null = null): Operand => ({ kind, period, value: null });
const k = (value: number): Operand => ({ kind: "const", period: null, value });
const NONE = { type: "none" as const, value: null };

export const TEMPLATES: { id: string; name: string; spec: RuleSpec }[] = [
  {
    id: "ema-cross",
    name: "EMA 20/50 trend cross (4h)",
    spec: {
      side: "long", timeframe: "4h",
      entry: [{ left: o("ema", 20), op: "crosses_above", right: o("ema", 50) }],
      exit: [{ left: o("ema", 20), op: "crosses_below", right: o("ema", 50) }],
      stop: { type: "atr", value: 2 }, target: NONE, trailing: NONE, max_bars: null,
    },
  },
  {
    id: "rsi-revert",
    name: "RSI(14) oversold bounce in uptrend (1d)",
    spec: {
      side: "long", timeframe: "1d",
      entry: [{ left: o("rsi", 14), op: "crosses_above", right: k(30) }, { left: o("close"), op: "above", right: o("sma", 200) }],
      exit: [{ left: o("rsi", 14), op: "above", right: k(70) }],
      stop: { type: "percent", value: 8 }, target: NONE, trailing: NONE, max_bars: 30,
    },
  },
  {
    id: "breakout",
    name: "20-day breakout with ATR trail (1d)",
    spec: {
      side: "long", timeframe: "1d",
      entry: [{ left: o("close"), op: "crosses_above", right: o("highest_high", 20) }],
      exit: [],
      stop: { type: "atr", value: 2 }, target: NONE, trailing: { type: "atr", value: 3 }, max_bars: null,
    },
  },
  {
    id: "macd",
    name: "MACD signal cross, 2R target (4h)",
    spec: {
      side: "long", timeframe: "4h",
      entry: [{ left: o("macd_line"), op: "crosses_above", right: o("macd_signal") }, { left: o("close"), op: "above", right: o("ema", 200) }],
      exit: [],
      stop: { type: "atr", value: 1.5 }, target: { type: "r_multiple", value: 2 }, trailing: NONE, max_bars: 60,
    },
  },
];
