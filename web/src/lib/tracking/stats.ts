/**
 * Track-record maths over the engine's own DB rows. Pure (tested).
 * Nothing here invents a number: empty inputs give nulls, rendered as "—".
 */

export type SignalRow = {
  direction: string; // "long" | "short" | "flat"
  confidence: number; // 0..1
  outcome: string | null; // "target" | "stop" | "expired" | "n/a" | null (pending)
  returnPct: number | null;
  directionCorrect: boolean | null;
};

export type HitRate = { label: string; resolved: number; correct: number; hitRatePct: number | null; avgReturnPct: number | null };

function hit(label: string, rows: SignalRow[]): HitRate {
  const r = rows.filter((s) => s.directionCorrect != null);
  const correct = r.filter((s) => s.directionCorrect).length;
  const rets = r.map((s) => s.returnPct).filter((x): x is number => x != null);
  return {
    label,
    resolved: r.length,
    correct,
    hitRatePct: r.length ? (correct / r.length) * 100 : null,
    avgReturnPct: rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : null,
  };
}

/** Confidence buckets (lower bound inclusive). Directional signals need ≥ the engine's minConfidence. */
export const CONFIDENCE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "< 40%", min: 0, max: 0.4 },
  { label: "40–55%", min: 0.4, max: 0.55 },
  { label: "55–70%", min: 0.55, max: 0.7 },
  { label: "≥ 70%", min: 0.7, max: Infinity },
];

export function signalStats(rows: SignalRow[]) {
  const directional = rows.filter((s) => s.direction === "long" || s.direction === "short");
  const outcomes = { target: 0, stop: 0, expired: 0 };
  for (const s of directional) if (s.outcome === "target" || s.outcome === "stop" || s.outcome === "expired") outcomes[s.outcome]++;
  return {
    total: rows.length,
    flat: rows.filter((s) => s.direction === "flat").length,
    directional: directional.length,
    pending: directional.filter((s) => s.outcome == null).length,
    outcomes,
    overall: hit("All directional", directional),
    byDirection: [hit("Long", directional.filter((s) => s.direction === "long")), hit("Short", directional.filter((s) => s.direction === "short"))],
    byConfidence: CONFIDENCE_BUCKETS.map((b) => hit(b.label, directional.filter((s) => s.confidence >= b.min && s.confidence < b.max))),
  };
}

export type TradeRow = { closedAt: Date | null; pnlUsd: number | null; feesUsd: number };

export function tradeStats(trades: TradeRow[], startingCashUsd: number) {
  const closed = trades.filter((t) => t.closedAt != null && t.pnlUsd != null).sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime());
  const pnls = closed.map((t) => t.pnlUsd!);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const grossLoss = -sum(losses);
  let cum = 0;
  const curve = closed.map((t) => ({ t: Math.floor(t.closedAt!.getTime() / 1000), cumPnlUsd: (cum += t.pnlUsd!) }));
  return {
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: closed.length ? (wins.length / closed.length) * 100 : null,
    netPnlUsd: sum(pnls),
    netPnlPct: startingCashUsd > 0 ? (sum(pnls) / startingCashUsd) * 100 : null,
    feesUsd: sum(closed.map((t) => t.feesUsd)),
    avgWinUsd: wins.length ? sum(wins) / wins.length : null,
    avgLossUsd: losses.length ? sum(losses) / losses.length : null,
    profitFactor: grossLoss > 0 ? sum(wins) / grossLoss : null,
    best: pnls.length ? Math.max(...pnls) : null,
    worst: pnls.length ? Math.min(...pnls) : null,
    curve,
  };
}
