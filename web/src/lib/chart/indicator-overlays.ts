/**
 * Indicator catalogue for the chart workbench: ids → overlays/panes built from
 * the one indicator library. Pure, so it is unit-tested.
 */
import {
  adx, atr, bollinger, cci, donchian, ema, keltner, keyLevels, macd, mfi, obv, rsi, sma, stochastic, vwap, williamsR,
} from "@/lib/indicators";
import type { Candle } from "@/lib/market/types";
import { C, toPoints, type ChartSpec, type LineOverlay } from "./spec";

export type IndicatorId =
  | "ema20" | "ema50" | "ema200" | "sma50" | "sma200" | "bb" | "vwap" | "levels"
  | "rsi" | "macd"
  // Pro
  | "keltner" | "donchian" | "atr" | "stoch" | "obv" | "adx" | "cci" | "mfi" | "willr";

export type IndicatorDef = { id: IndicatorId; label: string; pro: boolean; pane: boolean; color: string; hint: string };

export const INDICATORS: IndicatorDef[] = [
  { id: "ema20", label: "EMA 20", pro: false, pane: false, color: C.accent, hint: "Exponential moving average, 20 bars" },
  { id: "ema50", label: "EMA 50", pro: false, pane: false, color: C.blue, hint: "Exponential moving average, 50 bars" },
  { id: "ema200", label: "EMA 200", pro: false, pane: false, color: C.purple, hint: "Exponential moving average, 200 bars" },
  { id: "sma50", label: "SMA 50", pro: false, pane: false, color: C.teal, hint: "Simple moving average, 50 bars" },
  { id: "sma200", label: "SMA 200", pro: false, pane: false, color: C.pink, hint: "Simple moving average, 200 bars" },
  { id: "bb", label: "Bollinger 20·2", pro: false, pane: false, color: C.grey, hint: "SMA 20 ± 2 population std devs" },
  { id: "vwap", label: "VWAP", pro: false, pane: false, color: C.yellow, hint: "Volume-weighted average price, resets 00:00 UTC (Coinbase spot volume)" },
  { id: "levels", label: "Auto S/R", pro: false, pane: false, color: C.grey, hint: "Swing points clustered within 0.4%, 2+ touches" },
  { id: "rsi", label: "RSI 14", pro: false, pane: true, color: C.purple, hint: "Wilder RSI, 14 bars" },
  { id: "macd", label: "MACD 12·26·9", pro: false, pane: true, color: C.blue, hint: "EMA 12 − EMA 26, signal EMA 9" },
  { id: "keltner", label: "Keltner 20·2", pro: true, pane: false, color: C.teal, hint: "EMA 20 ± 2 × ATR 10" },
  { id: "donchian", label: "Donchian 20", pro: true, pane: false, color: C.blue, hint: "Highest high / lowest low, 20 bars" },
  { id: "atr", label: "ATR 14", pro: true, pane: true, color: C.yellow, hint: "Wilder average true range" },
  { id: "stoch", label: "Stoch 14·3·3", pro: true, pane: true, color: C.teal, hint: "Slow stochastic %K / %D" },
  { id: "obv", label: "OBV", pro: true, pane: true, color: C.blue, hint: "On-balance volume (Coinbase spot volume)" },
  { id: "adx", label: "ADX 14", pro: true, pane: true, color: C.accent, hint: "Wilder ADX with +DI / −DI" },
  { id: "cci", label: "CCI 20", pro: true, pane: true, color: C.pink, hint: "Commodity channel index" },
  { id: "mfi", label: "MFI 14", pro: true, pane: true, color: C.yellow, hint: "Money flow index" },
  { id: "willr", label: "Williams %R", pro: true, pane: true, color: C.purple, hint: "Williams %R, 14 bars" },
];

const g = (price: number, title?: string) => ({ price, color: "rgba(139,148,167,0.6)", title });

