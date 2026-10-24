CREATE TABLE "snapshots" (
	"version" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"scheme_count" integer NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scholarships" DROP CONSTRAINT "scholarships_status_check";--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "tracker_id" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "applies_via" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "source_format" text;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "benefit_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "documents" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "cannot_combine_with" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scholarships" ADD COLUMN "opens_on" date;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_trackerId_unique" UNIQUE("tracker_id");--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_source_format_check" CHECK ("scholarships"."source_format" IN ('HTML', 'PDF'));--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_status_check" CHECK ("scholarships"."status" IN ('DRAFT', 'PUBLISHED', 'ON_HOLD', 'RETIRED'));