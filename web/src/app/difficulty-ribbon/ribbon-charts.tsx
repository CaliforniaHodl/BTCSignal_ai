"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { Segmented } from "@/components/form";
import { SeriesChart, type ChartLine } from "@/components/series-chart";
import type { HashSeries, RibbonSeries } from "@/lib/onchain/mining";
import { RIBBON_PERIODS } from "@/lib/onchain/ribbon";

const COLORS = ["#f7931a", "#f59e0b", "#eab308", "#a3e635", "#22c55e", "#14b8a6", "#38bdf8", "#6366f1"];
type Range = "1y" | "4y" | "all";

export function RibbonCharts({ daily, weekly, hash }: { daily: RibbonSeries; weekly: RibbonSeries; hash: HashSeries }) {
  const [range, setRange] = useState<Range>("1y");
  const [log, setLog] = useState(false);

  const ribbon = useMemo(() => {
    const src = range === "1y" ? daily : weekly;
    const keep = range === "4y" ? 209 : src.t.length;
    const from = Math.max(0, src.t.length - keep);
    const t = src.t.slice(from);
    const lines: ChartLine[] = [
      ...RIBBON_PERIODS.map((p, i) => ({ label: `SMA ${p}`, color: COLORS[i], values: src.s[i].slice(from) })),
      { label: "Difficulty", color: "#e6e9ef", values: src.d.slice(from), width: 2 as const },
    ];
    return { t, lines };
  }, [range, daily, weekly]);

  const hashLines = useMemo(() => {
    const keep = range === "1y" ? 365 : hash.t.length;
    const from = Math.max(0, hash.t.length - keep);
    return {
      t: hash.t.slice(from),
      lines: [
        { label: "Hashrate (daily est.)", color: "rgba(139,148,167,0.5)", values: hash.h.slice(from) },
        { label: "30-day SMA", color: "#f7931a", values: hash.s30.slice(from), width: 2 as const },
        { label: "60-day SMA", color: "#60a5fa", values: hash.s60.slice(from), width: 2 as const },
      ] satisfies ChartLine[],
    };
  }, [range, hash]);

  return (
    <>
      <Card
        title="Difficulty ribbon"
        action={
          <div className="flex flex-wrap gap-2">
            <Segmented label="Range" value={range} onChange={setRange} options={[{ id: "1y", label: "1Y" }, { id: "4y", label: "4Y" }, { id: "all", label: "All" }]} />
            <Segmented label="Scale" value={log ? "log" : "lin"} onChange={(v) => setLog(v === "log")} options={[{ id: "lin", label: "Linear" }, { id: "log", label: "Log" }]} />
          </div>
        }
      >
        <SeriesChart t={ribbon.t} lines={ribbon.lines} unit="difficulty" log={log || range === "all"} />
        <p className="mt-2 text-xs text-faint">{range === "1y" ? "Daily." : range === "4y" ? "Weekly samples." : "Weekly samples since July 2010, log scale."} Difficulty is constant between retargets, so the daily series is exact.</p>
      </Card>
      <Card title={`Hash ribbon${range === "1y" ? "" : " (last 2 years)"}`}>
        <SeriesChart t={hashLines.t} lines={hashLines.lines} unit="ehs" log={log} height={300} />
      </Card>
    </>
  );
}
