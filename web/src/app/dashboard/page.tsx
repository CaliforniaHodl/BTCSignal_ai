import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import clsx from "clsx";
import { AutoRefresh } from "@/components/auto-refresh";
import { LocalTime } from "@/components/local-time";
import { ProGate } from "@/components/pro-gate";
import { Badge, Card, DatumView, Disclaimer, Page, PageHeader, SourceLine, Unavailable } from "@/components/ui";
import { loadDashboard, PANELS, type DashboardData, type PanelId } from "@/lib/dashboard/load";
import { compactUsd, fundingPct, pct, tone, usd } from "@/lib/format";
import { LEVEL_METHOD } from "@/lib/market/pro";
import { FlowsChart, FundingHistoryChart, OiChart, ValuationChart } from "./charts";
import { PanelShell, type PanelDef } from "./panel-shell";

export const metadata: Metadata = {
  title: "Pro Dashboard",
  description: "Derivatives, on-chain valuation, network health, cross-asset correlation and the agent's read — real data only, every number sourced.",
};

export default function DashboardPage() {
  return (
    <Page>
      <PageHeader eyebrow="Pro" title="Pro Dashboard" lede="Every metric we can source for real, on one screen. No estimates dressed up as data: if a source is down, the panel says so." />
      <div className="mt-8">
        <ProGate feature="The Pro Dashboard">
          <Suspense fallback={<div className="card h-[40rem] animate-pulse" />}>
            <Body />
          </Suspense>
          <Disclaimer>
            On-chain data: Coin Metrics Community (CC BY-NC 4.0), daily, recent values may be revised. S&amp;P 500 series is the Hyperliquid xyz:SP500 perpetual, an oracle-tracked proxy rather than the cash index. For information only; not financial advice.
          </Disclaimer>
        </ProGate>
      </div>
    </Page>
  );
}

async function Body() {
  await connection();
  const d = await loadDashboard();
  const now = d.generatedAt;
  const node: Record<PanelId, React.ReactNode> = {
    overview: <Overview d={d} />,
    venues: <Venues d={d} />,
    "funding-history": (
      <Card title="Funding history · 30 days" action={<span className="text-xs text-faint">% per 8h</span>}>
        <DatumView d={d.fundingHistory} now={now}>{(v) => <FundingHistoryChart venues={v} />}</DatumView>
      </Card>
    ),
    "oi-history": (
      <Card title="Open interest · OKX BTC contracts" action={<span className="text-xs text-faint">daily, USD</span>}>
        <DatumView d={d.oiDaily} now={now}>{(v) => <OiChart points={v} />}</DatumView>
      </Card>
    ),
    basis: <Basis d={d} />,
    valuation: <Valuation d={d} />,
    flows: <Flows d={d} />,
    network: <Network d={d} />,
    correlation: <Correlation d={d} />,
    technicals: <Technicals d={d} />,
    agent: <Agent d={d} />,
  };
  const wide = new Set<PanelId>(["overview", "funding-history", "valuation"]);
  const panels: PanelDef[] = PANELS.map((p) => ({ ...p, wide: wide.has(p.id), node: node[p.id] }));
  return (
    <>
      <AutoRefresh seconds={60} />
      <p className="mb-4 text-xs text-faint">Rendered <LocalTime iso={new Date(now).toISOString()} /> · refreshes every minute while visible</p>
      <PanelShell panels={panels} />
    </>
  );
}

// ---------------------------------------------------------------- panels

const Row = ({ k, v, cls }: { k: React.ReactNode; v: React.ReactNode; cls?: string }) => (
  <div className="flex justify-between gap-3 py-1"><dt className="text-muted">{k}</dt><dd className={clsx("num text-right", cls)}>{v}</dd></div>
);
const Big = ({ children, cls }: { children: React.ReactNode; cls?: string }) => <div className={clsx("num text-2xl font-semibold", cls)}>{children}</div>;

