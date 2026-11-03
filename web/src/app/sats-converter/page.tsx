import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { getFx } from "@/lib/market/fx";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { SatsConverter } from "./sats-converter";

export const metadata: Metadata = {
  title: "Sats Converter",
  description: "Convert between bitcoin, satoshis, and USD (plus EUR, GBP, CAD, AUD, JPY, CHF) at the live Coinbase price, and track your stack in your browser.",
};

export default function SatsConverterPage() {
  return (
    <Page narrow>
      <PageHeader
        eyebrow="Calculators"
        title="Sats Converter"
        lede="1 bitcoin = 100,000,000 sats. Convert any amount at the live Coinbase price, and keep a running tally of your stack. It never leaves your browser."
      />
      <Suspense fallback={<div className="card mt-10 h-[520px] animate-pulse" />}>
        <ConverterBody />
      </Suspense>
      <Disclaimer>
        Non-USD values are the Coinbase BTC-USD spot converted with Coinbase&apos;s USD exchange rates, not a separate order book in that
        currency.
      </Disclaimer>
    </Page>
  );
}

async function ConverterBody() {
  await connection();
  const [snap, fx] = await Promise.all([getMarketSnapshot(), getFx()]);
  return <SatsConverter spot={snap.spot} fx={fx} />;
}
