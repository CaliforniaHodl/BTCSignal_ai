/** Absolute site origin, no trailing slash. Same source as `metadataBase` in app/layout.tsx. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://btctradingsignalai.netlify.app").replace(/\/+$/, "");

/** Routes that exist but shouldn't be indexed (private, utility, or embed-only). */
export const NOINDEX_ROUTES = ["owner", "owner-trading", "account", "recover", "embed/key-level"] as const;
