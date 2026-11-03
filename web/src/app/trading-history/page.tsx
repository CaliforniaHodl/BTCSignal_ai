import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EquityChart } from "@/components/equity-chart";
import { LegacyArchive } from "@/components/legacy-archive";
import { DataError, fmtPct, TrackingNav, TradeTable } from "@/components/track-record";
import { Card, Disclaimer, Page, PageHeader, SourceLine, Stat } from "@/components/ui";
import { RISK } from "@/lib/agent/risk";
import { pct, usd } from "@/lib/format";
import { getTrackRecord, type TrackRecord } from "@/lib/tracking/queries";

export const metadata: Metadata = {
  title: "Agent P&L",
  description: "Every paper trade the BTCSignal.ai agent has taken, with fees, slippage and net P&L. No hypotheticals.",
  alternates: { canonical: "/trading-history" },
  openGraph: { title: "Agent P&L · BTCSignal.ai", description: "Every paper trade, with fees and net P&L.", url: "/trading-history", type: "website" },
};

export default function TradingHistoryPage() {
  return (
    <Page>
      <PageHeader eyebrow="Track record" title="Agent P&L"
        lede={<>The paper-trading agent&apos;s actual ledger: every trade it opened, why it closed, what it paid in fees ({(RISK.takerFee * 100).toFixed(2)}% taker, {(RISK.makerFee * 100).toFixed(2)}% maker, plus slippage) and what it made or lost. It&apos;s a paper account, so no real money moves.</>}>
        <TrackingNav current="trading-history" />
      </PageHeader>
      <Suspense fallback={<div className="card mt-10 h-96 animate-pulse" />}>
        <Body />
      </Suspense>
      <LegacyArchive variant="pnl" />
      <Disclaimer />
    </Page>
  );
}

async function Body() {
  await connection();
  let v: TrackRecord;
  try {
    v = await getTrackRecord({ signalLimit: 1 });
  } catch (e) {
    console.error("[trading-history]", e);
    return <div className="mt-10"><DataError what="Agent P&L" /></div>;
  }
  const t = v.tradeStats;
  if (!t || v.startingCashUsd == null) {
    return <div className="card mt-10 p-8 text-muted">The agent hasn&apos;t run yet. Its trades will appear here after its first hourly tick.</div>;
  }
  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Net realized P&L" value={`${t.netPnlUsd > 0 ? "+" : ""}${usd(t.netPnlUsd, 2)}`} tone={t.netPnlUsd > 0 ? "up" : t.netPnlUsd < 0 ? "down" : undefined}
          sub={t.netPnlPct != null ? `${pct(t.netPnlPct)} of ${usd(v.startingCashUsd)}` : undefined} />
        <Stat label="Closed trades" value={String(t.trades)} sub={v.openTrade ? "1 open now" : "flat now"} />
        <Stat label="Win rate" value={fmtPct(t.winRatePct)} sub={`${t.wins}W – ${t.losses}L`} />
        <Stat label="Profit factor" value={t.profitFactor != null ? t.profitFactor.toFixed(2) : "—"} sub="gross win / gross loss" />
        <Stat label="Avg win / loss" value={`${t.avgWinUsd != null ? usd(t.avgWinUsd) : "—"} / ${t.avgLossUsd != null ? usd(t.avgLossUsd) : "—"}`} />
        <Stat label="Fees paid" value={usd(t.feesUsd, 2)} sub="closed trades, both legs" />
      </div>
      <Card title="Equity vs. holding BTC" action={<span className="text-xs text-faint"><span className="text-accent">Agent</span> · <span className="text-[#60a5fa]">BTC hold</span></span>}>
        {v.equity.length ? <EquityChart points={v.equity} startCash={v.startingCashUsd} /> : <p className="text-sm text-muted">No equity snapshots yet.</p>}
        <SourceLine source="BTCSignal.ai agent · equity snapshots (hourly, marked to Coinbase)" />
      </Card>
      <Card title="Every trade">
        <TradeTable trades={v.trades} />
        <p className="mt-3 text-xs text-faint">P&amp;L is net of entry and exit fees and slippage. Live reasoning for each trade is in the <Link href="/agent" className="text-accent">agent decision log</Link>.</p>
      </Card>
    </div>
  );
}
