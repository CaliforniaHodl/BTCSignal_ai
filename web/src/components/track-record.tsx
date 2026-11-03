/**
 * Track-record building blocks shared by /signal-history, /prediction-tracker
 * and /trading-history. Server components; data comes from lib/tracking.
 */
import Link from "next/link";
import clsx from "clsx";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui";
import type { Signal, PaperTrade } from "@/db/schema";
import { pct, tone, usd } from "@/lib/format";
import type { HitRate } from "@/lib/tracking/stats";

export const fmtPct = (n: number | null | undefined, d = 0) => (n == null || !Number.isFinite(n) ? "—" : `${n.toFixed(d)}%`);
export const fmtSignedPct = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : pct(n, d));

export function DirectionBadge({ dir }: { dir: string }) {
  const t = dir === "long" || dir === "up" ? "up" : dir === "short" || dir === "down" ? "down" : "neutral";
  return <Badge tone={t}>{dir.toUpperCase()}</Badge>;
}

const OUTCOME: Record<string, [string, "up" | "down" | "neutral" | "accent" | "warn"]> = {
  target: ["Target hit", "up"],
  stop: ["Stopped", "down"],
  expired: ["Expired", "neutral"],
  "n/a": ["No trade", "neutral"],
};
export function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (outcome == null) return <Badge tone="accent">Open</Badge>;
  const [label, t] = OUTCOME[outcome] ?? [outcome, "neutral"];
  return <Badge tone={t}>{label}</Badge>;
}

export function HitRateTable({ rows, caption }: { rows: HitRate[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[420px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-left text-xs text-faint">
          <tr><th className="pb-2 font-normal">{caption}</th><th className="font-normal">Resolved</th><th className="font-normal">Right direction</th><th className="font-normal">Hit rate</th><th className="text-right font-normal">Avg return</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-2 font-sans">{r.label}</td>
              <td>{r.resolved}</td>
              <td>{r.correct}</td>
              <td className={r.hitRatePct == null ? "text-faint" : ""}>
                {fmtPct(r.hitRatePct)}
                {r.resolved > 0 && r.resolved < 20 && <span className="ml-1.5 text-[10px] text-warn" title="Fewer than 20 resolved signals: too few to mean much">small n</span>}
              </td>
              <td className={clsx("text-right", r.avgReturnPct != null && tone(r.avgReturnPct))}>{fmtSignedPct(r.avgReturnPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SignalTable({ rows }: { rows: Signal[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No signals recorded yet. The engine writes one every hour.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-faint">
          <tr>
            <th className="pb-2 font-normal">Time</th><th className="font-normal">Call</th><th className="font-normal">Score</th>
            <th className="font-normal">Conf.</th><th className="font-normal">Price</th><th className="font-normal">Stop</th>
            <th className="font-normal">Outcome</th><th className="font-normal">Exit</th><th className="text-right font-normal">Return</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((s) => (
            <tr key={s.id} className={s.direction === "flat" ? "text-muted" : ""}>
              <td className="py-2"><LocalTime iso={s.createdAt.toISOString()} /></td>
              <td><DirectionBadge dir={s.direction} /></td>
              <td>{s.score.toFixed(2)}</td>
              <td>{(s.confidence * 100).toFixed(0)}%</td>
              <td>{usd(s.price)}</td>
              <td>{s.stop != null ? usd(s.stop) : "—"}</td>
              <td>{s.direction === "flat" && s.outcome == null ? <span className="text-xs text-faint">—</span> : <OutcomeBadge outcome={s.outcome} />}</td>
              <td>{s.exitPrice != null ? usd(s.exitPrice) : "—"}</td>
              <td className={clsx("text-right", s.returnPct != null && tone(s.returnPct))}>{fmtSignedPct(s.returnPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TradeTable({ trades }: { trades: PaperTrade[] }) {
  if (trades.length === 0) return <p className="text-sm text-muted">The agent hasn&apos;t taken a trade yet. It sits out until a setup clears the rules, the risk limits and the review.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-faint">
          <tr>
            <th className="pb-2 font-normal">Opened</th><th className="font-normal">Closed</th><th className="font-normal">Side</th>
            <th className="font-normal">Size</th><th className="font-normal">Entry</th><th className="font-normal">Exit</th>
            <th className="font-normal">Reason</th><th className="font-normal">Fees</th><th className="text-right font-normal">P&amp;L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {trades.map((t) => (
            <tr key={t.id}>
              <td className="py-2"><LocalTime iso={t.openedAt.toISOString()} /></td>
              <td>{t.closedAt ? <LocalTime iso={t.closedAt.toISOString()} /> : <Badge tone="accent">Open</Badge>}</td>
              <td className={t.side === "long" ? "text-up" : "text-down"}>{t.side}</td>
              <td>{t.qtyBtc.toFixed(5)}</td>
              <td>{usd(t.entryPrice)}</td>
              <td>{t.exitPrice != null ? usd(t.exitPrice) : "—"}</td>
              <td className="text-muted">{t.exitReason ?? "—"}</td>
              <td className="text-muted">{usd(t.feesUsd, 2)}</td>
              <td className={clsx("text-right", t.pnlUsd != null && tone(t.pnlUsd))}>{t.pnlUsd != null ? `${t.pnlUsd >= 0 ? "+" : ""}${usd(t.pnlUsd, 2)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrackingNav({ current }: { current: "signal-history" | "prediction-tracker" | "trading-history" }) {
  const items = [
    ["signal-history", "Signal history"],
    ["prediction-tracker", "Prediction tracker"],
    ["trading-history", "Agent P&L"],
    ["agent", "Live agent →"],
  ] as const;
  return (
    <nav aria-label="Track record" className="mt-6 flex flex-wrap gap-2 text-sm">
      {items.map(([href, label]) => (
        <Link key={href} href={`/${href}`} aria-current={href === current ? "page" : undefined}
          className={clsx("rounded-full border px-3 py-1", href === current ? "border-accent/50 bg-accent-soft text-accent" : "border-line text-muted hover:text-fg")}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DataError({ what }: { what: string }) {
  return <div className="card p-8 text-muted">{what} is unavailable right now.</div>;
}
