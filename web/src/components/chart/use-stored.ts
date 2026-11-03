"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Per-browser string state in localStorage, hydration-safe (server snapshot is
 * null) and synced across components/tabs. Falls back to in-memory if storage
 * is blocked.
 */
const memory = new Map<string, string | null>();
const EVT = "btcs:stored";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: key }));
}

export function useStored(key: string): [string | null, (v: string | null) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onEvt = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) cb();
      };
      window.addEventListener("storage", onEvt);
      window.addEventListener(EVT, onEvt);
      return () => {
        window.removeEventListener("storage", onEvt);
        window.removeEventListener(EVT, onEvt);
      };
    },
    [key]
  );
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = useCallback((v: string | null) => writeStored(key, v), [key]);
  return [value, set];
}
