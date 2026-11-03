import type { Datum } from "./types";

const UA = "btcsignal-ai/2.0 (+https://btctradingsignalai.netlify.app)";

export async function getJson<T = unknown>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 6000, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { accept: "application/json", "user-agent": UA, ...rest.headers },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

/** Run a source adapter and wrap the result (or failure) as a Datum. */
export async function datum<T>(source: string, fn: () => Promise<T>): Promise<Datum<T>> {
  try {
    const value = await fn();
    return { ok: true, value, source, fetchedAt: Date.now() };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[market] ${source} failed: ${error}`);
    return { ok: false, source, fetchedAt: Date.now(), error };
  }
}

export function num(v: unknown, field: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`bad number for ${field}: ${String(v)}`);
  return n;
}
