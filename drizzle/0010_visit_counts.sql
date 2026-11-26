CREATE TABLE "visit_counts" (
	"site" text PRIMARY KEY NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_counts_site_check" CHECK ("visit_counts"."site" IN ('paatra', 'portfolio'))
);
