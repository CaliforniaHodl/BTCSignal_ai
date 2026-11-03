import { boolean, doublePrecision, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** Every signal the engine emits, and what price actually did afterwards. */
export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    engineVersion: text("engine_version").notNull(),
    price: doublePrecision("price").notNull(),
    /** "long" | "short" | "flat" */
    direction: text("direction").notNull(),
    /** -1 (max bearish) .. +1 (max bullish) */
    score: doublePrecision("score").notNull(),
    /** 0..1 — agreement between factors × data coverage */
    confidence: doublePrecision("confidence").notNull(),
    stop: doublePrecision("stop"),
    target: doublePrecision("target"),
    horizonHours: integer("horizon_hours").notNull(),
    factors: jsonb("factors").notNull(),
    // Outcome (filled by the resolver once the horizon passes or stop/target hits)
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    /** "target" | "stop" | "expired" | "n/a" (flat signals) */
    outcome: text("outcome"),
    exitPrice: doublePrecision("exit_price"),
    returnPct: doublePrecision("return_pct"),
    directionCorrect: boolean("direction_correct"),
  },
  (t) => [index("signals_created_idx").on(t.createdAt), index("signals_unresolved_idx").on(t.resolvedAt)]
);

/** One row per agent tick: what it saw, proposed, what Claude said, what risk allowed, what it did. */
export const agentDecisions = pgTable(
  "agent_decisions",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    signalId: integer("signal_id").references(() => signals.id),
    price: doublePrecision("price").notNull(),
    /** "open_long" | "open_short" | "close" | "hold" | "skip" | "veto" | "blocked" | "error" */
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    proposal: jsonb("proposal"),
    review: jsonb("review"),
    risk: jsonb("risk"),
    tradeId: integer("trade_id"),
  },
  (t) => [index("decisions_created_idx").on(t.createdAt)]
);

export const paperTrades = pgTable(
  "paper_trades",
  {
    id: serial("id").primaryKey(),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    side: text("side").notNull(), // "long" | "short"
    qtyBtc: doublePrecision("qty_btc").notNull(),
    entryPrice: doublePrecision("entry_price").notNull(),
    stop: doublePrecision("stop").notNull(),
    target: doublePrecision("target").notNull(),
    exitPrice: doublePrecision("exit_price"),
    /** "stop" | "target" | "signal" | "manual" | "kill" */
    exitReason: text("exit_reason"),
    feesUsd: doublePrecision("fees_usd").notNull().default(0),
    pnlUsd: doublePrecision("pnl_usd"),
    openDecisionId: integer("open_decision_id"),
    signalId: integer("signal_id"),
  },
  (t) => [index("trades_open_idx").on(t.closedAt)]
);

export const equitySnapshots = pgTable(
  "equity_snapshots",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    price: doublePrecision("price").notNull(),
    cashUsd: doublePrecision("cash_usd").notNull(),
    positionBtc: doublePrecision("position_btc").notNull(),
    equityUsd: doublePrecision("equity_usd").notNull(),
  },
  (t) => [index("equity_created_idx").on(t.createdAt)]
);

/** Single-row account + controls. */
export const agentAccount = pgTable("agent_account", {
  id: integer("id").primaryKey().default(1),
  startingCashUsd: doublePrecision("starting_cash_usd").notNull(),
  cashUsd: doublePrecision("cash_usd").notNull(),
  /** Kill switch: when false the agent only manages exits, never opens. */
  enabled: boolean("enabled").notNull().default(true),
  haltedReason: text("halted_reason"),
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Signal = typeof signals.$inferSelect;
export type AgentDecision = typeof agentDecisions.$inferSelect;
export type PaperTrade = typeof paperTrades.$inferSelect;
export type EquitySnapshot = typeof equitySnapshots.$inferSelect;
export type AgentAccount = typeof agentAccount.$inferSelect;
