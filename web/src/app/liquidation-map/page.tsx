import type { Metadata } from "next";
import { connection } from "next/server";
import { ProGate } from "@/components/pro-gate";
import { Card, Disclaimer, ModeledTag, Page, PageHeader, SourceLine, Stat, Unavailable } from "@/components/ui";
import { compactUsd, fundingPct, usd } from "@/lib/format";
import { getRealizedLiquidations } from "@/lib/market/liquidations";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";
import {
  bucketByPrice, bucketByTime, DEFAULT_TIERS, estimateLiquidationLevels, fillBuckets, niceStep, totals,
} from "@/lib/patterns/liquidations";
import { LiqByHour, LiqByPrice } from "./liq-charts";

export const metadata: Metadata = {
  title: "Liquidation Map",
  description: "Real BTC perpetual liquidations from OKX over the last 24h, plus a clearly-labelled model of where remaining leveraged positions would be forced out.",
};

const MODEL_MMR = 0.005;
const MODEL_RANGE = 0.12;

export default function LiquidationMapPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Derivatives · Pro"
        title="Liquidation Map"
        lede="What actually got liquidated in the last 24 hours, where, and on which side — plus a separately labelled estimate of where today's open interest would be forced out."
      />
      <div className="mt-8">
        <ProGate feature="Liquidation Map">
          <LiquidationBody />
        </ProGate>
      </div>
      <Disclaimer />
    </Page>
  );
}

async function LiquidationBody() {
  await connection();
  const [liq, snap, candles] = await Promise.all([getRealizedLiquidations(), getMarketSnapshot(), getCandles("1h", 300)]);
  const price = snap.spot.ok ? snap.spot.value.price : candles.ok ? candles.value[candles.value.length - 1].close : null;

  return (
    <div className="space-y-6">
      <RealizedSection liq={liq} price={price} />
      <ModelSection snap={snap} candles={candles} price={price} />
    </div>
  );
}

function RealizedSection({ liq, price }: { liq: Awaited<ReturnType<typeof getRealizedLiquidations>>; price: number | null }) {
  if (!liq.ok) {
    return (
      <Card title="Realized liquidations (24h)">
        <Unavailable source={liq.source} error={liq.error} />
        <SourceLine source={liq.source} fetchedAt={liq.fetchedAt} />
      </Card>
    );
  }
  const { events, coverageStartMs, toMs, instruments, missing } = liq.value;
  const t = totals(events);
  const hours = (toMs - coverageStartMs) / 3600_000;
  const prices = events.map((e) => e.price);
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;
  const step = niceStep(hi - lo, 30);
  const byPrice = prices.length ? fillBuckets(bucketByPrice(events, step), step, lo, hi) : [];
  const byHour = bucketByTime(events, 3600_000, coverageStartMs, toMs);
  const total = t.longUsd + t.shortUsd;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`Longs liquidated · ${hours.toFixed(0)}h`} value={compactUsd(t.longUsd)} tone="down" sub={total ? `${((t.longUsd / total) * 100).toFixed(0)}% of total` : "none"} />
        <Stat label={`Shorts liquidated · ${hours.toFixed(0)}h`} value={compactUsd(t.shortUsd)} tone="up" sub={total ? `${((t.shortUsd / total) * 100).toFixed(0)}% of total` : "none"} />
        <Stat label="Liquidation prints" value={t.count.toLocaleString("en-US")} sub={instruments.join(" + ")} />
        <Stat
          label="Largest single print"
          value={t.largest ? compactUsd(t.largest.usd) : "—"}
          sub={t.largest ? `${t.largest.side} @ ${usd(t.largest.price)} · ${new Date(t.largest.ts).toISOString().slice(11, 16)} UTC` : ""}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By hour (UTC)">
          {events.length ? <LiqByHour data={byHour} /> : <p className="text-sm text-muted">No liquidations printed in this window.</p>}
          <SourceLine source={liq.source} fetchedAt={liq.fetchedAt} extra="bankruptcy-price fills" />
        </Card>
        <Card title="By price — where they were filled">
          {events.length ? <LiqByPrice data={byPrice} price={price} bucketUsd={step} height={Math.max(220, Math.min(520, byPrice.length * 14))} /> : <p className="text-sm text-muted">Nothing to plot.</p>}
          <SourceLine source={liq.source} fetchedAt={liq.fetchedAt} extra={`${usd(step)} buckets`} />
        </Card>
      </div>
      <p className="text-xs text-faint">
        OKX BTC-USDT and BTC-USD perpetual swaps only — one venue, so this understates market-wide liquidations.
        {coverageStartMs > liq.value.fromMs + 60_000 && ` Busy period: the public feed's page limit means coverage starts ${new Date(coverageStartMs).toISOString().slice(11, 16)} UTC rather than 24h ago.`}
        {missing.length > 0 && ` ${missing.join(", ")} didn't respond and is excluded.`}
        {" "}Red = long positions force-closed (sells), green = shorts force-closed (buys). Deribit and Hyperliquid don&apos;t offer a public liquidation feed we can query.
      </p>
    </section>
  );
}

