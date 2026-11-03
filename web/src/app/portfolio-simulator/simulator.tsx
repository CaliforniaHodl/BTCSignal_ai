"use client";

import { useState } from "react";
import { LINE_COLORS, LinesChart } from "@/components/lines-chart";
import { MonteCarloView } from "@/components/monte-carlo";
import { Card, SourceLine } from "@/components/ui";
import { Button, ErrorNote, Field, inputCls } from "@/components/form";
import type { McSummary } from "@/lib/backtest/montecarlo";
import type { PortfolioMetrics, PortfolioParams } from "@/lib/backtest/portfolio";
import { usd } from "@/lib/format";

type Result = { params: PortfolioParams; label: string; metrics: PortfolioMetrics; monteCarlo: McSummary | null; curve: { t: number; v: number }[] };
type Resp = { results: Result[]; capital: number; window: { from: number; to: number; days: number }; source: { name: string; fetchedAt: number }; fees: { maker: number; taker: number; slippage: number } };

const pc = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`);
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
const sel = "w-full rounded-lg border border-line-strong bg-sunken px-3 py-2 text-sm";

export function Simulator() {
  const [capital, setCapital] = useState(10_000);
  const [years, setYears] = useState(4);
  const [on, setOn] = useState({ buy_hold: true, dca: true, trend: true, rebalance: true });
  const [every, setEvery] = useState<"week" | "month">("week");
  const [sma, setSma] = useState(200);
  const [weight, setWeight] = useState(50);
  const [rule, setRule] = useState<"month" | "quarter" | "band">("month");
  const [band, setBand] = useState(10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<Resp | null>(null);
  const [mcIdx, setMcIdx] = useState(0);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const strategies: PortfolioParams[] = [];
    if (on.buy_hold) strategies.push({ preset: "buy_hold" });
    if (on.dca) strategies.push({ preset: "dca", every });
    if (on.trend) strategies.push({ preset: "trend", smaPeriod: sma });
    if (on.rebalance) strategies.push({ preset: "rebalance", btcWeightPct: weight, rule, bandPct: band });
    if (!strategies.length) return setErr("Pick at least one strategy.");
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/v1/portfolio/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ capital, days: Math.round(years * 365), strategies }) });
      const j = await r.json();
      if (!r.ok) setErr(j.error ?? `Request failed (${r.status})`);
      else { setRes(j); setMcIdx(0); }
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (k: keyof typeof on) => setOn({ ...on, [k]: !on[k] });

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="card space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Starting capital (USD)"><input className={inputCls} type="number" min={100} value={capital} onChange={(e) => setCapital(Number(e.target.value))} /></Field>
          <Field label="Years of history" hint="Coinbase data since 2015"><input className={inputCls} type="number" min={0.5} max={10} step={0.5} value={years} onChange={(e) => setYears(Number(e.target.value))} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Preset checked={on.buy_hold} onToggle={() => toggle("buy_hold")} title="Buy & hold" desc="All-in on day one, one taker buy." />
          <Preset checked={on.dca} onToggle={() => toggle("dca")} title="Dollar-cost average" desc="Capital split into equal buys; idle cash earns 0%.">
            <select aria-label="DCA frequency" className={sel} value={every} onChange={(e) => setEvery(e.target.value as "week" | "month")}><option value="week">Weekly</option><option value="month">Monthly</option></select>
          </Preset>
          <Preset checked={on.trend} onToggle={() => toggle("trend")} title="Trend filter" desc="Hold BTC while the daily close is above its SMA, else cash. Trades at the next open.">
            <Field label="SMA period (days)"><input className={inputCls} type="number" min={10} max={300} value={sma} onChange={(e) => setSma(Number(e.target.value))} /></Field>
          </Preset>
          <Preset checked={on.rebalance} onToggle={() => toggle("rebalance")} title="Rebalance BTC / cash" desc="Hold a fixed BTC weight, rebalance on a schedule or when it drifts past a band.">
            <div className="grid grid-cols-3 gap-2">
              <Field label="BTC %"><input className={inputCls} type="number" min={5} max={95} value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></Field>
              <Field label="Rule"><select className={sel} value={rule} onChange={(e) => setRule(e.target.value as typeof rule)}><option value="month">Monthly</option><option value="quarter">Quarterly</option><option value="band">Band</option></select></Field>
              <Field label="Band ±%"><input className={inputCls} type="number" min={1} max={40} disabled={rule !== "band"} value={band} onChange={(e) => setBand(Number(e.target.value))} /></Field>
            </div>
          </Preset>
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Simulating…" : "Run simulation"}</Button>
        {err && <ErrorNote>{err}</ErrorNote>}
      </form>

      {res && (
        <>
          <Card title="Equity over time" action={<span className="text-xs text-faint">{day(res.window.from)} → {day(res.window.to)}</span>}>
            <LinesChart lines={res.results.map((r, i) => ({ name: r.label, color: LINE_COLORS[i % LINE_COLORS.length], data: r.curve }))} />
            <div className="mt-5 overflow-x-auto">
              <table className="num w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-faint">
                  <tr><th className="pb-2 font-normal">Strategy</th><th className="font-normal">Final</th><th className="font-normal">Return</th><th className="font-normal">CAGR</th><th className="font-normal">Max DD</th><th className="font-normal">Volatility</th><th className="font-normal">Sharpe</th><th className="font-normal">Trades</th><th className="text-right font-normal">Fees</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {res.results.map((r, i) => (
                    <tr key={r.label}>
                      <td className="py-2 font-sans"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />{r.label}</td>
                      <td>{usd(r.metrics.finalUsd)}</td>
                      <td className={r.metrics.returnPct >= 0 ? "text-up" : "text-down"}>{pc(r.metrics.returnPct)}</td>
                      <td>{pc(r.metrics.cagrPct)}</td>
                      <td className="text-down">{r.metrics.maxDrawdownPct.toFixed(1)}%</td>
                      <td>{r.metrics.volatilityPct.toFixed(0)}%</td>
                      <td>{r.metrics.sharpe.toFixed(2)}</td>
                      <td>{r.metrics.trades}</td>
                      <td className="text-right">{usd(r.metrics.feesUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SourceLine source={res.source.name} fetchedAt={res.source.fetchedAt} extra={`fees ${(res.fees.taker * 100).toFixed(2)}% taker + ${(res.fees.slippage * 100).toFixed(2)}% slippage on every trade`} />
          </Card>
          <Card title="Monte Carlo ranges" action={
            <select aria-label="Strategy for Monte Carlo" className="rounded-lg border border-line-strong bg-sunken px-2 py-1 text-sm" value={mcIdx} onChange={(e) => setMcIdx(Number(e.target.value))}>
              {res.results.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
            </select>
          }>
            <MonteCarloView mc={res.results[mcIdx]?.monteCarlo ?? null} title={`${res.results[mcIdx]?.label} — resampled history`} />
          </Card>
        </>
      )}
    </div>
  );
}

function Preset({ checked, onToggle, title, desc, children }: { checked: boolean; onToggle: () => void; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${checked ? "border-accent/50" : "border-line"}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={checked} onChange={onToggle} />
        <span><span className="font-medium">{title}</span><span className="mt-0.5 block text-xs text-muted">{desc}</span></span>
      </label>
      {children && checked && <div className="mt-3">{children}</div>}
    </div>
  );
}
