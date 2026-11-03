import type { Metadata } from "next";
import Link from "next/link";
import { Card, Page, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "A weekly BTCSignal.ai email is coming. We don't collect any email addresses yet.",
  alternates: { canonical: "/newsletter" },
  openGraph: { title: "Newsletter · BTCSignal.ai", description: "Coming soon.", url: "/newsletter", type: "website" },
};

/** No email provider is wired up, so this page deliberately has no signup form. */
export default function NewsletterPage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="Newsletter" title="Coming soon"
        lede="A weekly email with the agent's trades, the week's signals and what moved the market is planned. It isn't running yet." />
      <Card className="mt-10">
        <p className="text-sm text-muted">
          There&apos;s no signup form because we don&apos;t have an email provider set up, and we won&apos;t collect addresses we
          can&apos;t send to or protect properly. When it launches, it will be announced on X at{" "}
          <a href="https://x.com/BTCSignal_ai" className="text-accent" rel="noopener noreferrer" target="_blank">@BTCSignal_ai</a>.
        </p>
        <p className="mt-4 text-sm text-muted">Until then, everything the email would contain is already public:</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li><Link href="/agent" className="text-accent">The trading agent</Link>: every decision, live</li>
          <li><Link href="/signal-history" className="text-accent">Signal history</Link>: every signal and outcome</li>
          <li><Link href="/trading-history" className="text-accent">Agent P&amp;L</Link>: every paper trade</li>
        </ul>
      </Card>
    </Page>
  );
}
