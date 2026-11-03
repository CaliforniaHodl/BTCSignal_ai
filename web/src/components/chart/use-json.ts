"use client";

import { useEffect, useState } from "react";

export type Load<T> =
  | { state: "loading" }
  | { state: "ok"; data: T; at: number }
  | { state: "error"; status: number | null; data?: T };

/**
 * Fetch JSON from one of our own routes, re-polling every `refreshMs`.
 * Keeps the previous data while a refresh is in flight; a URL change resets to loading.
 */
export function useJson<T>(url: string | null, refreshMs = 60_000, ok: (d: T) => boolean = () => true): Load<T> {
  const [res, setRes] = useState<{ url: string | null; load: Load<T> }>({ url, load: { state: "loading" } });
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const run = () =>
      fetch(url, { cache: "no-store" })
        .then(async (r) => {
          const body = (await r.json().catch(() => null)) as T | null;
          if (cancelled) return;
          if (r.ok && body != null && ok(body)) setRes({ url, load: { state: "ok", data: body, at: Date.now() } });
          else setRes((prev) => (prev.url === url && prev.load.state === "ok" ? prev : { url, load: { state: "error", status: r.status, data: body ?? undefined } }));
        })
        .catch(() => {
          if (!cancelled) setRes((prev) => (prev.url === url && prev.load.state === "ok" ? prev : { url, load: { state: "error", status: null } }));
        });
    run();
    const id = refreshMs > 0 ? setInterval(run, refreshMs) : null;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ok` is a pure predicate
  }, [url, refreshMs]);
  return res.url === url ? res.load : { state: "loading" };
}
