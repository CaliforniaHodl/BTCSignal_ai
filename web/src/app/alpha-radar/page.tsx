import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import clsx from "clsx";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocalTime } from "@/components/local-time";
import { ProGate } from "@/components/pro-gate";
import { Badge, Card, Disclaimer, ModeledTag, Page, PageHeader, SourceLine } from "@/components/ui";
import { REVIEW_MODEL } from "@/lib/agent/review";
import { THRESHOLDS, type RadarItem } from "@/lib/radar/build";
import { loadRadar } from "@/lib/radar/load";
import { getRadarSummary, summaryConfigured } from "@/lib/radar/summary";

export const metadata: Metadata = {
  title: "Alpha Radar",
  description: "What changed in the Bitcoin market in the last hour and day: funding, open interest, dominance, fees, flows and agent signals.",
};

export default function AlphaRadarPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Pro"
        title="Alpha Radar"
        lede="What changed in the last hour and day, ranked. Every item is computed from live data with fixed, published thresholds."
      />
      <div className="mt-8">
        <ProGate feature="Alpha Radar">
          <AutoRefresh seconds={90} />
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Suspense fallback={<div className="card h-96 animate-pulse" />}>
              <Feed />
            </Suspense>
            <div className="space-y-6">
              <Suspense fallback={<div className="card h-48 animate-pulse" />}>
                <Summary />
              </Suspense>
              <Method />
            </div>
          </div>
          <Disclaimer />
        </ProGate>
      </div>
    </Page>
  );
}

async function Feed() {
  await connection();
  const r = await loadRadar();
  const loud = r.items.filter((i) => i.severity > 0);
  const quiet = r.items.filter((i) => i.severity === 0);
  return (
    <div className="space-y-6">
      <Card title={<>What changed <span className="text-sm font-normal text-faint">({loud.length} notable)</span></>} action={<span className="text-xs text-faint">Updated <LocalTime iso={new Date(r.generatedAt).toISOString()} withDate={false} /></span>}>
        {loud.length ? <Items items={loud} now={r.generatedAt} /> : <p className="text-sm text-muted">Nothing crossed a threshold. Quiet market — see the baseline readings below.</p>}
      </Card>
      <Card title="Baseline (below threshold)">
        {quiet.length ? <Items items={quiet} now={r.generatedAt} /> : <p className="text-sm text-muted">—</p>}
      </Card>
      {r.unavailable.length > 0 && <p className="text-xs text-faint">Unavailable this run: {r.unavailable.join(" · ")}</p>}
    </div>
  );
}

function Items({ items, now }: { items: RadarItem[]; now: number }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => (
        <li key={i.id} className="flex gap-3 py-3">
          <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", i.severity === 2 ? "bg-accent" : i.severity === 1 ? "bg-warn" : "bg-line-strong")} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("font-medium", i.tone === "up" && "text-up", i.tone === "down" && "text-down")}>{i.title}</span>
              {i.modeled && <ModeledTag how={i.modeled} />}
              {i.severity === 2 && <Badge tone="accent">Major</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted">{i.detail}</p>
            <SourceLine source={`${i.category} · ${i.window}`} extra={i.source} fetchedAt={i.fetchedAt} now={now} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Summary() {
  await connection();
  if (!summaryConfigured()) {
    return <Card title="Claude summary"><p className="text-sm text-muted">Not configured on this deployment. The feed is fully deterministic and works without it.</p></Card>;
  }
  const s = await getRadarSummary().catch(() => null);
  if (!s) return <Card title="Claude summary"><p className="text-sm text-muted">Summary unavailable right now ({REVIEW_MODEL}). The feed is unaffected.</p></Card>;
  if (s.status === "refused") return <Card title="Claude summary"><p className="text-sm text-muted">The model declined to summarise this feed ({s.reason}).</p></Card>;
  return (
      <Card title="Claude summary">
        <p className="font-medium">{s.headline}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
        <p className="mt-3 text-sm">{s.watch}</p>
        <SourceLine source={`${s.model} · narrates the feed only`} fetchedAt={s.writtenAt} extra={`from ${s.basedOnItems} items · refreshed hourly`} />
      </Card>
  );
}

function Method() {
  const t = THRESHOLDS;
  return (
    <Card title="Thresholds">
      <ul className="space-y-1 text-xs text-muted">
        <li>Price: notable ≥{t.price1h[0]}% / 1h or ≥{t.price24h[0]}% / 24h; major ≥{t.price1h[1]}% / ≥{t.price24h[1]}%</li>
        <li>Funding: Δ24h ≥{(t.fundingDelta[0] * 100).toFixed(3)}% per 8h, any sign flip, level ≥{(t.fundingHot * 100).toFixed(2)}% or ≤{(t.fundingCold * 100).toFixed(2)}%</li>
        <li>Open interest (OKX): ≥{t.oi1h[0]}% / 1h, ≥{t.oi24h[0]}% / 24h</li>
        <li>Dominance: ≥{t.dominancePp[0]} pts / 24h</li>
        <li>Fees: next-block ≥{t.feeRatio[0]}× the 24h block median</li>
        <li>Fear &amp; Greed: ≥{t.fearGreedDelta[0]} pts / day or a 25/75 crossing</li>
        <li>Exchange netflow (Coin Metrics, daily): ≥{t.flowZ[0]}σ vs 30 days</li>
        <li>Agent: signal direction flip vs 24h ago; trades opened/closed</li>
      </ul>
    </Card>
  );
}
