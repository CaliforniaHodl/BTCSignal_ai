/**
 * Alpha Radar: a deterministic "what changed" feed. Pure: same inputs → same
 * items. Thresholds are fixed constants (below) so the feed is explainable; the
 * optional Claude summary only narrates these items, it never adds data.
 */

export type Severity = 0 | 1 | 2; // quiet | notable | major
export type Tone = "up" | "down" | "neutral";
export type RadarItem = {
  id: string;
  category: "Price" | "Funding" | "Open interest" | "Dominance" | "Fees" | "Sentiment" | "Exchange flows" | "Agent";
  window: "1h" | "24h" | "1d" | "now";
  title: string;
  detail: string;
  severity: Severity;
  tone: Tone;
  source: string;
  fetchedAt: number;
  /** Set when the value is derived rather than directly observed: how it was computed. */
  modeled?: string;
};

type Src = { source: string; fetchedAt: number };
export type RadarInputs = {
  price?: Src & { now: number; ago1h: number | null; ago24h: number | null };
  funding?: Src & { avgNow: number; avgAgo24h: number | null; venues: { venue: string; now: number }[] };
  oi?: Src & { now: number; ago1h: number | null; ago24h: number | null };
  dominance?: Src & { now: number; ago24h: number };
  fees?: Src & { fastestNow: number; blockMedian24h: number; recentBlockMedian: number };
  fearGreed?: Src & { now: number; prev: number; label: string };
  flows?: Src & { day: string; netflowUsd: number; mean30: number; sd30: number };
  agent?: Src & {
    latest: { direction: string; score: number; confidence: number; at: number } | null;
    prior: { direction: string; at: number } | null;
    decisions24h: { action: string; summary: string; at: number }[];
  };
};

export const THRESHOLDS = {
  price1h: [1, 2.5],
  price24h: [3, 7],
  fundingDelta: [0.00005, 0.00015], // fraction per 8h (0.005% / 0.015%)
  fundingHot: 0.0003,
  fundingCold: -0.0001,
  fundingSpread: 0.0001,
  oi1h: [2, 4],
  oi24h: [5, 10],
  dominancePp: [0.3, 0.8],
  feeRatio: [2, 4],
  /** Below this, fee multiples are noise (1 → 3 sat/vB is not congestion). */
  feeFloorSatVb: 5,
  fearGreedDelta: [8, 15],
  flowZ: [2, 3],
} as const;

