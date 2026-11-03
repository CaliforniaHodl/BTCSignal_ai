"use client";

import { useState } from "react";
import clsx from "clsx";
import { ChartUpload } from "@/components/chart-upload";
import { Badge, Card, SourceLine } from "@/components/ui";
import { Button, ErrorNote, Field, inputCls } from "@/components/tool-form";
import type { AnalysisOut } from "@/lib/ai/features";
import { usd } from "@/lib/format";

export function AnalyzeForm() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ analysis?: AnalysisOut; model?: string; error?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setRes(null);
    const fd = new FormData();
    fd.set("image", file);
    if (question.trim()) fd.set("question", question.trim());
    try {
      const r = await fetch("/api/v1/ai/analyze", { method: "POST", body: fd });
      const j = await r.json();
      setRes(r.ok ? j : { error: j.error ?? `Request failed (${r.status})` });
    } catch {
      setRes({ error: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={submit} className="card space-y-4 p-5 lg:col-span-2">
        <ChartUpload file={file} onFile={setFile} disabled={busy} />
        <Field label="Anything specific? (optional)" hint="e.g. “Is this a bull flag?” Max 500 characters.">
          <textarea className={clsx(inputCls, "min-h-20 font-sans")} maxLength={500} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </Field>
        <Button type="submit" disabled={!file || busy} className="w-full">{busy ? "Analysing… (up to a minute)" : "Analyse chart"}</Button>
      </form>
      <div className="lg:col-span-3">
        {!res && !busy && <Card><p className="text-sm text-muted">Upload a chart to get a structured read. Keep the price axis visible so levels can be read.</p></Card>}
        {busy && <div className="card h-72 animate-pulse" />}
        {res?.error && <ErrorNote>{res.error}</ErrorNote>}
        {res?.analysis && <AnalysisView a={res.analysis} model={res.model} />}
      </div>
    </div>
  );
}

function AnalysisView({ a, model }: { a: AnalysisOut; model?: string }) {
  if (!a.readable) {
    return <Card title="Couldn't read this chart"><p className="text-sm text-muted">{a.chart_description}</p><ul className="mt-2 list-disc pl-5 text-sm text-muted">{a.caveats.map((c) => <li key={c}>{c}</li>)}</ul></Card>;
  }
  const dirTone = a.trend.direction === "up" ? "up" : a.trend.direction === "down" ? "down" : "neutral";
  return (
    <Card title="Analysis" action={<Badge tone={dirTone}>{a.trend.direction} · {a.trend.strength}</Badge>}>
      <p className="text-xs text-faint">{a.chart_description}</p>
      <p className="mt-3 text-sm text-fg/90">{a.summary}</p>
      <div className="mt-5"><h3 className="text-sm font-medium">Trend</h3><p className="mt-1 text-sm text-fg/90">{a.trend.notes}</p></div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Levels seen</h3>
          {a.levels.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {a.levels.map((l, i) => (
                <li key={i}>
                  <span className={clsx("num", l.kind === "support" ? "text-up" : l.kind === "resistance" ? "text-down" : "text-fg")}>{l.price != null ? `~${usd(l.price)}` : "unreadable"}</span>
                  <span className="ml-2 text-xs text-faint">{l.kind}</span>
                  <div className="text-xs text-muted">{l.note}</div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">None identified.</p>}
        </div>
        <div>
          <h3 className="text-sm font-medium">Patterns</h3>
          {a.patterns.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {a.patterns.map((p) => <li key={p.name}>{p.name} <Badge tone={p.confidence === "high" ? "accent" : "neutral"}>{p.confidence}</Badge><div className="text-xs text-muted">{p.note}</div></li>)}
            </ul>
          ) : <p className="mt-2 text-sm text-muted">No clear pattern.</p>}
          {a.indicators.length > 0 && (<><h3 className="mt-4 text-sm font-medium">Indicators</h3><ul className="mt-1 list-disc pl-5 text-sm text-fg/90">{a.indicators.map((x) => <li key={x}>{x}</li>)}</ul></>)}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-up-soft p-3 text-sm"><div className="text-xs font-medium text-up">Bullish case confirms if</div><p className="mt-1 text-fg/90">{a.scenarios.bullish}</p></div>
        <div className="rounded-lg bg-down-soft p-3 text-sm"><div className="text-xs font-medium text-down">Bearish case confirms if</div><p className="mt-1 text-fg/90">{a.scenarios.bearish}</p></div>
      </div>
      {a.caveats.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium">Caveats</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{a.caveats.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      <SourceLine source={`Claude ${model ?? ""}`.trim()} extra="AI can be wrong; not financial advice" />
    </Card>
  );
}
