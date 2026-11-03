import "server-only";
/** Server glue: real Coinbase history → rules engine → metrics + Monte Carlo. */
import { z } from "zod";
import { getHistory, HISTORY_MAX_DAYS } from "@/lib/market/history";
import { resampleTrades } from "./montecarlo";
import { BARS_PER_YEAR, DEFAULT_FEES, ruleMetrics, runRules, validateSpec, warmupBars, type Fees } from "./rules";

export const BacktestRequestSchema = z.object({
  spec: z.unknown(),
  days: z.number().int().min(30).max(4000),
  positionPct: z.number().min(1).max(100).default(100),
  /** Percent units, e.g. 0.9 = 0.9% */
  fees: z.object({ makerPct: z.number().min(0).max(2), takerPct: z.number().min(0).max(2), slippagePct: z.number().min(0).max(2) }).optional(),
});

const START_CASH = 10_000;
const barsPerDay = { "1h": 24, "4h": 6, "1d": 1 } as const;

/** Evenly thin a series to at most n points, always keeping the last. */
export function thin<T>(xs: T[], n: number): T[] {
  if (xs.length <= n) return xs;
  const step = xs.length / n;
  const out: T[] = [];
  for (let i = 0; i < n - 1; i++) out.push(xs[Math.floor(i * step)]);
  out.push(xs[xs.length - 1]);
  return out;
}

export async function runBacktest(raw: unknown) {
  const req = BacktestRequestSchema.safeParse(raw);
  if (!req.success) return { status: 400, body: { error: "Bad request: " + req.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ") } };
  const v = validateSpec(req.data.spec);
  if (!v.ok) return { status: 400, body: { error: "The rules aren't valid yet.", errors: v.errors, warnings: v.warnings } };
  const spec = v.spec;
  const tf = spec.timeframe;
  const warm = warmupBars(spec);
  const totalDays = Math.min(HISTORY_MAX_DAYS[tf], req.data.days + Math.ceil(warm / barsPerDay[tf]) + 1);
  const hist = await getHistory(tf, totalDays);
  if (!hist.ok) return { status: 502, body: { error: "Coinbase history is unavailable right now. Try again shortly.", source: hist.source } };
  const candles = hist.value;
  const fromTime = Math.floor(Date.now() / 1000) - req.data.days * 86400;
  let startIndex = candles.findIndex((c) => c.time >= fromTime);
  if (startIndex < 0) startIndex = candles.length;
  startIndex = Math.max(startIndex, warm);
  if (candles.length - startIndex < 20) return { status: 400, body: { error: "Not enough history after indicator warm-up for this window." } };

  const fees: Fees = req.data.fees
    ? { maker: req.data.fees.makerPct / 100, taker: req.data.fees.takerPct / 100, slippage: req.data.fees.slippagePct / 100 }
    : DEFAULT_FEES;
  const result = runRules(candles, spec, { startIndex, startCash: START_CASH, positionPct: req.data.positionPct, fees });
  const metrics = ruleMetrics(result, BARS_PER_YEAR[tf], START_CASH, fees);
  const mc = resampleTrades(result.trades.map((t) => t.returnPct), { runs: 1000, seed: 42 });
  const eq = result.equity.slice(startIndex);
  const p0 = eq[0]?.price ?? 1;
  const bhQty = START_CASH / (p0 * (1 + fees.slippage) * (1 + fees.taker));

  return {
    status: 200,
    body: {
      spec, warnings: v.warnings,
      metrics: { ...metrics, profitFactor: Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : null },
      monteCarlo: mc,
      equity: thin(eq, 1500).map((e) => ({ t: e.time, equity: e.equity, hold: bhQty * e.price })),
      trades: result.trades.slice(-500),
      tradeCount: result.trades.length,
      endedOpen: result.open,
      startCash: START_CASH,
      fees,
      window: { from: candles[startIndex].time, to: candles[candles.length - 1].time, bars: candles.length - startIndex, timeframe: tf },
      source: { name: `Coinbase BTC-USD ${tf} candles`, fetchedAt: hist.fetchedAt },
    },
  };
}
