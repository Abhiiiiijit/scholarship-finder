ALTER TABLE "scholarships" ADD COLUMN "yearly_amount" integer;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "window_from" integer;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "window_to" integer;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_yearly_amount_check" CHECK ("scholarships"."yearly_amount" > 0);--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_window_check" CHECK (("scholarships"."window_from" IS NULL) = ("scholarships"."window_to" IS NULL) AND "scholarships"."window_from" BETWEEN 1 AND 12 AND "scholarships"."window_to" BETWEEN 1 AND 12);