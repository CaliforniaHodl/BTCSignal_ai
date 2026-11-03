import { connection } from "next/server";
import { getMarketSnapshot } from "@/lib/market/snapshot";

export async function GET() {
  await connection(); // always request-time; the snapshot itself is cached ~30s
  const snapshot = await getMarketSnapshot();
  return Response.json(snapshot, {
    headers: { "cache-control": "public, max-age=10, stale-while-revalidate=30" },
  });
}
