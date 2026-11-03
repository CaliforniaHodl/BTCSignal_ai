CREATE TABLE "ai_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity" text NOT NULL,
	"feature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_usage_identity_feature_created_idx" ON "ai_usage" USING btree ("identity","feature","created_at");