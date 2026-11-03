/** User drawings (per browser). Parsing is defensive because localStorage is user-controlled. */
import { C, type ChartSpec } from "./spec";

export type HLine = { id: string; price: number };
export type Trend = { id: string; a: { time: number; price: number }; b: { time: number; price: number } };
export type Drawings = { hlines: HLine[]; trends: Trend[] };

export const EMPTY_DRAWINGS: Drawings = { hlines: [], trends: [] };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isPt = (v: unknown): v is { time: number; price: number } =>
  typeof v === "object" && v != null && isNum((v as { time: unknown }).time) && isNum((v as { price: unknown }).price);

export function parseDrawings(raw: string | null): Drawings {
  if (!raw) return { hlines: [], trends: [] };
  try {
    const j = JSON.parse(raw) as { hlines?: unknown[]; trends?: unknown[] };
    const hlines = (Array.isArray(j.hlines) ? j.hlines : []).flatMap((h) => {
      const x = h as HLine;
      return x && typeof x.id === "string" && isNum(x.price) ? [{ id: x.id, price: x.price }] : [];
    });
    const trends = (Array.isArray(j.trends) ? j.trends : []).flatMap((t) => {
      const x = t as Trend;
      return x && typeof x.id === "string" && isPt(x.a) && isPt(x.b) && x.a.time !== x.b.time
        ? [{ id: x.id, a: { time: x.a.time, price: x.a.price }, b: { time: x.b.time, price: x.b.price } }]
        : [];
    });
    return { hlines: hlines.slice(0, 50), trends: trends.slice(0, 50) };
  } catch {
    return { hlines: [], trends: [] };
  }
}

export function drawingsSpec(d: Drawings): ChartSpec {
  return {
    levels: d.hlines.map((h) => ({ price: h.price, color: C.accent, title: "✎", dashed: false })),
    overlays: d.trends
      .filter((t) => t.a.time !== t.b.time)
      .map((t) => {
        const [p, q] = t.a.time < t.b.time ? [t.a, t.b] : [t.b, t.a];
        return { kind: "line" as const, key: t.id, points: [{ time: p.time, value: p.price }, { time: q.time, value: q.price }], color: C.accent, width: 2 as const, quiet: true, lastValue: false };
      }),
    markers: [],
  };
}

export const drawingsKey = (tf: string) => `btcs:drawings:v1:${tf}`;
