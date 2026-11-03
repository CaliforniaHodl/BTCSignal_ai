import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/tool-card";
import { Page, PageHeader } from "@/components/ui";
import { TOOLS, type Category } from "@/lib/site/registry";
import { TIERS } from "@/lib/pay/tiers";

export const metadata: Metadata = {
  title: "Pro tools",
  description: "Every Pro tool on BTCSignal.ai: the dashboard, Alpha Radar, advanced charts, AI trade review and backtesting. One Lightning pass unlocks all of them.",
};

const ORDER: Category[] = ["Markets", "Charts", "Derivatives", "On-chain", "AI", "Calculators", "Tracking"];

export default function ProToolsPage() {
  const pro = TOOLS.filter((t) => t.tier === "premium");
  const live = pro.filter((t) => t.status === "live").length;
  const cheapest = Object.values(TIERS).sort((a, b) => a.sats - b.sats)[0];
  return (
    <Page>
      <PageHeader
        eyebrow="Pro"
        title="Pro tools"
        lede={`${pro.length} tools built on the same real-data layer as the rest of the site: no estimates passed off as data, every number with its source.`}
      >
        <p className="mt-3 text-sm text-muted">
          {live} of {pro.length} are live on the new stack; the rest are being rebuilt. One pass unlocks everything{cheapest ? `, from ${cheapest.sats.toLocaleString()} sats` : ""}. No account needed.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-lg bg-accent px-4 py-2.5 font-medium text-black">See passes</Link>
          <Link href="/tools" className="rounded-lg border border-line-strong px-4 py-2.5 font-medium">All tools</Link>
        </div>
      </PageHeader>
      <div className="mt-12 space-y-10">
        {ORDER.map((cat) => {
          const tools = pro.filter((t) => t.category === cat);
          if (!tools.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-4 text-sm uppercase tracking-wider text-faint">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((t) => <ToolCard key={t.slug} tool={t} />)}</div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
