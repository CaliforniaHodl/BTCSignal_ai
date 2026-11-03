import type { Metadata } from "next";
import { LearnIndex } from "@/components/learn-index";
import { Page, PageHeader } from "@/components/ui";
import { CATEGORY_LABELS, getGuideIndex } from "@/lib/content/learn";

export const metadata: Metadata = {
  title: "Learn",
  description: "Free guides on Bitcoin market structure, indicators, derivatives, on-chain data, risk management and trading psychology.",
  alternates: { canonical: "/learn" },
  openGraph: { title: "Learn · BTCSignal.ai", description: "Free guides on reading the Bitcoin market.", url: "/learn", type: "website" },
};

export default function LearnPage() {
  const guides = getGuideIndex();
  return (
    <Page>
      <PageHeader eyebrow="Learn" title="Guides"
        lede={`${guides.length} free guides on reading the Bitcoin market: indicators, derivatives, on-chain data, risk, and the psychology that undoes most plans.`} />
      <LearnIndex
        guides={guides.map(({ slug, title, description, category, difficulty, tags, readMinutes }) => ({ slug, title, description, category, difficulty, tags, readMinutes }))}
        categories={Object.entries(CATEGORY_LABELS)} />
    </Page>
  );
}