const sev = (abs: number, [n, m]: readonly [number, number]): Severity => (abs >= m ? 2 : abs >= n ? 1 : 0);
const toneOf = (x: number): Tone => (x > 0 ? "up" : x < 0 ? "down" : "neutral");
const pct = (x: number, d = 2) => `${x > 0 ? "+" : ""}${x.toFixed(d)}%`;
const fpct = (x: number) => `${x > 0 ? "+" : ""}${(x * 100).toFixed(4)}%`;
const chg = (from: number | null, to: number) => (from == null || from === 0 ? null : ((to - from) / from) * 100);
const usdC = (n: number) => "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export function buildRadar(inp: RadarInputs, now = Date.now()): RadarItem[] {
  const items: RadarItem[] = [];
  const push = (i: RadarItem) => items.push(i);

  if (inp.price) {
    const p = inp.price;
    const c1 = chg(p.ago1h, p.now), c24 = chg(p.ago24h, p.now);
    if (c1 != null) push({ id: "price-1h", category: "Price", window: "1h", title: `BTC ${pct(c1)} in the last hour`, detail: `Now $${Math.round(p.now).toLocaleString("en-US")}.`, severity: sev(Math.abs(c1), THRESHOLDS.price1h), tone: toneOf(c1), ...src(p) });
    if (c24 != null) push({ id: "price-24h", category: "Price", window: "24h", title: `BTC ${pct(c24)} over 24h`, detail: `From $${Math.round(p.ago24h!).toLocaleString("en-US")} to $${Math.round(p.now).toLocaleString("en-US")}.`, severity: sev(Math.abs(c24), THRESHOLDS.price24h), tone: toneOf(c24), ...src(p) });
  }

  if (inp.funding) {
    const f = inp.funding;
    if (f.avgAgo24h != null) {
      const d = f.avgNow - f.avgAgo24h;
      const flipped = Math.sign(f.avgNow) !== Math.sign(f.avgAgo24h) && f.avgNow !== 0 && f.avgAgo24h !== 0;
      let s = sev(Math.abs(d), THRESHOLDS.fundingDelta);
      if (flipped && s < 1) s = 1;
      push({
        id: "funding-24h", category: "Funding", window: "24h",
        title: flipped ? `Funding flipped ${f.avgNow > 0 ? "positive" : "negative"}` : `Funding ${d >= 0 ? "up" : "down"} ${fpct(Math.abs(d)).slice(1)} per 8h vs yesterday`,
        detail: `${fpct(f.avgAgo24h)} → ${fpct(f.avgNow)} per 8h (venue average).`,
        severity: s, tone: toneOf(d), ...src(f),
      });
    }
    if (f.avgNow >= THRESHOLDS.fundingHot || f.avgNow <= THRESHOLDS.fundingCold) {
      push({ id: "funding-level", category: "Funding", window: "now", title: f.avgNow > 0 ? "Longs paying elevated funding" : "Shorts paying to stay short", detail: `${fpct(f.avgNow)} per 8h ≈ ${(f.avgNow * 3 * 365 * 100).toFixed(1)}% annualised.`, severity: 1, tone: f.avgNow > 0 ? "up" : "down", ...src(f) });
    }
    if (f.venues.length >= 2) {
      const sorted = [...f.venues].sort((a, b) => a.now - b.now);
      const spread = sorted[sorted.length - 1].now - sorted[0].now;
      if (spread >= THRESHOLDS.fundingSpread) push({ id: "funding-spread", category: "Funding", window: "now", title: `Funding diverges across venues`, detail: `${sorted[sorted.length - 1].venue} ${fpct(sorted[sorted.length - 1].now)} vs ${sorted[0].venue} ${fpct(sorted[0].now)} per 8h.`, severity: 1, tone: "neutral", ...src(f) });
    }
  }

  if (inp.oi) {
    const o = inp.oi;
    const c1 = chg(o.ago1h, o.now), c24 = chg(o.ago24h, o.now);
    const p24 = inp.price ? chg(inp.price.ago24h, inp.price.now) : null;
    if (c1 != null) push({ id: "oi-1h", category: "Open interest", window: "1h", title: `Open interest ${pct(c1)} in the last hour`, detail: `${usdC(o.now)} on OKX BTC contracts.`, severity: sev(Math.abs(c1), THRESHOLDS.oi1h), tone: toneOf(c1), ...src(o) });
    if (c24 != null) push({ id: "oi-24h", category: "Open interest", window: "24h", title: `Open interest ${pct(c24)} over 24h`, detail: `${usdC(o.ago24h!)} → ${usdC(o.now)}.${p24 != null ? " " + oiRead(c24, p24) : ""}`, severity: sev(Math.abs(c24), THRESHOLDS.oi24h), tone: toneOf(c24), ...src(o) });
  }

  if (inp.dominance) {
    const d = inp.dominance.now - inp.dominance.ago24h;
    push({ id: "dominance-24h", category: "Dominance", window: "24h", title: `BTC dominance ${d >= 0 ? "+" : ""}${d.toFixed(2)} pts over 24h`, detail: `${inp.dominance.ago24h.toFixed(2)}% → ${inp.dominance.now.toFixed(2)}%.`, modeled: "24h-ago dominance = dominance × (1 + total mcap 24h change) / (1 + BTC 24h change), from CoinGecko; CoinGecko's total-mcap change is sensitive to its asset list, so treat as approximate.", severity: sev(Math.abs(d), THRESHOLDS.dominancePp), tone: toneOf(d), ...src(inp.dominance) });
  }

  if (inp.fees && inp.fees.blockMedian24h > 0) {
    const f = inp.fees;
    const ratio = f.fastestNow / f.blockMedian24h;
    const s = f.fastestNow < THRESHOLDS.feeFloorSatVb && f.blockMedian24h < THRESHOLDS.feeFloorSatVb ? 0 : ratio >= 1 ? sev(ratio, THRESHOLDS.feeRatio) : ratio <= 0.5 ? 1 : 0;
    push({ id: "fees-now", category: "Fees", window: "24h", title: ratio >= 1 ? `Next-block fee ${ratio.toFixed(1)}× the 24h median` : `Fees below the 24h median`, detail: `${f.fastestNow} sat/vB now; blocks over 24h cleared at a median ${f.blockMedian24h.toFixed(1)} sat/vB (last few blocks ${f.recentBlockMedian.toFixed(1)}).`, severity: s, tone: ratio >= 1 ? "up" : "down", ...src(f) });
  }

  if (inp.fearGreed) {
    const g = inp.fearGreed;
    const d = g.now - g.prev;
    const crossed = (g.prev > 25 && g.now <= 25) || (g.prev < 75 && g.now >= 75);
    let s = sev(Math.abs(d), THRESHOLDS.fearGreedDelta);
    if (crossed && s < 1) s = 1;
    push({ id: "fng-1d", category: "Sentiment", window: "1d", title: crossed ? `Sentiment entered extreme ${g.now <= 25 ? "fear" : "greed"}` : `Fear & Greed ${d >= 0 ? "+" : ""}${d} vs yesterday`, detail: `${g.prev} → ${g.now} (${g.label}).`, severity: s, tone: toneOf(d), ...src(g) });
  }

  if (inp.flows && inp.flows.sd30 > 0) {
    const f = inp.flows;
    const z = (f.netflowUsd - f.mean30) / f.sd30;
    push({ id: "flows-1d", category: "Exchange flows", window: "1d", title: `Net ${f.netflowUsd >= 0 ? "inflow to" : "outflow from"} exchanges: ${usdC(Math.abs(f.netflowUsd))}`, detail: `${f.day}: ${z >= 0 ? "+" : ""}${z.toFixed(1)}σ vs the 30-day average. Inflows usually mean coins readied to sell; outflows, coins moved to custody.`, severity: sev(Math.abs(z), THRESHOLDS.flowZ), tone: f.netflowUsd > 0 ? "down" : "up", ...src(f) });
  }

  if (inp.agent) {
    const a = inp.agent;
    if (a.latest) {
      const changed = a.prior && a.prior.direction !== a.latest.direction;
      push({
        id: "agent-signal", category: "Agent", window: changed ? "24h" : "now",
        title: changed ? `Agent signal flipped ${a.prior!.direction} → ${a.latest.direction}` : `Agent signal: ${a.latest.direction}`,
        detail: `Score ${a.latest.score.toFixed(2)}, confidence ${(a.latest.confidence * 100).toFixed(0)}%, ${Math.round((now - a.latest.at) / 60_000)} min ago.`,
        severity: changed ? 2 : 0, tone: a.latest.direction === "long" ? "up" : a.latest.direction === "short" ? "down" : "neutral", ...src(a),
      });
    }
    const trades = a.decisions24h.filter((d) => d.action === "open_long" || d.action === "open_short" || d.action === "close");
    for (const t of trades.slice(0, 3)) {
      push({ id: `agent-${t.at}`, category: "Agent", window: "24h", title: `Agent ${t.action.replace("_", " ")}`, detail: t.summary, severity: 1, tone: t.action === "open_long" ? "up" : t.action === "open_short" ? "down" : "neutral", ...src(a) });
    }
  }

  return items.sort((x, y) => y.severity - x.severity || y.fetchedAt - x.fetchedAt);
}

/** Standard OI/price quadrant read. */
export function oiRead(oiPct: number, pricePct: number): string {
  if (Math.abs(oiPct) < 1) return "Positioning roughly unchanged.";
  if (oiPct > 0) return pricePct >= 0 ? "OI and price both up: new leverage chasing the move." : "OI up while price falls: shorts pressing, or longs averaging down.";
  return pricePct >= 0 ? "OI down while price rises: short covering." : "OI and price both down: longs deleveraging.";
}

function src(s: Src) {
  return { source: s.source, fetchedAt: s.fetchedAt };
}
