import type { MetadataRoute } from "next";
import { getGuideIndex } from "@/lib/content/learn";
import { getPosts } from "@/lib/content/posts";
import { PAGES, TOOLS } from "@/lib/site/registry";
import { NOINDEX_ROUTES, SITE_URL } from "@/lib/site/url";

const PRIORITY: Record<string, number> = { "": 1, agent: 0.9, tools: 0.8, posts: 0.8, learn: 0.8, pricing: 0.8, "signal-history": 0.8 };
const LEGAL = new Set(["terms", "terms-of-use", "privacy-policy", "accessibility-statement"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const skip = new Set<string>(NOINDEX_ROUTES);
  const routes = Array.from(new Set(["", "tools", ...TOOLS.map((t) => t.slug), ...PAGES])).filter((r) => !skip.has(r));

  const pages: MetadataRoute.Sitemap = routes.map((r) => ({
    url: r ? `${SITE_URL}/${r}` : SITE_URL,
    changeFrequency: LEGAL.has(r) ? "yearly" : "daily",
    priority: PRIORITY[r] ?? (LEGAL.has(r) ? 0.2 : 0.6),
  }));

  const guides: MetadataRoute.Sitemap = getGuideIndex().map((g) => ({
    url: `${SITE_URL}/learn/${g.slug}`,
    lastModified: g.date ?? undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Archived v1 posts. Ones flagged as placeholder data are noindex, so leave them out.
  const posts: MetadataRoute.Sitemap = getPosts().filter((p) => !p.excludeFromStats).map((p) => ({
    url: `${SITE_URL}/posts/${p.slug}`,
    lastModified: p.date,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...pages, ...guides, ...posts];
}
