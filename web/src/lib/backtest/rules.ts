/**
 * Deterministic rule-based backtester. Pure, no I/O.
 *
 * A strategy is a STRICT spec built from a fixed menu of operands (price,
 * indicators from src/lib/indicators, constants) and four comparisons. Claude
 * may translate English into a spec, but only this module decides trades.
 *
 * Timeline per bar i (no look-ahead):
 *   1. a pending exit/entry decided at the close of bar i-1 fills at bar i OPEN (taker + slippage)
 *   2. an open position is checked against bar i's range: stop first if both
 *      stop and target are inside the bar (conservative); a gap through the stop
 *      fills at the open. Targets rest as limits (maker, no slippage).
 *   3. at bar i CLOSE, with indicators computed from bars 0..i only: trail the
 *      stop, evaluate exit conditions / max bars, then entry conditions.
 */
import { z } from "zod";
import { atr, bollinger, ema, highestHigh, lowestLow, macd, rsi, sma, stochK, type Series } from "@/lib/indicators";
import { RISK } from "@/lib/agent/risk";
import type { Candle } from "@/lib/market/types";

// ---------- Spec ----------

export const OPERAND_KINDS = [
  "close", "open", "high", "low", "volume",
  "sma", "ema", "bb_upper", "bb_middle", "bb_lower", "highest_high", "lowest_low",
  "rsi", "stoch_k", "macd_line", "macd_signal", "macd_hist", "atr", "volume_sma",
  "const",
] as const;
export type OperandKind = (typeof OPERAND_KINDS)[number];

const PERIOD_KINDS = new Set<OperandKind>(["sma", "ema", "bb_upper", "bb_middle", "bb_lower", "highest_high", "lowest_low", "rsi", "stoch_k", "atr", "volume_sma"]);
export const needsPeriod = (k: OperandKind) => PERIOD_KINDS.has(k);

/** Scale family, used to warn about apples-to-oranges comparisons. */
const FAMILY: Record<OperandKind, string> = {
  close: "price", open: "price", high: "price", low: "price", sma: "price", ema: "price", bb_upper: "price",
  bb_middle: "price", bb_lower: "price", highest_high: "price", lowest_low: "price",
  rsi: "oscillator", stoch_k: "oscillator", macd_line: "macd", macd_signal: "macd", macd_hist: "macd",
  atr: "atr", volume: "volume", volume_sma: "volume", const: "const",
};

// Claude-facing schemas carry no numeric constraints (the SDK would reject a
// near-miss); ranges are enforced in validateSpec() instead.
export const OperandSchema = z.object({
  kind: z.enum(OPERAND_KINDS).describe("close/open/high/low/volume = raw bar values; const = a fixed number in `value`; everything else is an indicator using `period`"),
  period: z.number().nullable().describe("Lookback for sma, ema, bb_*, highest_high, lowest_low, rsi, stoch_k, atr, volume_sma. null otherwise. MACD is fixed 12/26/9, Bollinger is 2 std dev."),
  value: z.number().nullable().describe("Only for kind=const, e.g. 30 for 'RSI below 30'. null otherwise."),
});
export const ConditionSchema = z.object({
  left: OperandSchema,
  op: z.enum(["above", "below", "crosses_above", "crosses_below"]),
  right: OperandSchema,
});
export const LevelSchema = z.object({
  type: z.enum(["none", "percent", "atr"]),
  value: z.number().nullable().describe("percent: e.g. 5 = 5% from entry. atr: multiple of ATR(14) at the signal bar. null for none."),
});
export const TargetSchema = z.object({
  type: z.enum(["none", "percent", "atr", "r_multiple"]),
  value: z.number().nullable().describe("percent / ATR multiple from entry, or r_multiple = multiple of the stop distance (requires a stop)."),
});
export const RuleSpecSchema = z.object({
  side: z.enum(["long", "short"]),
  timeframe: z.enum(["1h", "4h", "1d"]),
  entry: z.array(ConditionSchema).describe("ALL must be true at a bar close to enter (1-4 conditions)"),
  exit: z.array(ConditionSchema).describe("ANY true at a bar close exits (0-4 conditions)"),
  stop: LevelSchema,
  target: TargetSchema,
  trailing: LevelSchema.describe("Trailing stop from the best close since entry; only ever tightens"),
  max_bars: z.number().nullable().describe("Exit after this many bars in the trade; null = no time exit"),
});

export type Operand = z.infer<typeof OperandSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type RuleSpec = z.infer<typeof RuleSpecSchema>;