export function indicatorSpec(candles: Candle[], enabled: Iterable<IndicatorId>): ChartSpec {
  const on = new Set(enabled);
  const spec: ChartSpec = { overlays: [], levels: [], markers: [], paneHeights: {} };
  if (candles.length === 0) return spec;
  const times = candles.map((c) => c.time);
  const closes = candles.map((c) => c.close);
  const line = (key: string, s: (number | null)[], color: string, extra: Partial<LineOverlay> = {}): LineOverlay => ({
    kind: "line", key, points: toPoints(times, s), color, width: 2, ...extra,
  });
  const def = (id: IndicatorId) => INDICATORS.find((d) => d.id === id)!;

  // Overlays on price, in catalogue order so colours stay stable.
  for (const d of INDICATORS) {
    if (!on.has(d.id) || d.pane) continue;
    switch (d.id) {
      case "ema20": spec.overlays.push(line("ema20", ema(closes, 20), d.color)); break;
      case "ema50": spec.overlays.push(line("ema50", ema(closes, 50), d.color)); break;
      case "ema200": spec.overlays.push(line("ema200", ema(closes, 200), d.color)); break;
      case "sma50": spec.overlays.push(line("sma50", sma(closes, 50), d.color)); break;
      case "sma200": spec.overlays.push(line("sma200", sma(closes, 200), d.color)); break;
      case "vwap": spec.overlays.push(line("vwap", vwap(candles), d.color, { dashed: true })); break;
      case "bb": {
        const b = bollinger(closes, 20, 2);
        spec.overlays.push(line("bb-u", b.upper, d.color, { width: 1 }), line("bb-m", b.middle, d.color, { width: 1, dashed: true }), line("bb-l", b.lower, d.color, { width: 1 }));
        break;
      }
      case "keltner": {
        const k = keltner(candles, 20, 2, 10);
        spec.overlays.push(line("kc-u", k.upper, d.color, { width: 1 }), line("kc-l", k.lower, d.color, { width: 1 }));
        break;
      }
      case "donchian": {
        const k = donchian(candles, 20);
        spec.overlays.push(line("dc-u", k.upper, d.color, { width: 1, dashed: true }), line("dc-l", k.lower, d.color, { width: 1, dashed: true }));
        break;
      }
      case "levels":
        for (const l of keyLevels(candles, { lookback: 4, max: 6 })) {
          spec.levels.push({ price: l.price, color: l.kind === "support" ? C.up : C.down, title: `${l.kind === "support" ? "S" : "R"} ×${l.touches}` });
        }
        break;
    }
  }

  // Indicator panes.
  const pane = (id: IndicatorId, ...ov: ChartSpec["overlays"]) => {
    for (const o of ov) spec.overlays.push({ ...o, pane: id });
    spec.paneHeights![id] = 110;
  };
  for (const d of INDICATORS) {
    if (!on.has(d.id) || !d.pane) continue;
    switch (d.id) {
      case "rsi": pane("rsi", line("rsi", rsi(closes, 14), d.color, { precision: 1, guides: [g(70, "70"), g(30, "30")] })); break;
      case "macd": {
        const m = macd(closes);
        pane(
          "macd",
          { kind: "hist", key: "macd-h", pane: "macd", color: C.grey, points: m.histogram.flatMap((v, i) => (v == null ? [] : [{ time: times[i], value: v, color: v >= 0 ? C.upSoft : C.downSoft }])) },
          line("macd-l", m.line, def("macd").color, { width: 1, precision: 0 }),
          line("macd-s", m.signal, C.accent, { width: 1, precision: 0 })
        );
        break;
      }
      case "atr": pane("atr", line("atr", atr(candles, 14), d.color, { precision: 0 })); break;
      case "stoch": {
        const s = stochastic(candles);
        pane("stoch", line("stoch-k", s.k, d.color, { width: 1, precision: 1, guides: [g(80), g(20)] }), line("stoch-d", s.d, C.accent, { width: 1, precision: 1 }));
        break;
      }
      case "obv": pane("obv", line("obv", obv(candles), d.color, { precision: 0 })); break;
      case "adx": {
        const a = adx(candles, 14);
        pane("adx", line("adx", a.adx, d.color, { precision: 1, guides: [g(25, "25")] }), line("pdi", a.plusDI, C.up, { width: 1, precision: 1 }), line("mdi", a.minusDI, C.down, { width: 1, precision: 1 }));
        break;
      }
      case "cci": pane("cci", line("cci", cci(candles, 20), d.color, { precision: 0, guides: [g(100), g(-100)] })); break;
      case "mfi": pane("mfi", line("mfi", mfi(candles, 14), d.color, { precision: 1, guides: [g(80), g(20)] })); break;
      case "willr": pane("willr", line("willr", williamsR(candles, 14), d.color, { precision: 1, guides: [g(-20), g(-80)] })); break;
    }
  }
  return spec;
}
