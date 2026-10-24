import { describe, expect, it } from "vitest";
import { publishableRuleSchema, ruleValueSchema } from "./schema";

const incomeRule = { group: 2, field: "family_income", op: "LTE", value: 800000 };

describe("ruleValueSchema", () => {
  it("accepts the section 4 example rules", () => {
    expect(ruleValueSchema.safeParse(incomeRule).success).toBe(true);
    expect(
      ruleValueSchema.safeParse({ group: 5, field: "category", op: "IN", value: ["GENERAL", "EWS"] })
        .success,
    ).toBe(true);
  });

  it("rejects a value that does not fit the operator", () => {
    expect(ruleValueSchema.safeParse({ ...incomeRule, value: "8 lakh" }).success).toBe(false);
    expect(ruleValueSchema.safeParse({ ...incomeRule, op: "IN", value: [] }).success).toBe(false);
  });
});

describe("publishableRuleSchema", () => {
  const source = "https://mahadbt.maharashtra.gov.in/";

  it("accepts a rule with a quote and an official link", () => {
    const rule = { ...incomeRule, quote: "Annual family income up to Rs. 8 lakh", sourceUrl: source };
    expect(publishableRuleSchema.safeParse(rule).success).toBe(true);
  });

  it("blocks publishing a rule without a quote", () => {
    expect(publishableRuleSchema.safeParse({ ...incomeRule, quote: "  ", sourceUrl: source }).success).toBe(
      false,
    );
    expect(publishableRuleSchema.safeParse({ ...incomeRule, sourceUrl: source }).success).toBe(false);
  });

  it("blocks publishing a rule without an official link", () => {
    expect(publishableRuleSchema.safeParse({ ...incomeRule, quote: "Up to Rs. 8 lakh" }).success).toBe(false);
  });
});