export const LIMITS = { maxConditions: 4, minPeriod: 2, maxPeriod: 400 };

export type SpecCheck = { ok: true; spec: RuleSpec; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] };

/** Strict validation + normalisation (periods rounded, unused fields nulled). */
export function validateSpec(input: unknown): SpecCheck {
  const parsed = RuleSpecSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), warnings: [] };
  const s = structuredClone(parsed.data);
  const errors: string[] = [];
  const warnings: string[] = [];

  const op = (o: Operand, where: string) => {
    if (needsPeriod(o.kind)) {
      if (o.period == null || !Number.isFinite(o.period)) errors.push(`${where}: ${o.kind} needs a period`);
      else {
        o.period = Math.round(o.period);
        if (o.period < LIMITS.minPeriod || o.period > LIMITS.maxPeriod) errors.push(`${where}: period must be ${LIMITS.minPeriod}–${LIMITS.maxPeriod}`);
      }
    } else o.period = null;
    if (o.kind === "const") {
      if (o.value == null || !Number.isFinite(o.value)) errors.push(`${where}: constant needs a number`);
    } else o.value = null;
  };
  const conds = (list: Condition[], name: string, min: number) => {
    if (list.length < min || list.length > LIMITS.maxConditions) errors.push(`${name}: ${min}–${LIMITS.maxConditions} conditions`);
    list.forEach((c, i) => {
      op(c.left, `${name}[${i + 1}] left`);
      op(c.right, `${name}[${i + 1}] right`);
      if (c.left.kind === "const" && c.right.kind === "const") errors.push(`${name}[${i + 1}]: compares two constants`);
      const fl = FAMILY[c.left.kind], fr = FAMILY[c.right.kind];
      if (fl !== "const" && fr !== "const" && fl !== fr) warnings.push(`${name}[${i + 1}]: compares ${fl} to ${fr} — different scales`);
    });
  };
  conds(s.entry, "entry", 1);
  conds(s.exit, "exit", 0);

  const level = (l: { type: string; value: number | null }, name: string, [lo, hi]: [number, number]) => {
    if (l.type === "none") { l.value = null; return; }
    if (l.value == null || !Number.isFinite(l.value) || l.value < lo || l.value > hi) errors.push(`${name}: ${l.type} value must be ${lo}–${hi}`);
  };
  const range = (t: string): [number, number] => (t === "percent" ? [0.1, 50] : [0.25, 20]);
  level(s.stop, "stop", range(s.stop.type));
  level(s.target, "target", range(s.target.type));
  level(s.trailing, "trailing", range(s.trailing.type));
  if (s.target.type === "r_multiple" && s.stop.type === "none") errors.push("target: an R-multiple target needs a stop");
  if (s.max_bars != null) {
    s.max_bars = Math.round(s.max_bars);
    if (s.max_bars < 1 || s.max_bars > 5000) errors.push("max_bars must be 1–5000");
  }
  if (s.exit.length === 0 && s.stop.type === "none" && s.target.type === "none" && s.trailing.type === "none" && s.max_bars == null)
    warnings.push("No exit rule: the first trade is held to the end of the data.");
  if (s.side === "short") warnings.push("Shorts can't be placed on Coinbase spot; results assume a borrow/perp with zero funding cost.");

  return errors.length ? { ok: false, errors, warnings } : { ok: true, spec: s, warnings };
}

// ---------- Display ----------

const LABEL: Record<OperandKind, string> = {
  close: "Close", open: "Open", high: "High", low: "Low", volume: "Volume", sma: "SMA", ema: "EMA",
  bb_upper: "Upper Bollinger", bb_middle: "Middle Bollinger", bb_lower: "Lower Bollinger",
  highest_high: "Highest high (prior)", lowest_low: "Lowest low (prior)", rsi: "RSI", stoch_k: "Stochastic %K",
  macd_line: "MACD line", macd_signal: "MACD signal", macd_hist: "MACD histogram", atr: "ATR", volume_sma: "Volume SMA", const: "",
};
export const operandLabel = (o: Operand) =>
  o.kind === "const" ? String(o.value) : needsPeriod(o.kind) ? `${LABEL[o.kind]}(${o.period})` : LABEL[o.kind];
const OP_LABEL = { above: "is above", below: "is below", crosses_above: "crosses above", crosses_below: "crosses below" } as const;
export const conditionLabel = (c: Condition) => `${operandLabel(c.left)} ${OP_LABEL[c.op]} ${operandLabel(c.right)}`;

// ---------- Engine ----------

