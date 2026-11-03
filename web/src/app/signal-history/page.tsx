import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LegacyArchive } from "@/components/legacy-archive";
import { DataError, fmtPct, HitRateTable, SignalTable, TrackingNav } from "@/components/track-record";
import { Card, Disclaimer, Page, PageHeader, SourceLine, Stat } from "@/components/ui";
import { ENGINE_CONFIG, ENGINE_VERSION } from "@/lib/engine/signal";
import { getTrackRecord, type TrackRecord } from "@/lib/tracking/queries";

const LIMIT = 500;

export const metadata: Metadata = {
  title: "Signal History",
  description: "Every signal the BTCSignal.ai engine has emitted, with what price actually did afterwards. Plus the retired v1 archive.",
  alternates: { canonical: "/signal-history" },
  openGraph: { title: "Signal History · BTCSignal.ai", description: "Every engine signal and its outcome — wins, losses, and expiries.", url: "/signal-history", type: "website" },
};

export default function SignalHistoryPage() {
  return (
    <Page>
      <PageHeader eyebrow="Track record" title="Signal history"
        lede={<>Every signal the engine (v{ENGINE_VERSION}) has written, hourly, and how each one resolved. Directional signals are scored against their stop and a {ENGINE_CONFIG.horizonHours}-hour horizon using Coinbase hourly candles. Nothing is removed.</>}>
        <TrackingNav current="signal-history" />
      </PageHeader>
      <Suspense fallback={<div className="card mt-10 h-96 animate-pulse" />}>
        <Body />
      </Suspense>
      <LegacyArchive />
      <Disclaimer />
    </Page>
  );
}

async function Body() {
  await connection();
  let v: TrackRecord;
  try {
    v = await getTrackRecord({ signalLimit: LIMIT });
  } catch (e) {
    console.error("[signal-history]", e);
    return <div className="mt-10"><DataError what="Signal history" /></div>;
  }
  const s = v.signals;
  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Signals written" value={s.total.toLocaleString()} sub={`${s.flat.toLocaleString()} flat (no trade)`} />
        <Stat label="Directional" value={s.directional.toLocaleString()} sub={`${s.pending} still open`} />
        <Stat label="Hit rate" value={fmtPct(s.overall.hitRatePct)} sub={`${s.overall.resolved} resolved`} />
        <Stat label="Outcomes" value={`${s.outcomes.target} / ${s.outcomes.stop} / ${s.outcomes.expired}`} sub="target / stop / expired" />
      </div>
      <Card title="Hit rate by direction" action={<Link href="/prediction-tracker" className="text-sm text-accent">By confidence →</Link>}>
        <HitRateTable rows={s.byDirection} caption="Direction" />
        <p className="mt-3 text-xs text-faint">&quot;Right direction&quot; = the signal closed with a positive return (target, or expiry in profit). Returns are per-signal price moves, before fees.</p>
      </Card>
      <Card title={`Every signal${v.recent.length >= LIMIT ? ` (latest ${LIMIT})` : ""}`}>
        <SignalTable rows={v.recent} />
        <SourceLine source="BTCSignal.ai engine · signals table" extra={v.since ? `since ${v.since.toISOString().slice(0, 10)}` : "no data yet"} />
      </Card>
    </div>
  );
}
