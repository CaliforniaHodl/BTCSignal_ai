import { connection } from "next/server";
import { preflight, publicJson } from "@/lib/api/public";
import { getMarketSnapshot } from "@/lib/market/snapshot";

/** GET /api/v1/snapshot — the whole market snapshot; each field is its own Datum. */
export async function GET() {
  await connection(); // always request-time; the snapshot itself is cached ~30s
  const snapshot = await getMarketSnapshot();
  return publicJson(snapshot, { maxAge: 10, swr: 30 });
}

export const OPTIONS = preflight;
