import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Disclaimer, Page, PageHeader, SourceLine, Unavailable } from "@/components/ui";
import { getDailyCloses } from "@/lib/market/history";
import { DcaCalculator } from "./dca-calculator";

export const metadata: Metadata = {
  title: "DCA Calculator",
  description: "What steady Bitcoin stacking would have returned versus a lump sum, using every real Coinbase daily close since 2015.",
};

export default function DcaPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Calculators"
        title="DCA Calculator"
        lede="Pick an amount, a schedule, and a date range. We replay it against real Coinbase daily closes and compare it with investing the same total on day one."
      />
      <Suspense fallback={<div className="card mt-10 h-[640px] animate-pulse" />}>
        <DcaBody />
      </Suspense>
      <Disclaimer>
        Purchases fill at that day&apos;s Coinbase BTC-USD close (UTC). Real fills, spreads, and fees differ. Past returns say nothing about
        future returns. Not financial advice.
      </Disclaimer>
    </Page>
  );
}

async function DcaBody() {
  await connection();
  const h = await getDailyCloses();
  if (!h.ok) {
    return (
      <Card className="mt-10">
        <Unavailable source={h.source} error={h.error} />
        <SourceLine source={h.source} fetchedAt={h.fetchedAt} />
      </Card>
    );
  }
  return <DcaCalculator prices={h.value} source={h.source} fetchedAt={h.fetchedAt} />;
}
