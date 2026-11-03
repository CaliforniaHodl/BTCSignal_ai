/**
 * Deterministic signal engine. Pure: same inputs → same signal. The live agent
 * and the backtester call exactly these functions, so backtests test the real thing.
 *
 * Two stages, so research can compute factors once and sweep configs cheaply:
 *   computeFactors(inputs)      → raw factor values (no tunable parameters)
 *   combine(computed, config)   → score, confidence, direction, stop/target
 *
 * Inputs must be CLOSED candles only (see `closedOnly`) so a live run and a
 * backtest at the same timestamp see identical data — no look-ahead.
 */
import { atr, ema, last, macd, rsi } from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";

export const ENGINE_VERSION = "2.3.0";

export type FactorName = "trend_4h" | "trend_1d" | "momentum_4h" | "rsi_1h" | "funding" | "fear_greed" | "momentum_1d";
export const FACTOR_NAMES: FactorName[] = ["trend_4h", "trend_1d", "momentum_4h", "rsi_1h", "funding", "fear_greed", "momentum_1d"];

export type Factor = {
  name: FactorName;
  label: string;
  /** -1 bearish .. +1 bullish; null when the input wasn't available */
  value: number | null;
  weight: number;
  detail: string;
};

export type SignalInputs = {
  h1: Candle[];
  h4: Candle[];
  d1: Candle[];
  /** 8h funding (fraction). Live: OI-weighted across venues. History: Deribit. */
  funding8h?: number | null;
  /** 0..100, daily */
  fearGreed?: number | null;
};

export type Direction = "long" | "short" | "flat";

export type EngineConfig = {
  enterScore: number;
  minConfidence: number;
  stopAtr: number;
  targetAtr: number;
  /** Which ATR sizes stops/targets: intraday (4h) or swing (1d). */
  stopBasis: "4h" | "1d";
  /** "target": fixed take-profit at targetAtr. "trail": no target; stop trails the best close by stopAtr × ATR. */
  exit: "target" | "trail";
  horizonHours: number;
  /** Weight 0 disables a factor entirely (it also stops counting toward coverage). */
  weights: Record<FactorName, number>;
};

/**
 * Live config: "swing_all + trail 3". Chosen 2026-11-03 after research showed the
 * v2.0 intraday config (1.5×4h-ATR stops, fixed targets) loses to fees at retail
 * rates (−81% over 3y, halt off). This config was picked IN-SAMPLE (PF ≈1.25 over
 * 34 trades) and did not pass the walk-forward gate — paper trading is its real test.
 */
export const ENGINE_CONFIG: EngineConfig = {
  enterScore: 0.25,
  minConfidence: 0.25,
  stopAtr: 3,
  targetAtr: 0,
  stopBasis: "1d",
  exit: "trail",
  horizonHours: 72,
  weights: { trend_4h: 0.25, trend_1d: 0.2, momentum_4h: 0.15, rsi_1h: 0.15, funding: 0.15, fear_greed: 0.1, momentum_1d: 0.3 },
};

/** The original v2.0 intraday config, kept for research comparisons. */
export const INTRADAY_V2_CONFIG: EngineConfig = {
  ...ENGINE_CONFIG,
  minConfidence: 0.35, stopAtr: 1.5, targetAtr: 2.5, stopBasis: "4h", exit: "target", horizonHours: 24,
  weights: { ...ENGINE_CONFIG.weights, momentum_1d: 0 },
};

export type Computed = { price: number; atr4h: number | null; atr1d: number | null; factors: Omit<Factor, "weight">[] };

export type EngineSignal = {
  engineVersion: string;
  price: number;
  direction: Direction;
  score: number;
  confidence: number;
  coverage: number;
  agreement: number;
  atr4h: number | null;
  atr1d: number | null;
  stop: number | null;
  target: number | null;
  horizonHours: number;
  factors: Factor[];
  reason: string;
};

const clamp = (x: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, x));
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

/** Drop the still-forming candle (if any) so only closed bars are used. */
export function closedOnly(candles: Candle[], intervalSec: number, nowSec: number): Candle[] {
  const lastC = candles[candles.length - 1];
  return lastC && lastC.time + intervalSec > nowSec ? candles.slice(0, -1) : candles;
}

