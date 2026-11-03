/**
 * Shared UI primitives. Use these instead of re-styling per page so the whole
 * site reads as one system. Server-safe (no hooks) unless noted.
 */
import clsx from "clsx";
import { ago } from "@/lib/format";
import type { Datum } from "@/lib/market/types";

export function PageHeader({ eyebrow, title, lede, children }: { eyebrow?: string; title: string; lede?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="max-w-3xl">
      {eyebrow && <p className="text-xs uppercase tracking-wider text-accent">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {lede && <p className="mt-3 text-lg text-muted">{lede}</p>}
      {children}
    </header>
  );
}

/** Standard page container. */
export function Page({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={clsx("mx-auto px-4 py-10 sm:px-6 sm:py-14", narrow ? "max-w-3xl" : "max-w-7xl")}>{children}</div>;
}

export function Card({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("card p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="font-medium">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "up" | "down" | "muted" }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-faint">{label}</div>
      <div className={clsx("num mt-2 text-xl font-semibold", tone === "up" && "text-up", tone === "down" && "text-down", tone === "muted" && "text-muted")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Render a Datum: children when ok, an honest "Unavailable" otherwise. Always shows source + age. */
export function DatumView<T>({ d, children, now }: { d: Datum<T>; children: (v: T) => React.ReactNode; now?: number }) {
  return (
    <>
      {d.ok ? children(d.value) : <Unavailable source={d.source} error={d.error} />}
      <SourceLine source={d.source} fetchedAt={d.fetchedAt} now={now} />
    </>
  );
}

export function Unavailable({ source, error, className }: { source: string; error?: string; className?: string }) {
  return (
    <div className={clsx("text-muted", className)} title={error}>
      Unavailable
      <div className="mt-1 text-xs text-faint">{source} didn&apos;t respond</div>
    </div>
  );
}

export function SourceLine({ source, fetchedAt, now, extra }: { source: string; fetchedAt?: number; now?: number; extra?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-2 text-[11px] text-faint">
      <span>{source}</span>
      {fetchedAt != null && (<><span>·</span><span suppressHydrationWarning>{ago(fetchedAt, now)}</span></>)}
      {extra && (<><span>·</span><span>{extra}</span></>)}
    </div>
  );
}

/** Use for any number that is estimated or modeled rather than directly observed. */
export function ModeledTag({ how }: { how: string }) {
  return <span title={how} className="ml-1.5 rounded bg-warn/10 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-warn">Modeled</span>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "up" | "down" | "accent" | "warn" }) {
  const cls = { neutral: "bg-sunken text-muted", up: "bg-up-soft text-up", down: "bg-down-soft text-down", accent: "bg-accent-soft text-accent", warn: "bg-warn/10 text-warn" }[tone];
  return <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", cls)}>{children}</span>;
}

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return <p className="mt-8 text-xs text-faint">{children ?? "For information and education only. Not financial advice."}</p>;
}
