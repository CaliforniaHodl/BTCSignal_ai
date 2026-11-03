"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";

/** Agent equity vs. buy-and-hold BTC, both indexed to the agent's starting cash. */
export function EquityChart({ points, startCash }: { points: { t: number; equity: number; price: number }[]; startCash: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || points.length === 0) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--fg-muted") },
      grid: { vertLines: { visible: false }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderColor: v("--line") },
      timeScale: { borderColor: v("--line"), timeVisible: true },
    });
    // lightweight-charts needs strictly increasing times
    const dedup = points.filter((p, i) => i === 0 || p.t > points[i - 1].t);
    const p0 = dedup[0].price;
    const t = (x: number) => x as UTCTimestamp;
    chart.addSeries(LineSeries, { color: "#60a5fa", lineWidth: 1, lineStyle: 2, title: "BTC hold", priceLineVisible: false })
      .setData(dedup.map((p) => ({ time: t(p.t), value: (startCash * p.price) / p0 })));
    chart.addSeries(LineSeries, { color: v("--accent"), lineWidth: 2, title: "Agent", priceLineVisible: false })
      .setData(dedup.map((p) => ({ time: t(p.t), value: p.equity })));
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [points, startCash]);

  if (points.length < 2) {
    return <div className="grid h-64 place-items-center text-sm text-muted">The equity curve appears after the agent&apos;s second hourly run.</div>;
  }
  return <div ref={el} className="h-64 sm:h-80" />;
}