function Overview({ d }: { d: DashboardData }) {
  const s = d.snapshot, now = d.generatedAt;
  const spread = s.spot.ok && s.spotCrossCheck.ok ? ((s.spotCrossCheck.value.price - s.spot.value.price) / s.spot.value.price) * 100 : null;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card className="col-span-2">
        <div className="text-xs uppercase tracking-wider text-faint">BTC / USD</div>
        <DatumView d={s.spot} now={now}>
          {(v) => (
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="num text-4xl font-semibold">{usd(v.price)}</div>
                <div className={clsx("num mt-1", tone(v.change24hPct))}>{pct(v.change24hPct)} <span className="text-xs text-faint">24h</span></div>
              </div>
              <dl className="num grid grid-cols-3 gap-4 text-sm">
                <div><dt className="text-xs text-faint">High</dt><dd>{usd(v.high24h)}</dd></div>
                <div><dt className="text-xs text-faint">Low</dt><dd>{usd(v.low24h)}</dd></div>
                <div><dt className="text-xs text-faint">Vol</dt><dd>{Math.round(v.volume24hBtc).toLocaleString()} ₿</dd></div>
              </dl>
            </div>
          )}
        </DatumView>
        {spread != null && <div className="text-[11px] text-faint">Kraken {pct(spread, 3)} vs Coinbase</div>}
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wider text-faint">Fear &amp; Greed</div>
        <DatumView d={s.fearGreed} now={now}>{(v) => <><Big cls={v.value >= 55 ? "text-up" : v.value <= 45 ? "text-down" : ""}>{v.value}</Big><div className="text-sm text-muted">{v.label}</div></>}</DatumView>
      </Card>
      <Card>
        <div className="text-xs uppercase tracking-wider text-faint">BTC dominance</div>
        <DatumView d={s.global} now={now}>{(v) => <><Big>{v.btcDominancePct.toFixed(1)}%</Big><div className="text-sm text-muted">Total {compactUsd(v.totalMarketCapUsd)}</div></>}</DatumView>
      </Card>
    </div>
  );
}

function Venues({ d }: { d: DashboardData }) {
  const s = d.snapshot.derivatives;
  const ls = d.longShort.ok ? d.longShort.value[d.longShort.value.length - 1] : null;
  return (
    <Card title="Perpetuals by venue">
      <DatumView d={s} now={d.generatedAt}>
        {(v) => (
          <>
            <table className="num w-full text-sm">
              <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">Venue</th><th className="pb-2 text-right font-normal">Funding / 8h</th><th className="pb-2 text-right font-normal">Annualised</th><th className="pb-2 text-right font-normal">OI</th></tr></thead>
              <tbody>
                {v.venues.map((x) => (
                  <tr key={x.venue} className="border-t border-line">
                    <td className="py-1.5">{x.venue}</td>
                    <td className={clsx("py-1.5 text-right", tone(x.rate8h))}>{fundingPct(x.rate8h)}</td>
                    <td className="py-1.5 text-right text-muted">{pct(x.rate8h * 3 * 365 * 100, 1)}</td>
                    <td className="py-1.5 text-right">{x.openInterestUsd != null ? compactUsd(x.openInterestUsd) : "—"}</td>
                  </tr>
                ))}
                <tr className="border-t border-line-strong font-medium">
                  <td className="py-1.5">OI-weighted</td>
                  <td className={clsx("py-1.5 text-right", tone(v.avgRate8h))}>{fundingPct(v.avgRate8h)}</td>
                  <td className="py-1.5 text-right text-muted">{pct(v.avgRate8h * 3 * 365 * 100, 1)}</td>
                  <td className="py-1.5 text-right">{compactUsd(v.totalOpenInterestUsd)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </DatumView>
      <div className="mt-4 border-t border-line pt-3 text-sm">
        {ls ? <Row k="OKX long/short accounts" v={`${ls.ratio.toFixed(2)} : 1`} /> : <Unavailable source="OKX Rubik" />}
        <SourceLine source="OKX Rubik · share of accounts net long vs net short" fetchedAt={d.longShort.fetchedAt} now={d.generatedAt} />
      </div>
    </Card>
  );
}

function Basis({ d }: { d: DashboardData }) {
  return (
    <Card title="Futures basis · Deribit dated futures">
      <DatumView d={d.term} now={d.generatedAt}>
        {(v) => {
          const rows = v.rows.filter((r) => r.daysToExpiry >= 1);
          return (
            <table className="num w-full text-sm">
              <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">Expiry</th><th className="pb-2 text-right font-normal">Days</th><th className="pb-2 text-right font-normal">Premium</th><th className="pb-2 text-right font-normal">Ann.</th><th className="hidden pb-2 text-right font-normal sm:table-cell">OI</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.instrument} className="border-t border-line">
                    <td className="py-1.5">{r.instrument.replace("BTC-", "")}</td>
                    <td className="py-1.5 text-right text-muted">{r.daysToExpiry.toFixed(0)}</td>
                    <td className={clsx("py-1.5 text-right", tone(r.premiumPct))}>{pct(r.premiumPct, 2)}</td>
                    <td className={clsx("py-1.5 text-right", tone(r.annualisedPct ?? 0))}>{r.annualisedPct != null ? pct(r.annualisedPct, 1) : "—"}</td>
                    <td className="hidden py-1.5 text-right text-muted sm:table-cell">{compactUsd(r.openInterestUsd)}</td>
                  </tr>
                ))}
              </tbody>
              <caption className="caption-bottom pt-2 text-left text-[11px] text-faint">Mark vs Deribit index {usd(v.indexPrice)}; simple annualisation, expiries under a day hidden.</caption>
            </table>
          );
        }}
      </DatumView>
    </Card>
  );
}

