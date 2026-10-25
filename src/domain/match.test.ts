import { describe, expect, it } from "vitest";
import { exampleStudent, NOW, section5Snapshot, TODAY } from "@/lib/fixtures/section5";
import { checkRule, match, matchAll, type RuleOutcome } from "./match";
import type { Profile } from "./profile";
import type { PublishableRule } from "./rules/schema";
import { snapshotSchema } from "./rules/snapshot";

const scheme = (slug: string) => section5Snapshot.schemes.find((s) => s.slug === slug)!;
const outcomes = (p: Profile, slug: string) =>
  Object.fromEntries(
    match(p, scheme(slug)).groups.flatMap((g) => g.checks.map((c) => [c.rule.field, c.outcome])),
  );

describe("PRD section 5 worked example", () => {
  it("is a valid published snapshot", () => {
    expect(snapshotSchema.safeParse(section5Snapshot).success).toBe(true);
  });

  // "Rule-by-rule result" and "Matcher output" columns of the section 5 table.
  it.each<[string, Record<string, RuleOutcome>, string]>([
    [
      "reliance-foundation-ug",
      { family_income: "pass", class12_pct: "pass", year: "pass" },
      "eligible",
    ],
    [
      "mh-rajarshi-shahu-ebc",
      { domicile_state: "pass", family_income: "fail", "MH.cap_admission": "unknown", category: "unknown" },
      "nearMiss",
    ],
    ["aicte-pragati", { gender: "unknown", family_income: "fail" }, "nearMiss"],
    ["aicte-saksham", { disability_pct: "unknown", family_income: "fail" }, "nearMiss"],
    ["central-sector-scheme", { class12_pct: "unknown", family_income: "fail" }, "notEligible"],
  ])("%s", (slug, rules, status) => {
    expect(outcomes(exampleStudent, slug)).toEqual(rules);
    expect(match(exampleStudent, scheme(slug)).status).toBe(status);
  });

  it("names the one failed rule: income ₹1 L over ₹8 L", () => {
    const m = match(exampleStudent, scheme("mh-rajarshi-shahu-ebc"));
    expect(m.failed?.rule.field).toBe("family_income");
    expect(m.failed?.gap).toEqual({ amount: 100000, ratio: 0.125 });
    expect(m.unknownFields).toEqual(["MH.cap_admission"]);
    // The disputed category rule is "confirm on the official site", not a question.
    expect(m.confirm.map((c) => c.rule.field)).toEqual(["category"]);
  });

  it("treats ₹9 L against ₹4.5 L as too far to be a near-miss", () => {
    const m = match(exampleStudent, scheme("central-sector-scheme"));
    const income = m.groups[1].checks[0];
    expect(income.gap?.ratio).toBe(1);
  });

  it("shows 1 match, 2 near-misses and the CAP and gender questions", () => {
    const { results, questions, unlocks } = matchAll(exampleStudent, section5Snapshot, TODAY, NOW);
    expect(results.map((r) => [r.scheme.slug, r.status])).toEqual([
      ["reliance-foundation-ug", "eligible"],
      ["aicte-pragati", "nearMiss"],
      ["mh-rajarshi-shahu-ebc", "nearMiss"],
    ]);
    expect(results.filter((r) => r.status === "nearMiss").map((r) => r.failed?.rule.field)).toEqual([
      "family_income",
      "family_income",
    ]);
    expect(questions.map((q) => q.field).sort()).toEqual(["MH.cap_admission", "gender"]);
    // Saksham stays hidden until the disability question is answered.
    expect(unlocks).toEqual([{ field: "disability_pct", schemes: 1 }]);
  });

  it("drops Pragati once the student says male, and keeps it as a near-miss for a girl", () => {
    const slugs = (p: Profile) => matchAll(p, section5Snapshot, TODAY, NOW).results.map((r) => r.scheme.slug);
    expect(slugs({ ...exampleStudent, gender: "male" })).not.toContain("aicte-pragati");
    const girl = match({ ...exampleStudent, gender: "female" }, scheme("aicte-pragati"));
    expect(girl.status).toBe("nearMiss");
    expect(girl.unknownFields).toEqual([]);
  });

  it("shows Saksham as a near-miss once disability is answered 40% or more", () => {
    const { results, unlocks } = matchAll({ ...exampleStudent, disability: "gte40" }, section5Snapshot, TODAY, NOW);
    expect(results.find((r) => r.scheme.slug === "aicte-saksham")?.status).toBe("nearMiss");
    expect(unlocks).toEqual([]);
  });

  it("makes Rajarshi Shahu eligible-pending-confirmation at ₹7.5 L through CAP", () => {
    const p: Profile = { ...exampleStudent, family_income: 750000, state: { "MH.cap_admission": "yes" } };
    const m = match(p, scheme("mh-rajarshi-shahu-ebc"));
    // Never a plain "eligible" while a disputed rule is open.
    expect(m.status).toBe("needsInfo");
    expect(m.unknownFields).toEqual([]);
    expect(m.confirm).toHaveLength(1);
  });
});

