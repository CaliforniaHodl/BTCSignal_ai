"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactUsd, usd } from "@/lib/format";
import type { PriceBucket, TimeBucket } from "@/lib/patterns/liquidations";

const LONG = "#ef4444"; // longs liquidated = forced sells
const SHORT = "#22c55e"; // shorts liquidated = forced buys
const axis = { stroke: "#5b6476", fontSize: 11 };
const tooltipStyle = { background: "#0d1117", border: "1px solid #2a3344", borderRadius: 8, fontSize: 12 };

export function LiqByHour({ data }: { data: TimeBucket[] }) {
  const rows = data.map((b) => ({ ...b, label: new Date(b.t).toISOString().slice(11, 16) }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1b2230" vertical={false} />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={axis} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => compactUsd(v)} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(139,148,167,0.08)" }} formatter={(v) => compactUsd(Number(v))} labelFormatter={(l) => `${l} UTC`} />
          <Bar dataKey="longUsd" name="Longs liquidated" stackId="a" fill={LONG} />
          <Bar dataKey="shortUsd" name="Shorts liquidated" stackId="a" fill={SHORT} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars by price bucket, highest price on top, with the current price marked. */
export function LiqByPrice({ data, price, bucketUsd, height = 420 }: { data: PriceBucket[]; price: number | null; bucketUsd: number; height?: number }) {
  const rows = data.map((b) => ({ ...b, label: usd(b.price), mid: b.price + bucketUsd / 2 }));
  const priceLabel = price != null ? rows.find((r) => price >= r.mid - bucketUsd / 2 && price < r.mid + bucketUsd / 2)?.label : undefined;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap={1}>
          <CartesianGrid stroke="#1b2230" horizontal={false} />
          <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={(v: number) => compactUsd(v)} />
          <YAxis type="category" dataKey="label" tick={axis} tickLine={false} axisLine={false} width={70} interval="preserveStartEnd" minTickGap={6} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(139,148,167,0.08)" }} formatter={(v) => compactUsd(Number(v))} labelFormatter={(l) => `${l} – ${usd(Number(String(l).replace(/[^0-9.]/g, "")) + bucketUsd)}`} />
          {priceLabel && <ReferenceLine y={priceLabel} stroke="#f7931a" strokeDasharray="4 3" label={{ value: "now", fill: "#f7931a", fontSize: 11, position: "insideTopRight" }} />}
          <Bar dataKey="longUsd" name="Longs" stackId="a" fill={LONG} />
          <Bar dataKey="shortUsd" name="Shorts" stackId="a" fill={SHORT} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
