import { connection } from "next/server";
import { mapDatum, preflight, publicDatum } from "@/lib/api/public";
import { getMarketSnapshot } from "@/lib/market/snapshot";

/** GET /api/v1/funding — BTC perpetual funding (normalised to 8h) and open interest per venue. */
export async function GET() {
  await connection();
  const s = await getMarketSnapshot();
  return publicDatum(
    mapDatum(s.derivatives, (v) => ({
      avgRate8h: v.avgRate8h,
      avgRateAnnualisedPct: v.avgRate8h * 3 * 365 * 100,
      totalOpenInterestUsd: v.totalOpenInterestUsd,
      venues: v.venues.map((x) => ({ venue: x.venue, rate8h: x.rate8h, openInterestUsd: x.openInterestUsd })),
    })),
    30
  );
}

export const OPTIONS = preflight;
