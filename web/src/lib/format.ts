export const usd = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });

export const compactUsd = (n: number) =>
  "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export const pct = (n: number, digits = 2, signed = true) =>
  `${signed && n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

/** Funding as a fraction (0.0001) → "0.0100%" */
export const fundingPct = (rate: number) => `${rate > 0 ? "+" : ""}${(rate * 100).toFixed(4)}%`;

export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const tone = (n: number) => (n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted");
