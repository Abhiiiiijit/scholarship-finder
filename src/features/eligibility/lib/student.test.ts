import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import { exampleStudent, NOW, section5Snapshot, TODAY } from "@/lib/fixtures/section5";
import { match } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import type { PublishableRule } from "@/domain/rules/schema";
import { gapText, missText, reasonRows, ruleText, yourAnswer } from "./explain";
import { answer, questionFor } from "./questions";
import { buildResults, counts, deadlineLine, mainReason } from "./results";

// English, so these sentences match what students see today.
const t = createTranslator({ locale: "en", messages: en });
const scheme = (slug: string) => section5Snapshot.schemes.find((s) => s.slug === slug)!;
const r = (rule: Partial<PublishableRule>) =>
  ({ group: 1, quote: "q", sourceUrl: "https://example.org/", ambiguous: false, ...rule }) as PublishableRule;

describe("rule reasons", () => {
  it("says each rule in a student's words", () => {
    expect(ruleText(t, r({ field: "family_income", op: "LTE", value: 800000 }))).toBe("Family income up to ₹8 L");
    expect(ruleText(t, r({ field: "class12_pct", op: "GTE", value: 60 }))).toBe("Class 12 at least 60%");
    expect(ruleText(t, r({ field: "domicile_state", op: "EQ", value: "MH" }))).toBe("Maharashtra domicile");
    expect(ruleText(t, r({ field: "category", op: "IN", value: ["sc", "st", "vjnt"] }))).toBe("Category: SC, ST or VJNT");
    expect(ruleText(t, r({ field: "MH.cap_admission", op: "IS_TRUE", value: true }))).toBe("Admitted through CAP");
    expect(ruleText(t, r({ field: "year", op: "IN", value: ["1", "2_lateral"] }))).toBe(
      "Year of study: 1st year or 2nd year (lateral entry)",
    );
    expect(ruleText(t, r({ field: "class12_pct", op: "PERCENTILE_GTE", value: 80 }))).toBe("Class 12 marks in the top 20% of your board");
  });

  it("names the near miss: income ₹1 L over the ₹8 L limit", () => {
    const m = match(exampleStudent, scheme("mh-rajarshi-shahu-ebc"));
    expect(gapText(t, m.failed!, exampleStudent)).toBe("Income ₹9 L is ₹1 L over the ₹8 L limit.");
  });

  it("explains a far miss with the limit and the student's figure", () => {
    const m = match(exampleStudent, scheme("central-sector-scheme"));
    const failed = m.groups.find((g) => g.outcome === "fail")!.checks[0];
    expect(missText(t, failed, exampleStudent)).toBe("Income ₹9 L is ₹4.5 L over the ₹4.5 L limit");
  });

  it("gives one row per rule group, with confirm rows for disputed rules", () => {
    const m = match(exampleStudent, scheme("mh-rajarshi-shahu-ebc"));
    expect(reasonRows(t, m.groups, exampleStudent).map((x) => [x.result, x.text])).toEqual([
      ["pass", "Maharashtra domicile"],
      ["fail", "Family income up to ₹8 L"],
      ["unknown", "Admitted through CAP"],
      ["confirm", "Category: Open, EWS or SEBC: sources differ, confirm on the official site"],
    ]);
    const reliance = match(exampleStudent, scheme("reliance-foundation-ug"));
    expect(reasonRows(t, reliance.groups, exampleStudent)[0].text).toBe("Income ₹9 L is within the ₹15 L limit");
  });

  it("shows a disputed rule the student fails on every reading, instead of hiding it", () => {
    // Sitaram Jindal: ₹4 L for salaried families, ₹2.5 L for others. ₹9 L is over both.
    const groups = match(exampleStudent, {
      ...scheme("reliance-foundation-ug"),
      rules: [r({ field: "family_income", op: "LTE", value: 400000, ambiguous: true })],
    }).groups;
    expect(reasonRows(t, groups, exampleStudent).map((x) => [x.result, x.text])).toEqual([
      ["fail", "Income ₹9 L is ₹5 L over the ₹4 L limit. Sources differ, so confirm on the official site"],
    ]);
  });

  it("shows the student's own answer beside a rule", () => {
    expect(yourAnswer(t, "family_income", exampleStudent)).toBe("₹9,00,000");
    expect(yourAnswer(t, "MH.cap_admission", { state: { "MH.cap_admission": "no" } })).toBe("No, institute or management quota");
    expect(yourAnswer(t, "gender", exampleStudent)).toBeUndefined();
  });
});

