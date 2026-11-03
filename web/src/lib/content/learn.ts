/**
 * Learn guides (content/learn/*.md). URLs match the Hugo site: /learn/<slug>.
 * Sync fs so pages prerender.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { readingMinutes } from "./markdown";

const DIR = path.join(process.cwd(), "content", "learn");
const SLUG = /^[a-z0-9-]+$/;

export const CATEGORY_LABELS: Record<string, string> = {
  fundamentals: "Fundamentals",
  technical: "Technical analysis",
  strategies: "Strategies",
  derivatives: "Derivatives",
  sentiment: "Sentiment",
  "on-chain": "On-chain",
  "risk-management": "Risk management",
  psychology: "Psychology",
  advanced: "Advanced concepts",
};
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export type GuideMeta = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  tags: string[];
  readMinutes: number;
  date: string | null;
};
export type Guide = GuideMeta & { body: string };

// Legacy files used both "risk" and "risk-management".
const normCategory = (c: unknown) => (c === "risk" ? "risk-management" : typeof c === "string" && c in CATEGORY_LABELS ? c : "fundamentals");

function parse(file: string, raw: string): Guide {
  const { data: f, content } = matter(raw);
  const slug = typeof f.slug === "string" && SLUG.test(f.slug) ? f.slug : file.replace(/\.md$/, "");
  const declared = typeof f.readTime === "string" ? parseInt(f.readTime, 10) : NaN;
  const difficulty = (DIFFICULTIES as readonly string[]).includes(f.difficulty) ? (f.difficulty as Difficulty) : "beginner";
  return {
    slug,
    title: String(f.title ?? slug),
    description: String(f.description ?? ""),
    category: normCategory(f.category),
    difficulty,
    tags: Array.isArray(f.tags) ? f.tags.filter((t: unknown): t is string => typeof t === "string" && t !== "education") : [],
    readMinutes: Number.isFinite(declared) ? declared : readingMinutes(content),
    date: f.date instanceof Date ? f.date.toISOString().slice(0, 10) : typeof f.date === "string" ? f.date : null,
    body: content,
  };
}

let cache: Guide[] | null = null;

export function getGuides(): Guide[] {
  if (cache) return cache;
  cache = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => parse(f, fs.readFileSync(path.join(DIR, f), "utf8")))
    .sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

export const getGuideIndex = (): GuideMeta[] =>
  getGuides().map((g) => ({ slug: g.slug, title: g.title, description: g.description, category: g.category, difficulty: g.difficulty, tags: g.tags, readMinutes: g.readMinutes, date: g.date }));

export function getGuide(slug: string): Guide | null {
  if (!SLUG.test(slug)) return null;
  return getGuides().find((g) => g.slug === slug) ?? null;
}
