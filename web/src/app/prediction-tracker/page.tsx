import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LegacyArchive } from "@/components/legacy-archive";
import { DataError, fmtPct, HitRateTable, TrackingNav } from "@/components/track-record";
import { Card, Disclaimer, Page, PageHeader, SourceLine, Stat } from "@/components/ui";
import { ENGINE_CONFIG } from "@/lib/engine/signal";
import { getTrackRecord, type TrackRecord } from "@/lib/tracking/queries";

export const metadata: Metadata = {
  title: "Prediction Tracker",
  description: "How often the engine's calls go the right way, split by direction and confidence. Computed from every resolved signal.",
  alternates: { canonical: "/prediction-tracker" },
  openGraph: { title: "Prediction Tracker · BTCSignal.ai", description: "Hit rate by direction and confidence, from every resolved signal.", url: "/prediction-tracker", type: "website" },
};

export default function PredictionTrackerPage() {
  return (
    <Page>
      <PageHeader eyebrow="Track record" title="Prediction tracker"
        lede="Does a higher confidence score actually mean the call is right more often? Here is the answer from every resolved signal, including the ones that make us look bad.">
        <TrackingNav current="prediction-tracker" />
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
    v = await getTrackRecord({ signalLimit: 1 });
  } catch (e) {
    console.error("[prediction-tracker]", e);
    return <div className="mt-10"><DataError what="The prediction tracker" /></div>;
  }
  const s = v.signals;
  const resolved = s.outcomes.target + s.outcomes.stop + s.outcomes.expired;
  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Hit rate" value={fmtPct(s.overall.hitRatePct)} sub={`${s.overall.correct} of ${s.overall.resolved} resolved`} />
        <Stat label="Target hit" value={fmtPct(resolved ? (s.outcomes.target / resolved) * 100 : null)} sub={`${s.outcomes.target} signals`} />
        <Stat label="Stopped out" value={fmtPct(resolved ? (s.outcomes.stop / resolved) * 100 : null)} sub={`${s.outcomes.stop} signals`} />
        <Stat label="Expired" value={fmtPct(resolved ? (s.outcomes.expired / resolved) * 100 : null)} sub={`${ENGINE_CONFIG.horizonHours}h horizon, ${s.outcomes.expired} signals`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By confidence">
          <HitRateTable rows={s.byConfidence} caption="Confidence" />
          <p className="mt-3 text-xs text-faint">
            A well-calibrated engine shows hit rate rising with confidence. Fewer than 20 resolved signals in a bucket is
            noise, so those buckets are marked.
          </p>
        </Card>
        <Card title="By direction">
          <HitRateTable rows={s.byDirection} caption="Direction" />
          <p className="mt-3 text-xs text-faint">
            The paper agent only goes long (spot venue), but the engine still writes short signals and they are scored the same way.
          </p>
        </Card>
      </div>
      <p className="text-sm text-muted">
        How a signal is scored: from the signal time, Coinbase hourly candles are checked against its stop
        {ENGINE_CONFIG.exit === "trail" ? " (the live config has no fixed target, so most directional signals stop out or expire)" : " and target"}.
        If neither is touched within {ENGINE_CONFIG.horizonHours}h, it expires at the last close. &quot;Right direction&quot; means
        the resulting return was positive. Per-signal list: <Link href="/signal-history" className="text-accent">signal history</Link>.
      </p>
      <SourceLine source="BTCSignal.ai engine · signals table" extra={v.since ? `since ${v.since.toISOString().slice(0, 10)}` : "no data yet"} />
    </div>
  );
}
