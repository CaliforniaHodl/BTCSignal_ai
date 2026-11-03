import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LocalTime } from "@/components/local-time";
import { DirectionBadge, OutcomeBadge, fmtSignedPct } from "@/components/track-record";
import { Badge, Card, Disclaimer, Page, PageHeader, SourceLine } from "@/components/ui";
import { getPosts } from "@/lib/content/posts";
import { summariseRecorded } from "@/lib/legacy/archive";
import { ENGINE_VERSION } from "@/lib/engine/signal";
import { tone, usd } from "@/lib/format";
import { getRecentSignals } from "@/lib/tracking/queries";

export const metadata: Metadata = {
  title: "Signals",
  description: "The live engine's latest Bitcoin signals, plus the archive of daily posts from the retired v1 engine (Nov 2025 – Jan 2026).",
  alternates: { canonical: "/posts" },
  openGraph: { title: "Signals · BTCSignal.ai", description: "Latest engine signals and the v1 post archive.", url: "/posts", type: "website" },
};

const RECENT = 12;

export default function PostsPage() {
  const posts = getPosts();
  const rec = summariseRecorded(posts);
  return (
    <Page>
      <PageHeader eyebrow="Signals" title="Signals & archive"
        lede="The current engine writes a signal every hour and the paper agent acts on it in public. Below that is the archive of daily posts from the retired v1 engine." />

      <Card className="mt-10" title={<>Latest engine signals <span className="ml-1 text-xs font-normal text-faint">v{ENGINE_VERSION}</span></>}
        action={<div className="flex gap-4 text-sm"><Link href="/signal-history" className="text-accent">Full history →</Link><Link href="/agent" className="text-accent">The agent →</Link></div>}>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-sunken" />}>
          <RecentSignals />
        </Suspense>
      </Card>

      <section className="mt-14" aria-labelledby="archive">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warn">Legacy v1 engine · retired</Badge>
          <Badge>Free</Badge>
        </div>
        <h2 id="archive" className="mt-3 text-2xl font-semibold tracking-tight">v1 daily posts</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          {posts.length} posts from a retired engine. The current system shares none of its rules. They&apos;re kept so old links
          keep working and the record stays honest: v1 scored itself {rec.all.wins}W – {rec.all.losses}L
          ({rec.excluded} early posts are excluded because their prices don&apos;t match the market). Our independent re-check is on
          the <Link href="/signal-history#legacy-archive" className="text-accent">signal history</Link> page.
        </p>
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-raised">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/posts/${p.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-sunken sm:grid-cols-[170px_80px_1fr_auto]">
                <span className="num text-sm">{p.date.slice(0, 16).replace("T", " ")} UTC</span>
                <span className="justify-self-end sm:justify-self-start"><DirectionBadge dir={p.direction} /></span>
                <span className="num text-sm text-muted">{p.confidence}% · entry {usd(p.price)}</span>
                <span className="text-sm">
                  {p.excludeFromStats ? <span className="text-warn">excluded</span>
                    : p.callResult ? <span className={p.callResult === "win" ? "text-up" : "text-down"}>recorded {p.callResult}</span>
                    : <span className="text-faint">unresolved</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Disclaimer />
    </Page>
  );
}

async function RecentSignals() {
  await connection();
  let rows;
  try {
    rows = await getRecentSignals(RECENT);
  } catch (e) {
    console.error("[posts] recent signals", e);
    return <p className="text-sm text-muted">Engine signals are unavailable right now.</p>;
  }
  if (rows.length === 0) return <p className="text-sm text-muted">No signals yet. The engine&apos;s first hourly run will appear here.</p>;
  return (
    <>
      <ul className="divide-y divide-line">
        {rows.map((s) => {
          const reason = (s.factors as { reason?: string } | null)?.reason;
          return (
            <li key={s.id} className="grid gap-1 py-3 sm:grid-cols-[150px_80px_1fr_auto] sm:items-center sm:gap-3">
              <span className="text-xs text-faint"><LocalTime iso={s.createdAt.toISOString()} /></span>
              <span><DirectionBadge dir={s.direction} /></span>
              <span className="text-sm text-muted">{reason ?? `Score ${s.score.toFixed(2)}, confidence ${(s.confidence * 100).toFixed(0)}%`}</span>
              <span className="num text-sm">
                {s.direction === "flat" ? <span className="text-faint">{usd(s.price)}</span>
                  : s.outcome ? <span className="flex items-center gap-2"><OutcomeBadge outcome={s.outcome} /><span className={s.returnPct != null ? tone(s.returnPct) : ""}>{fmtSignedPct(s.returnPct)}</span></span>
                  : <OutcomeBadge outcome={null} />}
              </span>
            </li>
          );
        })}
      </ul>
      <SourceLine source="BTCSignal.ai engine · signals table" extra={`latest ${rows.length}`} />
    </>
  );
}
