"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Renders a timestamp in the viewer's timezone (server renders UTC, then hydrates). */
export function LocalTime({ iso, withDate = true }: { iso: string; withDate?: boolean }) {
  const local = useSyncExternalStore(
    subscribe,
    () => new Date(iso).toLocaleString(undefined, withDate ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" }),
    () => new Date(iso).toISOString().slice(withDate ? 5 : 11, 16).replace("T", " ") + " UTC"
  );
  return <time dateTime={iso}>{local}</time>;
}
