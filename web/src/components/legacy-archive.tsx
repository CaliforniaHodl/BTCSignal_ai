/**
 * The retired v1 engine's calls (Nov 2025 – Jan 2026), shown apart from the
 * live engine's record. Recorded results come from the posts' frontmatter and
 * the v1 ledger (historical-calls.json); the re-check column is our own
 * resolution against Coinbase hourly candles.
 */
import Link from "next/link";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import clsx from "clsx";
import { Badge, Card, Stat } from "@/components/ui";
import { DirectionBadge, fmtPct, fmtSignedPct } from "@/components/track-record";
import { getHistoricalCalls, getPosts, type LegacyPost } from "@/lib/content/posts";
import { mergeLedger, PRICE_MISMATCH_PCT, RECHECK_HORIZON_H, recheckCall, summariseRecheck, summariseRecorded, type ArchiveRow, type Recheck } from "@/lib/legacy/archive";
import { candlesAround, inBatches } from "@/lib/legacy/history";
import { tone, usd } from "@/lib/format";

type Row = ArchiveRow<LegacyPost>;

function rows(): Row[] {
  return mergeLedger(getPosts(), getHistoricalCalls());
}

export function LegacyArchive({ variant = "full" }: { variant?: "full" | "pnl" }) {
  const r = rows();
  const rec = summariseRecorded(r);
  const ledgerPnl = r.filter((x) => !x.excludeFromStats && x.ledger?.pnlPct != null).map((x) => x.ledger!.pnlPct!);
  return (
    <section aria-labelledby="legacy-archive" className="mt-16 border-t border-line pt-10">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warn">Legacy v1 engine · retired</Badge>
        <span className="text-xs text-faint">Nov 2025 – Jan 2026 · archive, not the current system</span>
      </div>
      <h2 id="legacy-archive" className="mt-3 text-2xl font-semibold tracking-tight">Legacy v1 archive</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Before the current engine, a v1 bot published one daily call as a <Link href="/posts" className="text-accent">post</Link>.
        It was retired; the engine above shares none of its code or rules. These are its calls exactly as it recorded them,
        next to our own re-check against Coinbase hourly candles ({RECHECK_HORIZON_H}h from the next full hour after each post,
        target vs. stop, whichever was touched first; stop wins ties). {rec.excluded} early posts are excluded from every
        number because their recorded entry price is more than {PRICE_MISMATCH_PCT}% away from where BTC actually traded.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Calls published" value={String(rec.total)} sub={`${rec.excluded} excluded · ${rec.unresolved} never resolved`} />
        <Stat label="Recorded record" value={`${rec.all.wins}W – ${rec.all.losses}L`} sub={`${fmtPct(rec.all.hitRatePct)} as v1 scored itself`} />
        <Stat label="Recorded: up / down" value={`${fmtPct(rec.up.hitRatePct)} / ${fmtPct(rec.down.hitRatePct)}`} sub={`${rec.up.wins + rec.up.losses} up · ${rec.down.wins + rec.down.losses} down calls`} />
        {variant === "pnl" ? (
          <Stat label="v1 ledger P&L" value={ledgerPnl.length ? fmtSignedPct(ledgerPnl.reduce((a, b) => a + b, 0)) : "—"} sub={`sum of ${ledgerPnl.length} calls in its ledger, unleveraged, no fees`} />
        ) : (
          <Suspense fallback={<Stat label="Re-checked vs. Coinbase" value="…" sub="checking candles" />}>
            <RecheckStat />
          </Suspense>
        )}
      </div>

      <Card className="mt-6" title="Every v1 call">
        <Suspense fallback={<ArchiveTable rows={r} checks={null} />}>
          <ArchiveTableWithRecheck />
        </Suspense>
      </Card>
    </section>
  );
}

/** Per-request dedupe: the stat and the table share one set of fetches. */
const recheckAll = cache(async (): Promise<Map<string, Recheck | null>> => {
  await connection();
  const r = rows();
  const out = await inBatches(r, 4, async (p) => {
    const c = await candlesAround(p.date, RECHECK_HORIZON_H + 3);
    return [p.slug, c.ok ? recheckCall(p, c.value) : null] as const;
  });
  return new Map(out);
});

