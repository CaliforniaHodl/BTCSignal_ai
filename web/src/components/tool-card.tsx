import Link from "next/link";
import clsx from "clsx";
import type { Tool } from "@/lib/site/registry";

export function ToolCard({ tool }: { tool: Tool }) {
  const live = tool.status === "live";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-faint">{tool.category}</span>
        <div className="flex gap-1.5 text-[11px]">
          {tool.tier === "premium" && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">PRO</span>}
          {!live && <span className="rounded bg-sunken px-1.5 py-0.5 text-faint">Rebuilding · phase {tool.phase}</span>}
        </div>
      </div>
      <h3 className="mt-3 font-medium">{tool.name}</h3>
      <p className="mt-1 text-sm text-muted">{tool.blurb}</p>
    </>
  );
  const cls = clsx("card block p-5 transition", live ? "hover:border-line-strong hover:bg-[#10151d]" : "opacity-70");
  return live ? (
    <Link href={`/${tool.slug}`} className={cls}>{body}</Link>
  ) : (
    <div className={cls} aria-disabled>{body}</div>
  );
}