export function computeFactors(inp: SignalInputs): Computed {
  const price = inp.h1[inp.h1.length - 1]?.close;
  if (price == null) throw new Error("engine needs at least one 1h candle");
  const factors: Computed["factors"] = [];
  const add = (name: FactorName, label: string, value: number | null, detail: string) =>
    factors.push({ name, label, value: value == null || !Number.isFinite(value) ? null : clamp(value), detail });

  // 1. 4h trend: EMA20 vs EMA50 separation, 1% saturates.
  const c4 = inp.h4.map((c) => c.close);
  const e20 = last(ema(c4, 20));
  const e50 = last(ema(c4, 50));
  add("trend_4h", "4h trend (EMA 20/50)", e20 != null && e50 != null ? (e20 - e50) / e50 / 0.01 : null,
    e20 != null && e50 != null ? `EMA20 ${e20 > e50 ? "above" : "below"} EMA50 by ${pct((e20 - e50) / e50)}` : "not enough 4h history");

  // 2. Daily regime: close vs EMA200, 10% saturates.
  const cd = inp.d1.map((c) => c.close);
  const e200 = last(ema(cd, 200));
  const dClose = cd[cd.length - 1];
  add("trend_1d", "Daily regime (vs EMA 200)", e200 != null ? (dClose - e200) / e200 / 0.1 : null,
    e200 != null ? `Daily close ${pct((dClose - e200) / e200)} vs EMA200` : "not enough daily history");

  // 3. 4h momentum: MACD histogram in units of half an ATR.
  const a4 = last(atr(inp.h4, 14));
  const hist = last(macd(c4).histogram);
  add("momentum_4h", "4h momentum (MACD hist / ATR)", hist != null && a4 ? hist / (0.5 * a4) : null,
    hist != null ? `MACD histogram ${hist >= 0 ? "+" : ""}${hist.toFixed(0)}` : "not enough 4h history");

  // 4. 1h RSI: momentum in the middle, contrarian at extremes.
  const r = last(rsi(inp.h1.map((c) => c.close), 14));
  let rv: number | null = null;
  if (r != null) rv = r > 75 ? -(r - 75) / 15 : r < 25 ? (25 - r) / 15 : (r - 50) / 25;
  add("rsi_1h", "1h RSI", rv, r != null ? `RSI ${r.toFixed(1)}${r > 75 ? " (overbought)" : r < 25 ? " (oversold)" : ""}` : "not enough 1h history");

  // 5. Funding: contrarian. Baseline 0.01%/8h is neutral; +0.05% is max bearish.
  const f = inp.funding8h;
  add("funding", "Perp funding (contrarian)", f == null ? null : -(f - 0.0001) / 0.0004,
    f == null ? "unavailable" : `${(f * 100).toFixed(4)}% / 8h${f > 0.0003 ? " — longs crowded" : f < 0 ? " — shorts paying" : ""}`);

  // 6. Fear & Greed: contrarian.
  const fg = inp.fearGreed;
  add("fear_greed", "Fear & Greed (contrarian)", fg == null ? null : (50 - fg) / 40, fg == null ? "unavailable" : `Index ${fg}`);

  // 7. Daily time-series momentum: 30-day rate of change, 15% saturates.
  const roc30 = cd.length > 30 ? (dClose - cd[cd.length - 31]) / cd[cd.length - 31] : null;
  add("momentum_1d", "30-day momentum", roc30 == null ? null : roc30 / 0.15, roc30 == null ? "not enough daily history" : `30-day change ${pct(roc30)}`);

  return { price, atr4h: a4, atr1d: last(atr(inp.d1, 14)), factors };
}

export function levels(direction: Direction, price: number, atrs: { atr4h: number | null; atr1d: number | null }, cfg: EngineConfig = ENGINE_CONFIG) {
  const a = cfg.stopBasis === "1d" ? atrs.atr1d : atrs.atr4h;
  if (direction === "flat" || !a) return { stop: null, target: null };
  const s = cfg.stopAtr * a, t = cfg.targetAtr * a;
  if (cfg.exit === "trail") return { stop: direction === "long" ? price - s : price + s, target: null };
  return direction === "long" ? { stop: price - s, target: price + t } : { stop: price + s, target: price - t };
}

export function combine(c: Computed, cfg: EngineConfig = ENGINE_CONFIG): EngineSignal {
  const factors: Factor[] = c.factors.map((f) => ({ ...f, weight: cfg.weights[f.name] }));
  const active = factors.filter((x) => x.weight > 0);
  const avail = active.filter((x) => x.value != null);
  const wAvail = avail.reduce((s, x) => s + x.weight, 0);
  const wAll = active.reduce((s, x) => s + x.weight, 0);
  const score = wAvail > 0 ? avail.reduce((s, x) => s + x.weight * x.value!, 0) / wAvail : 0;
  const coverage = wAll > 0 ? wAvail / wAll : 0;
  const sign = Math.sign(score);
  const agreement =
    wAvail > 0 && sign !== 0 ? avail.filter((x) => Math.sign(x.value!) === sign).reduce((s, x) => s + x.weight, 0) / wAvail : 0;
  const confidence = clamp(Math.min(1, Math.abs(score) * 1.5) * (0.5 + 0.5 * agreement) * coverage, 0, 1);

  let direction: Direction = "flat";
  if (confidence >= cfg.minConfidence && score >= cfg.enterScore) direction = "long";
  else if (confidence >= cfg.minConfidence && score <= -cfg.enterScore) direction = "short";
  const { stop, target } = levels(direction, c.price, c, cfg);

  const top = [...avail].sort((a, b) => Math.abs(b.value! * b.weight) - Math.abs(a.value! * a.weight)).slice(0, 2);
  const reason =
    direction === "flat"
      ? `No edge: score ${score.toFixed(2)}, confidence ${(confidence * 100).toFixed(0)}% (needs ±${cfg.enterScore} and ${Math.round(cfg.minConfidence * 100)}%).`
      : `${direction.toUpperCase()} — score ${score.toFixed(2)}, confidence ${(confidence * 100).toFixed(0)}%. Led by ${top.map((t) => t.label).join(" and ")}.`;

  return {
    engineVersion: ENGINE_VERSION, price: c.price, direction, score, confidence, coverage, agreement,
    atr4h: c.atr4h, atr1d: c.atr1d, stop, target, horizonHours: cfg.horizonHours, factors, reason,
  };
}

export function evaluate(inp: SignalInputs, cfg: EngineConfig = ENGINE_CONFIG): EngineSignal {
  return combine(computeFactors(inp), cfg);
}
