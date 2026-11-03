import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import research from "../../../research/latest.json";
import { Badge, Card, Disclaimer, Page, PageHeader } from "@/components/ui";
import { RISK } from "@/lib/agent/risk";
import { REVIEW_MODEL } from "@/lib/agent/review";
import { GATE } from "@/lib/backtest/sim";
import { ENGINE_CONFIG, ENGINE_VERSION, FACTOR_NAMES, type FactorName } from "@/lib/engine/signal";

export const metadata: Metadata = {
  title: "How it works",
  description: "The data layer, the seven-factor signal engine, hard risk limits, Claude's review, paper trading, and the backtest gate it hasn't passed yet.",
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: "How it works · BTCSignal.ai", description: "Data → seven factors → risk limits → Claude review → paper trade. And the gate it hasn't passed.", url: "/how-it-works", type: "article" },
};

type M = { returnPct: number; holdPct: number; trades: number; winRatePct: number; profitFactor: number | null; maxDrawdownPct: number; sharpe: number };
const R = research as unknown as {
  generatedAt: string; engineVersion: string; period: { from: string; to: string; days: number };
  baseline: M; intradayV2: M; walkForward: { trainDays: number; testDays: number; folds: unknown[]; oos: M }; gate: { pass: boolean; failures: string[] };
};
const f = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(d));

/** What each factor measures, in plain words. Weights come from ENGINE_CONFIG. */
const FACTOR_COPY: Record<FactorName, [string, string]> = {
  trend_4h: ["4h trend", "EMA 20 vs EMA 50 on 4-hour candles. A 1% gap saturates the factor."],
  trend_1d: ["Daily regime", "Daily close vs the 200-day EMA. 10% above/below saturates."],
  momentum_4h: ["4h momentum", "MACD histogram on 4-hour candles, measured in half-ATRs so it scales with volatility."],
  rsi_1h: ["1h RSI", "Momentum in the middle of the range, contrarian above 75 and below 25."],
  funding: ["Perp funding", "Contrarian. 0.01%/8h is neutral; crowded longs paying more push the score down."],
  fear_greed: ["Fear & Greed", "Contrarian. Extreme greed counts against longs, extreme fear for them."],
  momentum_1d: ["30-day momentum", "30-day rate of change on daily closes. 15% saturates."],
};

const SOURCES: [string, string, string][] = [
  ["Coinbase", "Spot price, 1h/1d candles (4h aggregated from 1h)", "Signals, charts, paper fills"],
  ["Kraken", "Spot price", "Cross-check against Coinbase"],
  ["OKX · Deribit · Hyperliquid", "Perpetual funding and open interest", "Funding factor (OI-weighted)"],
  ["alternative.me", "Fear & Greed Index", "Sentiment factor"],
  ["mempool.space", "Fees, hashrate, difficulty, blocks", "On-chain pages"],
  ["CoinGecko", "BTC dominance, total market cap", "Market pages"],
];

