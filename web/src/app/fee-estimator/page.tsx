import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { getMempool } from "@/lib/onchain/mempool";
import { FeeEstimator } from "./fee-estimator";

export const metadata: Metadata = {
  title: "Bitcoin Fee Estimator",
  description: "Live mempool.space fee rates, mempool backlog, and a transaction-size calculator that prices your transaction in sats and USD.",
};

export default function FeeEstimatorPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="On-chain"
        title="Fee Estimator"
        lede="What to pay to confirm in the next block, the next hour, or whenever. Live rates from mempool.space, priced at the site's shared Coinbase spot."
      />
      <Suspense fallback={<div className="card mt-10 h-[520px] animate-pulse" />}>
        <FeeBody />
      </Suspense>
      <Disclaimer>
        Fee rates are mempool.space&apos;s recommendations from its current mempool view; actual confirmation time depends on what other
        users broadcast after you. Size estimates assume standard single-signature scripts.
      </Disclaimer>
    </Page>
  );
}

async function FeeBody() {
  await connection();
  const [snap, mempool] = await Promise.all([getMarketSnapshot(), getMempool()]);
  return <FeeEstimator initial={{ fees: snap.fees, spot: snap.spot, mempool }} />;
}