export type Fees = { maker: number; taker: number; slippage: number };
export const DEFAULT_FEES: Fees = { maker: RISK.makerFee, taker: RISK.takerFee, slippage: RISK.slippage };

export type RunOptions = {
  /** First bar index allowed to signal an entry (earlier bars are indicator warm-up). */
  startIndex?: number;
  startCash?: number;
  /** % of equity committed per trade (no leverage). */
  positionPct?: number;
  fees?: Fees;
};

export type RuleTrade = {
  side: "long" | "short";
  entryTime: number; exitTime: number;
  entryPrice: number; exitPrice: number;
  qty: number; pnlUsd: number; feesUsd: number;
  /** P&L as % of equity before the trade */
  returnPct: number;
  /** P&L in units of initial stop risk; null without a stop */
  r: number | null;
  bars: number;
  reason: "stop" | "target" | "trail" | "signal" | "time" | "end";
};

export type RuleResult = {
  trades: RuleTrade[];
  equity: { time: number; equity: number; price: number }[];
  finalEquity: number;
  startIndex: number;
  barsInMarket: number;
  open: boolean;
};

type Pos = {
  side: "long" | "short"; qty: number; entry: number; entryTime: number; entryIndex: number;
  stop: number | null; target: number | null; trailing: boolean; best: number;
  openFee: number; equityBefore: number; riskPerUnit: number | null;
};

