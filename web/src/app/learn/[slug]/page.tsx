import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProseHtml } from "@/components/prose";
import { Badge, Disclaimer, Page } from "@/components/ui";
import { CATEGORY_LABELS, getGuide, getGuideIndex } from "@/lib/content/learn";
import { renderMarkdown } from "@/lib/content/markdown";

/**
 * Every slug is prerendered by generateStaticParams, so blocking on params costs nothing and lets
 * notFound() send a 404 instead of a streamed 200 (Next docs: not-found "Status codes").
 */
export const instant = false;

export function generateStaticParams() {
  return getGuideIndex().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[slug]">): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  return {
    title: g.title,
    description: g.description,
    keywords: g.tags,
    alternates: { canonical: `/learn/${g.slug}` },
    openGraph: { title: g.title, description: g.description, url: `/learn/${g.slug}`, type: "article", tags: g.tags },
  };
}

export default async function GuidePage({ params }: PageProps<"/learn/[slug]">) {
  return (
    <Page narrow>
      <Link href="/learn" className="text-sm text-muted hover:text-fg">← All guides</Link>
      {/* Awaited outside Suspense on purpose: unknown slugs must return a real 404 (see `instant` above). */}
      <GuideBody slug={(await params).slug} />
      <Disclaimer>Education only. Not financial advice. Examples are illustrative, not predictions.</Disclaimer>
    </Page>
  );
}

function GuideBody({ slug }: { slug: string }) {
  const g = getGuide(slug);
  if (!g) notFound();
  const related = getGuideIndex().filter((x) => x.category === g.category && x.slug !== g.slug).slice(0, 4);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="accent">{CATEGORY_LABELS[g.category] ?? g.category}</Badge>
        <Badge>{g.difficulty}</Badge>
        <span className="text-xs text-faint">{g.readMinutes} min read</span>
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{g.title}</h1>
      {g.description && <p className="mt-3 text-lg text-muted">{g.description}</p>}
      <article className="mt-10">
        <ProseHtml html={renderMarkdown(g.body)} />
      </article>
      {related.length > 0 && (
        <aside className="mt-14 border-t border-line pt-8">
          <h2 className="text-sm uppercase tracking-wider text-faint">More in {CATEGORY_LABELS[g.category] ?? g.category}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}><Link href={`/learn/${r.slug}`} className="card block p-4 hover:border-line-strong"><span className="font-medium">{r.title}</span><span className="mt-1 block text-sm text-muted">{r.description}</span></Link></li>
            ))}
          </ul>
        </aside>
      )}
    </>
  );
}
