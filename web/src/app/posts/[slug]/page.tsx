import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProseHtml } from "@/components/prose";
import { DirectionBadge } from "@/components/track-record";
import { Badge, Disclaimer, Page } from "@/components/ui";
import { getPost, getPosts } from "@/lib/content/posts";
import { renderMarkdown } from "@/lib/content/markdown";
import { usd } from "@/lib/format";

/**
 * Every slug is prerendered by generateStaticParams, so blocking on params costs nothing and lets
 * notFound() send a 404 instead of a streamed 200 (Next docs: not-found "Status codes").
 */
export const instant = false;

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const p = getPost((await params).slug);
  if (!p) notFound();
  const description = `Archived v1 call from ${p.date.slice(0, 10)}: ${p.direction.toUpperCase()} at ${usd(p.price)}, ${p.confidence}% confidence. Retired engine.`;
  return {
    title: p.title,
    description,
    alternates: { canonical: `/posts/${p.slug}` },
    openGraph: { title: p.title, description, url: `/posts/${p.slug}`, type: "article", publishedTime: p.date },
    robots: p.excludeFromStats ? { index: false } : undefined,
  };
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  return (
    <Page narrow>
      <Link href="/posts" className="text-sm text-muted hover:text-fg">← Signals & archive</Link>
      {/* Awaited outside Suspense on purpose: unknown slugs must return a real 404 (see `instant` above). */}
      <PostBody slug={(await params).slug} />
      <Disclaimer />
    </Page>
  );
}

function PostBody({ slug }: { slug: string }) {
  const p = getPost(slug);
  if (!p) notFound();
  const all = getPosts();
  const i = all.findIndex((x) => x.slug === p.slug);
  const newer = all[i - 1], older = all[i + 1];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="warn">Legacy v1 engine · retired</Badge>
        <Badge>Archive · free</Badge>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{p.title}</h1>

      <div role="note" className="mt-5 rounded-xl border border-warn/30 bg-warn/5 p-4 text-sm text-muted">
        This was published by the <strong className="text-fg">v1 engine, which has been retired</strong>. It is not a current
        signal and the current system shares none of its rules. See the <Link href="/agent" className="text-accent">live agent</Link> and
        the <Link href="/signal-history" className="text-accent">current track record</Link>.
      </div>
      {p.archiveNote && (
        <div role="alert" className="mt-3 rounded-xl border border-down/30 bg-down-soft p-4 text-sm text-fg">{p.archiveNote}</div>
      )}

      <dl className="num mt-6 grid grid-cols-2 gap-4 rounded-xl border border-line bg-raised p-4 text-sm sm:grid-cols-5">
        <div><dt className="text-xs text-faint">Call</dt><dd className="mt-1"><DirectionBadge dir={p.direction} /></dd></div>
        <div><dt className="text-xs text-faint">Confidence</dt><dd className="mt-1">{p.confidence}%</dd></div>
        <div><dt className="text-xs text-faint">Entry</dt><dd className="mt-1">{usd(p.price, 2)}</dd></div>
        <div><dt className="text-xs text-faint">Target / stop</dt><dd className="mt-1">{usd(p.targetPrice)} / {usd(p.stopLoss)}</dd></div>
        <div>
          <dt className="text-xs text-faint">Recorded result</dt>
          <dd className="mt-1">{p.callResult ? <span className={p.callResult === "win" ? "text-up" : "text-down"}>{p.callResult.toUpperCase()}</span> : <span className="text-faint">never resolved</span>}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-faint">
        &quot;Recorded result&quot; is what v1 wrote down. Our independent re-check against Coinbase candles is on the{" "}
        <Link href="/signal-history#legacy-archive" className="text-accent">signal history</Link> page.
      </p>

      <article className="mt-10">
        <ProseHtml html={renderMarkdown(p.body)} />
      </article>

      <nav className="mt-12 flex justify-between gap-4 border-t border-line pt-6 text-sm" aria-label="Archive navigation">
        {older ? <Link href={`/posts/${older.slug}`} className="text-muted hover:text-fg">← {older.date.slice(0, 10)}</Link> : <span />}
        {newer ? <Link href={`/posts/${newer.slug}`} className="text-muted hover:text-fg">{newer.date.slice(0, 10)} →</Link> : <span />}
      </nav>
    </>
  );
}
