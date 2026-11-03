import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED, POLICIES } from "@/components/legal";
import { Page, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Policies",
  description: "BTCSignal.ai terms of use, privacy policy and accessibility statement.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Policies · BTCSignal.ai", description: "Terms, privacy and accessibility.", url: "/terms", type: "website" },
};

export default function TermsIndexPage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="Policies" title="Terms & policies" lede={`Plain-language policies for BTCSignal.ai. Last updated ${LEGAL_UPDATED}.`} />
      <ul className="mt-10 space-y-3">
        {POLICIES.map(([href, title, blurb]) => (
          <li key={href}>
            <Link href={href} className="card block p-5 hover:border-line-strong">
              <span className="font-medium">{title}</span>
              <span className="mt-1 block text-sm text-muted">{blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">
        The short version: this is an information service, not financial advice; the trading agent uses a paper account; passes are
        one-off Lightning payments that never auto-renew; and we store as little about you as we can.
      </p>
    </Page>
  );
}