function Valuation({ d }: { d: DashboardData }) {
  return (
    <Card title="On-chain valuation" action={d.onchain.ok ? <span className="text-xs text-faint">as of {d.onchain.value.day} (daily)</span> : undefined}>
      <DatumView d={d.onchain} now={d.generatedAt}>
        {(o) => (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <dl className="text-sm">
              <Row k={<span title="Market cap / realized cap (Coin Metrics CapMVRVCur)">MVRV</span>} v={o.mvrv?.toFixed(2) ?? "—"} cls={o.mvrv == null ? "" : o.mvrv > 3 ? "text-down" : o.mvrv < 1 ? "text-up" : ""} />
              <Row k={<span title="Market cap ÷ MVRV — exact by definition">Realized cap</span>} v={o.realizedCapUsd != null ? compactUsd(o.realizedCapUsd) : "—"} />
              <Row k={<span title="Realized cap ÷ current supply: the average on-chain cost basis">Realized price</span>} v={o.realizedPriceUsd != null ? usd(o.realizedPriceUsd) : "—"} />
              <Row k="Market cap" v={o.marketCapUsd != null ? compactUsd(o.marketCapUsd) : "—"} />
              <Row k={<span title="Daily issuance value (USD) ÷ its 365-day average">Puell multiple</span>} v={o.puell?.toFixed(2) ?? "—"} />
              <p className="mt-3 text-[11px] text-faint">MVRV &gt; 3 has marked past cycle tops; &lt; 1 means price is below the average cost basis. NVT, SOPR, NUPL cohorts and Z-scores need paid data and are not shown.</p>
            </dl>
            <ValuationChart series={o.series} />
          </div>
        )}
      </DatumView>
    </Card>
  );
}

