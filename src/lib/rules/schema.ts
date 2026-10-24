import { z } from "zod";

// Operators from PRD section 4, step 5. PERCENTILE_GTE can be stored now, but until the board
// cut-off tables exist (Phase 6) the matcher answers it as "confirm on the official site".
export const OPERATORS = ["EQ", "IN", "LTE", "GTE", "BETWEEN", "IS_TRUE", "PERCENTILE_GTE"] as const;
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
  ruleBase.extend({ op: z.literal("PERCENTILE_GTE"), value: z.number().min(0).max(100) }),
]);

// A rule may be saved as a draft without its quote, but never published without one.
export const publishableRuleSchema = z.intersection(
  ruleValueSchema,
  z.object({
    quote: z.string().trim().min(1, "Quote the official wording for this rule"),
    sourceUrl: z.url("Link the official page this quote comes from"),
    // "Sources disagree": students see "confirm on the official site" instead of a yes or no.
    ambiguous: z.boolean().default(false),
  }),
);

export type RuleValue = z.infer<typeof ruleValueSchema>;
export type PublishableRule = z.infer<typeof publishableRuleSchema>;
