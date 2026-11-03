import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Page, PageHeader, SourceLine } from "@/components/ui";
import { getOwner } from "@/lib/alerts/owner";
import { listAlerts } from "@/lib/alerts/store";
import { fundingPct, usd } from "@/lib/format";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { AlertsManager } from "./alerts-manager";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Free Bitcoin price, move, funding and Fear & Greed alerts, delivered to Discord and kept in your alert history.",
};

export default function AlertsPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Free"
        title="Alerts"
        lede="Get pinged when BTC crosses a price, moves fast, funding gets crowded, or sentiment hits an extreme. Checked every 5 minutes against live data."
      >
        <p className="mt-3 text-sm text-muted">
          No account needed: alerts belong to this browser (or your account if you&apos;re signed in). <Link href="/alerts/history" className="text-accent hover:underline">View alert history →</Link>
        </p>
      </PageHeader>
      <Suspense fallback={<div className="card mt-8 h-96 animate-pulse" />}>
        <AlertsBody />
      </Suspense>
    </Page>
  );
}

async function AlertsBody() {
  await connection();
  const [snap, initial] = await Promise.all([
    getMarketSnapshot(),
    getOwner().then(listAlerts).catch((e) => {
      console.error("[alerts page]", e);
      return null;
    }),
  ]);
  const now = {
    price: snap.spot.ok ? snap.spot.value.price : null,
    funding: snap.derivatives.ok ? snap.derivatives.value.avgRate8h : null,
    fearGreed: snap.fearGreed.ok ? snap.fearGreed.value.value : null,
  };
  return (
    <div className="mt-8 space-y-6">
      <Card title="Right now">
        <dl className="num grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-faint">BTC</dt><dd className="mt-1 text-lg">{now.price != null ? usd(now.price) : "Unavailable"}</dd></div>
          <div><dt className="text-xs text-faint">Funding 8h</dt><dd className="mt-1 text-lg">{now.funding != null ? fundingPct(now.funding) : "Unavailable"}</dd></div>
          <div><dt className="text-xs text-faint">Fear &amp; Greed</dt><dd className="mt-1 text-lg">{now.fearGreed ?? "Unavailable"}</dd></div>
        </dl>
        <SourceLine source="Coinbase · OKX/Deribit/Hyperliquid · alternative.me" fetchedAt={snap.generatedAt} />
      </Card>
      {initial == null ? (
        <div className="card p-8 text-muted">Alerts are unavailable right now (database not reachable).</div>
      ) : (
        <AlertsManager initial={initial} now={now} />
      )}
    </div>
  );
}
