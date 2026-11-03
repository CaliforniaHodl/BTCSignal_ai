import type { Timeframe } from "@/lib/market/types";

/** Client-safe twin of `isTimeframe` in market/snapshot (which pulls in server caching). */
export const CHART_TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d"];
export function isTimeframeClient(v: string | null): v is Timeframe {
  return v != null && (CHART_TIMEFRAMES as string[]).includes(v);
}
