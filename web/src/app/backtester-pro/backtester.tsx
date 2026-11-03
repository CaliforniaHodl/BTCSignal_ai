"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { LinesChart } from "@/components/lines-chart";
import { MonteCarloView } from "@/components/monte-carlo";
import { Badge, Card, SourceLine, Stat } from "@/components/ui";
import { Button, ErrorNote, Field, inputCls } from "@/components/form";
import type { McSummary } from "@/lib/backtest/montecarlo";
import { conditionLabel, validateSpec, type Fees, type RuleMetrics, type RuleSpec, type RuleTrade } from "@/lib/backtest/rules";
import { TEMPLATES } from "@/lib/backtest/templates";
import { usd } from "@/lib/format";
import { RuleEditor } from "./rule-editor";

type RunResp = {
  spec: RuleSpec; warnings: string[];
  metrics: Omit<RuleMetrics, "profitFactor"> & { profitFactor: number | null };
  monteCarlo: McSummary | null;
  equity: { t: number; equity: number; hold: number }[];
  trades: RuleTrade[]; tradeCount: number; endedOpen: boolean; startCash: number; fees: Fees;
  window: { from: number; to: number; bars: number; timeframe: string };
  source: { name: string; fetchedAt: number };
};
const MAX_DAYS = { "1h": 360, "4h": 720, "1d": 3650 } as const;
const f = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));
const pc = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

