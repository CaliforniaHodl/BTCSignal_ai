"use client";

import clsx from "clsx";
import { ago } from "@/lib/format";
import type { Timeframe } from "@/lib/market/types";

export const TFS: Timeframe[] = ["15m", "1h", "4h", "1d"];

export function TimeframeTabs({ value, onChange }: { value: Timeframe; onChange: (t: Timeframe) => void }) {
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-sm" role="tablist" aria-label="Timeframe">
      {TFS.map((x) => (
        <button
          key={x}
          role="tab"
          aria-selected={x === value}
          onClick={() => onChange(x)}
          className={clsx("num rounded-md px-3 py-1 transition", x === value ? "bg-accent text-black" : "text-muted hover:text-fg")}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

export function Chip({ on, onClick, color, children, title, disabled }: { on: boolean; onClick: () => void; color?: string; children: React.ReactNode; title?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-pressed={on}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition disabled:opacity-40",
        on ? "border-line-strong bg-sunken text-fg" : "border-line text-faint hover:text-muted"
      )}
    >
      {color && <span className="size-2 rounded-full" style={{ background: on ? color : "transparent", outline: `1px solid ${color}` }} />}
      {children}
    </button>
  );
}

/** Fixed-height chart frame with an honest loading / unavailable overlay. */
export function ChartFrame({ state, height = "h-[380px] sm:h-[480px]", children, message }: { state: "loading" | "ok" | "error"; height?: string; children: React.ReactNode; message?: string }) {
  return (
    <div className={clsx("relative", height)}>
      {children}
      {state !== "ok" && (
        <div className="absolute inset-0 grid place-items-center bg-raised/60 text-sm text-muted">
          {state === "loading" ? "Loading candles…" : message ?? "Candles unavailable — Coinbase didn't respond."}
        </div>
      )}
    </div>
  );
}

export function ClientSourceLine({ source, fetchedAt, extra }: { source: string; fetchedAt?: number; extra?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-2 text-[11px] text-faint">
      <span>{source}</span>
      {fetchedAt != null && (<><span>·</span><span suppressHydrationWarning>fetched {ago(fetchedAt)}</span></>)}
      {extra && (<><span>·</span><span>{extra}</span></>)}
    </div>
  );
}
