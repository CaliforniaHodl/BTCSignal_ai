import type { Metadata } from "next";
import { ProGate } from "@/components/pro-gate";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { LiquidityView } from "./liquidity-view";

export const metadata: Metadata = {
  title: "Liquidity Hunter",
  description: "Deterministic map of BTC liquidity pools: equal highs/lows, prior day and week extremes, and unswept swing points, with distance and touch counts.",
};

export default function LiquidityHunterPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Derivatives · Pro"
        title="Liquidity Hunter"
        lede="Where stop orders conventionally rest: above equal highs and swing highs, below equal lows and swing lows, and beyond yesterday's and last week's range. Found by fixed rules, with distance, touch count and a counted base rate."
      />
      <div className="mt-8">
        <ProGate feature="Liquidity Hunter">
          <LiquidityView />
        </ProGate>
      </div>
      <section className="card mt-10 p-4 text-sm text-muted">
        <h3 className="font-medium text-fg">Method</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Swing highs/lows use 3 bars on each side. A new swing within 0.25 ATR of an untouched one joins it as an <b>equal high/low</b>; touches are counted.</li>
          <li>A pool is <b>swept</b> the first time any bar trades beyond it. &ldquo;Wicked through, closed back&rdquo; means that bar closed on the original side.</li>
          <li>Prior day/week high and low come from Coinbase daily candles; weeks start Monday 00:00 UTC.</li>
          <li>The base rate is counted on the same 300 bars shown — it describes this window, not the future, and small samples are flagged.</li>
          <li>We don&apos;t see order books or anyone&apos;s stops. These are the places stops are <i>conventionally assumed</i> to cluster, not observed orders. The legacy version&apos;s &ldquo;72% accuracy&rdquo; figure had no measurement behind it and has been removed.</li>
        </ul>
      </section>
      <Disclaimer />
    </Page>
  );
}
