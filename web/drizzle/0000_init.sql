CREATE TABLE "agent_account" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"starting_cash_usd" double precision NOT NULL,
	"cash_usd" double precision NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"halted_reason" text,
	"last_tick_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signal_id" integer,
	"price" double precision NOT NULL,
	"action" text NOT NULL,
	"summary" text NOT NULL,
	"proposal" jsonb,
	"review" jsonb,
	"risk" jsonb,
	"trade_id" integer
);
--> statement-breakpoint
CREATE TABLE "equity_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price" double precision NOT NULL,
	"cash_usd" double precision NOT NULL,
	"position_btc" double precision NOT NULL,
	"equity_usd" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"side" text NOT NULL,
	"qty_btc" double precision NOT NULL,
	"entry_price" double precision NOT NULL,
	"stop" double precision NOT NULL,
	"target" double precision NOT NULL,
	"exit_price" double precision,
	"exit_reason" text,
	"fees_usd" double precision DEFAULT 0 NOT NULL,
	"pnl_usd" double precision,
	"open_decision_id" integer,
	"signal_id" integer
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"engine_version" text NOT NULL,
	"price" double precision NOT NULL,
	"direction" text NOT NULL,
	"score" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"stop" double precision,
	"target" double precision,
	"horizon_hours" integer NOT NULL,
	"factors" jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"outcome" text,
	"exit_price" double precision,
	"return_pct" double precision,
	"direction_correct" boolean
);
--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD CONSTRAINT "agent_decisions_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decisions_created_idx" ON "agent_decisions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "equity_created_idx" ON "equity_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trades_open_idx" ON "paper_trades" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "signals_created_idx" ON "signals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "signals_unresolved_idx" ON "signals" USING btree ("resolved_at");