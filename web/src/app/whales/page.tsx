import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Disclaimer, Page, PageHeader, SourceLine, Unavailable } from "@/components/ui";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { getWhales, WHALE_BLOCKS } from "@/lib/onchain/whales";
import { WhaleList } from "./whale-list";

export const metadata: Metadata = {
  title: "Whale Watch",
  description: "Large Bitcoin transactions from the latest blocks and newest mempool arrivals, straight from mempool.space, valued at the live Coinbase price.",
};

export default function WhalesPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="On-chain"
        title="Whale Watch"
        lede={`Every transaction moving 10 BTC or more in the last ${WHALE_BLOCKS} blocks, plus large ones just arriving in the mempool. Each links to mempool.space so you can check it yourself.`}
      />
      <Suspense fallback={<div className="card mt-10 h-[600px] animate-pulse" />}>
        <WhaleBody />
      </Suspense>
      <Disclaimer>
        Size is the transaction&apos;s total output, which includes change sent back to the sender, so it overstates how much actually changed
        hands. We don&apos;t label exchanges or owners: address attribution needs a maintained, documented dataset we don&apos;t have, and
        guessing would mislead.
      </Disclaimer>
    </Page>
  );
}

async function WhaleBody() {
  await connection();
  const [whales, snap] = await Promise.all([getWhales(), getMarketSnapshot()]);
  if (!whales.ok) {
    return (
      <Card className="mt-10">
        <Unavailable source={whales.source} error={whales.error} />
        <SourceLine source={whales.source} fetchedAt={whales.fetchedAt} />
      </Card>
    );
  }
  const w = whales.value;
  const missing = w.blocks.filter((b) => !b.scanned).map((b) => b.height);
  return (
    <div className="mt-10">
      <WhaleList
        txs={w.txs}
        price={snap.spot.ok ? snap.spot.value.price : null}
        fetchedAt={whales.fetchedAt}
        priceFetchedAt={snap.spot.fetchedAt}
        scope={`blocks ${w.blocks.at(-1)?.height.toLocaleString()}–${w.blocks[0]?.height.toLocaleString()} · newest ${w.mempoolScanned} mempool txs`}
        missing={missing}
      />
    </div>
  );
}
