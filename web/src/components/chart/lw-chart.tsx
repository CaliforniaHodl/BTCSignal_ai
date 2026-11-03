"use client";

/**
 * Declarative wrapper over lightweight-charts v5. The chart is created once;
 * candles and overlays are diffed by effect, so toggling an indicator or
 * refreshing data keeps the user's zoom/scroll. Indicator panes are named
 * and assigned indices in order of first appearance.
 */
import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market/types";
import type { ChartSpec } from "@/lib/chart/spec";

export type ChartHandle = {
  chart: IChartApi;
  /** Composite PNG-ready canvas of all panes. */
  screenshot: () => HTMLCanvasElement;
};

export type ChartClick = { time: number | null; price: number | null };

const t = (x: number) => x as UTCTimestamp;

export function LwChart({
  candles,
  spec,
  className,
  showVolume = true,
  fitKey,
  onReady,
  onClick,
}: {
  candles: Candle[];
  spec: ChartSpec;
  className?: string;
  showVolume?: boolean;
  /** Re-fit the visible range when this changes (e.g. timeframe). Defaults to the first candle's time. */
  fitKey?: string;
  onReady?: (h: ChartHandle | null) => void;
  onClick?: (p: ChartClick) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<{
    chart: IChartApi;
    candles: ISeriesApi<"Candlestick">;
    vol: ISeriesApi<"Histogram">;
    markers: ISeriesMarkersPluginApi<Time>;
    overlays: ISeriesApi<"Line" | "Histogram">[];
    priceLines: IPriceLine[];
    fitKey: string | null;
  } | null>(null);
  const clickRef = useRef(onClick);
  const readyRef = useRef(onReady);
  useEffect(() => {
    clickRef.current = onClick;
    readyRef.current = onReady;
  });

  // Create once.
  useEffect(() => {
    if (!el.current) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(el.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: v("--fg-muted"),
        fontFamily: "var(--font-geist-mono)",
        panes: { separatorColor: v("--line-strong"), separatorHoverColor: v("--line-strong") },
      },
      grid: { vertLines: { color: v("--line") }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderColor: v("--line") },
      timeScale: { borderColor: v("--line"), timeVisible: true },
      crosshair: { mode: 0 },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: v("--up"), downColor: v("--down"), wickUpColor: v("--up"), wickDownColor: v("--down"), borderVisible: false,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    const markers = createSeriesMarkers(candles, []);
    api.current = { chart, candles, vol, markers, overlays: [], priceLines: [], fitKey: null };

    const handler = (p: { time?: Time; point?: { x: number; y: number } }) => {
      if (!clickRef.current || !p.point) return;
      const price = candles.coordinateToPrice(p.point.y);
      clickRef.current({ time: typeof p.time === "number" ? p.time : null, price: price == null ? null : Number(price) });
    };
    chart.subscribeClick(handler);
    readyRef.current?.({ chart, screenshot: () => chart.takeScreenshot(true, false) });
    return () => {
      readyRef.current?.(null);
      chart.unsubscribeClick(handler);
      chart.remove();
      api.current = null;
    };
  }, []);

  // Candles + volume. Fit only when the dataset changes identity (e.g. timeframe switch).
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    a.candles.setData(candles.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
    a.vol.setData(
      showVolume
        ? candles.map((c) => ({ time: t(c.time), value: c.volume, color: c.close >= c.open ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" }))
        : []
    );
    const key = fitKey ?? String(candles[0]?.time ?? "");
    if (candles.length && key !== a.fitKey) {
      a.fitKey = key;
      a.chart.timeScale().fitContent();
    }
  }, [candles, showVolume, fitKey]);

  // Overlays, panes, price levels, markers.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    for (const s of a.overlays) a.chart.removeSeries(s);
    for (const l of a.priceLines) a.candles.removePriceLine(l);
    a.overlays = [];
    a.priceLines = [];

    const paneIndex = new Map<string, number>();
    const paneOf = (name?: string) => {
      if (!name || name === "main") return 0;
      if (!paneIndex.has(name)) paneIndex.set(name, paneIndex.size + 1);
      return paneIndex.get(name)!;
    };

    for (const o of spec.overlays) {
      const pane = paneOf(o.pane);
      if (o.kind === "line") {
        const s = a.chart.addSeries(
          LineSeries,
          {
            color: o.color,
            lineWidth: o.width ?? 2,
            lineStyle: o.dashed ? LineStyle.Dashed : LineStyle.Solid,
            priceLineVisible: false,
            lastValueVisible: o.lastValue ?? pane > 0,
            crosshairMarkerVisible: !o.quiet,
            title: o.title ?? "",
            priceFormat: o.precision != null ? { type: "price", precision: o.precision, minMove: 1 / 10 ** o.precision } : undefined,
          },
          pane
        );
        s.setData(o.points.map((p) => ({ time: t(p.time), value: p.value })));
        for (const pl of o.guides ?? []) s.createPriceLine({ price: pl.price, color: pl.color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: pl.title ?? "" });
        a.overlays.push(s);
      } else {
        const s = a.chart.addSeries(HistogramSeries, { color: o.color, priceLineVisible: false, lastValueVisible: true, title: o.title ?? "" }, pane);
        s.setData(o.points.map((p) => ({ time: t(p.time), value: p.value, color: p.color })));
        a.overlays.push(s);
      }
    }
    const panes = a.chart.panes();
    for (const [name, idx] of paneIndex) panes[idx]?.setHeight(spec.paneHeights?.[name] ?? 110);

    for (const l of spec.levels) {
      a.priceLines.push(
        a.candles.createPriceLine({
          price: l.price,
          color: l.color,
          lineWidth: l.width ?? 1,
          lineStyle: l.dashed === false ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: l.title,
        })
      );
    }
    a.markers.setMarkers(
      [...spec.markers]
        .sort((x, y) => x.time - y.time)
        .map((m): SeriesMarker<Time> => ({ time: t(m.time), position: m.position, shape: m.shape, color: m.color, text: m.text }))
    );
  }, [spec, candles]);

  return <div ref={el} className={className ?? "absolute inset-0"} />;
}
