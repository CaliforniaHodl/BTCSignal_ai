import { preflight, publicDatum, publicError } from "@/lib/api/public";
import { getFearGreedHistory } from "@/lib/market/pro";

/** GET /api/v1/fear-greed?days=1..31 — Crypto Fear & Greed index (alternative.me), newest last. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("days") ?? "1";
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > 31) return publicError("days must be an integer 1..31");
  const h = await getFearGreedHistory();
  if (!h.ok) return publicDatum(h, 5);
  const history = h.value.slice(-days).map((x) => ({ value: x.value, label: x.label, updatedAt: x.t }));
  const latest = history[history.length - 1];
  return publicDatum({ ok: true, source: h.source, fetchedAt: h.fetchedAt, value: { ...latest, history } }, 300);
}

export const OPTIONS = preflight;
