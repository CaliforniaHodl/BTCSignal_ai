import type { Metadata } from "next";
import Link from "next/link";
import { ChartWorkbench } from "@/components/chart/workbench";
import { Disclaimer, Page, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Smart Chart",
  description: "Free Bitcoin chart with automatic support/resistance, EMA/SMA, Bollinger, VWAP, RSI and MACD, plus our own signal history.",
};

export default function SmartChartPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Charts · Free"
        title="Smart Chart"
        lede="BTC/USD candles with auto-detected support and resistance, the core indicators, and every long/short signal our engine has published, marked where it fired."
      />
      <div className="mt-8">
        <ChartWorkbench />
      </div>
      <section className="mt-10 grid gap-4 text-sm text-muted md:grid-cols-3">
        <div className="card p-4">
          <h3 className="font-medium text-fg">Auto S/R</h3>
          <p className="mt-1">Swing highs and lows (4 bars each side) clustered within 0.4% of each other. Only levels touched twice or more are drawn; the number after S/R is the touch count.</p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-fg">Our signals</h3>
          <p className="mt-1">Arrows mark signals from our engine at the bar they were published. The number is factor agreement (0–1), not a win probability; ✓/✗ shows whether direction was right once resolved. Full record on the <Link className="text-accent hover:underline" href="/agent">agent page</Link>.</p>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-fg">Data</h3>
          <p className="mt-1">Coinbase BTC-USD spot. 4h candles are built from 1h candles aligned to UTC. VWAP resets at 00:00 UTC and uses Coinbase volume only, so it can differ from an all-venue VWAP.</p>
        </div>
      </section>
      <Disclaimer />
    </Page>
  );
}
