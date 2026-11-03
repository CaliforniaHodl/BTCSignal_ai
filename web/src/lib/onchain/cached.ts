import type { Datum } from "@/lib/market/types";

export type Stamped<T> = { value: T; fetchedAt: number };

/** Stamp a successful fetch so the age survives caching. */
export async function stamp<T>(fn: () => Promise<T>): Promise<Stamped<T>> {
  return { value: await fn(), fetchedAt: Date.now() };
}

/**
 * Wrap a `"use cache"` function that *throws* on failure. Failures are never
 * cached (a thrown error isn't stored), so a source outage doesn't pin an
 * "Unavailable" for the cache lifetime; successes carry their original fetch time.
 */
export async function cachedDatum<T>(source: string, fn: () => Promise<Stamped<T>>): Promise<Datum<T>> {
  try {
    const { value, fetchedAt } = await fn();
    return { ok: true, value, source, fetchedAt };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[onchain] ${source} failed: ${error}`);
    return { ok: false, source, fetchedAt: Date.now(), error };
  }
}