function Flows({ d }: { d: DashboardData }) {
  return (
    <Card title="Exchange flows & activity">
      <DatumView d={d.onchain} now={d.generatedAt}>
        {(o) => (
          <>
            <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
              <Row k="Netflow (1d)" v={o.exchangeNetflowUsd != null ? `${o.exchangeNetflowUsd >= 0 ? "+" : "−"}${compactUsd(Math.abs(o.exchangeNetflowUsd))}` : "—"} cls={o.exchangeNetflowUsd == null ? "" : o.exchangeNetflowUsd > 0 ? "text-down" : "text-up"} />
              <Row k="Netflow (30d)" v={o.exchangeNetflow30dSumUsd != null ? `${o.exchangeNetflow30dSumUsd >= 0 ? "+" : "−"}${compactUsd(Math.abs(o.exchangeNetflow30dSumUsd))}` : "—"} />
              <Row k="Exchange balance" v={o.exchangeSupplyBtc != null ? `${Math.round(o.exchangeSupplyBtc).toLocaleString()} ₿` : "—"} />
              <Row k="30d change" v={o.exchangeSupply30dChangeBtc != null ? `${o.exchangeSupply30dChangeBtc >= 0 ? "+" : ""}${Math.round(o.exchangeSupply30dChangeBtc).toLocaleString()} ₿` : "—"} />
              <Row k="Active addresses" v={o.activeAddresses?.toLocaleString() ?? "—"} />
              <Row k="30d avg" v={o.activeAddresses30dAvg != null ? Math.round(o.activeAddresses30dAvg).toLocaleString() : "—"} />
              <Row k="Transactions" v={o.txCount?.toLocaleString() ?? "—"} />
              <Row k="Fees paid" v={o.feesUsd != null ? compactUsd(o.feesUsd) : "—"} />
            </dl>
            <div className="mt-4"><FlowsChart flows={o.flows} /></div>
            <p className="text-[11px] text-faint">Red = net inflow to exchanges, green = net outflow (60 days). Recent days are &ldquo;flash&rdquo; estimates Coin Metrics may revise.</p>
          </>
        )}
      </DatumView>
    </Card>
  );
}

function Network({ d }: { d: DashboardData }) {
  const s = d.snapshot, now = d.generatedAt;
  const fees = d.blockFees.ok ? d.blockFees.value : null;
  const med = fees?.length ? [...fees.map((b) => b.median)].sort((a, b) => a - b)[Math.floor(fees.length / 2)] : null;
  return (
    <Card title="Network health · mempool.space">
      <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
        {s.network.ok ? (
          <>
            <Row k="Block height" v={s.network.value.blockHeight.toLocaleString()} />
            <Row k="Hashrate (3d)" v={`${s.network.value.hashrateEhs.toFixed(0)} EH/s`} />
            <Row k="Next difficulty adj." v={pct(s.network.value.difficultyChangePct)} cls={tone(s.network.value.difficultyChangePct)} />
            <Row k="Epoch progress" v={`${s.network.value.retargetProgressPct.toFixed(0)}% · ${s.network.value.blocksUntilRetarget} left`} />
          </>
        ) : <Unavailable source="mempool.space" />}
        {s.fees.ok ? (
          <>
            <Row k="Next-block fee" v={`${s.fees.value.fastest} sat/vB`} />
            <Row k="1h / economy" v={`${s.fees.value.hour} / ${s.fees.value.economy} sat/vB`} />
          </>
        ) : null}
        {d.mempool.ok ? (
          <>
            <Row k="Mempool txs" v={d.mempool.value.count.toLocaleString()} />
            <Row k="Mempool size" v={`${(d.mempool.value.vsizeVb / 1e6).toFixed(1)} vMB`} />
          </>
        ) : null}
        {med != null && <Row k="24h block median fee" v={`${med} sat/vB`} />}
        {fees && <Row k="Blocks (24h)" v={fees.length} />}
      </dl>
      <SourceLine source="mempool.space" fetchedAt={s.network.fetchedAt} now={now} />
    </Card>
  );
}

