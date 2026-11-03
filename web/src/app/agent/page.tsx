import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import clsx from "clsx";
import { EquityChart } from "@/components/equity-chart";
import { LocalTime } from "@/components/local-time";
import { getAgentView, type AgentView } from "@/lib/agent/queries";
import { RISK } from "@/lib/agent/risk";
import { ENGINE_CONFIG, ENGINE_VERSION } from "@/lib/engine/signal";
import { REVIEW_MODEL, type Review } from "@/lib/agent/review";
import { pct, tone, usd } from "@/lib/format";

export const metadata: Metadata = {
  title: "Trading Agent",
  description: "A paper-trading Bitcoin agent. Rules propose, Claude reviews, hard limits decide. Every decision is public.",
};

export default function AgentPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-muted">Paper account</span>
          <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-muted">Runs hourly</span>
          <span className="rounded-full border border-line bg-raised px-2.5 py-1 text-muted">Engine v{ENGINE_VERSION}</span>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">The trading agent</h1>
        <p className="mt-4 text-lg text-muted">
          Rules propose. Claude reviews. Hard limits decide. Every hour the agent reads the market, scores six
          factors, and either sits out or proposes a trade, which Claude can approve, shrink, or veto. Nothing
          here is hidden: every decision, every reason, every loss.
        </p>
      </div>
      <Suspense fallback={<div className="card mt-10 h-96 animate-pulse" />}>
        <AgentBody />
      </Suspense>
    </div>
  );
}

