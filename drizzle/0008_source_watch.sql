ALTER TABLE "rules" ADD COLUMN "quote_found_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "quote_missing_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "baseline_hash" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_status" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_changed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "sources_scheme_url_idx" ON "sources" USING btree ("scholarship_id","url");--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_last_status_check" CHECK ("sources"."last_status" IN ('ok', 'blocked', 'error'));