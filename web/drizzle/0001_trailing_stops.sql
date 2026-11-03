ALTER TABLE "paper_trades" ALTER COLUMN "target" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD COLUMN "best" double precision;