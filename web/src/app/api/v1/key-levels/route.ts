import { mapDatum, preflight, publicDatum, publicError } from "@/lib/api/public";
import { getKeyLevels, LEVEL_METHOD } from "@/lib/market/pro";
import { isTimeframe, TIMEFRAMES } from "@/lib/market/snapshot";

/** GET /api/v1/key-levels?tf=1h — support/resistance derived from Coinbase candles. */
export async function GET(req: Request) {
  const tf = new URL(req.url).searchParams.get("tf") ?? "1h";
  if (!isTimeframe(tf)) return publicError(`tf must be one of ${TIMEFRAMES.join(", ")}`);
  const d = await getKeyLevels(tf);
  return publicDatum(mapDatum(d, (v) => ({ ...v, method: LEVEL_METHOD })), tf === "1d" ? 300 : 60);
}

export const OPTIONS = preflight;
