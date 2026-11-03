"use client";

import { useState } from "react";
import { ChartUpload } from "@/components/chart-upload";
import { Badge, Card, SourceLine } from "@/components/ui";
import { Button, ErrorNote, Field, Segmented } from "@/components/form";
import type { GradeOut } from "@/lib/ai/features";

const CRITERIA: [keyof GradeOut["breakdown"], string][] = [
  ["trend_clarity", "Trend clarity"], ["key_levels", "Key levels"], ["pattern_quality", "Pattern quality"], ["risk_reward", "Reward:risk"], ["entry_timing", "Entry timing"],
];

export function GraderForm() {
  const [file, setFile] = useState<File | null>(null);
  const [tf, setTf] = useState("4h");
  const [bias, setBias] = useState<"none" | "long" | "short">("none");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ grade?: GradeOut; model?: string; error?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setRes(null);
    const fd = new FormData();
    fd.set("image", file);
    fd.set("timeframe", tf);
    if (bias !== "none") fd.set("bias", bias);
    try {
      const r = await fetch("/api/v1/ai/setup-grader", { method: "POST", body: fd });
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
        <Field label="Chart timeframe">
          <select className="w-full rounded-lg border border-line-strong bg-sunken px-3 py-2 text-sm" value={tf} onChange={(e) => setTf(e.target.value)}>
            {["5m", "15m", "1h", "4h", "1d", "1w"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <div>
          <span className="text-xs text-muted">Your bias</span>
          <div className="mt-1"><Segmented label="Bias" value={bias} onChange={setBias} options={[{ value: "none", label: "None" }, { value: "long", label: "Long" }, { value: "short", label: "Short" }]} /></div>
        </div>
        <Button type="submit" disabled={!file || busy} className="w-full">{busy ? "Grading… (up to a minute)" : "Grade this setup"}</Button>
      </form>
      <div className="lg:col-span-3">
        {!res && !busy && <Card><p className="text-sm text-muted">Upload a chart to get a grade. Crop to the price action and keep the price axis visible for the best read.</p></Card>}
        {busy && <div className="card h-72 animate-pulse" />}
        {res?.error && <ErrorNote>{res.error}</ErrorNote>}
        {res?.grade && <GradeView g={res.grade} model={res.model} />}
      </div>
    </div>
  );
}

function GradeView({ g, model }: { g: GradeOut; model?: string }) {
  const tone = g.action === "enter" ? "up" : g.action === "skip" ? "down" : "warn";
  if (!g.readable) {
    return <Card title="Couldn't read this chart"><p className="text-sm text-muted">{g.chart_description}</p><ul className="mt-2 list-disc pl-5 text-sm text-muted">{g.caveats.map((c) => <li key={c}>{c}</li>)}</ul></Card>;
  }
  return (
    <Card title="Grade" action={<Badge tone={tone}>{g.action.toUpperCase()}</Badge>}>
      <div className="flex items-end gap-4">
        <span className="text-5xl font-semibold text-accent">{g.grade}</span>
        <span className="num pb-1 text-muted">{g.score}/100</span>
        <span className="pb-1 text-sm text-muted">Chart reads <b className={g.chart_bias === "long" ? "text-up" : g.chart_bias === "short" ? "text-down" : "text-fg"}>{g.chart_bias}</b></span>
      </div>
      <p className="mt-1 text-xs text-faint">{g.chart_description}</p>
      {g.bias_warning && <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">{g.bias_warning}</p>}
      <ul className="mt-5 space-y-2.5">
        {CRITERIA.map(([k, label]) => (
          <li key={k} className="grid grid-cols-[120px_1fr_44px] items-center gap-3 text-sm">
            <span className="text-muted">{label}</span>
            <span className="h-2 rounded-full bg-sunken"><span className="block h-2 rounded-full bg-accent" style={{ width: `${(g.breakdown[k] / 20) * 100}%` }} /></span>
            <span className="num text-right">{g.breakdown[k]}/20</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-fg/90">{g.verdict}</p>
      <div className="mt-4"><h3 className="text-sm font-medium">Invalidation</h3><p className="mt-1 text-sm text-fg/90">{g.invalidation}</p></div>
      {g.improvements.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium">What would make it better</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-fg/90">{g.improvements.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {g.caveats.length > 0 && <div className="mt-4"><h3 className="text-sm font-medium">Caveats</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">{g.caveats.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      <SourceLine source={`Claude ${model ?? ""}`.trim()} extra="score and letter grade computed from the five sub-scores" />
    </Card>
  );
}
