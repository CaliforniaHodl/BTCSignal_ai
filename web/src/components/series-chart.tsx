"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart, LineSeries, PriceScaleMode, type UTCTimestamp } from "lightweight-charts";

export type ChartUnit = "difficulty" | "ehs" | "usd" | "pct" | "btc" | "ratio";

export type ChartLine = {
  label: string;
  color: string;
  values: (number | null)[];
  width?: 1 | 2 | 3;
  dashed?: boolean;
};

const FMT: Record<ChartUnit, (v: number) => string> = {
  difficulty: (v) => `${(v / 1e12).toFixed(v >= 1e12 ? 1 : 6)} T`,
  ehs: (v) => `${v.toFixed(0)} EH/s`,
  usd: (v) => "$" + Intl.NumberFormat("en-US", { notation: v >= 1e5 ? "compact" : "standard", maximumFractionDigits: v >= 1e5 ? 2 : 0 }).format(v),
  pct: (v) => `${v.toFixed(2)}%`,
  btc: (v) => `${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v)} BTC`,
  ratio: (v) => v.toFixed(2),
};

/**
 * Multi-line time series on lightweight-charts. Data is columnar (`t` + aligned
 * `values`) so it serialises compactly from a server component.
 */
export function SeriesChart({ t, lines, unit, log, height = 360 }: { t: number[]; lines: ChartLine[]; unit: ChartUnit; log?: boolean; height?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || t.length === 0) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: v("--fg-muted"), fontFamily: "var(--font-geist-mono)" },
      grid: { vertLines: { visible: false }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderColor: v("--line"), mode: log ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal },
      timeScale: { borderColor: v("--line") },
      localization: { priceFormatter: FMT[unit] },
      crosshair: { mode: 0 },
    });
    for (const line of lines) {
      const s = chart.addSeries(LineSeries, {
        color: line.color,
        lineWidth: line.width ?? 1,
        lineStyle: line.dashed ? 2 : 0,
        priceLineVisible: false,
        lastValueVisible: false,
        title: "",
      });
      const data: { time: UTCTimestamp; value: number }[] = [];
      let prev = -Infinity;
      for (let i = 0; i < t.length; i++) {
        const val = line.values[i];
        // strictly increasing time; log scale can't show ≤ 0
        if (val == null || !Number.isFinite(val) || t[i] <= prev || (log && val <= 0)) continue;
        data.push({ time: t[i] as UTCTimestamp, value: val });
        prev = t[i];
      }
      s.setData(data);
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [t, lines, unit, log]);

  return (
    <div>
      <div className="relative" style={{ height }}>
        <div ref={el} className="absolute inset-0" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {lines.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
