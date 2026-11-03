import type { Metadata } from "next";
import Link from "next/link";
import { Card, Disclaimer, Page, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "Why BTCSignal.ai exists: Bitcoin market data with its source and age on every number, and a trading agent that publishes every decision, including the losing ones.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About · BTCSignal.ai", description: "Bitcoin data and signals with receipts.", url: "/about", type: "website" },
};

export default function AboutPage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="About" title="Bitcoin signals with receipts"
        lede="Good Bitcoin data shouldn't cost $100 a month, and signals shouldn't come from accounts that hide their losses. This site tries to be the opposite of both." />

      <div className="mt-10 space-y-6 text-fg/85">
        <p>
          Retail traders are mostly stuck choosing between expensive institutional data tools and free &quot;signals&quot; from
          anonymous accounts that never show their record. BTCSignal.ai pulls market, derivatives and on-chain data from public
          sources, labels every number with where it came from and how old it is, and runs a signal engine whose every call is
          tracked against what price actually did.
        </p>
        <p>
          The site was rebuilt in 2026. The first version published one AI-written daily call; its results were mixed and its
          methods were hard to verify, so it was retired. Its posts stay up as a <Link href="/posts" className="text-accent">labelled archive</Link>.
          The current system is a deterministic seven-factor engine feeding a <Link href="/agent" className="text-accent">paper-trading agent</Link>,
          with Claude as a risk reviewer that can only shrink or veto trades. Its backtest has not yet passed our own out-of-sample bar,
          and we say so on the <Link href="/how-it-works" className="text-accent">how it works</Link> page.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Card title="What we are">
          <ul className="space-y-1.5 text-sm text-muted">
            <li>A data and information service</li>
            <li>Rules-based: signals come from code you can read about, not opinions</li>
            <li>Public about results, including losses</li>
            <li>Paid with Lightning time passes. No subscriptions, no cards</li>
            <li>Light on personal data. An account is optional</li>
          </ul>
        </Card>
        <Card title="What we're not">
          <ul className="space-y-1.5 text-sm text-muted">
            <li>Not a broker or exchange. We never hold your funds</li>
            <li>Not a financial adviser. Nothing here is personal advice</li>
            <li>Not a get-rich scheme. Most signals say &quot;do nothing&quot;</li>
            <li>Not a subscription. Passes expire and never auto-renew</li>
            <li>Not selling your data</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6" title="Where the data comes from">
        <p className="text-sm text-muted">
          Coinbase and Kraken (spot), OKX, Deribit and Hyperliquid (funding and open interest), alternative.me (Fear &amp; Greed),
          mempool.space (fees and network) and CoinGecko (dominance). The full list and what each is used for are on{" "}
          <Link href="/how-it-works" className="text-accent">how it works</Link>.
        </p>
      </Card>

      <Card className="mt-6" title="Get in touch">
        <p className="text-sm text-muted">
          Questions, corrections, or a number that looks wrong? Reach us on X at{" "}
          <a href="https://x.com/BTCSignal_ai" className="text-accent" rel="noopener noreferrer" target="_blank">@BTCSignal_ai</a>.
        </p>
      </Card>
      <Disclaimer>Not financial advice. Trading Bitcoin is risky and you can lose some or all of your money. Past performance does not predict future results.</Disclaimer>
    </Page>
  );
}
