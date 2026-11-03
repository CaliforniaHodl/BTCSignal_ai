/**
 * Fiat FX from Coinbase's public exchange-rates endpoint. We only use the
 * *ratios* between fiats (e.g. EUR per USD) and multiply by the site's shared
 * Coinbase BTC-USD spot, so every currency agrees with the one site price.
 */
import { cacheLife, cacheTag } from "next/cache";
import { cachedDatum, stamp, type Stamped } from "@/lib/onchain/cached";
import { getJson, num } from "./http";
import type { Datum } from "./types";

export const FIATS = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF"] as const;
export type Fiat = (typeof FIATS)[number];

/** Units of each fiat per 1 USD. */
export type FxRates = Record<Fiat, number>;

async function fetchFx(): Promise<Stamped<FxRates>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 600, expire: 3600 });
  cacheTag("fx-rates");
  return stamp(async () => {
    const r = await getJson<{ data: { currency: string; rates: Record<string, string> } }>(
      "https://api.coinbase.com/v2/exchange-rates?currency=USD"
    );
    if (r.data?.currency !== "USD") throw new Error("unexpected base currency");
    const out = {} as FxRates;
    for (const f of FIATS) out[f] = f === "USD" ? 1 : num(r.data.rates[f], `fx ${f}`);
    return out;
  });
}

export function getFx(): Promise<Datum<FxRates>> {
  return cachedDatum("Coinbase exchange-rates", fetchFx);
}
