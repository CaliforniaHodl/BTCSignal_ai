/**
 * Trade journal model: per-browser entries, derived P&L / R, stats, CSV,
 * and migration from the two legacy localStorage formats. Pure.
 */
export type Side = "long" | "short";
export type JournalEntry = {
  id: string;
  side: Side;
  entryDate: string; // YYYY-MM-DD
  exitDate: string | null;
  entry: number;
  exit: number | null;
  stop: number | null;
  target: number | null;
  sizeUsd: number;
  feesUsd: number;
  tags: string[];
  notes: string;
  timeframe: string | null;
};

export const STORAGE_KEY = "btcs_journal_v2";
export const LEGACY_KEYS = ["trade-journal-entries", "btcsai_trade_journal"] as const;
export const MAX_ENTRIES = 2000;

export const isClosed = (e: JournalEntry) => e.exit != null;

export function pnlUsd(e: JournalEntry): number | null {
  if (e.exit == null || e.entry <= 0) return null;
  const qty = e.sizeUsd / e.entry;
  return (e.side === "long" ? e.exit - e.entry : e.entry - e.exit) * qty - e.feesUsd;
}
export function pnlPct(e: JournalEntry): number | null {
  const p = pnlUsd(e);
  return p == null || e.sizeUsd <= 0 ? null : (p / e.sizeUsd) * 100;
}
/** P&L in units of the planned risk (entry→stop). null without a stop. */
export function rMultiple(e: JournalEntry): number | null {
  const p = pnlUsd(e);
  if (p == null || e.stop == null || e.stop === e.entry) return null;
  const risk = Math.abs(e.entry - e.stop) * (e.sizeUsd / e.entry);
  return risk > 0 ? p / risk : null;
}

export type Stats = {
  closed: number; open: number; wins: number; losses: number; winRatePct: number | null;
  totalPnl: number; avgWin: number | null; avgLoss: number | null; profitFactor: number | null;
  expectancyUsd: number | null; avgR: number | null; rTrades: number; best: number | null; worst: number | null;
  byTag: { tag: string; trades: number; pnl: number; winRatePct: number }[];
  bySide: Record<Side, { trades: number; pnl: number; winRatePct: number | null }>;
};

export function stats(entries: JournalEntry[]): Stats {
  const closed = entries.filter(isClosed);
  const pnls = closed.map((e) => pnlUsd(e)!);
  const wins = pnls.filter((p) => p > 0), losses = pnls.filter((p) => p <= 0);
  const gw = wins.reduce((a, b) => a + b, 0), gl = -losses.reduce((a, b) => a + b, 0);
  const rs = closed.map(rMultiple).filter((r): r is number => r != null);
  const tags = new Map<string, number[]>();
  closed.forEach((e, i) => e.tags.forEach((t) => tags.set(t, [...(tags.get(t) ?? []), pnls[i]])));
  const side = (s: Side) => {
    const ps = closed.flatMap((e, i) => (e.side === s ? [pnls[i]] : []));
    return { trades: ps.length, pnl: ps.reduce((a, b) => a + b, 0), winRatePct: ps.length ? (ps.filter((p) => p > 0).length / ps.length) * 100 : null };
  };
  return {
    closed: closed.length,
    open: entries.length - closed.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: closed.length ? (wins.length / closed.length) * 100 : null,
    totalPnl: pnls.reduce((a, b) => a + b, 0),
    avgWin: wins.length ? gw / wins.length : null,
    avgLoss: losses.length ? -gl / losses.length : null,
    profitFactor: gl > 0 ? gw / gl : null,
    expectancyUsd: closed.length ? pnls.reduce((a, b) => a + b, 0) / closed.length : null,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    rTrades: rs.length,
    best: pnls.length ? Math.max(...pnls) : null,
    worst: pnls.length ? Math.min(...pnls) : null,
    byTag: [...tags].map(([tag, ps]) => ({ tag, trades: ps.length, pnl: ps.reduce((a, b) => a + b, 0), winRatePct: (ps.filter((p) => p > 0).length / ps.length) * 100 }))
      .sort((a, b) => b.trades - a.trades),
    bySide: { long: side("long"), short: side("short") },
  };
}

// ---------- Normalisation / legacy migration ----------

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const dateOnly = (v: unknown): string | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const tagList = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[,;|]/) : [])
    .map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);

let seq = 0;
export const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `j${Date.now().toString(36)}${(seq++).toString(36)}`);

/**
 * Accepts the current shape AND both legacy shapes:
 *  - trade-journal.js:   { direction, entryPrice, exitPrice, size, stopLoss, takeProfit, entryDate, exitDate, tags[], notes, timeframe }
 *  - layouts/journal:    { type, entryPrice, exitPrice, positionSize, date, tags:"a,b", notes }
 * Returns null for anything without a usable side + entry price + size.
 */
