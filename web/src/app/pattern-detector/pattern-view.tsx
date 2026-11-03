"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { LwChart } from "@/components/chart/lw-chart";
import { ChartFrame, Chip, ClientSourceLine, TimeframeTabs } from "@/components/chart/controls";
import { useJson } from "@/components/chart/use-json";
import { mergeSpecs } from "@/lib/chart/spec";
import { patternSpec, smcSpec } from "@/lib/chart/structure-spec";
import { strength, type Pattern } from "@/lib/patterns/chart-patterns";
import { usd } from "@/lib/format";
import type { Timeframe } from "@/lib/market/types";
import type { PatternsResponse } from "@/app/api/v1/patterns/route";

const STATUS: Record<Pattern["status"], { label: string; tone: string }> = {
  forming: { label: "Forming", tone: "text-muted" },
  confirmed: { label: "Confirmed", tone: "text-accent" },
  invalidated: { label: "Invalidated", tone: "text-faint" },
  broke_up: { label: "Broke up", tone: "text-up" },
  broke_down: { label: "Broke down", tone: "text-down" },
};

export function PatternView() {
  const [tf, setTf] = useState<Timeframe>("1h");
  const [selected, setSelected] = useState<string | null>(null);
  const [showSmc, setShowSmc] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const load = useJson<PatternsResponse>(`/api/v1/patterns?tf=${tf}`, 120_000, (d) => d.candles.ok);
  const data = load.state === "ok" ? load.data : null;
  const candles = useMemo(() => (data?.candles.ok ? data.candles.value : []), [data]);

  // Live = forming, or resolved within the last 30 bars. History = the rest.
  const { live, history } = useMemo(() => {
    const ps = data?.patterns ?? [];
    const n = candles.length;
    const isLive = (p: Pattern) => p.status === "forming" || (p.statusIndex != null && p.statusIndex >= n - 30);
    return { live: ps.filter(isLive), history: ps.filter((p) => !isLive(p)) };
  }, [data, candles.length]);
  const shown = useMemo(() => (showHistory ? [...live, ...history] : live), [showHistory, live, history]);

  const spec = useMemo(
    () => mergeSpecs(patternSpec(candles, shown, selected), showSmc && data ? smcSpec(candles, data.fvgs, data.orderBlocks) : { overlays: [], levels: [], markers: [] }),
    [candles, shown, selected, showSmc, data]
  );

  const state = load.state === "ok" ? "ok" : load.state === "loading" ? "loading" : "error";
  const errMsg = load.state === "error" ? (load.status === 402 ? "Pro pass required." : "Candles unavailable — Coinbase didn't respond.") : undefined;

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">BTC / USD — detected structure</h2>
            <p className="text-xs text-faint">Swing pivots (3 bars each side) on Coinbase candles · recomputed every 2 minutes</p>
          </div>
          <TimeframeTabs value={tf} onChange={(t) => { setTf(t); setSelected(null); }} />
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip on={showSmc} onClick={() => setShowSmc(!showSmc)} color="#2dd4bf">FVGs &amp; order blocks</Chip>
          <Chip on={showHistory} onClick={() => setShowHistory(!showHistory)} color="#8b94a7">Older patterns ({history.length})</Chip>
          {selected && <Chip on onClick={() => setSelected(null)}>Show all</Chip>}
        </div>
        <ChartFrame state={state} message={errMsg}>
          <LwChart candles={candles} spec={spec} fitKey={tf} />
        </ChartFrame>
        {data && <ClientSourceLine source={data.candles.source} fetchedAt={data.candles.fetchedAt} extra={`${candles.length} bars`} />}
      </div>

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <h2 className="font-medium">Patterns</h2>
            {shown.length === 0 && (
              <div className="card p-5 text-sm text-muted">
                No pattern meets the rules on {tf} right now. That&apos;s a normal result: most price action isn&apos;t a clean textbook shape, and we don&apos;t loosen the rules to always show something.
              </div>
            )}
            {shown.map((p) => <PatternCard key={p.id} p={p} active={selected === p.id} onSelect={() => setSelected(selected === p.id ? null : p.id)} />)}
          </section>
          <section className="space-y-3">
            <h2 className="font-medium">Imbalances &amp; order blocks</h2>
            <SmcList data={data} />
          </section>
        </div>
      )}
    </div>
  );
}

function PatternCard({ p, active, onSelect }: { p: Pattern; active: boolean; onSelect: () => void }) {
  const s = strength(p);
  const st = STATUS[p.status];
  const fmt = (t: number) => new Date(t * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  return (
    <button onClick={onSelect} className={clsx("card block w-full p-4 text-left transition", active ? "border-accent" : "hover:border-line-strong")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={clsx("size-2 rounded-full", p.bias === "bullish" ? "bg-up" : p.bias === "bearish" ? "bg-down" : "bg-[#60a5fa]")} />
          <span className="font-medium">{p.name}</span>
          <span className="text-xs text-faint">{p.bias} by convention</span>
        </div>
        <span className={clsx("text-sm font-medium", st.tone)}>{st.label}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {fmt(p.lines[0].from.time)} → {fmt(p.lines[0].to.time)} · {s.met}/{s.total} textbook criteria ({s.label})
        {p.measuredMove != null && <> · measured-move objective <span className="num">{usd(p.measuredMove)}</span></>}
      </p>
      <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
        {p.criteria.map((c) => (
          <li key={c.label} className={c.met ? "text-fg" : "text-faint"}>
            <span className={c.met ? "text-up" : "text-faint"}>{c.met ? "✓" : "○"}</span> {c.label}
          </li>
        ))}
      </ul>
    </button>
  );
}

function SmcList({ data }: { data: PatternsResponse }) {
  const close = data.candles.ok ? data.candles.value[data.candles.value.length - 1]?.close : null;
  const rows = [
    ...data.fvgs.map((g) => ({ id: g.id, time: g.time, kind: `${g.kind === "bullish" ? "Bullish" : "Bearish"} FVG`, top: g.top, bottom: g.bottom, note: g.status === "open" ? "untouched" : `${Math.round(g.filled * 100)}% filled`, bull: g.kind === "bullish" })),
    ...data.orderBlocks.map((o) => ({ id: o.id, time: o.time, kind: `${o.kind === "bullish" ? "Bullish" : "Bearish"} order block`, top: o.top, bottom: o.bottom, note: o.status === "fresh" ? "not yet revisited" : "revisited", bull: o.kind === "bullish" })),
  ].sort((a, b) => b.time - a.time);
  if (!rows.length) return <div className="card p-5 text-sm text-muted">No open gaps or live order blocks in this window.</div>;
  return (
    <div className="card divide-y divide-line">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 p-3 text-sm">
          <div>
            <div className={r.bull ? "text-up" : "text-down"}>{r.kind}</div>
            <div className="text-xs text-faint">{new Date(r.time * 1000).toISOString().slice(5, 16).replace("T", " ")} UTC · {r.note}</div>
          </div>
          <div className="num text-right text-xs">
            <div>{usd(r.top)}–{usd(r.bottom)}</div>
            {close != null && <div className="text-faint">{(((((r.top + r.bottom) / 2) - close) / close) * 100).toFixed(2)}% away</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
