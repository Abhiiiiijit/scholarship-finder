CREATE TABLE "source_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone NOT NULL,
	"trigger" text NOT NULL,
	"triggered_by" text,
	"scholarship_id" bigint,
	"snapshot_version" integer,
	"summary" jsonb NOT NULL,
	CONSTRAINT "source_runs_trigger_check" CHECK ("source_runs"."trigger" IN ('schedule', 'admin'))
);
--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_runs_started_idx" ON "source_runs" USING btree ("started_at");