export default function HowItWorksPage() {
  const w = ENGINE_CONFIG.weights;
  const totalW = FACTOR_NAMES.reduce((s, n) => s + w[n], 0);
  const oos = R.walkForward.oos;
  return (
    <Page>
      <PageHeader eyebrow="How it works" title="Rules propose. Claude reviews. Hard limits decide."
        lede="This is the whole system, end to end, including the part where it hasn't yet earned real money. Numbers on this page are read from the live config and the latest research run, not typed in by hand." />

      <ol className="mt-12 space-y-6">
        <Step n={1} title="Data layer">
          <p>
            One server-side snapshot feeds every page, the engine and the agent, so the whole site agrees on one price. Every
            number shows its source and age. If a source fails, the page says &quot;Unavailable&quot;; nothing is filled in with a
            guess. Your browser never calls these APIs directly.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">Source</th><th className="font-normal">What</th><th className="font-normal">Used for</th></tr></thead>
              <tbody className="divide-y divide-line">
                {SOURCES.map(([s, what, use]) => <tr key={s}><td className="py-2 pr-4">{s}</td><td className="pr-4 text-muted">{what}</td><td className="text-muted">{use}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Step>

        <Step n={2} title={`Seven-factor engine (v${ENGINE_VERSION})`}>
          <p>
            Every hour, on closed candles only, so a live run and a backtest at the same moment see identical data, the
            engine scores seven factors from −1 (bearish) to +1 (bullish) and takes a weighted average. Confidence is the
            size of that score, discounted when factors disagree and when inputs are missing. It goes long or short only when
            the score clears ±{ENGINE_CONFIG.enterScore} <em>and</em> confidence clears {Math.round(ENGINE_CONFIG.minConfidence * 100)}%. Otherwise the
            signal is &quot;flat&quot;, which is the most common outcome. The engine is deterministic: same inputs, same signal.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {FACTOR_NAMES.map((n) => (
              <li key={n} className="rounded-lg border border-line bg-sunken p-3">
                <div className="flex items-center justify-between text-sm"><span className="font-medium">{FACTOR_COPY[n][0]}</span><span className="num text-xs text-faint">{((w[n] / totalW) * 100).toFixed(0)}% weight</span></div>
                <p className="mt-1 text-xs text-muted">{FACTOR_COPY[n][1]}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Exits: a {ENGINE_CONFIG.stopAtr}× {ENGINE_CONFIG.stopBasis} ATR stop{ENGINE_CONFIG.exit === "trail" ? " that trails the best close, with no fixed profit target" : `, target ${ENGINE_CONFIG.targetAtr}× ATR`}.
            Signals are scored against a {ENGINE_CONFIG.horizonHours}-hour horizon in the <Link href="/signal-history" className="text-accent">signal history</Link>.
          </p>
        </Step>

        <Step n={3} title="Hard risk limits">
          <p>Pure code, checked before anything else gets a say. Nothing downstream can loosen them.</p>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-muted sm:grid-cols-2">
            <li>Risk {RISK.riskPerTradePct}% of equity per trade</li>
            <li>Max position {RISK.maxPositionPct}% of equity, no leverage</li>
            <li>At most {RISK.maxEntriesPerDay} entries per UTC day</li>
            <li>No new trades after −{RISK.dailyLossStopPct}% on the day</li>
            <li>{RISK.cooldownHoursAfterClose}h cooldown after closing a trade</li>
            <li>Reward:risk ≥ 1.5 when there is a fixed target</li>
            <li>Auto-halt at {RISK.maxDrawdownHaltPct}% drawdown from peak</li>
            <li>{RISK.allowShort ? "Long and short" : "Long-only: the planned spot venue can't short"}</li>
          </ul>
        </Step>

        <Step n={4} title="Claude review">
          <p>
            A trade that passes the rules and limits goes to Claude ({REVIEW_MODEL}) with the market context. Claude acts as a
            skeptical risk reviewer and can <strong>approve</strong>, <strong>shrink</strong> or <strong>veto</strong> the trade. It
            cannot add size, move stops, flip direction, or open a trade the rules didn&apos;t propose. If the review fails for any
            reason, that counts as a veto. Exits never wait on Claude. Its reasoning is published in the agent&apos;s decision log.
          </p>
        </Step>

        <Step n={5} title="Paper trading, in public">
          <p>
            The agent trades a <strong>paper account</strong>. Fills include {(RISK.takerFee * 100).toFixed(2)}% taker /
            {" "}{(RISK.makerFee * 100).toFixed(2)}% maker fees (Coinbase&apos;s entry tier) and {(RISK.slippage * 100).toFixed(2)}% slippage on market
            orders. Every hourly decision, including &quot;sat out&quot;, is logged with its reason on{" "}
            <Link href="/agent" className="text-accent">/agent</Link>; every trade and its net P&amp;L is on{" "}
            <Link href="/trading-history" className="text-accent">Agent P&amp;L</Link>.
          </p>
        </Step>

        <Step n={6} title="Research & the gate it hasn't passed">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={R.gate.pass ? "up" : "down"}>Gate {R.gate.pass ? "passed" : "not passed"}</Badge>
            <span className="text-xs text-faint">research run {R.generatedAt.slice(0, 10)} · {R.period.from} → {R.period.to}</span>
          </div>
          <p className="mt-3">
            Before any real money, the engine has to pass an out-of-sample walk-forward test: tune on {R.walkForward.trainDays} days,
            trade the next unseen {R.walkForward.testDays} days, roll forward ({R.walkForward.folds.length} folds). The bar is profit
            factor ≥ {GATE.minProfitFactor}, Sharpe ≥ {GATE.minSharpe}, win rate ≥ {GATE.minWinRatePct}%, drawdown ≤ {GATE.maxDrawdownPct}%
            and ≥ {GATE.minTrades} trades, followed by 30+ days of paper trading that matches the backtest.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Result label="Live config, in-sample" m={R.baseline} note="Picked after seeing this history, so optimistic by construction" />
            <Result label="Walk-forward, out-of-sample" m={oos} note="The honest number" highlight />
            <Result label="Original v2.0 intraday" m={R.intradayV2} note="Retired: fees ate it" />
          </div>
          {!R.gate.pass && (
            <p className="mt-4 text-sm text-muted">
              It failed on: {R.gate.failures.join("; ")}. Buy-and-hold BTC returned {f(R.baseline.holdPct, 1)}% over the same period.
              That&apos;s why the agent is on paper. Paper trading is its real test.
            </p>
          )}
        </Step>
      </ol>

      <Card className="mt-10" title="What we don't do">
        <ul className="space-y-1.5 text-sm text-muted">
          <li>We don&apos;t trade for you, hold your funds, or connect to your exchange.</li>
          <li>We don&apos;t give personal financial advice. Signals are information, and the agent is a public experiment.</li>
          <li>We don&apos;t cherry-pick. Losing signals and losing trades stay on the record.</li>
        </ul>
      </Card>

      <Card className="mt-6" title="What happened to the old daily posts?">
        <p className="text-sm text-muted">
          The previous v1 engine published one call a day from Nov 2025 to Jan 2026. It was retired, and the current system shares none
          of its rules. Its posts stay up as a <Link href="/posts" className="text-accent">clearly labelled archive</Link>, along with an independent re-check of its record.
        </p>
      </Card>
      <Disclaimer />
    </Page>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="card grid gap-4 p-5 sm:grid-cols-[48px_1fr] sm:p-6">
      <div className="num flex size-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent" aria-hidden>{n}</div>
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-fg/85">{children}</div>
      </div>
    </li>
  );
}

function Result({ label, m, note, highlight }: { label: string; m: M; note: string; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-3", highlight ? "border-accent/40" : "border-line")}>
      <div className="text-xs text-faint">{label}</div>
      <div className={clsx("num mt-1 text-lg font-semibold", m.returnPct >= 0 ? "text-up" : "text-down")}>{m.returnPct >= 0 ? "+" : ""}{f(m.returnPct, 1)}%</div>
      <div className="num mt-1 text-xs text-muted">{m.trades} trades · PF {f(m.profitFactor)} · win {f(m.winRatePct, 0)}% · DD {f(m.maxDrawdownPct, 1)}%</div>
      <div className="mt-1 text-xs text-faint">{note}</div>
    </div>
  );
}
