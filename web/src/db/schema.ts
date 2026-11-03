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
    /** null = trailing-stop exit */
    target: doublePrecision("target"),
    /** Most favourable close since entry (trailing stops). */
    best: doublePrecision("best"),
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

// ---------------------------------------------------------------- accounts & access

/** A person who signed in through Gatekeep (OIDC `sub`). Buying access does NOT require an account. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  sub: text("sub").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

/** Server-side sessions. Only the SHA-256 of the cookie token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

/** Lightning invoices we issued. Status is only ever set from a server-side check against the node. */
export const invoices = pgTable("invoices", {
  paymentHash: text("payment_hash").primaryKey(),
  bolt11: text("bolt11").notNull(),
  tier: text("tier").notNull(),
  amountSats: integer("amount_sats").notNull(),
  /** "pending" | "paid" | "expired" */
  status: text("status").notNull().default("pending"),
  userId: integer("user_id").references(() => users.id),
  /** Browser that requested it — only this browser may claim an anonymous pass. */
  claimTokenHash: text("claim_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

/**
 * An access pass. Owned by a user (signed in) and/or redeemable with a recovery
 * code (anonymous). Only hashes of the recovery code and access token are stored.
 */
export const entitlements = pgTable(
  "entitlements",
  {
    id: serial("id").primaryKey(),
    paymentHash: text("payment_hash").notNull().unique(),
    tier: text("tier").notNull(),
    userId: integer("user_id").references(() => users.id),
    recoveryCodeHash: text("recovery_code_hash").notNull().unique(),
    /** Current browser token for anonymous holders; rotating it on recovery logs out the old browser. */
    accessTokenHash: text("access_token_hash").unique(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entitlements_user_idx").on(t.userId)]
);

export type User = typeof users.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