/** Precompute every operand series once. */
export function buildSeries(candles: Candle[], spec: RuleSpec) {
  const closes = candles.map((c) => c.close);
  const cache = new Map<string, Series>();
  let mac: ReturnType<typeof macd> | null = null;
  const get = (o: Operand): Series => {
    const key = `${o.kind}:${o.period ?? ""}:${o.value ?? ""}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const p = o.period ?? 14;
    let s: Series;
    switch (o.kind) {
      case "close": s = closes; break;
      case "open": s = candles.map((c) => c.open); break;
      case "high": s = candles.map((c) => c.high); break;
      case "low": s = candles.map((c) => c.low); break;
      case "volume": s = candles.map((c) => c.volume); break;
      case "sma": s = sma(closes, p); break;
      case "ema": s = ema(closes, p); break;
      case "bb_upper": s = bollinger(closes, p).upper; break;
      case "bb_middle": s = bollinger(closes, p).middle; break;
      case "bb_lower": s = bollinger(closes, p).lower; break;
      case "highest_high": s = highestHigh(candles, p); break;
      case "lowest_low": s = lowestLow(candles, p); break;
      case "rsi": s = rsi(closes, p); break;
      case "stoch_k": s = stochK(candles, p); break;
      case "macd_line": s = (mac ??= macd(closes)).line; break;
      case "macd_signal": s = (mac ??= macd(closes)).signal; break;
      case "macd_hist": s = (mac ??= macd(closes)).histogram; break;
      case "atr": s = atr(candles, p); break;
      case "volume_sma": s = sma(candles.map((c) => c.volume), p); break;
      case "const": s = new Array(candles.length).fill(o.value); break;
    }
    cache.set(key, s);
    return s;
  };
  const compile = (c: Condition) => {
    const l = get(c.left), r = get(c.right);
    return (i: number): boolean => {
      const a = l[i], b = r[i];
      if (a == null || b == null) return false;
      if (c.op === "above") return a > b;
      if (c.op === "below") return a < b;
      if (i < 1) return false;
      const pa = l[i - 1], pb = r[i - 1];
      if (pa == null || pb == null) return false;
      return c.op === "crosses_above" ? pa <= pb && a > b : pa >= pb && a < b;
    };
  };
  return {
    entry: spec.entry.map(compile),
    exit: spec.exit.map(compile),
    atr14: atr(candles, 14),
  };
}

/** Bars needed before every indicator in the spec is defined. */
export function warmupBars(spec: RuleSpec): number {
  let w = 15; // ATR(14) for stops/targets
  for (const c of [...spec.entry, ...spec.exit]) {
    for (const o of [c.left, c.right]) {
      if (o.kind.startsWith("macd")) w = Math.max(w, 35);
      else if (o.period != null) w = Math.max(w, o.period + 1);
    }
  }
  return w + 1; // +1 so crossovers have a defined previous bar
}

export function runRules(candles: Candle[], spec: RuleSpec, opts: RunOptions = {}): RuleResult {
  const fees = opts.fees ?? DEFAULT_FEES;
  const startCash = opts.startCash ?? 10_000;
  const frac = Math.min(100, Math.max(1, opts.positionPct ?? 100)) / 100;
  const startIndex = Math.max(opts.startIndex ?? 0, 0);
  const sig = buildSeries(candles, spec);

  let cash = startCash;
  let pos: Pos | null = null;
  let pendingEntry: { atr: number | null } | null = null;
  let pendingExit: RuleTrade["reason"] | null = null;
  let barsInMarket = 0;
  const trades: RuleTrade[] = [];
  const equity: RuleResult["equity"] = [];

  const slip = (price: number, buying: boolean) => price * (buying ? 1 + fees.slippage : 1 - fees.slippage);

  const close = (raw: number, liq: "maker" | "taker", reason: RuleTrade["reason"], time: number, i: number) => {
    const p = pos!;
    const fill = liq === "taker" ? slip(raw, p.side === "short") : raw;
    const fee = p.qty * fill * (liq === "taker" ? fees.taker : fees.maker);
    const gross = p.side === "long" ? (fill - p.entry) * p.qty : (p.entry - fill) * p.qty;
    cash = p.side === "long" ? cash + p.qty * fill - fee : cash + gross - fee;
    const pnl = gross - fee - p.openFee;
    trades.push({
      side: p.side, entryTime: p.entryTime, exitTime: time, entryPrice: p.entry, exitPrice: fill, qty: p.qty,
      pnlUsd: pnl, feesUsd: fee + p.openFee, returnPct: (pnl / p.equityBefore) * 100,
      r: p.riskPerUnit ? pnl / (p.riskPerUnit * p.qty) : null, bars: i - p.entryIndex + 1, reason,
    });
    pos = null;
  };

  const levelDist = (l: { type: string; value: number | null }, price: number, a: number | null) =>
    l.type === "percent" ? (price * l.value!) / 100 : l.type === "atr" && a != null ? a * l.value! : null;

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];

    // 1. fills at the open
    if (pendingExit && pos) close(bar.open, "taker", pendingExit, bar.time, i);
    pendingExit = null;
    if (pendingEntry && !pos && cash > 0) {
      const side = spec.side;
      const fill = slip(bar.open, side === "long");
      const budget = cash * frac;
      const qty = side === "long" ? budget / (fill * (1 + fees.taker)) : budget / fill;
      const fee = qty * fill * fees.taker;
      const equityBefore = cash;
      cash = side === "long" ? cash - qty * fill - fee : cash - fee;
      const a = pendingEntry.atr;
      const dir = side === "long" ? 1 : -1;
      const sd = levelDist(spec.stop, fill, a);
      const stop = sd != null ? fill - dir * sd : null;
      let td: number | null = null;
      if (spec.target.type === "r_multiple") td = sd != null ? sd * spec.target.value! : null;
      else td = levelDist(spec.target, fill, a);
      const target = td != null ? fill + dir * td : null;
      pos = {
        side, qty, entry: fill, entryTime: bar.time, entryIndex: i, stop, target, trailing: false,
        best: fill, openFee: fee, equityBefore, riskPerUnit: sd,
      };
    }
    pendingEntry = null;

    // 2. intrabar stop / target
    if (pos) {
      const p: Pos = pos;
      const long = p.side === "long";
      const hitStop = p.stop != null && (long ? bar.low <= p.stop : bar.high >= p.stop);
      const hitTarget = p.target != null && (long ? bar.high >= p.target : bar.low <= p.target);
      if (hitStop) {
        const gapped = long ? bar.open < p.stop! : bar.open > p.stop!;
        close(gapped ? bar.open : p.stop!, "taker", p.trailing ? "trail" : "stop", bar.time, i);
      } else if (hitTarget) {
        close(p.target!, "maker", "target", bar.time, i);
      }
    }

    // 3. decisions at the close
    if (pos) {
      barsInMarket++;
      const p: Pos = pos;
      const long = p.side === "long";
      p.best = long ? Math.max(p.best, bar.close) : Math.min(p.best, bar.close);
      const td = levelDist(spec.trailing, p.best, sig.atr14[i]);
      if (td != null) {
        const cand = long ? p.best - td : p.best + td;
        if (p.stop == null || (long ? cand > p.stop : cand < p.stop)) { p.stop = cand; p.trailing = true; }
      }
      if (sig.exit.some((f) => f(i))) pendingExit = "signal";
      else if (spec.max_bars != null && i - p.entryIndex + 1 >= spec.max_bars) pendingExit = "time";
    } else if (i >= startIndex && i < candles.length - 1 && sig.entry.every((f) => f(i))) {
      pendingEntry = { atr: sig.atr14[i] };
    }

    const eq = pos ? (pos.side === "long" ? cash + pos.qty * bar.close : cash + (pos.entry - bar.close) * pos.qty) : cash;
    equity.push({ time: bar.time, equity: Math.max(0, eq), price: bar.close });
    if (eq <= 0) { // ruined (only possible on a short with no stop)
      if (pos) close(bar.close, "taker", "end", bar.time, i);
      cash = 0;
      break;
    }
  }

  const stillOpen = pos != null;
  if (pos) {
    const lastBar = candles[candles.length - 1];
    close(lastBar.close, "taker", "end", lastBar.time, candles.length - 1);
    equity[equity.length - 1].equity = Math.max(0, cash);
  }
  return { trades, equity, finalEquity: Math.max(0, cash), startIndex, barsInMarket, open: stillOpen };
}

// ---------- Metrics ----------

export type RuleMetrics = {
  returnPct: number; buyHoldPct: number; cagrPct: number | null; maxDrawdownPct: number; buyHoldMaxDrawdownPct: number;
  sharpe: number; trades: number; winRatePct: number; profitFactor: number; avgTradePct: number; avgWinPct: number; avgLossPct: number;
  avgR: number | null; avgBars: number; exposurePct: number; feesUsd: number; bestTradePct: number; worstTradePct: number;
};

export const BARS_PER_YEAR = { "1h": 8760, "4h": 2190, "1d": 365 } as const;

export function maxDrawdown(values: number[]): number {
  let peak = -Infinity, dd = 0;
  for (const v of values) { peak = Math.max(peak, v); if (peak > 0) dd = Math.max(dd, (peak - v) / peak); }
  return dd * 100;
}

export function ruleMetrics(r: RuleResult, barsPerYear: number, startCash = 10_000, fees: Fees = DEFAULT_FEES): RuleMetrics {
  const eq = r.equity.slice(r.startIndex);
  const t = r.trades;
  const wins = t.filter((x) => x.pnlUsd > 0);
  const gw = wins.reduce((a, x) => a + x.pnlUsd, 0);
  const gl = -t.filter((x) => x.pnlUsd <= 0).reduce((a, x) => a + x.pnlUsd, 0);
  const rets = eq.slice(1).map((d, i) => (eq[i].equity > 0 ? d.equity / eq[i].equity - 1 : 0));
  const mean = rets.reduce((a, b) => a + b, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length || 1));
  const p0 = eq[0]?.price, p1 = eq[eq.length - 1]?.price;
  // Buy & hold: one taker buy (with slippage) at the first evaluated close, marked to market.
  const bhQty = p0 ? startCash / (p0 * (1 + fees.slippage) * (1 + fees.taker)) : 0;
  const bhCurve = eq.map((d) => bhQty * d.price);
  const years = eq.length / barsPerYear;
  const ret = (r.finalEquity - startCash) / startCash;
  const rs = t.filter((x) => x.r != null).map((x) => x.r!);
  return {
    returnPct: ret * 100,
    buyHoldPct: p0 && p1 ? ((bhQty * p1 - startCash) / startCash) * 100 : 0,
    cagrPct: years >= 0.5 && r.finalEquity > 0 ? (Math.pow(r.finalEquity / startCash, 1 / years) - 1) * 100 : null,
    maxDrawdownPct: maxDrawdown(eq.map((d) => d.equity)),
    buyHoldMaxDrawdownPct: maxDrawdown(bhCurve),
    sharpe: sd > 0 ? (mean / sd) * Math.sqrt(barsPerYear) : 0,
    trades: t.length,
    winRatePct: t.length ? (wins.length / t.length) * 100 : 0,
    profitFactor: gl > 0 ? gw / gl : gw > 0 ? Infinity : 0,
    avgTradePct: t.length ? t.reduce((a, x) => a + x.returnPct, 0) / t.length : 0,
    avgWinPct: wins.length ? wins.reduce((a, x) => a + x.returnPct, 0) / wins.length : 0,
    avgLossPct: t.length > wins.length ? t.filter((x) => x.pnlUsd <= 0).reduce((a, x) => a + x.returnPct, 0) / (t.length - wins.length) : 0,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    avgBars: t.length ? t.reduce((a, x) => a + x.bars, 0) / t.length : 0,
    exposurePct: eq.length ? (r.barsInMarket / eq.length) * 100 : 0,
    feesUsd: t.reduce((a, x) => a + x.feesUsd, 0),
    bestTradePct: t.length ? Math.max(...t.map((x) => x.returnPct)) : 0,
    worstTradePct: t.length ? Math.min(...t.map((x) => x.returnPct)) : 0,
  };
}
