"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";

export type GuideCard = { slug: string; title: string; description: string; category: string; difficulty: string; tags: string[]; readMinutes: number };

/** Client-side filter + search over the server-provided guide index. */
export function LearnIndex({ guides, categories }: { guides: GuideCard[]; categories: [string, string][] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [diff, setDiff] = useState<string>("all");

  const shown = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return guides.filter((g) => {
      if (cat !== "all" && g.category !== cat) return false;
      if (diff !== "all" && g.difficulty !== diff) return false;
      const hay = `${g.title} ${g.description} ${g.tags.join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [guides, q, cat, diff]);

  const catLabel = Object.fromEntries(categories);
  const present = categories.filter(([k]) => guides.some((g) => g.category === k));

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Search guides</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides — e.g. funding, RSI, stop loss"
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent/60" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Level
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="rounded-lg border border-line bg-raised px-2 py-2 text-sm text-fg">
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Category">
        {[["all", "All"] as [string, string], ...present].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setCat(k)} aria-pressed={cat === k}
            className={clsx("rounded-full border px-3 py-1 text-sm", cat === k ? "border-accent/50 bg-accent-soft text-accent" : "border-line text-muted hover:text-fg")}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-faint" aria-live="polite">{shown.length} of {guides.length} guides</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => (
          <Link key={g.slug} href={`/learn/${g.slug}`} className="card flex flex-col p-5 transition hover:border-line-strong">
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-faint">
              <span>{catLabel[g.category] ?? g.category}</span><span>·</span><span>{g.difficulty}</span><span>·</span><span>{g.readMinutes} min</span>
            </div>
            <h2 className="mt-2 font-medium">{g.title}</h2>
            <p className="mt-1.5 flex-1 text-sm text-muted">{g.description}</p>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="mt-6 text-sm text-muted">No guides match. Try a broader search.</p>}
    </div>
  );
}
