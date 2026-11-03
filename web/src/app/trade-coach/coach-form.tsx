"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Badge, Card, SourceLine, Stat } from "@/components/ui";
import { Button, ErrorNote, Field, inputCls, Segmented } from "@/components/tool-form";
import type { Coach } from "@/lib/ai/features";
import type { TradeFacts } from "@/lib/ai/trade-facts";
import { usd } from "@/lib/format";

type Source = { name: string; ok: boolean; fetchedAt: number };
type Resp = { facts?: TradeFacts; sources?: Source[]; coach?: Coach | null; model?: string; error?: string };

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[,$\s]/g, "")));
const f2 = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));

export function CoachForm({ takerPct, makerPct }: { takerPct: number; makerPct: number }) {
  const [side, setSide] = useState<"long" | "short">("long");
  const [tf, setTf] = useState<"15m" | "1h" | "4h" | "1d">("4h");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [size, setSize] = useState("");
  const [account, setAccount] = useState("");
  const [thesis, setThesis] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Resp | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/snapshot").then((r) => r.json()).then((s) => { if (s?.spot?.ok) setPrice(s.spot.value.price); }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    const body = { side, timeframe: tf, entry: num(entry), stop: num(stop), target: num(target), sizeUsd: num(size), accountUsd: num(account), thesis };
    if (!body.entry || !body.stop) return setFormErr("Entry and stop are required.");
    if ([body.entry, body.stop, body.target, body.sizeUsd, body.accountUsd].some((x) => x != null && (!Number.isFinite(x) || x <= 0))) return setFormErr("Prices and sizes must be positive numbers.");
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/v1/ai/trade-coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as Resp;
      setRes(r.ok ? j : { ...j, error: j.error ?? `Request failed (${r.status})` });
    } catch {
      setRes({ error: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={submit} className="card space-y-4 p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented label="Side" value={side} onChange={setSide} options={[{ value: "long", label: "Long" }, { value: "short", label: "Short" }]} />
          <Segmented label="Timeframe" value={tf} onChange={setTf} options={(["15m", "1h", "4h", "1d"] as const).map((v) => ({ value: v, label: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry (USD)" hint={price ? <button type="button" className="underline" onClick={() => setEntry(String(Math.round(price)))}>Use market {usd(price)}</button> : undefined}>
            <input className={inputCls} inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} required />
          </Field>
          <Field label="Stop (USD)"><input className={inputCls} inputMode="decimal" value={stop} onChange={(e) => setStop(e.target.value)} required /></Field>
          <Field label="Target (USD)" hint="Optional"><input className={inputCls} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="Position size (USD)" hint="Optional, notional"><input className={inputCls} inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} /></Field>
          <Field label="Account size (USD)" hint="Optional, for % at risk" className="col-span-2"><input className={inputCls} inputMode="decimal" value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
        </div>
        <Field label="Thesis" hint="Why this trade, why here, what you expect. Max 2,000 characters.">
          <textarea className={clsx(inputCls, "min-h-28 font-sans")} maxLength={2000} value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="e.g. 4h higher low held at 96k support, reclaiming the 50 EMA; targeting the range high." />
        </Field>
        {formErr && <ErrorNote>{formErr}</ErrorNote>}
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Checking the plan… (up to a minute)" : "Check this trade"}</Button>
        <p className="text-xs text-faint">Fees modeled at {makerPct.toFixed(2)}% maker (target) / {takerPct.toFixed(2)}% taker (entry, stop).</p>
      </form>

      <div className="space-y-6 lg:col-span-3">
        {!res && !busy && <Card><p className="text-sm text-muted">Results appear here: the computed facts first, then Claude&apos;s critique.</p></Card>}
        {busy && <div className="card h-64 animate-pulse" />}
        {res?.facts && <FactsView f={res.facts} sources={res.sources ?? []} side={side} />}
        {res?.error && <ErrorNote>{res.error}</ErrorNote>}
        {res?.coach && <CoachView c={res.coach} model={res.model} />}
      </div>
    </div>
  );
}

function FactsView({ f, sources, side }: { f: TradeFacts; sources: Source[]; side: "long" | "short" }) {
  return (
    <Card title="Computed facts" action={<Badge>Deterministic</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Reward:risk" value={f.rr == null ? "—" : `${f2(f.rr)}R`} sub={f.fees.netRr != null ? `${f2(f.fees.netRr)}R after fees` : "no target"} tone={f.rr != null && f.rr < 1.5 ? "down" : undefined} />
        <Stat label="Stop distance" value={`${f2(f.riskPct)}%`} sub={f.stopAtr != null ? `${f2(f.stopAtr)}× ATR` : "ATR unavailable"} />
        <Stat label="Fee drag at stop" value={`${f2(f.fees.roundTripStopPct)}%`} sub={`= ${f2(f.fees.feesAsPctOfRisk, 0)}% of your risk`} tone={f.fees.feesAsPctOfRisk > 20 ? "down" : undefined} />
        {f.sizing && <Stat label="Loss if stopped" value={usd(f.sizing.lossAtStopUsd)} sub={f.sizing.accountRiskPct != null ? `${f2(f.sizing.accountRiskPct)}% of account` : `${f.sizing.qtyBtc.toFixed(5)} BTC`} tone="down" />}
        {f.sizing?.gainAtTargetUsd != null && <Stat label="Gain at target" value={usd(f.sizing.gainAtTargetUsd)} sub="net of fees" tone="up" />}
        <Stat label="Entry vs market" value={f.entryVsPricePct == null ? "—" : `${f.entryVsPricePct > 0 ? "+" : ""}${f2(f.entryVsPricePct)}%`} sub={f.entryVsPriceAtr != null ? `${f2(f.entryVsPriceAtr)}× ATR` : undefined} />
        <Stat label="Funding (avg 8h)" value={f.funding8hPct == null ? "—" : `${f.funding8hPct > 0 ? "+" : ""}${f.funding8hPct.toFixed(4)}%`} sub={f.funding8hPct == null ? "unavailable" : f.funding8hPct > 0 ? "longs pay shorts" : "shorts pay longs"} />
        <Stat label="Fear & Greed" value={f.fearGreed?.value ?? "—"} sub={f.fearGreed?.label ?? "unavailable"} />
        <Stat label="Daily trend" value={f.dailyTrend ?? "—"} tone={f.dailyTrend == null ? "muted" : (f.dailyTrend.startsWith("above") === (side === "long")) ? "up" : "down"} />
      </div>

      {f.flags.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Rule-based flags</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {f.flags.map((x) => <li key={x} className="flex gap-2"><span className="text-warn">!</span><span className="text-fg/90">{x}</span></li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Key levels (swing clusters)</h3>
          {f.levels.length ? (
            <ul className="num mt-2 space-y-1 text-sm">
              {[...f.levels].sort((a, b) => b.price - a.price).map((l) => (
                <li key={l.price} className="flex justify-between gap-2">
                  <span className={l.kind === "resistance" ? "text-down" : "text-up"}>{usd(l.price)}</span>
                  <span className="text-xs text-faint">{l.kind} · {l.touches} touches{f.stopNearLevel?.price === l.price ? " · near your stop" : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No clustered levels found.</p>}
        </div>
        <div>
          <h3 className="text-sm font-medium">Moving averages</h3>
          {f.emas.length ? (
            <ul className="num mt-2 space-y-1 text-sm">
              {f.emas.map((m) => (
                <li key={m.label} className="flex justify-between gap-2"><span>{m.label}</span><span className="text-muted">{usd(m.value)} · entry {m.entryAbovePct >= 0 ? "+" : ""}{m.entryAbovePct.toFixed(2)}%</span></li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">Candles unavailable.</p>}
          {f.atr != null && <p className="num mt-2 text-xs text-faint">ATR(14): {usd(f.atr)}</p>}
        </div>
      </div>
      <SourceLine source={sources.map((s) => `${s.name}${s.ok ? "" : " (unavailable)"}`).join(" · ")} fetchedAt={Math.min(...sources.map((s) => s.fetchedAt))} />
    </Card>
  );
}

function CoachView({ c, model }: { c: Coach; model?: string }) {
  const tone = c.verdict === "take" ? "up" : c.verdict === "skip" ? "down" : "warn";
  return (
    <Card title="Claude's critique" action={<Badge tone={tone}>{c.verdict.toUpperCase()}</Badge>}>
      <div className="flex items-baseline gap-3">
        <span className="num text-4xl font-semibold">{c.score}</span><span className="text-sm text-muted">/ 100</span>
      </div>
      <p className="mt-3 text-sm text-fg/90">{c.summary}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <List title="Strengths" items={c.strengths} mark="+" cls="text-up" />
        <List title="Risks" items={c.risks} mark="−" cls="text-down" />
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-medium">What would invalidate it</h3>
        <p className="mt-1 text-sm text-fg/90">{c.invalidation}</p>
      </div>
      {c.adjustments.length > 0 && <div className="mt-5"><List title="Suggested adjustments" items={c.adjustments} mark="→" cls="text-accent" /></div>}
      <p className="mt-5 text-xs text-muted">Thesis: {c.thesis_quality}</p>
      <SourceLine source={`Claude ${model ?? ""}`.trim()} extra="AI can be wrong; not financial advice" />
    </Card>
  );
}

function List({ title, items, mark, cls }: { title: string; items: string[]; mark: string; cls: string }) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-sm">{items.map((x) => <li key={x} className="flex gap-2"><span className={cls}>{mark}</span><span className="text-fg/90">{x}</span></li>)}</ul>
      ) : <p className="mt-2 text-sm text-muted">None noted.</p>}
    </div>
  );
}
