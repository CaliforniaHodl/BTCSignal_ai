import "server-only";
import { and, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { keyLevels } from "@/lib/indicators";
import { getCandles, getMarketSnapshot } from "@/lib/market/snapshot";
import { closedOnly, ENGINE_CONFIG, evaluate, levels, type EngineSignal } from "@/lib/engine/signal";
import type { Candle } from "@/lib/market/types";
import * as broker from "./broker";
import { checkEntry, RISK, shouldHalt } from "./risk";
import { reviewTrade, type Review } from "./review";
import { announce } from "@/lib/notify";

const STARTING_CASH = Number(process.env.AGENT_STARTING_CASH ?? 10_000);
const MIN_TICK_GAP_MS = 45 * 60 * 1000;
const LOCK_ID = 7_331_001;

export type TickResult = { ran: boolean; reason?: string; action?: string; summary?: string; signalId?: number; decisionId?: number };

export async function runTick({ force = false } = {}): Promise<TickResult> {
  const d = await db();
  const [lock] = rows<{ ok: boolean }>(await d.execute(sql`select pg_try_advisory_lock(${LOCK_ID}) as ok`));
  if (!lock?.ok) return { ran: false, reason: "another tick is running" };
  try {
    return await tick(force);
  } finally {
    await d.execute(sql`select pg_advisory_unlock(${LOCK_ID})`);
  }
}

async function tick(force: boolean): Promise<TickResult> {
  const d = await db();
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  // ---- account ----
  let [acct] = await d.select().from(schema.agentAccount).where(eq(schema.agentAccount.id, 1));
  if (!acct) {
    [acct] = await d.insert(schema.agentAccount).values({ id: 1, startingCashUsd: STARTING_CASH, cashUsd: STARTING_CASH }).returning();
  }
  if (!force && acct.lastTickAt && now - acct.lastTickAt.getTime() < MIN_TICK_GAP_MS) {
    return { ran: false, reason: `last tick ${Math.round((now - acct.lastTickAt.getTime()) / 60000)}m ago` };
  }

  // ---- data ----
  const [snapshot, c15, c1h, c4h, c1d] = await Promise.all([
    getMarketSnapshot(), getCandles("15m"), getCandles("1h"), getCandles("4h"), getCandles("1d"),
  ]);
  if (!snapshot.spot.ok || !c1h.ok || !c4h.ok || !c1d.ok || !c15.ok) {
    const missing = [!snapshot.spot.ok && "spot", !c15.ok && "15m", !c1h.ok && "1h", !c4h.ok && "4h", !c1d.ok && "1d"].filter(Boolean).join(", ");
    await d.insert(schema.agentDecisions).values({ price: snapshot.spot.ok ? snapshot.spot.value.price : 0, action: "error", summary: `Data unavailable (${missing}); no action taken.` });
    await d.update(schema.agentAccount).set({ lastTickAt: new Date(now) }).where(eq(schema.agentAccount.id, 1));
    return { ran: true, action: "error", summary: `data unavailable: ${missing}` };
  }
  const price = snapshot.spot.value.price;
  let cash = acct.cashUsd;

  // ---- 1. manage the open position first (exits are never gated by Claude) ----
  const [openTrade] = await d.select().from(schema.paperTrades).where(isNull(schema.paperTrades.closedAt)).limit(1);
  let position: broker.Position | null = openTrade
    ? { side: openTrade.side as broker.Side, qtyBtc: openTrade.qtyBtc, entryPrice: openTrade.entryPrice, stop: openTrade.stop, target: openTrade.target, openFeeUsd: openTrade.feesUsd, best: openTrade.best ?? undefined }
    : null;
  let closedThisTick: string | null = null;

  if (openTrade && position) {
    const since = Math.floor(openTrade.openedAt.getTime() / 1000);
    const hit = broker.findExit(position, c15.value.filter((c) => c.time >= since));
    if (hit) {
      closedThisTick = await closeTrade(openTrade.id, position, hit.price, hit.reason, cash, new Date(Math.min(now, (hit.time + 900) * 1000)));
      cash = (await account()).cashUsd;
      position = null;
    }
  }

  // ---- 2. signal (closed candles only, identical to backtest) ----
  const signal = evaluate({
    h1: closedOnly(c1h.value, 3600, nowSec),
    h4: closedOnly(c4h.value, 14400, nowSec),
    d1: closedOnly(c1d.value, 86400, nowSec),
    funding8h: snapshot.derivatives.ok ? snapshot.derivatives.value.avgRate8h : null,
    fearGreed: snapshot.fearGreed.ok ? snapshot.fearGreed.value.value : null,
  });
  signal.price = price; // decide at the live price; factors use closed bars
  Object.assign(signal, levels(signal.direction, price, signal));
  const [sigRow] = await d.insert(schema.signals).values({
    engineVersion: signal.engineVersion, price, direction: signal.direction, score: signal.score, confidence: signal.confidence,
    stop: signal.stop, target: signal.target, horizonHours: signal.horizonHours,
    factors: { factors: signal.factors, coverage: signal.coverage, agreement: signal.agreement, atr4h: signal.atr4h, reason: signal.reason },
  }).returning({ id: schema.signals.id });

  await resolveSignals(c1h.value, now);

  // ---- 2b. tighten a trailing stop using closed 1h closes since entry ----
  if (position && openTrade && position.target == null) {
    const atrNow = ENGINE_CONFIG.stopBasis === "1d" ? signal.atr1d : signal.atr4h;
    const since = Math.floor(openTrade.openedAt.getTime() / 1000);
    let p = position;
    for (const c of closedOnly(c1h.value, 3600, nowSec)) if (c.time >= since) p = broker.trail(p, c.close, atrNow, ENGINE_CONFIG.stopAtr);
    if (p.stop !== position.stop || p.best !== position.best) {
      await d.update(schema.paperTrades).set({ stop: p.stop, best: p.best ?? null }).where(eq(schema.paperTrades.id, openTrade.id));
    }
    position = p;
  }

  // ---- 3. decide ----
  const decide = async (action: string, summary: string, extra: Partial<typeof schema.agentDecisions.$inferInsert> = {}) => {
    const [row] = await d.insert(schema.agentDecisions).values({ signalId: sigRow.id, price, action, summary, ...extra }).returning({ id: schema.agentDecisions.id });
    return row.id;
  };

  let action: string;
  let summary: string;
  let decisionId: number;

  if (position && openTrade) {
    const opposite = signal.direction !== "flat" && signal.direction !== position.side;
    if (opposite) {
      const msg = await closeTrade(openTrade.id, position, price, "signal", cash, new Date(now));
      position = null;
      action = "close";
      summary = `Closed ${openTrade.side} on opposite signal. ${msg}`;
    } else {
      const upnl = broker.equity(cash, position, price) - (cash + (position.side === "long" ? position.qtyBtc * position.entryPrice : 0));
      action = "hold";
      summary = `Holding ${position.side} from $${Math.round(position.entryPrice).toLocaleString()} (${upnl >= 0 ? "+" : ""}$${upnl.toFixed(2)} unrealized). Stop $${Math.round(position.stop).toLocaleString()}${position.target != null ? `, target $${Math.round(position.target).toLocaleString()}` : " (trailing)"}.`;
    }
    decisionId = await decide(action, summary);
  } else if (signal.direction === "flat") {
    action = "skip";
    summary = (closedThisTick ? `${closedThisTick} ` : "") + signal.reason;
    decisionId = await decide(action, summary);
  } else {
    const state = await riskState(cash, now);
    const proposal = { side: signal.direction, price, stop: signal.stop!, target: signal.target };
    const pre = checkEntry(state, proposal, 1);
    if (!pre.allowed) {
      action = "blocked";
      summary = `${signal.direction.toUpperCase()} signal blocked by risk: ${pre.checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}.`;
      decisionId = await decide(action, summary, { proposal: proposalJson(signal), risk: pre });
    } else {
      const recent = await d.select({ summary: schema.agentDecisions.summary, at: schema.agentDecisions.createdAt })
        .from(schema.agentDecisions).where(sql`${schema.agentDecisions.action} in ('open_long','open_short','close','veto')`)
        .orderBy(desc(schema.agentDecisions.createdAt)).limit(5);
      const review: Review = await reviewTrade({
        signal, risk: pre, snapshot,
        recent: recent.map((r) => ({ summary: r.summary, at: r.at.toISOString() })),
        levels: keyLevels(c1h.value, { lookback: 4, max: 4 }),
      });
      if (review.decision === "veto") {
        action = "veto";
        summary = `Claude vetoed ${signal.direction}: ${review.reasoning}`;
        decisionId = await decide(action, summary, { proposal: proposalJson(signal), risk: pre, review });
      } else {
        const final = checkEntry(state, proposal, review.sizeMultiplier);
        if (!final.allowed) {
          action = "blocked";
          summary = `Approved at ×${review.sizeMultiplier} but resulting size failed risk: ${final.checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}.`;
          decisionId = await decide(action, summary, { proposal: proposalJson(signal), risk: final, review });
        } else {
          const side = signal.direction;
          const o = broker.open(cash, side, final.qtyBtc, price);
          action = side === "long" ? "open_long" : "open_short";
          const sizeNote = review.decision === "reduce" ? ` (reduced ×${review.sizeMultiplier.toFixed(2)})` : "";
          summary = `Opened ${side} ${final.qtyBtc.toFixed(5)} BTC at $${Math.round(o.fill).toLocaleString()}${sizeNote}. Stop $${Math.round(signal.stop!).toLocaleString()}${signal.target != null ? `, target $${Math.round(signal.target).toLocaleString()}` : " (trailing)"}, risking $${final.riskUsd.toFixed(2)}. ${review.mode === "claude" ? `Claude: ${review.reasoning}` : "Rules-only mode."}`;
          decisionId = await decide(action, summary, { proposal: proposalJson(signal), risk: final, review });
          const [t] = await d.insert(schema.paperTrades).values({
            side, qtyBtc: final.qtyBtc, entryPrice: o.fill, stop: signal.stop!, target: signal.target, feesUsd: o.feeUsd,
            openDecisionId: decisionId, signalId: sigRow.id, openedAt: new Date(now),
          }).returning({ id: schema.paperTrades.id });
          await d.update(schema.agentDecisions).set({ tradeId: t.id }).where(eq(schema.agentDecisions.id, decisionId));
          await d.update(schema.agentAccount).set({ cashUsd: o.cashUsd }).where(eq(schema.agentAccount.id, 1));
          cash = o.cashUsd;
          position = { side, qtyBtc: final.qtyBtc, entryPrice: o.fill, stop: signal.stop!, target: signal.target, openFeeUsd: o.feeUsd };
        }
      }
    }
  }

  // ---- 4. equity + drawdown halt ----
  const equityNow = broker.equity(cash, position, price);
  await d.insert(schema.equitySnapshots).values({ price, cashUsd: cash, positionBtc: position ? (position.side === "long" ? position.qtyBtc : -position.qtyBtc) : 0, equityUsd: equityNow });
  const [{ peak }] = await d.select({ peak: sql<number>`max(${schema.equitySnapshots.equityUsd})` }).from(schema.equitySnapshots);
  const halt = shouldHalt(equityNow, Math.max(peak ?? equityNow, acct.startingCashUsd));
  await d.update(schema.agentAccount).set({
    lastTickAt: new Date(now),
    ...(halt && acct.enabled ? { enabled: false, haltedReason: `Drawdown limit (${RISK.maxDrawdownHaltPct}%) hit at equity $${equityNow.toFixed(2)}` } : {}),
  }).where(eq_(1));

  if (action === "open_long" || action === "open_short" || action === "close" || closedThisTick) {
    await announce(`🤖 BTCSignal agent (paper): ${closedThisTick && action !== "close" ? `${closedThisTick} ` : ""}${action === "skip" ? "" : summary}`.slice(0, 900));
  }
  return { ran: true, action, summary, signalId: sigRow.id, decisionId };
}

const eq_ = (id: number) => eq(schema.agentAccount.id, id);
const rows = <T>(r: unknown): T[] => (Array.isArray(r) ? r : ((r as { rows: T[] }).rows ?? []));

async function account() {
  const d = await db();
  const [a] = await d.select().from(schema.agentAccount).where(eq_(1));
  return a;
}

async function closeTrade(tradeId: number, pos: broker.Position, price: number, reason: string, cash: number, at: Date) {
  const d = await db();
  const c = broker.close(cash, pos, price, RISK, broker.exitLiquidity(reason));
  await d.update(schema.paperTrades).set({
    closedAt: at, exitPrice: c.fill, exitReason: reason, pnlUsd: c.pnlUsd, feesUsd: pos.openFeeUsd + c.feeUsd,
  }).where(eq(schema.paperTrades.id, tradeId));
  await d.update(schema.agentAccount).set({ cashUsd: c.cashUsd }).where(eq_(1));
  const msg = `Closed ${pos.side} at $${Math.round(c.fill).toLocaleString()} (${reason}), P&L ${c.pnlUsd >= 0 ? "+" : ""}$${c.pnlUsd.toFixed(2)}.`;
  if (reason === "stop" || reason === "target") {
    await d.insert(schema.agentDecisions).values({ price: c.fill, action: "close", summary: msg, tradeId });
  }
  return msg;
}

async function riskState(cash: number, now: number) {
  const d = await db();
  const dayStart = new Date(now - (now % 86_400_000));
  const [acct] = await d.select().from(schema.agentAccount).where(eq_(1));
  const [{ peak }] = await d.select({ peak: sql<number>`max(${schema.equitySnapshots.equityUsd})` }).from(schema.equitySnapshots);
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(schema.paperTrades).where(gte(schema.paperTrades.openedAt, dayStart));
  const [startSnap] = await d.select().from(schema.equitySnapshots).where(lte(schema.equitySnapshots.createdAt, dayStart)).orderBy(desc(schema.equitySnapshots.createdAt)).limit(1);
  const [lastClosed] = await d.select({ at: schema.paperTrades.closedAt }).from(schema.paperTrades).where(isNotNull(schema.paperTrades.closedAt)).orderBy(desc(schema.paperTrades.closedAt)).limit(1);
  const startEq = startSnap?.equityUsd ?? acct.startingCashUsd;
  return {
    enabled: acct.enabled,
    equityUsd: cash,
    cashUsd: cash,
    peakEquityUsd: Math.max(peak ?? cash, acct.startingCashUsd),
    hasOpenPosition: false,
    entriesToday: n,
    pnlTodayPct: ((cash - startEq) / startEq) * 100,
    lastCloseAt: lastClosed?.at ? lastClosed.at.getTime() : null,
    now,
  };
}

/** Score past signals against what price actually did. */
async function resolveSignals(h1: Candle[], now: number) {
  const d = await db();
  const pending = await d.select().from(schema.signals).where(and(isNull(schema.signals.resolvedAt), lte(schema.signals.createdAt, new Date(now - 3600_000))));
  for (const s of pending) {
    const start = Math.floor(s.createdAt.getTime() / 1000);
    const end = start + s.horizonHours * 3600;
    const window = h1.filter((c) => c.time >= start && c.time < end);
    if (s.direction === "flat") {
      if (now / 1000 >= end) await d.update(schema.signals).set({ resolvedAt: new Date(now), outcome: "n/a" }).where(eq(schema.signals.id, s.id));
      continue;
    }
    if (s.stop == null) continue;
    const pos: broker.Position = { side: s.direction as broker.Side, qtyBtc: 1, entryPrice: s.price, stop: s.stop, target: s.target, openFeeUsd: 0 };
    const hit = broker.findExit(pos, window);
    const expired = now / 1000 >= end;
    if (!hit && !expired) continue;
    const exit = hit ? hit.price : window[window.length - 1]?.close ?? s.price;
    const ret = ((exit - s.price) / s.price) * 100 * (s.direction === "long" ? 1 : -1);
    await d.update(schema.signals).set({
      resolvedAt: new Date(now), outcome: hit ? hit.reason : "expired", exitPrice: exit, returnPct: ret, directionCorrect: ret > 0,
    }).where(eq(schema.signals.id, s.id));
  }
}

function proposalJson(s: EngineSignal) {
  return { side: s.direction, entry: s.price, stop: s.stop, target: s.target, score: s.score, confidence: s.confidence, reason: s.reason };
}
