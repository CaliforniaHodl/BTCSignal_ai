"use client";

import { useState } from "react";
import clsx from "clsx";
import { ago } from "@/lib/format";
import { ALERT_KINDS, describe, formatValue, KIND_LABEL, type AlertKind } from "@/lib/alerts/rules";
import type { AlertView } from "@/lib/alerts/store";

type Dated<T> = { [K in keyof T]: T[K] extends Date | null ? string | Date | null : T[K] extends Date ? string | Date : T[K] };
type A = Dated<AlertView>;

const inputCls = "w-full rounded-lg border border-line bg-sunken px-3 py-2 text-sm outline-none focus:border-line-strong";

const UNIT: Record<AlertKind, string> = {
  price_above: "USD", price_below: "USD", move_pct: "%", funding_above: "% per 8h", funding_below: "% per 8h", fear_greed_above: "0–100", fear_greed_below: "0–100",
};

export function AlertsManager({ initial, now }: { initial: A[]; now: { price: number | null; funding: number | null; fearGreed: number | null } }) {
  const [alerts, setAlerts] = useState<A[]>(initial);
  const [kind, setKind] = useState<AlertKind>("price_above");
  const [threshold, setThreshold] = useState("");
  const [windowHours, setWindowHours] = useState(4);
  const [direction, setDirection] = useState<"up" | "down" | "either">("either");
  const [mode, setMode] = useState<"once" | "repeat">("once");
  const [cooldown, setCooldown] = useState(60);
  const [label, setLabel] = useState("");
  const [webhook, setWebhook] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder =
    kind.startsWith("price_") && now.price ? String(Math.round(now.price / 1000) * 1000)
    : kind.startsWith("funding_") ? "0.03"
    : kind.startsWith("fear_greed_") ? (kind.endsWith("above") ? "75" : "25")
    : "3";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = Number(threshold);
    if (!threshold || !Number.isFinite(t)) return setError("Enter a number.");
    setBusy(true);
    try {
      const r = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind, threshold: t, mode, cooldownMinutes: cooldown,
          ...(kind === "move_pct" ? { windowHours, direction } : {}),
          ...(label.trim() ? { label: label.trim() } : {}),
          ...(webhook.trim() ? { discordWebhookUrl: webhook.trim() } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setError(j.error ?? `Error ${r.status}`);
      setAlerts((a) => [j.alert as A, ...a]);
      setThreshold("");
      setLabel("");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const r = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (r.ok) setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function toggle(a: A) {
    const r = await fetch(`/api/alerts/${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !a.active }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setAlerts((xs) => xs.map((x) => (x.id === a.id ? (j.alert as A) : x)));
    else setError(j.error ?? "Couldn't update alert.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <form onSubmit={create} className="card space-y-4 p-5">
        <h2 className="font-medium">New alert</h2>
        <label className="block text-sm">
          <span className="text-muted">When</span>
          <select className={clsx(inputCls, "mt-1")} value={kind} onChange={(e) => setKind(e.target.value as AlertKind)}>
            {ALERT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Threshold ({UNIT[kind]})</span>
          <input className={clsx(inputCls, "num mt-1")} inputMode="decimal" value={threshold} placeholder={placeholder} onChange={(e) => setThreshold(e.target.value)} />
        </label>
        {kind === "move_pct" && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="block"><span className="text-muted">Within</span>
              <select className={clsx(inputCls, "mt-1")} value={windowHours} onChange={(e) => setWindowHours(Number(e.target.value))}>
                <option value={1}>1 hour</option><option value={4}>4 hours</option><option value={24}>24 hours</option>
              </select>
            </label>
            <label className="block"><span className="text-muted">Direction</span>
              <select className={clsx(inputCls, "mt-1")} value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
                <option value="either">Up or down</option><option value="up">Up</option><option value="down">Down</option>
              </select>
            </label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="block"><span className="text-muted">Fires</span>
            <select className={clsx(inputCls, "mt-1")} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              <option value="once">Once, then off</option><option value="repeat">Every crossing</option>
            </select>
          </label>
          <label className="block"><span className="text-muted">Cooldown</span>
            <select className={clsx(inputCls, "mt-1")} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} disabled={mode === "once"}>
              <option value={15}>15 min</option><option value={60}>1 hour</option><option value={240}>4 hours</option><option value={1440}>1 day</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted">Label (optional)</span>
          <input className={clsx(inputCls, "mt-1")} maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Discord webhook (optional)</span>
          <input className={clsx(inputCls, "mt-1")} value={webhook} placeholder="https://discord.com/api/webhooks/…" onChange={(e) => setWebhook(e.target.value)} />
          <span className="mt-1 block text-xs text-faint">Channel settings → Integrations → Webhooks. Without one, alerts appear in your history only.</span>
        </label>
        {error && <p className="text-sm text-down">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-black disabled:opacity-60">{busy ? "Saving…" : "Create alert"}</button>
        <p className="text-xs text-faint">“Every crossing” re-arms only after the condition clears, then waits for the cooldown, so a price sitting on your level won&apos;t spam you.</p>
      </form>

      <section className="card p-5">
        <h2 className="mb-4 font-medium">Your alerts <span className="text-sm text-faint">({alerts.length})</span></h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alerts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className={clsx("font-medium", !a.active && "text-muted")}>{describe({ kind: a.kind as AlertKind, threshold: a.threshold, windowHours: (a.windowHours ?? undefined) as 1 | 4 | 24 | undefined, direction: (a.direction ?? undefined) as "up" | "down" | "either" | undefined, label: a.label })}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-faint">
                    <span>{a.active ? (a.armed ? "Armed" : "Waiting for condition to clear") : a.fireCount > 0 && a.mode === "once" ? "Fired · off" : "Paused"}</span>
                    <span>{a.mode === "once" ? "one-shot" : `repeat · ${a.cooldownMinutes}m cooldown`}</span>
                    <span>{a.webhook ? "Discord" : "In-app only"}</span>
                    {a.lastValue != null && a.lastCheckedAt && <span suppressHydrationWarning>last {formatValue(a.kind as AlertKind, a.lastValue)} · {ago(new Date(a.lastCheckedAt).getTime())}</span>}
                    {a.fireCount > 0 && <span>fired {a.fireCount}×</span>}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => toggle(a)} className="rounded-md border border-line px-2.5 py-1 text-muted hover:text-fg">{a.active ? "Pause" : "Resume"}</button>
                  <button onClick={() => remove(a.id)} className="rounded-md border border-line px-2.5 py-1 text-down hover:bg-down-soft">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