describe("checkRule", () => {
  const rule = (r: Partial<PublishableRule> & Pick<PublishableRule, "field" | "op" | "value">) =>
    ({ group: 1, quote: "q", sourceUrl: "https://example.gov.in/", ambiguous: false, ...r }) as PublishableRule;
  const outcome = (r: PublishableRule, p: Profile) => checkRule(r, p).outcome;

  it.each<[string, PublishableRule, Profile, RuleOutcome]>([
    ["unanswered is unknown, never a fail", rule({ field: "family_income", op: "LTE", value: 800000 }), {}, "unknown"],
    ["LTE at the limit passes", rule({ field: "family_income", op: "LTE", value: 800000 }), { family_income: 800000 }, "pass"],
    ["GTE below fails", rule({ field: "class12_pct", op: "GTE", value: 60 }), { class12_pct: 59.9 }, "fail"],
    ["BETWEEN inside passes", rule({ field: "class12_pct", op: "BETWEEN", value: [50, 75] }), { class12_pct: 60 }, "pass"],
    ["IN matches one value", rule({ field: "year", op: "IN", value: ["1", "2_lateral"] }), { year: "2_lateral" }, "pass"],
    ["IN on a multi answer needs one overlap", rule({ field: "parent_occupation", op: "IN", value: ["capf", "ex_serviceman"] }), { parent_occupation: ["farmer", "capf"] }, "pass"],
    ["'none of these' fails a multi rule", rule({ field: "special_status", op: "EQ", value: "orphan" }), { special_status: ["none"] }, "fail"],
    ["IS_TRUE on yes passes", rule({ field: "MH.cap_admission", op: "IS_TRUE", value: true }), { state: { "MH.cap_admission": "yes" } }, "pass"],
    ["IS_TRUE on no fails", rule({ field: "MH.cap_admission", op: "IS_TRUE", value: true }), { state: { "MH.cap_admission": "no" } }, "fail"],
    ["IS_TRUE on 'applied' is unknown", rule({ field: "MH.caste_validity", op: "IS_TRUE", value: true }), { state: { "MH.caste_validity": "applied" } }, "unknown"],
    ["'not sure' is unknown", rule({ field: "aicte_approved", op: "IS_TRUE", value: true }), { aicte_approved: "unknown" }, "unknown"],
    ["AICTE yes passes", rule({ field: "aicte_approved", op: "IS_TRUE", value: true }), { aicte_approved: "yes" }, "pass"],
    ["disability under 40% fails a 40% rule", rule({ field: "disability_pct", op: "GTE", value: 40 }), { disability: "lt40" }, "fail"],
    ["disability under 40% is unknown for a 21% rule", rule({ field: "disability_pct", op: "GTE", value: 21 }), { disability: "lt40" }, "unknown"],
    ["percentile waits for board tables", rule({ field: "class12_pct", op: "PERCENTILE_GTE", value: 80 }), { class12_pct: 99 }, "unknown"],
    ["a 1st-year student applies fresh", rule({ field: "fresh_or_renewal", op: "EQ", value: "fresh" }), { year: "1" }, "pass"],
    ["a number rule on a choice field never passes", rule({ field: "gender", op: "LTE", value: 1 }), { gender: "female" }, "unknown"],
  ])("%s", (_name, r, p, expected) => {
    expect(outcome(r, p)).toBe(expected);
  });
});

describe("match", () => {
  const base = scheme("aicte-pragati");

  it("ORs rules inside a group", () => {
    const s = {
      ...base,
      rules: [
        ...base.rules,
        { ...base.rules[1], field: "special_status", op: "EQ" as const, value: "orphan" },
      ],
    };
    // Income fails but the orphan rule in the same group passes.
    const m = match({ gender: "female", family_income: 900000, special_status: ["orphan"] }, s);
    expect(m.status).toBe("eligible");
  });

  it("is not a near-miss when two groups fail", () => {
    expect(match({ gender: "male", family_income: 850000 }, base).status).toBe("notEligible");
  });

  it("is not a near-miss when the one fail is not a number", () => {
    expect(match({ gender: "male", family_income: 500000 }, base).status).toBe("notEligible");
  });

  it("asks for a field the MVP does not ask as 'confirm on the official site'", () => {
    const s = { ...base, rules: [...base.rules, { ...base.rules[0], group: 3, field: "siblings_claiming", op: "LTE" as const, value: 2 }] };
    const m = match({ gender: "female", family_income: 500000 }, s);
    expect(m.status).toBe("needsInfo");
    expect(m.unknownFields).toEqual([]);
    expect(m.confirm.map((c) => c.rule.field)).toEqual(["siblings_claiming"]);
  });
});

describe("matchAll freshness", () => {
  it("hides schemes past their deadline or not verified in 90 days", () => {
    const [reliance] = section5Snapshot.schemes;
    const snapshot = {
      ...section5Snapshot,
      schemes: [
        { ...reliance, slug: "closed", deadline: "2026-10-23" },
        { ...reliance, slug: "stale", lastVerifiedAt: "2026-07-20T10:00:00+05:30" },
        { ...reliance, slug: "open", deadline: TODAY },
      ],
    };
    expect(matchAll(exampleStudent, snapshot, TODAY, NOW).results.map((r) => r.scheme.slug)).toEqual(["open"]);
  });
});