export function normalize(raw: unknown): JournalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sideRaw = String(r.side ?? r.direction ?? r.type ?? "").toLowerCase();
  const side: Side | null = sideRaw === "long" || sideRaw === "buy" ? "long" : sideRaw === "short" || sideRaw === "sell" ? "short" : null;
  const entry = numOrNull(r.entry ?? r.entryPrice);
  const size = numOrNull(r.sizeUsd ?? r.size ?? r.positionSize);
  if (!side || entry == null || entry <= 0 || size == null || size <= 0) return null;
  const exit = numOrNull(r.exit ?? r.exitPrice);
  const entryDate = dateOnly(r.entryDate ?? r.date) ?? new Date().toISOString().slice(0, 10);
  return {
    id: typeof r.id === "string" && r.id ? r.id.slice(0, 64) : newId(),
    side,
    entryDate,
    exitDate: exit != null && exit > 0 ? dateOnly(r.exitDate) ?? entryDate : null,
    entry,
    exit: exit != null && exit > 0 ? exit : null,
    stop: positive(numOrNull(r.stop ?? r.stopLoss)),
    target: positive(numOrNull(r.target ?? r.takeProfit)),
    sizeUsd: size,
    feesUsd: Math.max(0, numOrNull(r.feesUsd ?? r.fees) ?? 0),
    tags: tagList(r.tags),
    notes: typeof r.notes === "string" ? r.notes.slice(0, 2000) : "",
    timeframe: typeof r.timeframe === "string" && r.timeframe ? r.timeframe.slice(0, 8) : null,
  };
}
const positive = (n: number | null) => (n != null && n > 0 ? n : null);

/** Merge legacy arrays into the current list, skipping duplicates (same id, or same side/entry/date/size). */
export function mergeEntries(current: JournalEntry[], incoming: unknown[]): { entries: JournalEntry[]; added: number } {
  const ids = new Set(current.map((e) => e.id));
  const sig = (e: JournalEntry) => `${e.side}|${e.entry}|${e.entryDate}|${e.sizeUsd}|${e.exit ?? ""}`;
  const sigs = new Set(current.map(sig));
  const out = [...current];
  let added = 0;
  for (const raw of incoming) {
    const e = normalize(raw);
    if (!e || ids.has(e.id) || sigs.has(sig(e))) continue;
    ids.add(e.id); sigs.add(sig(e)); out.push(e); added++;
  }
  return { entries: sortEntries(out).slice(0, MAX_ENTRIES), added };
}

export const sortEntries = (xs: JournalEntry[]) => [...xs].sort((a, b) => (b.entryDate > a.entryDate ? 1 : b.entryDate < a.entryDate ? -1 : 0));

/** Set once legacy keys have been imported, so deleting a migrated entry doesn't resurrect it. */
export const MIGRATED_FLAG = "btcs_journal_migrated";

/** Read current + (unless already migrated) legacy keys from a Storage-like object. Never throws. */
export function loadAll(store: Pick<Storage, "getItem"> | null, { includeLegacy = true } = {}): { entries: JournalEntry[]; migrated: number } {
  const read = (k: string): unknown[] => {
    try {
      const v = JSON.parse(store?.getItem(k) ?? "null");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const current = mergeEntries([], read(STORAGE_KEY)).entries;
  let entries = current, migrated = 0;
  for (const k of includeLegacy ? LEGACY_KEYS : []) {
    const r = mergeEntries(entries, read(k));
    entries = r.entries; migrated += r.added;
  }
  return { entries, migrated };
}

// ---------- CSV ----------

const COLS = ["id", "side", "entryDate", "exitDate", "entry", "exit", "stop", "target", "sizeUsd", "feesUsd", "tags", "timeframe", "notes", "pnlUsd", "rMultiple"] as const;

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Prefix formula-looking cells so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(entries: JournalEntry[]): string {
  const rows = entries.map((e) => COLS.map((c) => {
    if (c === "tags") return esc(e.tags.join("; "));
    if (c === "pnlUsd") { const p = pnlUsd(e); return p == null ? "" : p.toFixed(2); }
    if (c === "rMultiple") { const r = rMultiple(e); return r == null ? "" : r.toFixed(2); }
    return esc(e[c]);
  }).join(","));
  return [COLS.join(","), ...rows].join("\n");
}

/** RFC-4180-ish parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** CSV → raw objects keyed by header (case-insensitive aliases handled by normalize()). */
export function fromCsv(text: string): { rows: Record<string, string>[]; error?: string } {
  const all = parseCsv(text.replace(/^﻿/, ""));
  if (all.length < 2) return { rows: [], error: "No data rows found." };
  const head = all[0].map((h) => h.trim());
  const alias: Record<string, string> = { direction: "side", type: "side", entryprice: "entry", exitprice: "exit", stoploss: "stop", takeprofit: "target", size: "sizeUsd", positionsize: "sizeUsd", sizeusd: "sizeUsd", fees: "feesUsd", feesusd: "feesUsd", date: "entryDate", entrydate: "entryDate", exitdate: "exitDate" };
  const keys = head.map((h) => alias[h.toLowerCase()] ?? h);
  const rows = all.slice(1).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").replace(/^'(?=[=+\-@])/, "")])));
  return { rows };
}
