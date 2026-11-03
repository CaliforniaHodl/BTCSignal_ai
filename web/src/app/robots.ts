import type { MetadataRoute } from "next";
import { NOINDEX_ROUTES, SITE_URL } from "@/lib/site/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...NOINDEX_ROUTES.map((r) => `/${r}`)] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
