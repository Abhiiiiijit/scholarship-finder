CREATE TABLE "rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scholarship_id" bigint NOT NULL,
	"group" integer NOT NULL,
	"field" text NOT NULL,
	"op" text NOT NULL,
	"value" jsonb NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	CONSTRAINT "rules_op_check" CHECK ("rules"."op" IN ('EQ', 'IN', 'LTE', 'GTE', 'BETWEEN', 'IS_TRUE'))
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"state_code" text,
	"official_url" text NOT NULL,
	"amount_text" text,
	"deadline" date,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scholarships_slug_unique" UNIQUE("slug"),
	CONSTRAINT "scholarships_provider_check" CHECK ("scholarships"."provider" IN ('CENTRAL', 'AICTE', 'STATE', 'PRIVATE')),
	CONSTRAINT "scholarships_status_check" CHECK ("scholarships"."status" IN ('DRAFT', 'PUBLISHED', 'ON_HOLD'))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"scholarship_id" bigint,
	"url" text NOT NULL,
	"kind" text,
	"tier" integer,
	"check_every" interval,
	"last_hash" text,
	"last_fetched" timestamp with time zone,
	"etag" text,
	CONSTRAINT "sources_kind_check" CHECK ("sources"."kind" IN ('HTML', 'PDF'))
);
--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rules_scholarship_idx" ON "rules" USING btree ("scholarship_id");--> statement-breakpoint
CREATE INDEX "scholarships_state_idx" ON "scholarships" USING btree ("state_code");