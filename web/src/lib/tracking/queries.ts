import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { signalStats, tradeStats } from "./stats";

/** Most recent engine signals (for the /posts index). */
export async function getRecentSignals(limit = 10) {
  const d = await db();
  return d.select().from(schema.signals).orderBy(desc(schema.signals.createdAt)).limit(limit);
}

export type TrackRecord = Awaited<ReturnType<typeof getTrackRecord>>;

/** Everything the tracking pages show, from the DB only. */
export async function getTrackRecord({ signalLimit = 500 }: { signalLimit?: number } = {}) {
  const d = await db();
  const [all, recent, trades, [account], equity] = await Promise.all([
    d.select({
      direction: schema.signals.direction, confidence: schema.signals.confidence, outcome: schema.signals.outcome,
      returnPct: schema.signals.returnPct, directionCorrect: schema.signals.directionCorrect, createdAt: schema.signals.createdAt,
    }).from(schema.signals).orderBy(desc(schema.signals.createdAt)),
    d.select().from(schema.signals).orderBy(desc(schema.signals.createdAt)).limit(signalLimit),
    d.select().from(schema.paperTrades).orderBy(desc(schema.paperTrades.openedAt)),
    d.select().from(schema.agentAccount).where(eq(schema.agentAccount.id, 1)),
    d.select().from(schema.equitySnapshots).orderBy(asc(schema.equitySnapshots.createdAt)).limit(5000),
  ]);
  const start = account?.startingCashUsd ?? null;
  return {
    since: all[all.length - 1]?.createdAt ?? null,
    signals: signalStats(all),
    recent,
    trades,
    openTrade: trades.find((t) => t.closedAt == null) ?? null,
    tradeStats: start != null ? tradeStats(trades, start) : null,
    startingCashUsd: start,
    equity: equity.map((e) => ({ t: Math.floor(e.createdAt.getTime() / 1000), equity: e.equityUsd, price: e.price })),
  };
}
