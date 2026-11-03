CREATE TABLE "alert_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_id" integer NOT NULL,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"observed_value" double precision NOT NULL,
	"message" text NOT NULL,
	"source" text NOT NULL,
	"delivery" text NOT NULL,
	"delivery_error" text
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer,
	"owner_token_hash" text,
	"creator_ip_hash" text,
	"kind" text NOT NULL,
	"threshold" double precision NOT NULL,
	"window_hours" integer,
	"direction" text,
	"label" text,
	"mode" text DEFAULT 'once' NOT NULL,
	"cooldown_minutes" integer DEFAULT 60 NOT NULL,
	"discord_webhook_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"armed" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_value" double precision,
	"last_fired_at" timestamp with time zone,
	"fire_count" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_events_alert_idx" ON "alert_events" USING btree ("alert_id");--> statement-breakpoint
CREATE INDEX "alert_events_fired_idx" ON "alert_events" USING btree ("fired_at");--> statement-breakpoint
CREATE INDEX "alerts_user_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_owner_token_idx" ON "alerts" USING btree ("owner_token_hash");--> statement-breakpoint
CREATE INDEX "alerts_active_idx" ON "alerts" USING btree ("active");--> statement-breakpoint
CREATE INDEX "alerts_created_idx" ON "alerts" USING btree ("created_at");