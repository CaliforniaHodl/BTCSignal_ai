import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { RISK } from "@/lib/agent/risk";
import { ENGINE_CONFIG } from "@/lib/engine/signal";
import { TIERS } from "@/lib/pay/tiers";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Lightning passes, recovery codes, passkey sign-in, paper trading, data sources, and what this site is and isn't.",
  alternates: { canonical: "/faq" },
  openGraph: { title: "FAQ · BTCSignal.ai", description: "Passes, recovery codes, passkeys, paper trading and data sources.", url: "/faq", type: "website" },
};

type QA = [string, React.ReactNode];

const passes = Object.values(TIERS).map((t) => `${t.label} (${t.sats.toLocaleString()} sats)`).join(", ");

const SECTIONS: [string, QA[]][] = [
  ["The service", [
    ["What is BTCSignal.ai?", <>A Bitcoin data and signals site. Live market, derivatives and on-chain data with the source and age on every number, a rules-based signal engine, and a <Link href="/agent">paper-trading agent</Link> that publishes every decision.</>],
    ["Do you trade on my behalf?", <>No. We never execute trades for you, hold your funds, or connect to your exchange accounts. The agent trades its own paper account, in public, as an experiment.</>],
    ["Is this financial advice?", <>No. Everything here is information and education. It isn&apos;t a recommendation to buy, sell or hold anything, and it isn&apos;t tailored to you. Do your own research.</>],
    ["What happened to the daily analysis posts?", <>They came from the v1 engine, which was retired in early 2026. The <Link href="/posts">posts</Link> stay up as a clearly labelled archive, free to read, with an independent re-check of their record on <Link href="/signal-history">signal history</Link>.</>],
  ]],
  ["Signals & the agent", [
    ["How are signals generated?", <>A deterministic engine scores seven factors every hour on closed candles: 4h trend, daily regime vs the 200-day EMA, 4h MACD momentum, 1h RSI, perpetual funding, Fear &amp; Greed, and 30-day momentum. It only calls long or short when the weighted score and confidence both clear fixed thresholds; most hours it says &quot;flat&quot;. Details: <Link href="/how-it-works">how it works</Link>.</>],
    ["Is the agent trading real money?", <>No. It&apos;s <strong>paper trading</strong>, with realistic fees ({(RISK.takerFee * 100).toFixed(2)}% taker) and slippage. Its backtest hasn&apos;t passed our out-of-sample gate yet, so it stays on paper until it does and then matches that result in 30+ days of paper trading.</>],
    ["What does Claude do?", <>Claude reviews trades the rules propose, after they&apos;ve passed hard risk limits. It can approve, shrink or veto. It can&apos;t add size, move stops or invent trades. If the review fails, the trade is vetoed.</>],
    ["How accurate are the signals?", <>See for yourself: every signal and its outcome is on <Link href="/signal-history">signal history</Link>, and hit rate by direction and confidence is on the <Link href="/prediction-tracker">prediction tracker</Link>. We don&apos;t quote a single accuracy number out of context.</>],
    ["What timeframe do signals cover?", <>Signals use 1h, 4h and daily data and are scored over a {ENGINE_CONFIG.horizonHours}-hour horizon. The agent holds swing trades with a trailing stop, so trades can last days.</>],
  ]],
  ["Passes & payment", [
    ["How much does it cost?", <>Pro is bought as a time pass, paid over Lightning: {passes}. Free forever: live market data, the agent and its full log, the track record pages, the archive, and the learn guides. See <Link href="/pricing">pricing</Link>.</>],
    ["Is it a subscription?", <>No. A pass runs for its time and then simply ends. Nothing auto-renews and we never hold a card. Buying again before a pass ends adds the time on top.</>],
    ["How do I pay?", <>Pick a pass and scan the Lightning invoice with any Lightning wallet. Access unlocks as soon as our node sees the payment.</>],
    ["Do I need an account?", <>No. After paying you get a <strong>recovery code</strong> (it looks like BTCS-XXXX-XXXX-XXXX-XXXX). That browser has access straight away. Save the code: it&apos;s the only way to restore the pass on another device or after clearing cookies, and we can&apos;t show it again because we only store a hash of it.</>],
    ["I lost access. How do I get it back?", <>Enter your recovery code on the <Link href="/recover">restore page</Link>. That browser gets access, and any other browser using the same pass is signed out. Without the code (and without an account), we can&apos;t recover a pass, because we don&apos;t know who bought it.</>],
    ["Can I sign in instead?", <>Yes, optionally, with a <strong>passkey</strong> (Face ID, Touch ID, Windows Hello or a security key). Passes bought while signed in are tied to your account, so you don&apos;t need a code. No password is ever created.</>],
    ["Can I get a refund?", <>Lightning payments are final and access is delivered immediately, so passes aren&apos;t normally refundable. If something went wrong on our side, contact us. See the <Link href="/terms-of-use">terms</Link>.</>],
  ]],
  ["Data & privacy", [
    ["Where does the data come from?", <>Coinbase and Kraken (spot), OKX, Deribit and Hyperliquid (funding, open interest), alternative.me (Fear &amp; Greed), mempool.space (fees, network) and CoinGecko (dominance). All requests go from our servers, never from your browser.</>],
    ["What if a data source is down?", <>The affected number shows &quot;Unavailable&quot; with the source name. We never fill a gap with an estimate or an old value presented as new.</>],
    ["What do you store about me?", <>Very little. See the <Link href="/privacy-policy">privacy policy</Link> for the full list.</>],
  ]],
  ["Risk", [
    ["What are the risks of trading Bitcoin?", <>Prices are volatile, markets run 24/7, leverage magnifies losses, and past performance doesn&apos;t predict the future. Never trade money you can&apos;t afford to lose.</>],
    ["Who is responsible for my trading losses?", <>You are. We provide information only and aren&apos;t liable for trading decisions you make with it.</>],
    ["How do I contact you?", <>On X at <a href="https://x.com/BTCSignal_ai" rel="noopener noreferrer" target="_blank">@BTCSignal_ai</a>.</>],
  ]],
];

export default function FaqPage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="FAQ" title="Frequently asked questions" />
      <div className="mt-10 space-y-10">
        {SECTIONS.map(([title, qas]) => (
          <section key={title} aria-labelledby={`faq-${title}`}>
            <h2 id={`faq-${title}`} className="text-sm uppercase tracking-wider text-faint">{title}</h2>
            <div className="mt-3 divide-y divide-line rounded-xl border border-line bg-raised">
              {qas.map(([q, a]) => (
                <details key={q} className="group px-4 py-3 [&_a]:text-accent">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-center justify-between gap-4">{q}<span aria-hidden className="text-faint transition group-open:rotate-45">+</span></span>
                  </summary>
                  <div className="mt-2 text-sm leading-relaxed text-muted">{a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Disclaimer />
    </Page>
  );
}
