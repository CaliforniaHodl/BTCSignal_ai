import Link from "next/link";
import { Suspense } from "react";
import { MarketPulse } from "@/components/market-pulse";
import { PriceChart } from "@/components/price-chart";
import { ToolCard } from "@/components/tool-card";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { TOOLS } from "@/lib/site/registry";

export default function Home() {
  const featured = ["agent", "smart-chart", "dashboard", "liquidation-map", "trade-coach", "whales"]
    .map((s) => TOOLS.find((t) => t.slug === s)!)
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-10 sm:px-6 sm:py-14">
      <section className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-xs text-muted">
          <span className="size-1.5 rounded-full bg-accent" /> Rebuilt from scratch: every number has a source
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
          Bitcoin signals, <span className="text-accent">with receipts.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Live market, on-chain, and derivatives data from venues you can verify. Signals with a public track record.
          A paper-trading agent that publishes every trade and the reasoning behind it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/agent" className="rounded-lg bg-accent px-4 py-2.5 font-medium text-black hover:brightness-110">
            Watch the agent trade
          </Link>
          <Link href="/tools" className="rounded-lg border border-line-strong px-4 py-2.5 font-medium hover:bg-raised">
            Explore {TOOLS.length} tools
          </Link>
        </div>
      </section>

      <section aria-label="Market pulse">
        <Suspense fallback={<PulseSkeleton />}>
          <LivePulse />
        </Suspense>
      </section>

      <section aria-label="Chart">
        <PriceChart />
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Tools</h2>
          <Link href="/tools" className="text-sm text-muted hover:text-fg">All tools →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => <ToolCard key={t.slug} tool={t} />)}
        </div>
      </section>
    </div>
  );
}

async function LivePulse() {
  const snapshot = await getMarketSnapshot();
  return <MarketPulse initial={snapshot} />;
}

function PulseSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card h-[188px] animate-pulse" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <div key={i} className="card h-36 animate-pulse" />)}
      </div>
    </div>
  );
}
