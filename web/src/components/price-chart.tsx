"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { ema, keyLevels, last, rsi } from "@/lib/indicators";
import { usd } from "@/lib/format";
import type { Candle, Datum, Timeframe } from "@/lib/market/types";

const TFS: Timeframe[] = ["15m", "1h", "4h", "1d"];

type Levels = ReturnType<typeof keyLevels>;

export function PriceChart() {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [tf, setTf] = useState<Timeframe>("1h");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [stats, setStats] = useState<{ rsi: number | null; levels: Levels } | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();

    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--fg-muted"), fontFamily: "var(--font-geist-mono)" },
      grid: { vertLines: { color: v("--line") }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderColor: v("--line") },
      timeScale: { borderColor: v("--line"), timeVisible: true },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: v("--up"), downColor: v("--down"), wickUpColor: v("--up"), wickDownColor: v("--down"), borderVisible: false, priceFormat: { type: "price", precision: 0, minMove: 1 },
    });
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false, color: "rgba(139,148,167,0.25)" });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const ema20 = chart.addSeries(LineSeries, { color: v("--accent"), lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    const ema50 = chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    let cancelled = false;
    setState("loading");
    fetch(`/api/v1/candles?tf=${tf}`)
      .then((r) => r.json() as Promise<Datum<Candle[]>>)
      .then((d) => {
        if (cancelled) return;
        if (!d.ok || d.value.length === 0) return setState("error");
        const cs = d.value;
        const t = (x: number) => x as UTCTimestamp;
        candles.setData(cs.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
        vol.setData(cs.map((c) => ({ time: t(c.time), value: c.volume, color: c.close >= c.open ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" })));
        const closes = cs.map((c) => c.close);
        const toLine = (s: (number | null)[]) =>
          s.flatMap((val, i) => (val == null ? [] : [{ time: t(cs[i].time), value: val }]));
        ema20.setData(toLine(ema(closes, 20)));
        ema50.setData(toLine(ema(closes, 50)));
        const levels = keyLevels(cs, { lookback: 4, max: 4 });
        for (const l of levels) {
          candles.createPriceLine({
            price: l.price,
            color: l.kind === "support" ? v("--up") : v("--down"),
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `${l.kind === "support" ? "S" : "R"} ×${l.touches}`,
          });
        }
        chart.timeScale().fitContent();
        setStats({ rsi: last(rsi(closes, 14)), levels });
        setState("ok");
      })
      .catch(() => !cancelled && setState("error"));

    return () => {
      cancelled = true;
      chart.remove();
      chartRef.current = null;
    };
  }, [tf]);

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">BTC / USD</h2>
          <p className="text-xs text-faint">
            Coinbase candles · <span className="text-accent">EMA 20</span> · <span className="text-[#60a5fa]">EMA 50</span> · auto S/R
          </p>
        </div>
        <div className="flex rounded-lg border border-line p-0.5 text-sm">
          {TFS.map((x) => (
            <button
              key={x}
              onClick={() => setTf(x)}
              className={clsx("num rounded-md px-3 py-1 transition", x === tf ? "bg-accent text-black" : "text-muted hover:text-fg")}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
      <div className="relative h-[380px] sm:h-[460px]">
        <div ref={el} className="absolute inset-0" />
        {state !== "ok" && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted">
            {state === "loading" ? "Loading candles…" : "Candles unavailable — Coinbase didn't respond."}
          </div>
        )}
      </div>
      {stats && state === "ok" && (
        <div className="num mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>
            RSI 14: <span className={clsx(stats.rsi != null && (stats.rsi > 70 ? "text-down" : stats.rsi < 30 ? "text-up" : "text-fg"))}>{stats.rsi?.toFixed(1) ?? "—"}</span>
          </span>
          {stats.levels.map((l) => (
            <span key={l.price}>
              {l.kind === "support" ? "Support" : "Resistance"} <span className={l.kind === "support" ? "text-up" : "text-down"}>{usd(l.price)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