describe("results", () => {
  it("matches the PRD section 5 example: 1 eligible, 2 near misses, Saksham hidden", () => {
    const res = buildResults(t, exampleStudent, section5Snapshot, TODAY, NOW);
    expect(counts(res)).toEqual({ eligible: 1, nearMiss: 2, needsInfo: 0 });
    expect(res.farMisses.map((m) => m.scheme.slug)).toEqual(["central-sector-scheme"]);
    expect(res.hidden.map((m) => m.scheme.slug)).toEqual(["aicte-saksham"]);
  });

  it("only matches state schemes for the student's own state", () => {
    const res = buildResults(t, { ...exampleStudent, domicile_state: "UP" }, section5Snapshot, TODAY, NOW);
    const shown = [...res.results, ...res.farMisses, ...res.hidden].map((m) => m.scheme.slug);
    expect(shown).not.toContain("mh-rajarshi-shahu-ebc");
    expect(shown).toContain("aicte-pragati");
  });

  it("says income is the main reason when nothing fits", () => {
    const rich: Profile = { ...exampleStudent, family_income: 2000000, gender: "female", disability: "none" };
    const res = buildResults(t, rich, section5Snapshot, TODAY, NOW);
    expect(counts(res).eligible + counts(res).nearMiss).toBe(0);
    expect(mainReason(t, res, rich)).toBe(
      "Most schemes cap family income between ₹4.5 L and ₹15 L. Yours is ₹20 L, so merit-based and private scholarships are your best chance.",
    );
  });

  it("lists schemes that fit but have closed, instead of dropping them", () => {
    const closed = { ...scheme("reliance-foundation-ug"), deadline: "2026-10-05" };
    const snapshot = { ...section5Snapshot, schemes: section5Snapshot.schemes.map((s) => (s.slug === closed.slug ? closed : s)) };
    const res = buildResults(t, exampleStudent, snapshot, TODAY, NOW);
    expect(res.results.map((m) => m.scheme.slug)).not.toContain("reliance-foundation-ug");
    expect(res.closed.map((m) => [m.scheme.slug, m.status])).toEqual([["reliance-foundation-ug", "eligible"]]);
    // A closed scheme the student doesn't fit stays out.
    const far = { ...scheme("central-sector-scheme"), deadline: "2026-10-05" };
    const res2 = buildResults(t, exampleStudent, { ...section5Snapshot, schemes: [far] }, TODAY, NOW);
    expect(res2.closed).toEqual([]);
  });

  it("says when to apply by, and warns in the last two weeks", () => {
    const s = (deadline: string | null) => ({ ...scheme("reliance-foundation-ug"), deadline });
    expect(deadlineLine(t, "en", s(null), TODAY)).toEqual({ text: "Deadline not announced yet", urgent: false });
    expect(deadlineLine(t, "en", s("2026-12-31"), TODAY)).toEqual({ text: "Apply by 31 Dec 2026", urgent: false });
    expect(deadlineLine(t, "en", s("2026-10-29"), TODAY)).toEqual({ text: "Apply by 29 Oct 2026 · 5 days left", urgent: true });
    expect(deadlineLine(t, "en", s("2026-10-24"), TODAY).text).toBe("Apply by 24 Oct 2026 · closes today");
    expect(deadlineLine(t, "en", s("2026-10-05"), TODAY)).toEqual({ text: "Closed on 5 Oct 2026", urgent: false });
  });

  it("asks the CAP question inline and re-matches with the answer", () => {
    const q = questionFor(t, "MH.cap_admission", exampleStudent)!;
    expect(q.kind === "choice" && q.options.map((o) => o.value)).toEqual(["yes", "no"]);
    const p = answer({ ...exampleStudent, family_income: 750000 }, "MH.cap_admission", "yes");
    expect(match(p, scheme("mh-rajarshi-shahu-ebc")).unknownFields).toEqual([]);
    expect(questionFor(t, "MH.cap_admission", { domicile_state: "KA" })).toBeUndefined();
  });
});
