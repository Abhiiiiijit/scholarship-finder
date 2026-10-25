import { describe, expect, it } from "vitest";
import { exampleStudent, NOW, section5Snapshot, TODAY } from "../fixtures/section5";
import { match } from "../match";
import type { Profile } from "../profile";
import type { PublishableRule } from "../rules/schema";
import { gapText, missText, reasonRows, ruleText, yourAnswer } from "./explain";
import { answer, questionFor } from "./questions";
import { buildResults, counts, mainReason } from "./results";

const scheme = (slug: string) => section5Snapshot.schemes.find((s) => s.slug === slug)!;
const r = (rule: Partial<PublishableRule>) =>
  ({ group: 1, quote: "q", sourceUrl: "https://example.org/", ambiguous: false, ...rule }) as PublishableRule;

describe("rule reasons", () => {
  it("says each rule in a student's words", () => {
    expect(ruleText(r({ field: "family_income", op: "LTE", value: 800000 }))).toBe("Family income up to ₹8 L");
    expect(ruleText(r({ field: "class12_pct", op: "GTE", value: 60 }))).toBe("Class 12 at least 60%");
    expect(ruleText(r({ field: "domicile_state", op: "EQ", value: "MH" }))).toBe("Maharashtra domicile");
    expect(ruleText(r({ field: "category", op: "IN", value: ["sc", "st", "vjnt"] }))).toBe("Category: SC, ST or VJNT");
    expect(ruleText(r({ field: "MH.cap_admission", op: "IS_TRUE", value: true }))).toBe("Admitted through CAP");
    expect(ruleText(r({ field: "year", op: "IN", value: ["1", "2_lateral"] }))).toBe(
      "Year of study: 1st year or 2nd year (lateral entry)",
    );
    expect(ruleText(r({ field: "class12_pct", op: "PERCENTILE_GTE", value: 80 }))).toBe("Class 12 marks in the top 20% of your board");
  });

  it("names the near miss: income ₹1 L over the ₹8 L limit", () => {
    const m = match(exampleStudent, scheme("mh-rajarshi-shahu-ebc"));
    expect(gapText(m.failed!, exampleStudent)).toBe("Income ₹9 L is ₹1 L over the ₹8 L limit.");
  });

  it("explains a far miss with the limit and the student's figure", () => {
    const m = match(exampleStudent, scheme("central-sector-scheme"));
    const failed = m.groups.find((g) => g.outcome === "fail")!.checks[0];
    expect(missText(failed, exampleStudent)).toBe("Income ₹9 L is ₹4.5 L over the ₹4.5 L limit");
  });

  it("gives one row per rule group, with confirm rows for disputed rules", () => {
    const m = match(exampleStudent, scheme("mh-rajarshi-shahu-ebc"));
    expect(reasonRows(m.groups, exampleStudent).map((x) => [x.result, x.text])).toEqual([
      ["pass", "Maharashtra domicile"],
      ["fail", "Family income up to ₹8 L"],
      ["unknown", "Admitted through CAP"],
      ["confirm", "Category: Open, EWS or SEBC: sources differ, confirm on the official site"],
    ]);
    const reliance = match(exampleStudent, scheme("reliance-foundation-ug"));
    expect(reasonRows(reliance.groups, exampleStudent)[0].text).toBe("Income ₹9 L is within the ₹15 L limit");
  });

  it("shows the student's own answer beside a rule", () => {
    expect(yourAnswer("family_income", exampleStudent)).toBe("₹9,00,000");
    expect(yourAnswer("MH.cap_admission", { state: { "MH.cap_admission": "no" } })).toBe("No, institute or management quota");
    expect(yourAnswer("gender", exampleStudent)).toBeUndefined();
  });
});

describe("results", () => {
  it("matches the PRD section 5 example: 1 eligible, 2 near misses, Saksham hidden", () => {
    const res = buildResults(exampleStudent, section5Snapshot, TODAY, NOW);
    expect(counts(res)).toEqual({ eligible: 1, nearMiss: 2, needsInfo: 0 });
    expect(res.farMisses.map((m) => m.scheme.slug)).toEqual(["central-sector-scheme"]);
    expect(res.hidden.map((m) => m.scheme.slug)).toEqual(["aicte-saksham"]);
  });

  it("only matches state schemes for the student's own state", () => {
    const res = buildResults({ ...exampleStudent, domicile_state: "UP" }, section5Snapshot, TODAY, NOW);
    const shown = [...res.results, ...res.farMisses, ...res.hidden].map((m) => m.scheme.slug);
    expect(shown).not.toContain("mh-rajarshi-shahu-ebc");
    expect(shown).toContain("aicte-pragati");
  });

  it("says income is the main reason when nothing fits", () => {
    const rich: Profile = { ...exampleStudent, family_income: 2000000, gender: "female", disability: "none" };
    const res = buildResults(rich, section5Snapshot, TODAY, NOW);
    expect(counts(res).eligible + counts(res).nearMiss).toBe(0);
    expect(mainReason(res, rich)).toBe(
      "Most schemes cap family income between ₹4.5 L and ₹15 L. Yours is ₹20 L, so merit-based and private scholarships are your best chance.",
    );
  });

  it("asks the CAP question inline and re-matches with the answer", () => {
    const q = questionFor("MH.cap_admission", exampleStudent)!;
    expect(q.kind === "choice" && q.options.map((o) => o.value)).toEqual(["yes", "no"]);
    const p = answer({ ...exampleStudent, family_income: 750000 }, "MH.cap_admission", "yes");
    expect(match(p, scheme("mh-rajarshi-shahu-ebc")).unknownFields).toEqual([]);
    expect(questionFor("MH.cap_admission", { domicile_state: "KA" })).toBeUndefined();
  });
});
