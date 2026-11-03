import type { Metadata } from "next";
import { ProGate } from "@/components/pro-gate";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { PatternView } from "./pattern-view";

export const metadata: Metadata = {
  title: "Pattern Detector",
  description: "Rule-based detection of double tops/bottoms, triangles, wedges, channels, fair-value gaps and order blocks on live BTC candles.",
};

export default function PatternDetectorPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Charts · Pro"
        title="Pattern Detector"
        lede="Classical patterns and imbalances found by fixed, published rules on live Coinbase candles. Each detection lists which textbook criteria it meets, and nothing else."
      />
      <div className="mt-8">
        <ProGate feature="Pattern Detector">
          <PatternView />
        </ProGate>
      </div>
      <section className="mt-10 grid gap-4 text-sm text-muted md:grid-cols-2">
        <div className="card p-4">
          <h3 className="font-medium text-fg">How detection works</h3>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li><b>Double top/bottom:</b> two alternating swing pivots within 0.75 ATR of each other, at least 6 bars apart, with a pullback of 2+ ATR between them. Confirmed on a close through the neckline; invalidated if price clears the peaks.</li>
            <li><b>Triangles, wedges, channels, ranges:</b> least-squares lines through the last 2–4 swing highs and lows (last 120 bars). Every pivot must sit within 0.6 ATR of its line and closes must stay inside. Slopes are judged in ATR units over the pattern&apos;s length.</li>
            <li><b>Fair-value gap:</b> candle 1&apos;s high below candle 3&apos;s low (or the reverse), at least 0.1 ATR wide.</li>
            <li><b>Order block:</b> the last opposite-colour candle before a displacement that leaves an FVG and closes beyond the latest confirmed swing.</li>
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="font-medium text-fg">What the confidence means</h3>
          <p className="mt-2">
            We show which textbook criteria a detection meets (touch count, volume behaviour, prior trend, breakout direction) and
            label it textbook / partial / weak. We do <b>not</b> publish a success rate: we haven&apos;t measured one on enough
            history to state it honestly.
            &ldquo;Bullish/bearish&rdquo; is the conventional reading of the shape, not a forecast. The measured-move objective is the textbook projection of the pattern&apos;s height.
          </p>
        </div>
      </section>
      <Disclaimer />
    </Page>
  );
}
