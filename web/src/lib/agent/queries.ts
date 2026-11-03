import "server-only";
import { asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Factor } from "@/lib/engine/signal";

export type AgentView = Awaited<ReturnType<typeof getAgentView>>;

export async function getAgentView() {
  const d = await db();
  const [account] = await d.select().from(schema.agentAccount).where(eq(schema.agentAccount.id, 1));
  const [latestSignal] = await d.select().from(schema.signals).orderBy(desc(schema.signals.createdAt)).limit(1);
  const [openTrade] = await d.select().from(schema.paperTrades).where(isNull(schema.paperTrades.closedAt)).limit(1);
  const closed = await d.select().from(schema.paperTrades).where(isNotNull(schema.paperTrades.closedAt)).orderBy(desc(schema.paperTrades.closedAt)).limit(200);
  const decisions = await d.select().from(schema.agentDecisions).orderBy(desc(schema.agentDecisions.createdAt)).limit(40);
  const equity = await d.select().from(schema.equitySnapshots).orderBy(asc(schema.equitySnapshots.createdAt)).limit(5000);
  const resolved = await d.select().from(schema.signals).where(isNotNull(schema.signals.directionCorrect)).orderBy(desc(schema.signals.createdAt)).limit(500);

  const start = account?.startingCashUsd ?? 10_000;
  const lastEq = equity[equity.length - 1];
  const firstPrice = equity[0]?.price;
  const wins = closed.filter((t) => (t.pnlUsd ?? 0) > 0);
  const grossWin = wins.reduce((s, t) => s + (t.pnlUsd ?? 0), 0);
  const grossLoss = closed.filter((t) => (t.pnlUsd ?? 0) <= 0).reduce((s, t) => s + (t.pnlUsd ?? 0), 0);
  let peak = start, maxDd = 0;
  for (const e of equity) {
    peak = Math.max(peak, e.equityUsd);
    maxDd = Math.max(maxDd, (peak - e.equityUsd) / peak);
  }

  return {
    account: account ?? null,
    latestSignal: latestSignal
      ? { ...latestSignal, detail: latestSignal.factors as { factors: Factor[]; coverage: number; agreement: number; reason: string } }
      : null,
    openTrade: openTrade ?? null,
    closedTrades: closed,
    decisions,
    equity: equity.map((e) => ({ t: Math.floor(e.createdAt.getTime() / 1000), equity: e.equityUsd, price: e.price })),
    stats: {
      equityUsd: lastEq?.equityUsd ?? start,
      returnPct: lastEq ? ((lastEq.equityUsd - start) / start) * 100 : 0,
      btcReturnPct: firstPrice && lastEq ? ((lastEq.price - firstPrice) / firstPrice) * 100 : 0,
      trades: closed.length,
      winRatePct: closed.length ? (wins.length / closed.length) * 100 : null,
      profitFactor: grossLoss < 0 ? grossWin / -grossLoss : null,
      maxDrawdownPct: maxDd * 100,
      signalHitRatePct: resolved.length ? (resolved.filter((s) => s.directionCorrect).length / resolved.length) * 100 : null,
      signalsResolved: resolved.length,
      since: equity[0]?.createdAt ?? null,
    },
  };
}
