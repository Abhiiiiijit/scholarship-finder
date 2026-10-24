ALTER TABLE "rules" DROP CONSTRAINT "rules_op_check";--> statement-breakpoint
ALTER TABLE "rules" ADD COLUMN "ambiguous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rules" ADD CONSTRAINT "rules_op_check" CHECK ("rules"."op" IN ('EQ', 'IN', 'LTE', 'GTE', 'BETWEEN', 'IS_TRUE', 'PERCENTILE_GTE'));