function ModelSection({
  snap, candles, price,
}: {
  snap: Awaited<ReturnType<typeof getMarketSnapshot>>;
  candles: Awaited<ReturnType<typeof getCandles>>;
  price: number | null;
}) {
  const how =
    `Current open interest (${snap.derivatives.ok ? snap.derivatives.value.venues.map((v) => v.venue).join(", ") : "n/a"}) is spread over the last ${candles.ok ? candles.value.length : 0} hourly Coinbase candles in proportion to volume, entered at each candle's typical price, ` +
    `split 50/50 long/short and across assumed leverage tiers (${DEFAULT_TIERS.map((t) => `${t.leverage}x ${Math.round(t.weight * 100)}%`).join(", ")}). ` +
    `Liquidation ≈ entry × (1 ∓ 1/leverage ± ${MODEL_MMR * 100}% maintenance). Levels price has already crossed since entry are removed.`;

  return (
    <Card
      title={<span>Estimated liquidation levels <ModeledTag how={how} /></span>}
      action={snap.derivatives.ok ? <span className="num text-xs text-muted">OI {compactUsd(snap.derivatives.value.totalOpenInterestUsd)} · funding {fundingPct(snap.derivatives.value.avgRate8h)}/8h</span> : undefined}
    >
      {!snap.derivatives.ok || !candles.ok || price == null ? (
        <Unavailable source={!snap.derivatives.ok ? snap.derivatives.source : candles.source} error={!snap.derivatives.ok ? snap.derivatives.error : !candles.ok ? candles.error : "no price"} />
      ) : (
        <ModelChart oi={snap.derivatives.value.totalOpenInterestUsd} candles={candles.value} price={price} />
      )}
      <p className="mt-4 text-xs text-muted">
        <b className="text-warn">This is a model, not observed data.</b> No venue publishes where positions&apos; liquidation prices sit. {how} Real positions use mixed leverage, cross margin, and
        partial liquidation, and open interest includes positions older than the window — so treat the shape (where it clusters) as indicative and the dollar amounts as rough.
      </p>
      <SourceLine
        source={`${snap.derivatives.source} OI · Coinbase 1h candles`}
        fetchedAt={snap.derivatives.fetchedAt}
       
        extra={snap.derivatives.ok ? snap.derivatives.value.venues.map((v) => `${v.venue} ${v.openInterestUsd != null ? compactUsd(v.openInterestUsd) : "—"}`).join(" · ") : undefined}
      />
    </Card>
  );
}

function ModelChart({ oi, candles, price }: { oi: number; candles: Parameters<typeof estimateLiquidationLevels>[0]["candles"]; price: number }) {
  const step = niceStep(price * MODEL_RANGE * 2, 48);
  const m = estimateLiquidationLevels({ candles, openInterestUsd: oi, bucketUsd: step, mmr: MODEL_MMR, rangePct: MODEL_RANGE });
  const ladder = fillBuckets(m.buckets, step, price * (1 - MODEL_RANGE), price * (1 + MODEL_RANGE));
  const nearestAbove = [...m.buckets].filter((b) => b.price > price).sort((a, b) => b.shortUsd - a.shortUsd)[0];
  const nearestBelow = [...m.buckets].filter((b) => b.price + step < price).sort((a, b) => b.longUsd - a.longUsd)[0];
  return (
    <>
      <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><div className="text-xs text-faint">Est. shorts above</div><div className="num text-up">{compactUsd(m.shortUsd)}</div></div>
        <div><div className="text-xs text-faint">Est. longs below</div><div className="num text-down">{compactUsd(m.longUsd)}</div></div>
        <div><div className="text-xs text-faint">Densest above</div><div className="num">{nearestAbove ? `${usd(nearestAbove.price)}–${usd(nearestAbove.price + step)}` : "—"}</div></div>
        <div><div className="text-xs text-faint">Densest below</div><div className="num">{nearestBelow ? `${usd(nearestBelow.price)}–${usd(nearestBelow.price + step)}` : "—"}</div></div>
      </div>
      <LiqByPrice data={ladder} price={price} bucketUsd={step} height={520} />
      <p className="mt-2 text-xs text-faint">
        {compactUsd(m.droppedUsd)} of modeled notional was already liquidated by later price action and is excluded. Range ±{MODEL_RANGE * 100}% of {usd(price)} in {usd(step)} buckets.
      </p>
    </>
  );
}
