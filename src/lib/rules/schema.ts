import { z } from "zod";

// Operators from PRD section 4, step 5. PERCENTILE_GTE joins in Phase 6.
export const OPERATORS = ["EQ", "IN", "LTE", "GTE", "BETWEEN", "IS_TRUE"] as const;
export type Operator = (typeof OPERATORS)[number];

const scalar = z.union([z.string(), z.number(), z.boolean()]);

// Rules sharing a group are OR-ed; groups are AND-ed.
const ruleBase = z.object({
  group: z.number().int().positive(),
  field: z.string().min(1),
});

export const ruleValueSchema = z.discriminatedUnion("op", [
  ruleBase.extend({ op: z.literal("EQ"), value: scalar }),
  ruleBase.extend({ op: z.literal("IN"), value: z.array(scalar).min(1) }),
  ruleBase.extend({ op: z.literal("LTE"), value: z.number() }),
  ruleBase.extend({ op: z.literal("GTE"), value: z.number() }),
  ruleBase.extend({ op: z.literal("BETWEEN"), value: z.tuple([z.number(), z.number()]) }),
  ruleBase.extend({ op: z.literal("IS_TRUE"), value: z.literal(true) }),
]);

// A rule may be saved as a draft without its quote, but never published without one.
export const publishableRuleSchema = z.intersection(
  ruleValueSchema,
  z.object({
    quote: z.string().trim().min(1, "Quote the official wording for this rule"),
    sourceUrl: z.url("Link the official page this quote comes from"),
  }),
);

export type RuleValue = z.infer<typeof ruleValueSchema>;
export type PublishableRule = z.infer<typeof publishableRuleSchema>;
