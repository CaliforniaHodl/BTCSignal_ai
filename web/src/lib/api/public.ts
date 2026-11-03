/**
 * Helpers for the public, documented API under /api/v1. GET-only, CORS `*`,
 * no cookies read, CDN-cacheable. Shapes are documented on /api-docs — treat
 * them as a contract: add fields, never rename or remove.
 */
import type { Datum } from "@/lib/market/types";

export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

/** `maxAge` = seconds a browser/CDN may reuse the response. */
export function publicJson(body: unknown, { maxAge, swr = maxAge * 3, status = 200 }: { maxAge: number; swr?: number; status?: number }) {
  return Response.json(body, {
    status,
    headers: { ...CORS, "cache-control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${swr}` },
  });
}

/** A Datum response: 200 when ok, 502 when the upstream source failed (body is still a Datum). */
export function publicDatum<T>(d: Datum<T>, maxAge: number) {
  return publicJson(d, { maxAge: d.ok ? maxAge : 5, status: d.ok ? 200 : 502 });
}

export function publicError(error: string, status = 400) {
  return Response.json({ error }, { status, headers: { ...CORS, "cache-control": "no-store" } });
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Re-wrap the value of a Datum without changing its source/age. */
export function mapDatum<T, U>(d: Datum<T>, fn: (v: T) => U): Datum<U> {
  return d.ok ? { ok: true, value: fn(d.value), source: d.source, fetchedAt: d.fetchedAt } : d;
}
