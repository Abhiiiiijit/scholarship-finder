import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/i18n/messages/en.json";
import { exampleStudent, NOW, section5Snapshot, TODAY } from "@/lib/fixtures/section5";
import { match } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import type { PublishableRule } from "@/domain/rules/schema";
import { displayQuote, gapText, missText, reasonRows, ruleText, yourAnswer } from "./explain";
import { answer, questionFor } from "./questions";
import { courseGroups } from "./labels";
import { amountLine, buildResults, byPay, counts, deadlineLine, mainReason, stateSchemeCounts } from "./results";
import { resultsMessage, schemeMessage } from "./share";

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

describe("course rules", () => {
  it("says course scope in a student's words", () => {
    expect(ruleText(t, r({ field: "course_level", op: "IN", value: ["ug", "pg"] }))).toBe(
      "Course level: Undergraduate degree or Postgraduate degree",
    );
    expect(ruleText(t, r({ field: "stream", op: "EQ", value: "medical" }))).toBe("Stream: Medicine");
    expect(ruleText(t, r({ field: "course", op: "IN", value: ["mbbs", "bds"] }))).toBe("Course: MBBS or BDS");
    expect(yourAnswer(t, "course_level", { course: "be_btech" })).toBe("Undergraduate degree");
  });

  it("asks the AICTE question for an AICTE course's regulator rule, and saves it there", () => {
    const p: Profile = { course: "be_btech" };
    expect(questionFor(t, "regulator_approved", p)).toMatchObject({ field: "regulator_approved", question: t("questions.aicte_approved") });
    expect(answer(p, "regulator_approved", "yes")).toEqual({ course: "be_btech", aicte_approved: "yes" });
    expect(questionFor(t, "regulator_approved", { course: "mbbs" })).toBeUndefined();
  });

  it("lists every course on S02 by level, with only live ones open to pick", () => {
    const groups = courseGroups(t);
    expect(groups.map((g) => g.label)).toEqual(["Diploma", "Degree (undergraduate)", "Postgraduate", "PhD"]);
    const open = groups.flatMap((g) => g.options).filter((o) => !o.disabled);
    expect(open).toEqual([{ value: "be_btech", label: "B.E. / B.Tech (engineering)", disabled: false }]);
    expect(groups[1].options.find((o) => o.value === "mbbs")?.label).toBe("MBBS, coming soon");
  });

  it("leaves another course's schemes out of results, not in the far misses", () => {
    const res = buildResults(t, { ...exampleStudent, course: "bcom" }, section5Snapshot, TODAY, NOW);
    expect(res.results).toEqual([]);
    expect(res.farMisses).toEqual([]);
  });
});

describe("state coverage", () => {
  // The J&K scheme is filed under JK but its domicile rule names J&K and Ladakh.
  const jk = {
    ...scheme("mh-rajarshi-shahu-ebc"),
    slug: "jk-sss",
    stateCode: "JK",
    rules: [r({ field: "domicile_state", op: "IN", value: ["JK", "LA"] }), r({ group: 2, field: "family_income", op: "LTE", value: 800000 })],
  };
  const snapshot = { ...section5Snapshot, schemes: [...section5Snapshot.schemes, jk] };

  it("counts published state schemes per state, including states a domicile rule names", () => {
    const n = stateSchemeCounts(snapshot);
    expect([n.get("MH"), n.get("JK"), n.get("LA"), n.get("KA")]).toEqual([1, 1, 1, undefined]);
  });

  it("matches a two-state scheme for students of either state", () => {
    const student: Profile = { ...exampleStudent, domicile_state: "LA", family_income: 500000 };
    const res = buildResults(t, student, snapshot, TODAY, NOW);
    expect(res.results.map((m) => m.scheme.slug)).toContain("jk-sss");
    expect(res.results.map((m) => m.scheme.slug)).not.toContain("mh-rajarshi-shahu-ebc");
  });
});

describe("send to family", () => {
  const c = { locale: "en", today: TODAY, base: "https://paatra.example" };

  it("lists each scheme with amount, deadline, link and papers, and none of the student's answers", () => {
    const res = buildResults(t, exampleStudent, section5Snapshot, TODAY, NOW);
    const text = resultsMessage(t, c, res);
    expect(text).toContain("I can apply for 1 scheme:");
    expect(text).toContain("• Reliance Foundation UG Scholarship");
    expect(text).toContain("https://paatra.example/scheme/reliance-foundation-ug");
    expect(text).toContain("2 more need an answer or a check:");
    expect(text).not.toContain("9,00,000");
    expect(text).not.toContain("₹9 L");
  });

  it("names the papers still missing for one scheme", () => {
    const text = schemeMessage(t, c, scheme("reliance-foundation-ug"), ["Income certificate"]);
    expect(text).toContain("Papers I still need:\n• Income certificate");
    expect(text).toContain("Rules and full document list:\nhttps://paatra.example/scheme/reliance-foundation-ug");
  });
});

describe("quotes", () => {
  it("drops a quote's own outer quotation marks so they are not doubled, and changes nothing else", () => {
    expect(displayQuote('"Family income up to Rs. 2.5 lakh per year."')).toBe("Family income up to Rs. 2.5 lakh per year.");
    expect(displayQuote('Family income "up to Rs. 2.50 lakh" from all sources')).toBe('Family income "up to Rs. 2.50 lakh" from all sources');
    expect(displayQuote('"For salaried employees: ₹4 lakh per year"; "For others: ₹2.5 lakh per year"')).toBe(
      '"For salaried employees: ₹4 lakh per year"; "For others: ₹2.5 lakh per year"',
    );
  });
});

describe("how much and by when", () => {
  const s = (over: Partial<ReturnType<typeof scheme>>) => ({ ...scheme("reliance-foundation-ug"), deadline: null, ...over });

  it("says when applications open, or the months they usually run, before a deadline is announced", () => {
    expect(deadlineLine(t, "en", s({ opensOn: "2026-12-01" }), TODAY).text).toBe("Opens 1 Dec 2026");
    expect(deadlineLine(t, "en", s({ usualWindow: { from: 8, to: 10 } }), TODAY).text).toBe("Usually open Aug–Oct");
    expect(deadlineLine(t, "en", s({ usualWindow: { from: 7, to: 7 } }), TODAY).text).toBe("Usually open Jul");
    // An opening date already past says nothing new; the usual months still help.
    expect(deadlineLine(t, "en", s({ opensOn: "2026-08-15", usualWindow: { from: 8, to: 10 } }), TODAY).text).toBe("Usually open Aug–Oct");
    expect(deadlineLine(t, "en", s({}), TODAY).text).toBe("Deadline not announced yet");
  });

  it("leads with a comparable yearly figure and puts the best-paying scheme first", () => {
    expect(amountLine(t, s({ yearlyAmount: 50000 }))).toBe("About ₹50,000 a year");
    expect(amountLine(t, s({}))).toBe("Up to ₹2 lakh over the degree");
    const res = buildResults(t, { ...exampleStudent, family_income: 300000, gender: "female", disability: "none" }, section5Snapshot, TODAY, NOW);
    const eligible = res.results.filter((m) => m.status === "eligible");
    const paid = eligible.map((m, i) => ({ ...m, scheme: { ...m.scheme, yearlyAmount: i === eligible.length - 1 ? 90000 : null } }));
    expect(byPay(paid)[0].scheme.yearlyAmount).toBe(90000);
  });
});