async function RecheckStat() {
  const r = rows();
  const checks = await recheckAll();
  const counted = r.filter((x) => !x.excludeFromStats).map((x) => checks.get(x.slug)).filter((x): x is Recheck => x != null);
  if (counted.length === 0) return <Stat label="Re-checked vs. Coinbase" value="Unavailable" sub="Coinbase didn't respond" tone="muted" />;
  const s = summariseRecheck(counted);
  return (
    <Stat label="Re-checked vs. Coinbase" value={`${s.targets} target · ${s.stops} stop`}
      sub={`${s.neither} neither in ${RECHECK_HORIZON_H}h · avg ${fmtSignedPct(s.avgReturnPct)}/call`} />
  );
}

async function ArchiveTableWithRecheck() {
  const r = rows();
  return <ArchiveTable rows={r} checks={await recheckAll()} />;
}

function RecheckCell({ c }: { c: Recheck | null | undefined }) {
  if (c === undefined) return <span className="text-xs text-faint">checking…</span>;
  if (c === null || c.status === "no-data") return <span className="text-xs text-faint" title="Coinbase didn't return candles for this window">unavailable</span>;
  if (c.status === "price-mismatch") return <span className="text-xs text-warn">market was {usd(c.marketClose)}</span>;
  const label = c.status === "target" ? "Target" : c.status === "stop" ? "Stop" : `Neither (${RECHECK_HORIZON_H}h)`;
  return (
    <span className="whitespace-nowrap">
      <span className={c.status === "target" ? "text-up" : c.status === "stop" ? "text-down" : "text-muted"}>{label}</span>{" "}
      <span className={clsx("text-xs", tone(c.returnPct))}>{fmtSignedPct(c.returnPct)}</span>
    </span>
  );
}

function ArchiveTable({ rows, checks }: { rows: Row[]; checks: Map<string, Recheck | null> | null }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="num w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-faint">
            <tr>
              <th className="pb-2 font-normal">Post (UTC)</th><th className="font-normal">Call</th><th className="font-normal">Conf.</th>
              <th className="font-normal">Entry</th><th className="font-normal">Target</th><th className="font-normal">Stop</th>
              <th className="font-normal">v1 recorded</th><th className="font-normal">v1 ledger P&amp;L</th><th className="font-normal">Our re-check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((p) => (
              <tr key={p.slug} className={p.excludeFromStats ? "text-faint" : ""}>
                <td className="py-2">
                  <Link href={`/posts/${p.slug}`} className="hover:text-accent">{p.date.slice(0, 16).replace("T", " ")}</Link>
                  {p.excludeFromStats && <span className="ml-1.5 text-[10px] uppercase text-warn" title={p.archiveNote ?? undefined}>excluded</span>}
                </td>
                <td><DirectionBadge dir={p.direction} /></td>
                <td>
                  {p.confidence}%
                  {p.ledger && p.ledger.confidencePct !== p.confidence && (
                    <span className="ml-1 text-[10px] text-faint" title="v1's ledger recorded a different confidence for this call">(ledger {p.ledger.confidencePct}%)</span>
                  )}
                </td>
                <td>{usd(p.price)}</td>
                <td>{usd(p.targetPrice)}</td>
                <td>{usd(p.stopLoss)}</td>
                <td>{p.callResult ? <span className={p.callResult === "win" ? "text-up" : "text-down"}>{p.callResult}</span> : <span className="text-faint">unresolved</span>}</td>
                <td className={clsx(p.ledger?.pnlPct != null && tone(p.ledger.pnlPct))}>{p.ledger ? fmtSignedPct(p.ledger.pnlPct) : <span className="text-faint">not in ledger</span>}</td>
                <td><RecheckCell c={checks ? checks.get(p.slug) : undefined} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint">
        Sources: v1 post frontmatter and v1&apos;s own ledger (historical-calls.json), both as published. Where they disagree we show both.
        Re-check: Coinbase BTC-USD 1h candles. v1 never counted fees.
      </p>
    </>
  );
}
