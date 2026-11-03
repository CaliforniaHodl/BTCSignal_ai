import "server-only";
import { z } from "zod";
import { getHistory, HISTORY_MAX_DAYS } from "@/lib/market/candle-history";
import { DEFAULT_FEES } from "./rules";
import { portfolioMetrics, portfolioMonteCarlo, runPreset, type PortfolioParams } from "./portfolio";
import { thin } from "./run";

const Preset = z.discriminatedUnion("preset", [
  z.object({ preset: z.literal("buy_hold") }),
  z.object({ preset: z.literal("dca"), every: z.enum(["week", "month"]) }),
  z.object({ preset: z.literal("trend"), smaPeriod: z.number().int().min(10).max(300) }),
  z.object({ preset: z.literal("rebalance"), btcWeightPct: z.number().min(5).max(95), rule: z.enum(["month", "quarter", "band"]), bandPct: z.number().min(1).max(40) }),
]);
export const PortfolioRequestSchema = z.object({
  days: z.number().int().min(180).max(3650),
  capital: z.number().min(100).max(1e9),
  strategies: z.array(Preset).min(1).max(4),
});

export function presetLabel(p: PortfolioParams): string {
  switch (p.preset) {
    case "buy_hold": return "Buy & hold";
    case "dca": return `DCA ${p.every === "week" ? "weekly" : "monthly"}`;
    case "trend": return `Trend filter (close vs ${p.smaPeriod}D SMA)`;
    case "rebalance": return `Rebalance ${p.btcWeightPct}% BTC / ${100 - p.btcWeightPct}% cash (${p.rule === "band" ? `±${p.bandPct}% band` : p.rule === "month" ? "monthly" : "quarterly"})`;
  }
}

export async function runPortfolio(raw: unknown) {
  const req = PortfolioRequestSchema.safeParse(raw);
  if (!req.success) return { status: 400, body: { error: "Bad request: " + req.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") } };
  const { days, capital, strategies } = req.data;
  const warm = Math.max(0, ...strategies.map((s) => (s.preset === "trend" ? s.smaPeriod + 2 : 0)));
  const hist = await getHistory("1d", Math.min(HISTORY_MAX_DAYS["1d"], days + warm + 2));
  if (!hist.ok) return { status: 502, body: { error: "Coinbase history is unavailable right now. Try again shortly." } };
  const c = hist.value;
  const from = Math.floor(Date.now() / 1000) - days * 86400;
  let start = c.findIndex((x) => x.time >= from);
  if (start < 0) start = c.length;
  start = Math.max(start, warm);
  if (c.length - start < 60) return { status: 400, body: { error: "Not enough daily history for this window." } };

  const results = strategies.map((p) => {
    const run = runPreset(c, start, capital, p, DEFAULT_FEES);
    return {
      params: p,
      label: presetLabel(p),
      metrics: portfolioMetrics(run, capital),
      monteCarlo: portfolioMonteCarlo(run),
      curve: thin(run.curve, 1000).map((x) => ({ t: x.time, v: x.value })),
    };
  });
  return {
    status: 200,
    body: {
      results,
      capital,
      fees: DEFAULT_FEES,
      window: { from: c[start].time, to: c[c.length - 1].time, days: c.length - start },
      source: { name: "Coinbase BTC-USD daily candles", fetchedAt: hist.fetchedAt },
    },
  };
}
