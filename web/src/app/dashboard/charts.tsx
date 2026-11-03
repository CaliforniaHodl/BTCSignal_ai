"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Categorical order, validated for the dark surface (lightness band, CVD ΔE ≥ 15). */
export const SERIES = ["#3b82f6", "#d0740a", "#a855f7"] as const;
const GRID = "var(--line)";
const TICK = { fill: "var(--fg-faint)", fontSize: 11 };
const TIP = { contentStyle: { background: "var(--bg-raised)", border: "1px solid var(--line-strong)", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "var(--fg-muted)" } };
const compact = (n: number) => Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const dayLabel = (t: number) => new Date(t).toISOString().slice(5, 10);

/** Funding per 8h for each venue on a shared 8h grid. */
export function FundingHistoryChart({ venues }: { venues: { venue: string; points: { t: number; rate8h: number }[] }[] }) {
  const byT = new Map<number, Record<string, number>>();
  for (const v of venues) for (const p of v.points) byT.set(p.t, { ...(byT.get(p.t) ?? { t: p.t }), [v.venue]: +(p.rate8h * 100).toFixed(5) });
  const data = [...byT.values()].sort((a, b) => a.t - b.t);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={dayLabel} tick={TICK} stroke={GRID} />
          <YAxis tickFormatter={(v: number) => `${v.toFixed(3)}%`} tick={TICK} stroke={GRID} width={64} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <Tooltip {...TIP} labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 16).replace("T", " ") + " UTC"} formatter={(v) => [`${Number(v).toFixed(4)}%`]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {venues.map((v, i) => (
            <Line key={v.venue} type="monotone" dataKey={v.venue} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OiChart({ points }: { points: { t: number; oiUsd: number }[] }) {
  const data = points.slice(-60).map((p) => ({ t: p.t, oi: p.oiUsd }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="t" tickFormatter={dayLabel} tick={TICK} stroke={GRID} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => `$${compact(v)}`} tick={TICK} stroke={GRID} width={56} domain={["auto", "auto"]} />
          <Tooltip {...TIP} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} labelFormatter={(t) => new Date(Number(t)).toISOString().slice(0, 10)} formatter={(v) => [`$${compact(Number(v))}`, "OI"]} />
          <Bar dataKey="oi" fill={SERIES[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Price vs realized price: same unit, one axis. */
export function ValuationChart({ series }: { series: { day: string; price: number | null; realizedPrice: number | null }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(2, 7)} tick={TICK} stroke={GRID} minTickGap={32} />
          <YAxis tickFormatter={(v: number) => `$${compact(v)}`} tick={TICK} stroke={GRID} width={56} />
          <Tooltip {...TIP} formatter={(v, name) => [`$${Math.round(Number(v)).toLocaleString("en-US")}`, name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line name="BTC price" dataKey="price" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line name="Realized price" dataKey="realizedPrice" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily exchange netflow: inflow (to exchanges) red, outflow green. */
export function FlowsChart({ flows }: { flows: { day: string; netflowUsd: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={flows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={TICK} stroke={GRID} minTickGap={24} />
          <YAxis tickFormatter={(v: number) => `$${compact(v)}`} tick={TICK} stroke={GRID} width={56} />
          <ReferenceLine y={0} stroke="var(--line-strong)" />
          <Tooltip {...TIP} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} formatter={(v) => [`${Number(v) >= 0 ? "+" : "−"}$${compact(Math.abs(Number(v)))}`, Number(v) >= 0 ? "Net inflow" : "Net outflow"]} />
          <Bar dataKey="netflowUsd" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {flows.map((f) => <Cell key={f.day} fill={f.netflowUsd >= 0 ? "var(--down)" : "var(--up)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
