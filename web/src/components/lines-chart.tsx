"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts";

export type Line = { name: string; color: string; dashed?: boolean; data: { t: number; v: number }[] };

/** Several value-over-time lines on one price scale (equity curves etc.). */
export function LinesChart({ lines, height = "h-64 sm:h-80" }: { lines: Line[]; height?: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || lines.every((l) => l.data.length < 2)) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--fg-muted") },
      grid: { vertLines: { visible: false }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderColor: v("--line") },
      timeScale: { borderColor: v("--line"), timeVisible: true },
    });
    for (const l of lines) {
      const data = l.data.filter((p, i) => i === 0 || p.t > l.data[i - 1].t).map((p) => ({ time: p.t as UTCTimestamp, value: p.v }));
      chart.addSeries(LineSeries, { color: l.color, lineWidth: l.dashed ? 1 : 2, lineStyle: l.dashed ? 2 : 0, title: l.name, priceLineVisible: false }).setData(data);
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [lines]);

  return (
    <div>
      <div ref={el} className={height} />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {lines.map((l) => (
          <span key={l.name} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: l.color }} /> {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export const LINE_COLORS = ["#f7931a", "#60a5fa", "#22c55e", "#c084fc", "#f472b6"];
