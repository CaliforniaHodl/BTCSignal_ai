import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge, Card, Disclaimer, Page, PageHeader, SourceLine, Stat, Unavailable } from "@/components/ui";
import { pct } from "@/lib/format";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { getMining, type MiningView } from "@/lib/onchain/mining";
import { COMPRESSED_PERCENTILE, RIBBON_PERIODS, type Episode } from "@/lib/onchain/ribbon";
import { RibbonCharts } from "./ribbon-charts";

export const metadata: Metadata = {
  title: "Difficulty Ribbon",
  description: "Bitcoin difficulty ribbon (9–200 day SMAs) and hash ribbon computed from the full mempool.space retarget and hashrate history.",
};

export default function DifficultyRibbonPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="On-chain"
        title="Difficulty Ribbon"
        lede="Eight moving averages of mining difficulty. When they squeeze together or flip, miners are under stress — historically near cycle lows. Computed from every retarget since 2009."
      />
      <Suspense fallback={<div className="card mt-10 h-[640px] animate-pulse" />}>
        <RibbonBody />
      </Suspense>
      <Disclaimer>
        The ribbon and hash ribbon are rule-based readings of real network data, not predictions. Past capitulations preceded rallies, but
        that is a small sample. Not financial advice.
      </Disclaimer>
    </Page>
  );
}

const T = (d: number) => `${(d / 1e12).toFixed(2)} T`;
const date = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);

const STATE: Record<MiningView["ribbon"]["state"], { label: string; tone: "up" | "warn" | "neutral"; text: string }> = {
  inverted: {
    label: "Inverted",
    tone: "up",
    text: "The 9-day average has fallen below the 200-day average: difficulty is falling, meaning hashpower is leaving. This is the miner-capitulation zone the ribbon is known for.",
  },
  compressed: {
    label: "Compressed",
    tone: "warn",
    text: `The ribbon is in the narrowest ${COMPRESSED_PERCENTILE}% of its history: difficulty growth has stalled. Compression often precedes either an inversion or a fresh expansion.`,
  },
  expanding: {
    label: "Expanding",
    tone: "neutral",
    text: "Short averages sit above long ones with a normal spread: difficulty is rising and miners are adding hashpower. No capitulation signal.",
  },
};

async function RibbonBody() {
  await connection();
  const [mining, snap] = await Promise.all([getMining(), getMarketSnapshot()]);
  if (!mining.ok) {
    return (
      <Card className="mt-10">
        <Unavailable source={mining.source} error={mining.error} />
        <SourceLine source={mining.source} fetchedAt={mining.fetchedAt} />
      </Card>
    );
  }
  const m = mining.value;
  const r = m.ribbon;
  const st = STATE[r.state];
  const net = snap.network;
  const h = m.hashLatest;

  return (
    <div className="mt-10 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Difficulty" value={T(r.difficulty)} sub={`retarget ${date(m.lastRetarget.time)}`} />
        <Stat label="Last retarget" value={pct(m.lastRetarget.changePct)} tone={m.lastRetarget.changePct >= 0 ? "up" : "down"} sub={`block ${m.lastRetarget.height.toLocaleString()}`} />
        <Stat
          label="Next retarget (est.)"
          value={net.ok ? pct(net.value.difficultyChangePct) : "—"}
          sub={net.ok ? `${net.value.blocksUntilRetarget.toLocaleString()} blocks · ${net.value.retargetProgressPct.toFixed(0)}% through` : "mempool.space unavailable"}
        />
        <Stat label="Hashrate (1d)" value={`${h.hashrate.toFixed(0)} EH/s`} sub={`30d avg ${h.sma30.toFixed(0)} EH/s`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Difficulty ribbon reading" action={<Badge tone={st.tone === "up" ? "up" : st.tone}>{st.label}</Badge>}>
          <p className="text-sm text-muted">{st.text}</p>
          <dl className="num mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-faint">Ribbon width</dt><dd>{r.widthPct.toFixed(1)}%</dd></div>
            <div><dt className="text-xs text-faint">Width vs history</dt><dd>narrower than {(100 - r.widthPercentile).toFixed(0)}% of days</dd></div>
            <div><dt className="text-xs text-faint">SMA 9 vs SMA 200</dt><dd>{pct(r.shortVsLongPct)}</dd></div>
            <div><dt className="text-xs text-faint">As of</dt><dd>{date(r.time)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-faint">
            Width = (highest − lowest of the {RIBBON_PERIODS.length} SMAs) ÷ lowest, ranked against every day since 2011. Inverted = SMA 9 &lt; SMA 200.
          </p>
          <SourceLine source={mining.source} fetchedAt={mining.fetchedAt} extra="computed from retarget history" />
        </Card>
        <Card title="Hash ribbon reading" action={<Badge tone={h.capitulation ? "up" : "neutral"}>{h.capitulation ? "Capitulation" : "Recovered"}</Badge>}>
          <p className="text-sm text-muted">
            {h.capitulation
              ? `The 30-day hashrate average is below the 60-day average and has been for ${h.daysSinceCross} days: miners are switching off.`
              : `The 30-day hashrate average is above the 60-day average (for ${h.daysSinceCross} days). The classic “buy” signal is the first recovery after a capitulation.`}
          </p>
          <dl className="num mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-faint">30-day SMA</dt><dd>{h.sma30.toFixed(0)} EH/s</dd></div>
            <div><dt className="text-xs text-faint">60-day SMA</dt><dd>{h.sma60.toFixed(0)} EH/s</dd></div>
          </dl>
          <p className="mt-4 text-xs text-faint">Daily hashrate is mempool.space&apos;s estimate from block times and difficulty, so single days are noisy.</p>
          <SourceLine source={mining.source} fetchedAt={mining.fetchedAt} />
        </Card>
      </div>

      <RibbonCharts daily={m.ribbonDaily} weekly={m.ribbonWeekly} hash={m.hash} />

      <div className="grid gap-6 lg:grid-cols-2">
        <EpisodeTable title="Ribbon inversions (SMA 9 < SMA 200, ≥ 7 days)" rows={m.inversions} />
        <EpisodeTable title="Hash-ribbon capitulations (30d < 60d, ≥ 7 days)" rows={m.capitulations} />
      </div>
    </div>
  );
}

function EpisodeTable({ title, rows }: { title: string; rows: Episode[] }) {
  const recent = rows.slice(-10).reverse();
  return (
    <Card title={title}>
      {recent.length === 0 ? (
        <p className="text-sm text-muted">None in the available history.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="num w-full text-sm">
            <thead className="text-left text-xs text-faint">
              <tr><th className="py-1 pr-3 font-normal">Start</th><th className="py-1 pr-3 font-normal">End</th><th className="py-1 text-right font-normal">Days</th></tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.start} className="border-t border-line">
                  <td className="py-1.5 pr-3">{date(e.start)}</td>
                  <td className="py-1.5 pr-3">{e.end ? date(e.end) : <span className="text-accent">ongoing</span>}</td>
                  <td className="py-1.5 text-right text-muted">{e.days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-faint">Most recent {recent.length} of {rows.length} episodes.</p>
    </Card>
  );
}
