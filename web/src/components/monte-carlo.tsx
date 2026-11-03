"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ModeledTag } from "@/components/ui";
import type { McSummary } from "@/lib/backtest/montecarlo";

const p = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

/** Monte Carlo ranges + histogram of final returns. Always labelled as modeled, with the method. */
export function MonteCarloView({ mc, title = "Monte Carlo ranges" }: { mc: McSummary | null; title?: string }) {
  if (!mc) return <p className="text-sm text-muted">Not enough trades/history to resample (need at least 5 trades).</p>;
  const data = mc.histogram.map((h) => ({ x: `${h.from.toFixed(0)}%`, n: h.count, mid: (h.from + h.to) / 2 }));
  return (
    <div>
      <h3 className="text-sm font-medium">{title}<ModeledTag how={mc.method} /></h3>
      <p className="mt-1 text-xs text-faint">{mc.method}. Ranges show how much of the result depends on order and luck — not a forecast.</p>
      <dl className="num mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-faint">5th pct</dt><dd className={mc.finalReturnPct.p5 < 0 ? "text-down" : ""}>{p(mc.finalReturnPct.p5)}</dd></div>
        <div><dt className="text-xs text-faint">Median</dt><dd>{p(mc.finalReturnPct.p50)}</dd></div>
        <div><dt className="text-xs text-faint">95th pct</dt><dd className="text-up">{p(mc.finalReturnPct.p95)}</dd></div>
        <div><dt className="text-xs text-faint">Chance of loss</dt><dd>{mc.probLossPct.toFixed(0)}%</dd></div>
        <div><dt className="text-xs text-faint">Median max DD</dt><dd>{mc.maxDrawdownPct.p50.toFixed(1)}%</dd></div>
        <div><dt className="text-xs text-faint">95th pct max DD</dt><dd className="text-down">{mc.maxDrawdownPct.p95.toFixed(1)}%</dd></div>
      </dl>
      <div className="mt-4 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="x" tick={{ fontSize: 10, fill: "var(--fg-faint)" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: "var(--fg-faint)" }} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
              contentStyle={{ background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v} runs`, ""]}
              labelFormatter={(l) => `from ${l}`}
            />
            <Bar dataKey="n" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
