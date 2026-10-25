import { z } from "zod";
import { RULE_FIELDS } from "@/domain/rules/fields";
import { publishableRuleSchema, ruleValueSchema } from "@/domain/rules/schema";
import { STATE_BY_CODE, stateFieldKeys } from "@/domain/states";

// What the scheme editor (A02) saves. A draft may have rules without quotes; publishing may not.

const blankToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const optionalText = z.preprocess(blankToNull, z.string().trim().nullable());
const optionalDate = z.preprocess(blankToNull, z.iso.date().nullable());

export const draftRuleSchema = z.intersection(
  ruleValueSchema,
  z.object({
    quote: z.string().default(""),
    sourceUrl: z.union([z.literal(""), z.url("Link the official page this quote comes from")]).default(""),
    ambiguous: z.boolean().default(false),
  }),
);

export const schemeDraftSchema = z
  .object({
    trackerId: z.preprocess(blankToNull, z.string().trim().regex(/^[A-Z]{1,3}\d{1,3}$/, "Use the tracker id, e.g. C1 or M4").nullable()),
    slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase words joined by hyphens"),
    name: z.string().trim().min(1, "Name the scheme"),
    provider: z.enum(["CENTRAL", "AICTE", "STATE", "PRIVATE"]),
    stateCode: z.preprocess(blankToNull, z.string().nullable()),
    source: optionalText,
    appliesVia: optionalText,
    sourceFormat: z.preprocess(blankToNull, z.enum(["HTML", "PDF"]).nullable()),
    officialUrl: z.url("Link the scheme's official page"),
    amountText: optionalText,
    benefitTypes: z.array(z.string()).default([]),
    documents: z.array(z.string()).default([]),
    cannotCombineWith: z.array(z.string().trim().min(1)).default([]),
    reviewNotes: optionalText,
    opensOn: optionalDate,
    deadline: optionalDate,
    rules: z.array(draftRuleSchema),
  })
  .superRefine((s, ctx) => {
    if (s.provider === "STATE" && !(s.stateCode && STATE_BY_CODE.has(s.stateCode))) {
      ctx.addIssue({ code: "custom", path: ["stateCode"], message: "Pick the state that runs this scheme" });
    }
    if (s.provider !== "STATE" && s.stateCode) {
      ctx.addIssue({ code: "custom", path: ["stateCode"], message: "Only state schemes have a state" });
    }
    if (s.opensOn && s.deadline && s.opensOn > s.deadline) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "The last date is before the opening date" });
    }
    const allowed = new Set([...Object.keys(RULE_FIELDS), ...stateFieldKeys(s.stateCode)]);
    s.rules.forEach((r, i) => {
      if (!allowed.has(r.field)) {
        ctx.addIssue({ code: "custom", path: ["rules", i, "field"], message: `${r.field} is not a field this scheme can use` });
      }
      if (r.op === "PERCENTILE_GTE") {
        ctx.addIssue({ code: "custom", path: ["rules", i, "op"], message: "Percentile rules wait for board cut-off tables" });
      }
      if (r.op === "BETWEEN" && r.value[0] > r.value[1]) {
        ctx.addIssue({ code: "custom", path: ["rules", i, "value"], message: "The lower bound is above the upper bound" });
      }
    });
  });

export type SchemeDraftInput = z.input<typeof schemeDraftSchema>;
export type SchemeDraft = z.output<typeof schemeDraftSchema>;

// The publish checklist on A02. Empty means the scheme can be published.
export function publishProblems(s: Pick<SchemeDraft, "rules" | "officialUrl">): string[] {
  const problems: string[] = [];
  if (!s.officialUrl) problems.push("Add the official URL");
  if (s.rules.length === 0) problems.push("Add at least one rule");
  s.rules.forEach((r, i) => {
    const check = publishableRuleSchema.safeParse(r);
    if (!check.success) {
      for (const issue of check.error.issues) problems.push(`Rule ${i + 1} (${r.field}): ${issue.message}`);
    }
  });
  return problems;
}

export function issuesByPath(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}