async function AgentBody() {
  await connection();
  let v: AgentView;
  try {
    v = await getAgentView();
  } catch (e) {
    console.error("[agent page]", e);
    return <div className="card mt-10 p-8 text-muted">Agent data is unavailable right now.</div>;
  }
  if (!v.account) {
    return <div className="card mt-10 p-8 text-muted">The agent hasn&apos;t run yet. Its first hourly tick will appear here.</div>;
  }
  const { stats, account, latestSignal, openTrade } = v;
  const reviewMode = process.env.AGENT_REVIEW === "rules" || !process.env.ANTHROPIC_API_KEY ? "Rules only (Claude review not configured)" : `Claude review · ${REVIEW_MODEL}`;

  return (
    <div className="mt-10 space-y-6">
      {/* Status bar */}
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm">
        <span className="flex items-center gap-2">
          <span className={clsx("live-dot size-2 rounded-full", account.enabled ? "bg-up" : "bg-down")} />
          {account.enabled ? "Active" : `Halted — ${account.haltedReason ?? "kill switch on"}`}
        </span>
        <span className="text-muted">{reviewMode}</span>
        {account.lastTickAt && (
          <span className="text-muted">Last run <LocalTime iso={account.lastTickAt.toISOString()} /></span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Equity" value={usd(stats.equityUsd, 2)} sub={`from ${usd(account.startingCashUsd)}`} />
        <Stat label="Return" value={pct(stats.returnPct)} cls={tone(stats.returnPct)} sub={`BTC ${pct(stats.btcReturnPct)}`} />
        <Stat label="Trades" value={String(stats.trades)} sub={stats.winRatePct != null ? `${stats.winRatePct.toFixed(0)}% win` : "none closed yet"} />
        <Stat label="Profit factor" value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "—"} sub="gross win / loss" />
        <Stat label="Max drawdown" value={`${stats.maxDrawdownPct.toFixed(2)}%`} sub={`halts at ${RISK.maxDrawdownHaltPct}%`} />
        <Stat label="Signal hit rate" value={stats.signalHitRatePct != null ? `${stats.signalHitRatePct.toFixed(0)}%` : "—"} sub={`${stats.signalsResolved} resolved`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Current read */}
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Current read</h2>
            {latestSignal && <span className="text-xs text-faint"><LocalTime iso={latestSignal.createdAt.toISOString()} /></span>}
          </div>
          {latestSignal ? (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-6">
                <DirBadge dir={latestSignal.direction} />
                <Meter label="Score" value={latestSignal.score} min={-1} max={1} fmt={(x) => x.toFixed(2)} />
                <Meter label="Confidence" value={latestSignal.confidence} min={0} max={1} fmt={(x) => `${(x * 100).toFixed(0)}%`} />
              </div>
              <p className="mt-4 text-sm text-muted">{latestSignal.detail.reason}</p>
              <ul className="mt-5 space-y-3">
                {latestSignal.detail.factors.map((raw) => ({ ...raw, value: raw.value != null && Math.abs(raw.value) < 0.005 ? 0 : raw.value })).map((f) => (
                  <li key={f.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[220px_1fr_70px]">
                    <div className="text-sm">
                      {f.label} <span className="text-xs text-faint">×{f.weight}</span>
                    </div>
                    <div className="order-3 col-span-2 sm:order-none sm:col-span-1"><Diverging value={f.value} /></div>
                    <div className={clsx("num text-right text-sm", f.value == null ? "text-faint" : tone(f.value))}>
                      {f.value == null ? "n/a" : f.value.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-xs text-faint sm:col-span-3">{f.detail}</div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-muted">No signal yet.</p>
          )}
        </div>

        {/* Position */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-medium">Position</h2>
          {openTrade ? (
            <dl className="num mt-4 grid grid-cols-2 gap-4 text-sm">
              <KV k="Side" v={<span className={openTrade.side === "long" ? "text-up" : "text-down"}>{openTrade.side.toUpperCase()}</span>} />
              <KV k="Size" v={`${openTrade.qtyBtc.toFixed(5)} BTC`} />
              <KV k="Entry" v={usd(openTrade.entryPrice)} />
              <KV k="Opened" v={<LocalTime iso={openTrade.openedAt.toISOString()} />} />
              <KV k="Stop" v={<span className="text-down">{usd(openTrade.stop)}</span>} />
              <KV k="Target" v={<span className="text-up">{usd(openTrade.target)}</span>} />
            </dl>
          ) : (
            <p className="mt-4 text-muted">Flat. Waiting for a setup that clears the rules and the review.</p>
          )}
          <h3 className="mt-8 text-sm font-medium">Hard limits</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>Risk {RISK.riskPerTradePct}% of equity per trade, max {RISK.maxPositionPct}% notional, no leverage</li>
            <li>Max {RISK.maxEntriesPerDay} entries/day · stop new trades at −{RISK.dailyLossStopPct}% on the day</li>
            <li>{RISK.cooldownHoursAfterClose}h cooldown after a close · reward:risk ≥ 1.5</li>
            <li>Auto-halt at {RISK.maxDrawdownHaltPct}% drawdown · {RISK.allowShort ? "long & short" : "long-only (spot)"}</li>
            <li>Stops {ENGINE_CONFIG.stopAtr}× ATR, targets {ENGINE_CONFIG.targetAtr}× ATR · fees {(RISK.feeRate * 100).toFixed(2)}% + {(RISK.slippage * 100).toFixed(2)}% slippage per fill</li>
            <li>Claude can approve, shrink, or veto — never enlarge. Exits never wait on Claude.</li>
          </ul>
        </div>
      </div>

      {/* Equity */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Equity vs. holding BTC</h2>
          <span className="text-xs text-faint"><span className="text-accent">Agent</span> · <span className="text-[#60a5fa]">BTC hold</span></span>
        </div>
        <EquityChart points={v.equity} startCash={account.startingCashUsd} />
      </div>

      {/* Decision log */}
      <div className="card p-5">
        <h2 className="font-medium">Decision log</h2>
        <ol className="mt-4 divide-y divide-line">
          {v.decisions.map((d) => {
            const review = d.review as Review | null;
            return (
              <li key={d.id} className="grid gap-2 py-4 sm:grid-cols-[150px_110px_1fr]">
                <span className="text-xs text-faint"><LocalTime iso={d.createdAt.toISOString()} /></span>
                <span><ActionBadge action={d.action} /></span>
                <div className="text-sm">
                  <p className="text-fg/90">{d.summary}</p>
                  {review?.mode === "claude" && review.keyRisks.length > 0 && (
                    <p className="mt-1.5 text-xs text-faint">Risks flagged: {review.keyRisks.join(" · ")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Trades */}
      <div className="card overflow-x-auto p-5">
        <h2 className="font-medium">Closed trades</h2>
        {v.closedTrades.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No closed trades yet.</p>
        ) : (
          <table className="num mt-4 w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-faint">
              <tr><th className="pb-2 font-normal">Opened</th><th className="font-normal">Side</th><th className="font-normal">Entry</th><th className="font-normal">Exit</th><th className="font-normal">Reason</th><th className="text-right font-normal">P&amp;L</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {v.closedTrades.map((t) => (
                <tr key={t.id}>
                  <td className="py-2"><LocalTime iso={t.openedAt.toISOString()} /></td>
                  <td className={t.side === "long" ? "text-up" : "text-down"}>{t.side}</td>
                  <td>{usd(t.entryPrice)}</td>
                  <td>{t.exitPrice ? usd(t.exitPrice) : "—"}</td>
                  <td className="text-muted">{t.exitReason}</td>
                  <td className={clsx("text-right", tone(t.pnlUsd ?? 0))}>{(t.pnlUsd ?? 0) >= 0 ? "+" : ""}{usd(t.pnlUsd ?? 0, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-faint">{label}</div>
      <div className={clsx("num mt-2 text-xl font-semibold", cls)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function DirBadge({ dir }: { dir: string }) {
  const cls = dir === "long" ? "bg-up-soft text-up" : dir === "short" ? "bg-down-soft text-down" : "bg-sunken text-muted";
  return <span className={clsx("num rounded-lg px-3 py-1.5 text-lg font-semibold", cls)}>{dir.toUpperCase()}</span>;
}

function Meter({ label, value, min, max, fmt }: { label: string; value: number; min: number; max: number; fmt: (x: number) => string }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="w-40">
      <div className="flex justify-between text-xs"><span className="text-faint">{label}</span><span className="num">{fmt(value)}</span></div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-sunken">
        <div className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${Math.min(100, Math.max(0, p))}%` }} />
      </div>
    </div>
  );
}

function Diverging({ value }: { value: number | null }) {
  if (value == null) return <div className="h-2 rounded-full bg-sunken" />;
  const w = Math.abs(value) * 50;
  return (
    <div className="relative h-2 rounded-full bg-sunken">
      <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
      <div className={clsx("absolute inset-y-0 rounded-full", value >= 0 ? "bg-up" : "bg-down")} style={value >= 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><dt className="text-xs text-faint">{k}</dt><dd className="mt-0.5">{v}</dd></div>;
}

const ACTION: Record<string, [string, string]> = {
  open_long: ["Opened long", "bg-up-soft text-up"],
  open_short: ["Opened short", "bg-down-soft text-down"],
  close: ["Closed", "bg-accent-soft text-accent"],
  hold: ["Holding", "bg-sunken text-fg"],
  skip: ["Sat out", "bg-sunken text-muted"],
  veto: ["Claude veto", "bg-down-soft text-down"],
  blocked: ["Risk block", "bg-warn/10 text-warn"],
  error: ["Data error", "bg-down-soft text-down"],
};
function ActionBadge({ action }: { action: string }) {
  const [label, cls] = ACTION[action] ?? [action, "bg-sunken text-muted"];
  return <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", cls)}>{label}</span>;
}
