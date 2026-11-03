import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, Disclaimer, ModeledTag, Page, PageHeader, SourceLine, Stat, Unavailable } from "@/components/ui";
import { SeriesChart } from "@/components/series-chart";
import { getHolders } from "@/lib/onchain/holders";
import { changeOver, rollingNetOutflow } from "@/lib/onchain/holders-parse";

export const metadata: Metadata = {
  title: "HODL Waves",
  description: "Why we don't show HODL waves (no free coin-age data), and the real holder-behaviour data we can show instead: exchange balances, exchange flows, and MVRV.",
};

const EXCHANGE_HOW =
  "Coin Metrics attributes addresses to exchanges with its own clustering heuristics. These are Coin Metrics' estimates, not balances the exchanges report.";

export default function HodlWavesPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="On-chain"
        title="HODL Waves"
        lede="HODL waves split the supply by how long coins have sat unmoved. We'd love to show them — but we won't fake them."
      />
      <Card className="mt-8 max-w-3xl border-warn/40">
        <h2 className="font-medium">Why there are no age bands on this page</h2>
        <div className="mt-2 space-y-2 text-sm text-muted">
          <p>
            Real HODL waves need the age of every unspent output (UTXO), recomputed daily. That comes from a full-node indexer or a paid feed
            (Glassnode, Coin Metrics Pro). The free Coin Metrics Community API refuses every coin-age metric (<code className="num">SplyAct1yr</code>,{" "}
            <code className="num">SplyAct180d</code>, … all return &ldquo;not available&rdquo;), and none of our other sources publish it.
          </p>
          <p>
            The old version of this page drew bands from hardcoded percentages and a sine wave. That&apos;s gone. Below is the closest
            real holder-behaviour data we can source for free: how much BTC sits on exchanges, which way it&apos;s moving, and MVRV.
          </p>
        </div>
      </Card>
      <Suspense fallback={<div className="card mt-6 h-[640px] animate-pulse" />}>
        <HoldersBody />
      </Suspense>
      <Disclaimer>
        Data: Coin Metrics Community API. Recent days are often &ldquo;flash&rdquo; (preliminary) and get revised. Not financial advice.
      </Disclaimer>
    </Page>
  );
}

const btc = (n: number) => `${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)} BTC`;
const signedBtc = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })} BTC`;

async function HoldersBody() {
  await connection();
  const d = await getHolders();
  if (!d.ok) {
    return (
      <Card className="mt-6">
        <Unavailable source={d.source} error={d.error} />
        <SourceLine source={d.source} fetchedAt={d.fetchedAt} />
      </Card>
    );
  }
  const pts = d.value;
  // latest row with exchange data (very recent days can lag)
  const exPts = pts.filter((p) => p.exchangeSupply != null);
  const last = exPts.at(-1);
  const net30 = rollingNetOutflow(pts, 30);
  const lastNet = [...net30].reverse().find((v) => v != null) ?? null;
  const mvrvLast = [...pts].reverse().find((p) => p.mvrv != null);
  const ch90 = changeOver(exPts, 90, (p) => p.exchangeSupply);
  const t = pts.map((p) => p.time);
  const asOf = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="On exchanges"
          value={<>{last ? btc(last.exchangeSupply!) : "—"}<ModeledTag how={EXCHANGE_HOW} /></>}
          sub={last ? `${last.exchangeSharePct!.toFixed(2)}% of supply · ${asOf(last.time)}${last.flash ? " · flash" : ""}` : undefined}
        />
        <Stat label="90-day change" value={ch90 != null ? signedBtc(ch90) : "—"} tone={ch90 == null ? "muted" : ch90 < 0 ? "up" : "down"} sub="exchange balance" />
        <Stat
          label="30-day net flow"
          value={lastNet != null ? signedBtc(lastNet) : "—"}
          tone={lastNet == null ? "muted" : lastNet > 0 ? "up" : "down"}
          sub={lastNet != null ? (lastNet > 0 ? "net leaving exchanges" : "net arriving on exchanges") : undefined}
        />
        <Stat label="MVRV" value={mvrvLast?.mvrv != null ? mvrvLast.mvrv.toFixed(2) : "—"} sub={mvrvLast ? `market ÷ realized cap · ${asOf(mvrvLast.time)}` : undefined} />
      </div>

      <Card title={<>Exchange balance, % of supply<ModeledTag how={EXCHANGE_HOW} /></>}>
        <p className="mb-3 text-sm text-muted">A falling share means coins are being withdrawn to self-custody — the closest free proxy for “holders aren&apos;t selling.”</p>
        <SeriesChart t={t} unit="pct" height={300} lines={[{ label: "Exchange share of supply", color: "#f7931a", values: pts.map((p) => p.exchangeSharePct), width: 2 }]} />
        <SourceLine source={d.source} fetchedAt={d.fetchedAt} extra="SplyExNtv ÷ SplyCur" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={<>30-day net exchange flow<ModeledTag how={EXCHANGE_HOW} /></>}>
          <p className="mb-3 text-sm text-muted">Outflow minus inflow, summed over 30 days. Above zero: more BTC leaving exchanges than arriving.</p>
          <SeriesChart t={t} unit="btc" height={260} lines={[{ label: "Net outflow (30d)", color: "#22c55e", values: net30, width: 2 }]} />
          <SourceLine source={d.source} fetchedAt={d.fetchedAt} extra="FlowOutExNtv − FlowInExNtv" />
        </Card>
        <Card title="MVRV ratio">
          <p className="mb-3 text-sm text-muted">Market cap ÷ realized cap (each coin valued at the price it last moved). Above 1: the average holder is in profit.</p>
          <SeriesChart t={t} unit="ratio" height={260} lines={[{ label: "MVRV", color: "#60a5fa", values: pts.map((p) => p.mvrv), width: 2 }]} />
          <SourceLine source={d.source} fetchedAt={d.fetchedAt} extra="CapMVRVCur" />
        </Card>
      </div>
    </div>
  );
}
