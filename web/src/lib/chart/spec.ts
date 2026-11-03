/** Plain-data description of what to draw on a chart. Pure; built server- or client-side. */
import type { Series } from "@/lib/indicators";

export type Pt = { time: number; value: number };

export type LineOverlay = {
  kind: "line";
  key: string;
  /** "main" (default) or a named indicator pane. */
  pane?: string;
  points: Pt[];
  color: string;
  width?: 1 | 2 | 3 | 4;
  dashed?: boolean;
  title?: string;
  lastValue?: boolean;
  /** Hide the crosshair dot (for structural lines like pattern boundaries). */
  quiet?: boolean;
  precision?: number;
  /** Horizontal guides on this series' scale, e.g. RSI 70/30. */
  guides?: { price: number; color: string; title?: string }[];
};

export type HistOverlay = {
  kind: "hist";
  key: string;
  pane: string;
  points: { time: number; value: number; color?: string }[];
  color: string;
  title?: string;
};

export type Level = { price: number; color: string; title: string; dashed?: boolean; width?: 1 | 2 | 3 | 4 };

export type Marker = {
  time: number;
  position: "aboveBar" | "belowBar" | "inBar";
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  color: string;
  text?: string;
};

export type ChartSpec = {
  overlays: (LineOverlay | HistOverlay)[];
  levels: Level[];
  markers: Marker[];
  paneHeights?: Record<string, number>;
};

export const EMPTY_SPEC: ChartSpec = { overlays: [], levels: [], markers: [] };

/** Series aligned to candle times → chart points, skipping warm-up nulls. */
export function toPoints(times: number[], s: Series): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < s.length; i++) if (s[i] != null) out.push({ time: times[i], value: s[i]! });
  return out;
}

export function mergeSpecs(...specs: ChartSpec[]): ChartSpec {
  return {
    overlays: specs.flatMap((s) => s.overlays),
    levels: specs.flatMap((s) => s.levels),
    markers: specs.flatMap((s) => s.markers),
    paneHeights: Object.assign({}, ...specs.map((s) => s.paneHeights ?? {})),
  };
}

/** Palette for chart overlays (hex so lightweight-charts can use them directly). */
export const C = {
  accent: "#f7931a",
  blue: "#60a5fa",
  purple: "#a78bfa",
  pink: "#f472b6",
  teal: "#2dd4bf",
  yellow: "#eab308",
  grey: "#8b94a7",
  up: "#22c55e",
  down: "#ef4444",
  upSoft: "rgba(34,197,94,0.45)",
  downSoft: "rgba(239,68,68,0.45)",
};
