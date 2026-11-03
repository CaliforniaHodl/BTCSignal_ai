"use client";

import { useState } from "react";
import clsx from "clsx";
import type { Endpoint } from "@/lib/api/catalog";

type Result = { status: number; ms: number; cache: string | null; body: string } | { error: string };

export function Explorer({ endpoints }: { endpoints: Endpoint[] }) {
  const [sel, setSel] = useState(0);
  const ep = endpoints[sel];
  const [params, setParams] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  const qs = ep.params.map((p) => `${p.name}=${encodeURIComponent(params[`${ep.path}:${p.name}`] ?? p.default)}`).join("&");
  const url = `${ep.path}${qs ? `?${qs}` : ""}`;

  async function send() {
    setBusy(true);
    setRes(null);
    const t0 = performance.now();
    try {
      const r = await fetch(url, { cache: "no-store" });
      const text = await r.text();
      let body = text;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch { /* not JSON: show raw */ }
      setRes({ status: r.status, ms: Math.round(performance.now() - t0), cache: r.headers.get("cache-control"), body });
    } catch (e) {
      setRes({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <nav className="card flex flex-col p-2 text-sm">
        {endpoints.map((e, i) => (
          <button key={e.path} onClick={() => { setSel(i); setRes(null); }} className={clsx("rounded-md px-3 py-2 text-left", i === sel ? "bg-accent-soft text-accent" : "text-muted hover:bg-bg hover:text-fg")}>
            <div className="num text-xs">{e.path}</div>
            <div className="text-[11px] opacity-80">{e.title}</div>
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-4">
        <div className="card p-5">
          <p className="text-sm text-muted">{ep.description}</p>
          {ep.params.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {ep.params.map((p) => {
                const key = `${ep.path}:${p.name}`;
                return (
                  <label key={key} className="text-sm">
                    <span className="num text-xs text-faint">{p.name}</span>
                    <select className="mt-1 block rounded-lg border border-line bg-sunken px-3 py-2" value={params[key] ?? p.default} onChange={(e) => setParams((s) => ({ ...s, [key]: e.target.value }))}>
                      {p.values.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="num min-w-0 flex-1 truncate rounded-lg border border-line bg-sunken px-3 py-2 text-xs">GET {url}</code>
            <button onClick={send} disabled={busy} className="rounded-lg bg-accent px-4 py-2 font-medium text-black disabled:opacity-60">{busy ? "Sending…" : "Send"}</button>
          </div>
        </div>
        {res && (
          <div className="card p-5">
            {"error" in res ? (
              <p className="text-sm text-down">Request failed: {res.error}</p>
            ) : (
              <>
                <div className="num flex flex-wrap gap-x-4 text-xs text-faint">
                  <span className={res.status < 300 ? "text-up" : "text-down"}>HTTP {res.status}</span>
                  <span>{res.ms} ms</span>
                  {res.cache && <span>cache-control: {res.cache}</span>}
                </div>
                <pre className="num mt-3 max-h-[32rem] overflow-auto rounded-lg border border-line bg-sunken p-3 text-xs leading-relaxed">{res.body}</pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
