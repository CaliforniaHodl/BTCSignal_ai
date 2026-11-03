"use client";

import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";

export type PanelDef = { id: string; section: string; title: string; wide?: boolean; node: React.ReactNode };

const KEY = "btcs.dashboard.hidden.v1";

// Per-browser layout: which panels are hidden. localStorage only, wrapped in try/catch.
const listeners = new Set<() => void>();
function readHidden(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function writeHidden(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked: layout just won't persist */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function PanelShell({ panels }: { panels: PanelDef[] }) {
  const raw = useSyncExternalStore(subscribe, readHidden, () => "[]");
  const hidden = new Set<string>(safeParse(raw));
  const [open, setOpen] = useState(false);
  const visible = panels.filter((p) => !hidden.has(p.id));
  const sections = [...new Set(panels.map((p) => p.section))];
  const toggle = (id: string) => writeHidden(hidden.has(id) ? [...hidden].filter((x) => x !== id) : [...hidden, id]);
  const q = `panels=${visible.map((p) => p.id).join(",")}`;

  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <button onClick={() => setOpen((o) => !o)} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-fg" aria-expanded={open}>
          Layout · {visible.length}/{panels.length} panels
        </button>
        <span className="text-faint">Export shown data:</span>
        <a href={`/api/pro/dashboard?format=csv&${q}`} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-fg">CSV</a>
        <a href={`/api/pro/dashboard?format=json&${q}`} className="rounded-md border border-line px-3 py-1.5 text-muted hover:text-fg">JSON</a>
        {open && (
          <div className="mt-2 grid w-full gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {panels.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 text-muted">
                <input type="checkbox" checked={!hidden.has(p.id)} onChange={() => toggle(p.id)} className="accent-[var(--accent)]" />
                <span><span className="text-faint">{p.section} ·</span> {p.title}</span>
              </label>
            ))}
            <button onClick={() => writeHidden([])} className="justify-self-start py-1 text-xs text-accent">Show all</button>
          </div>
        )}
      </div>

      <div className="space-y-10">
        {sections.map((s) => {
          const ps = visible.filter((p) => p.section === s);
          if (!ps.length) return null;
          return (
            <section key={s}>
              <h2 className="mb-3 text-sm uppercase tracking-wider text-faint">{s}</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {ps.map((p) => (
                  <div key={p.id} className={clsx(p.wide && "lg:col-span-2")}>{p.node}</div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function safeParse(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