export function Backtester({ defaultFees }: { defaultFees: { makerPct: number; takerPct: number; slippagePct: number } }) {
  const [text, setText] = useState("");
  const [spec, setSpec] = useState<RuleSpec | null>(null);
  const [interp, setInterp] = useState<{ interpretation: string; unsupported: string[]; model?: string } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [days, setDays] = useState(730);
  const [positionPct, setPositionPct] = useState(100);
  const [fees, setFees] = useState(defaultFees);
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [result, setResult] = useState<RunResp | null>(null);

  const check = useMemo(() => (spec ? validateSpec(spec) : null), [spec]);
  const maxDays = spec ? MAX_DAYS[spec.timeframe] : 3650;

  async function translate() {
    setParsing(true); setParseErr(null);
    try {
      const r = await fetch("/api/v1/ai/strategy-parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const j = await r.json();
      if (!r.ok) setParseErr(j.error ?? `Request failed (${r.status})`);
      else { setSpec(j.spec); setInterp({ interpretation: j.interpretation, unsupported: j.unsupported, model: j.model }); setResult(null); }
    } catch {
      setParseErr("Network error. Try again.");
    } finally {
      setParsing(false);
    }
  }

  async function run() {
    if (!spec || !check?.ok) return;
    setRunning(true); setRunErr(null);
    try {
      const r = await fetch("/api/v1/backtest/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ spec: check.spec, days: Math.min(days, maxDays), positionPct, fees }) });
      const j = await r.json();
      if (!r.ok) setRunErr([j.error, ...(j.errors ?? [])].filter(Boolean).join(" · ") || `Request failed (${r.status})`);
      else setResult(j);
    } catch {
      setRunErr("Network error. Try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1 */}
      <Card title="1 · Describe the strategy">
        <textarea className={clsx(inputCls, "min-h-24 font-sans")} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. On the daily chart, buy when the 50-day EMA crosses above the 200-day and RSI is above 50. Sell when price closes below the 50 EMA. 8% stop." />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={translate} disabled={parsing || text.trim().length < 10}>{parsing ? "Translating…" : "Translate with Claude"}</Button>
          <span className="text-xs text-faint">or start from a template:</span>
          {TEMPLATES.map((t) => (
            <Button key={t.id} type="button" variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => { setSpec(structuredClone(t.spec)); setInterp(null); setResult(null); }}>{t.name}</Button>
          ))}
        </div>
        {parseErr && <div className="mt-3"><ErrorNote>{parseErr}</ErrorNote></div>}
        <p className="mt-3 text-xs text-faint">Claude only translates your words into rules from a fixed menu. It never runs or tunes the backtest. AI can be wrong; check the rules below.</p>
      </Card>

      {/* Step 2 */}
      {spec && (
        <Card title="2 · Confirm the rules" action={check?.ok ? <Badge tone="up">Valid</Badge> : <Badge tone="down">Needs fixing</Badge>}>
          {interp && (
            <div className="mb-5 rounded-lg bg-sunken p-3 text-sm">
              <div className="text-xs text-faint">Claude&apos;s reading{interp.model ? ` · ${interp.model}` : ""}</div>
              <p className="mt-1 text-fg/90">{interp.interpretation}</p>
              {interp.unsupported.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-warn">{interp.unsupported.map((u) => <li key={u}>Not encoded: {u}</li>)}</ul>
              )}
            </div>
          )}
          <RuleEditor spec={spec} onChange={(s) => { setSpec(s); setResult(null); }} errors={check && !check.ok ? check.errors : []} warnings={check?.warnings ?? []} />
        </Card>
      )}

      {/* Step 3 */}
      {spec && (
        <Card title="3 · Run on real Coinbase history">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Lookback (days)" hint={`max ${maxDays} for ${spec.timeframe}`}><input className={inputCls} type="number" min={30} max={maxDays} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
            <Field label="Position size" hint="% of equity per trade"><input className={inputCls} type="number" min={1} max={100} value={positionPct} onChange={(e) => setPositionPct(Number(e.target.value))} /></Field>
            <Field label="Taker fee %" hint="entries, stops, exits"><input className={inputCls} type="number" step="0.01" min={0} max={2} value={fees.takerPct} onChange={(e) => setFees({ ...fees, takerPct: Number(e.target.value) })} /></Field>
            <Field label="Maker fee %" hint="targets (limit)"><input className={inputCls} type="number" step="0.01" min={0} max={2} value={fees.makerPct} onChange={(e) => setFees({ ...fees, makerPct: Number(e.target.value) })} /></Field>
            <Field label="Slippage %" hint="on market fills"><input className={inputCls} type="number" step="0.01" min={0} max={2} value={fees.slippagePct} onChange={(e) => setFees({ ...fees, slippagePct: Number(e.target.value) })} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={run} disabled={running || !check?.ok}>{running ? "Running… (first run fetches history)" : "Run backtest"}</Button>
            <span className="text-xs text-faint">Signals at bar close, fills at the next open. Defaults are Coinbase Advanced&apos;s entry tier.</span>
          </div>
          {runErr && <div className="mt-3"><ErrorNote>{runErr}</ErrorNote></div>}
        </Card>
      )}

      {result && <Results r={result} />}
    </div>
  );
}

function Results({ r }: { r: RunResp }) {
  const m = r.metrics;
  const lines = [
    { name: "Strategy", color: "#f7931a", data: r.equity.map((e) => ({ t: e.t, v: e.equity })) },
    { name: "Buy & hold", color: "#60a5fa", dashed: true, data: r.equity.map((e) => ({ t: e.t, v: e.hold })) },
  ];
  return (
    <div className="space-y-6">
      <Card title="Results" action={<span className="text-xs text-faint">{day(r.window.from)} → {day(r.window.to)} · {r.window.bars.toLocaleString()} {r.window.timeframe} bars</span>}>
        <ul className="mb-4 space-y-0.5 text-xs text-muted">
          {r.spec.entry.map((c, i) => <li key={`e${i}`}>Entry: {conditionLabel(c)}</li>)}
          {r.spec.exit.map((c, i) => <li key={`x${i}`}>Exit: {conditionLabel(c)}</li>)}
        </ul>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Return" value={pc(m.returnPct)} tone={m.returnPct >= 0 ? "up" : "down"} sub={`B&H ${pc(m.buyHoldPct)}`} />
          <Stat label="CAGR" value={m.cagrPct == null ? "—" : pc(m.cagrPct)} sub={m.cagrPct == null ? "window < 6 months" : "annualised"} />
          <Stat label="Max drawdown" value={`${f(m.maxDrawdownPct, 1)}%`} sub={`B&H ${f(m.buyHoldMaxDrawdownPct, 1)}%`} tone="down" />
          <Stat label="Sharpe" value={f(m.sharpe)} sub="per-bar, annualised" />
          <Stat label="Trades" value={String(r.tradeCount)} sub={`${f(m.winRatePct, 0)}% win${r.endedOpen ? " · last closed at end" : ""}`} />
          <Stat label="Profit factor" value={m.profitFactor == null ? (m.trades ? "∞" : "—") : f(m.profitFactor)} sub="gross win / loss" />
          <Stat label="Avg trade" value={pc(m.avgTradePct)} sub={`win ${pc(m.avgWinPct)} · loss ${pc(m.avgLossPct)}`} />
          <Stat label="Avg R" value={m.avgR == null ? "—" : `${f(m.avgR)}R`} sub="needs a stop" />
          <Stat label="Exposure" value={`${f(m.exposurePct, 0)}%`} sub={`avg ${f(m.avgBars, 1)} bars held`} />
          <Stat label="Fees paid" value={usd(m.feesUsd)} sub={`on ${usd(r.startCash)} start`} />
          <Stat label="Best trade" value={pc(m.bestTradePct)} tone="up" />
          <Stat label="Worst trade" value={pc(m.worstTradePct)} tone="down" />
        </div>
        {r.warnings.length > 0 && <ul className="mt-3 text-xs text-warn">{r.warnings.map((w) => <li key={w}>! {w}</li>)}</ul>}
        <div className="mt-6"><LinesChart lines={lines} /></div>
        <SourceLine source={r.source.name} fetchedAt={r.source.fetchedAt}
          extra={`fees ${(r.fees.taker * 100).toFixed(2)}% taker / ${(r.fees.maker * 100).toFixed(2)}% maker + ${(r.fees.slippage * 100).toFixed(2)}% slippage · stops assumed before targets inside a bar`} />
      </Card>

      <Card><MonteCarloView mc={r.monteCarlo} title="Trade-order Monte Carlo" /></Card>

      <Card title={`Trades${r.tradeCount > r.trades.length ? ` (last ${r.trades.length} of ${r.tradeCount})` : ""}`} className="overflow-x-auto">
        {r.trades.length === 0 ? <p className="text-sm text-muted">No trades: the entry conditions never all lined up in this window.</p> : (
          <table className="num w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-faint">
              <tr><th className="pb-2 font-normal">Entry</th><th className="font-normal">Exit</th><th className="font-normal">Side</th><th className="font-normal">Entry px</th><th className="font-normal">Exit px</th><th className="font-normal">Bars</th><th className="font-normal">Reason</th><th className="font-normal">R</th><th className="text-right font-normal">Return</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...r.trades].reverse().map((t) => (
                <tr key={`${t.entryTime}-${t.exitTime}`}>
                  <td className="py-1.5">{day(t.entryTime)}</td><td>{day(t.exitTime)}</td>
                  <td className={t.side === "long" ? "text-up" : "text-down"}>{t.side}</td>
                  <td>{usd(t.entryPrice)}</td><td>{usd(t.exitPrice)}</td><td>{t.bars}</td>
                  <td className="text-muted">{t.reason}</td><td>{t.r == null ? "—" : f(t.r)}</td>
                  <td className={clsx("text-right", t.pnlUsd >= 0 ? "text-up" : "text-down")}>{pc(t.returnPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
