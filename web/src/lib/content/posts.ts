/**
 * Legacy v1 daily analysis posts (content/posts/*.md). Historical archive only:
 * the v1 engine that wrote them was retired. URLs match the Hugo site
 * (/posts/<filename-without-.md>).
 *
 * Reads with sync fs so pages prerender (see Next "predictable values").
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { LegacyCall } from "@/lib/legacy/archive";

const DIR = path.join(process.cwd(), "content", "posts");
const SLUG = /^[a-z0-9-]+$/;

export type LegacyPost = LegacyCall & {
  slug: string;
  title: string;
  timeframe: string | null;
  rsi: number | null;
  body: string;
};

const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function parse(slug: string, raw: string): LegacyPost {
  const { data: f, content } = matter(raw);
  const dir = f.direction === "up" || f.direction === "down" ? f.direction : null;
  if (!dir) throw new Error(`post ${slug}: bad direction ${String(f.direction)}`);
  const date = f.date instanceof Date ? f.date.toISOString() : new Date(String(f.date)).toISOString();
  return {
    slug,
    // Titles carried emoji ("BTC-USD 📈 UP 72%"); rebuild a plain one from the data.
    title: `BTC-USD ${dir.toUpperCase()} ${Number(f.confidence)}% — ${date.slice(0, 10)}`,
    date,
    direction: dir,
    confidence: Number(f.confidence),
    price: Number(f.price),
    targetPrice: Number(f.targetPrice),
    stopLoss: Number(f.stopLoss),
    callResult: f.callResult === "win" || f.callResult === "loss" ? f.callResult : null,
    excludeFromStats: f.excludeFromStats === true,
    archiveNote: typeof f.archiveNote === "string" ? f.archiveNote : null,
    timeframe: typeof f.timeframe === "string" ? f.timeframe : null,
    rsi: numOrNull(f.rsi),
    body: content,
  };
}

let cache: LegacyPost[] | null = null;

/** All posts, newest first. */
export function getPosts(): LegacyPost[] {
  if (cache) return cache;
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  cache = files
    .map((f) => parse(f.replace(/\.md$/, ""), fs.readFileSync(path.join(DIR, f), "utf8")))
    .sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}

export function getPost(slug: string): LegacyPost | null {
  if (!SLUG.test(slug)) return null;
  return getPosts().find((p) => p.slug === slug) ?? null;
}

/** data/historical-calls.json from the legacy repo: the v1 bot's own P&L ledger. */
export type HistoricalCall = {
  date: string;
  direction: "up" | "down";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  actualResult: string;
  pnlPercent: number | null;
};

export function getHistoricalCalls(): HistoricalCall[] {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "legacy", "historical-calls.json"), "utf8"));
}