function Correlation({ d }: { d: DashboardData }) {
  const cell = (r: number | null, n: number) => (r == null ? <span className="text-faint">—</span> : <span className={clsx(Math.abs(r) >= 0.5 && "font-semibold")} title={`${n} daily returns`}>{r.toFixed(2)}</span>);
  return (
    <Card title="BTC correlation · daily log returns">
      <table className="num w-full text-sm">
        <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">vs</th><th className="pb-2 text-right font-normal">30d</th><th className="pb-2 text-right font-normal">90d</th></tr></thead>
        <tbody>
          {d.correlations.map((c) => (
            <tr key={c.id} className="border-t border-line">
              <td className="py-1.5">{c.label}<div className="text-[11px] text-faint">{c.source}</div></td>
              {c.ok ? <><td className="py-1.5 text-right">{cell(c.r30, c.n30)}</td><td className="py-1.5 text-right">{cell(c.r90, c.n90)}</td></> : <td colSpan={2} className="py-1.5 text-right text-muted" title={c.error}>Unavailable</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <SourceLine source="Pearson r on days both markets printed a close" fetchedAt={d.correlationsFetchedAt} now={d.generatedAt} />
    </Card>
  );
}

function Technicals({ d }: { d: DashboardData }) {
  return (
    <Card title="RSI & nearest key levels">
      <table className="num w-full text-sm">
        <thead className="text-left text-xs text-faint"><tr><th className="pb-2 font-normal">TF</th><th className="pb-2 text-right font-normal">RSI 14</th><th className="pb-2 text-right font-normal">Support</th><th className="pb-2 text-right font-normal">Resistance</th></tr></thead>
        <tbody>
          {d.technicals.map((t) => (
            <tr key={t.tf} className="border-t border-line">
              <td className="py-1.5">{t.tf}</td>
              <td className={clsx("py-1.5 text-right", t.rsi14.ok && t.rsi14.value != null && (t.rsi14.value >= 70 ? "text-down" : t.rsi14.value <= 30 ? "text-up" : ""))}>{t.rsi14.ok && t.rsi14.value != null ? t.rsi14.value.toFixed(1) : "—"}</td>
              <td className="py-1.5 text-right">{t.levels.ok && t.levels.value.support ? <>{usd(t.levels.value.support.price)}<div className="text-[11px] text-faint">{pct(t.levels.value.support.distancePct, 1)} · {t.levels.value.support.touches}×</div></> : "—"}</td>
              <td className="py-1.5 text-right">{t.levels.ok && t.levels.value.resistance ? <>{usd(t.levels.value.resistance.price)}<div className="text-[11px] text-faint">{pct(t.levels.value.resistance.distancePct, 1)} · {t.levels.value.resistance.touches}×</div></> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SourceLine source="Coinbase candles" fetchedAt={d.technicals[0]?.levels.fetchedAt} now={d.generatedAt} extra={LEVEL_METHOD} />
    </Card>
  );
}

function Agent({ d }: { d: DashboardData }) {
  return (
    <Card title="Agent's current read" action={<Link href="/agent" className="text-xs text-accent hover:underline">Full log →</Link>}>
      <DatumView d={d.agent} now={d.generatedAt}>
        {(a) =>
          !a ? <p className="text-sm text-muted">The agent hasn&apos;t produced a signal yet.</p> : (
            <div className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.direction === "long" ? "up" : a.direction === "short" ? "down" : "neutral"}>{a.direction.toUpperCase()}</Badge>
                <span className="num text-muted">score {a.score.toFixed(2)} · confidence {(a.confidence * 100).toFixed(0)}%</span>
                <span className="text-xs text-faint"><LocalTime iso={a.at} /></span>
              </div>
              <p className="mt-2 text-muted">{a.reason}</p>
              <ul className="num mt-3 grid grid-cols-1 gap-x-6 text-xs sm:grid-cols-2">
                {a.factors.map((f) => (
                  <li key={f.label} className="flex justify-between gap-2 py-0.5" title={f.detail}><span className="text-muted">{f.label}</span><span className={f.value == null ? "text-faint" : tone(f.value)}>{f.value == null ? "n/a" : f.value.toFixed(2)}</span></li>
                ))}
              </ul>
              <div className="mt-3 border-t border-line pt-3">
                {a.openTrade ? (
                  <Row k={`Open ${a.openTrade.side}`} v={`${usd(a.openTrade.entry)} · stop ${usd(a.openTrade.stop)}${a.openTrade.target ? ` · tgt ${usd(a.openTrade.target)}` : " · trailing"}`} />
                ) : <Row k="Position" v="Flat" />}
                {a.lastDecision && <Row k="Last decision" v={a.lastDecision.action} />}
                <Row k="Signal hit rate" v={a.hitRatePct != null ? `${a.hitRatePct.toFixed(0)}% of ${a.resolved}` : "not enough resolved"} />
              </div>
            </div>
          )
        }
      </DatumView>
    </Card>
  );
}
