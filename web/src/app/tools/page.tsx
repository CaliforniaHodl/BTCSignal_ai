import type { Metadata } from "next";
import { ToolCard } from "@/components/tool-card";
import { TOOLS, type Category } from "@/lib/site/registry";

export const metadata: Metadata = { title: "Tools" };

const ORDER: Category[] = ["Tracking", "Markets", "Charts", "Derivatives", "On-chain", "AI", "Calculators"];

export default function ToolsPage() {
  const live = TOOLS.filter((t) => t.status === "live").length;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tools</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Everything from the original site is being rebuilt on one shared data layer. {live} of {TOOLS.length} are
        live on the new stack so far.
      </p>
      <div className="mt-10 space-y-12">
        {ORDER.map((cat) => {
          const tools = TOOLS.filter((t) => t.category === cat);
          if (!tools.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-4 text-sm uppercase tracking-wider text-faint">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => <ToolCard key={t.slug} tool={t} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
