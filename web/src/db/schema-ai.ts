import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per metered AI/compute request, for per-pass hourly rate limits.
 * `identity` is a SHA-256 of the access identity (account id or pass token hash) —
 * never the raw token. Rows older than a day are pruned opportunistically.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    identity: text("identity").notNull(),
    /** "trade-coach" | "setup-grader" | "analyze" | "strategy-parse" | "backtest" | "portfolio" */
    feature: text("feature").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_identity_feature_created_idx").on(t.identity, t.feature, t.createdAt)]
);
