import { connection } from "next/server";
import { getMarketSnapshot } from "@/lib/market/snapshot";
import { getMempool } from "@/lib/onchain/mempool";

/** Live feed for the fee estimator: the shared fee tiers + spot, plus mempool backlog. */
export async function GET() {
  await connection();
  const [snap, mempool] = await Promise.all([getMarketSnapshot(), getMempool()]);
  return Response.json(
    { fees: snap.fees, spot: snap.spot, mempool },
    { headers: { "cache-control": "public, max-age=10, stale-while-revalidate=30" } }
  );
}
