ALTER TYPE "public"."rule_field" ADD VALUE 'course_level' BEFORE 'year';--> statement-breakpoint
ALTER TYPE "public"."rule_field" ADD VALUE 'stream' BEFORE 'year';--> statement-breakpoint
ALTER TYPE "public"."rule_field" ADD VALUE 'course_tag' BEFORE 'year';--> statement-breakpoint
ALTER TYPE "public"."rule_field" ADD VALUE 'graduation_pct' BEFORE 'entrance_exam';--> statement-breakpoint
ALTER TYPE "public"."rule_field" ADD VALUE 'regulator_approved' BEFORE 'listed_institute';