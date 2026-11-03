/** Access passes, priced in sats. Prices carried over from the legacy site's access-manager; change here only. */
export const TIERS = {
  day: { label: "Day pass", sats: 10_000, hours: 24, blurb: "Everything Pro for 24 hours." },
  week: { label: "Week pass", sats: 25_000, hours: 24 * 7, blurb: "Seven days of Pro tools and signals." },
  month: { label: "Month pass", sats: 50_000, hours: 24 * 30, blurb: "Thirty days. The best value for active traders." },
  year: { label: "Year pass", sats: 400_000, hours: 24 * 365, blurb: "A full year of Pro, paid once." },
} as const;

export type TierId = keyof typeof TIERS;
export const isTier = (v: unknown): v is TierId => typeof v === "string" && v in TIERS;
