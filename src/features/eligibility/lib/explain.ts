import type { GroupCheck, RuleCheck } from "@/domain/match";
import { ENTRANCE_EXAMS, YEARS, type Profile } from "@/domain/profile";
import { fieldTier, isStateKey, RULE_FIELDS, type RuleField } from "@/domain/rules/fields";
import type { PublishableRule } from "@/domain/rules/schema";
import { NATIONAL_CATEGORIES, STATE_BY_CODE, STATES } from "@/domain/states";
import { formatINR, formatLakh } from "@/lib/format";
import { categoryLabel, optionLabel, questionLabel, stateLabel } from "./domain-labels";
import { joinList, type T } from "./i18n";
import {
  aicteOptions,
  disabilityOptions,
  genderOptions,
  institutionOptions,
  labelOf,
  minorityOptions,
  parentOccupationOptions,
  specialStatusOptions,
  type Option,
} from "./labels";

// Plain-language reasons for every rule, so a result always says why: "Family income up to ₹8 L",
// "Income ₹9 L is ₹1 L over the ₹8 L limit". Pure, so the screens and the tests share it. The
// words come from the "rules" messages, and state words from domain-labels.ts.

// Every state's category names, so a central scheme's "sc" or a state's "vjnt" reads right.
const CATEGORY_LABELS = new Map<string, string>();
for (const c of [...NATIONAL_CATEGORIES, ...STATES.flatMap((s) => s.categories)]) {
  if (!CATEGORY_LABELS.has(c.value)) CATEGORY_LABELS.set(c.value, c.label);
}

const keyed = <K extends string>(keys: readonly K[], label: (k: K) => string): Option[] =>
  keys.map((value) => ({ value, label: label(value) }));

function choiceLabels(t: T, field: RuleField): readonly Option[] {
  switch (field) {
    case "gender":
      return genderOptions(t);
    case "year":
      return keyed(YEARS, (v) => t(`options.yearInRule.${v}`));
    case "institution_type":
      return institutionOptions(t);
    case "minority":
      return minorityOptions(t);
    case "parent_occupation":
      return parentOccupationOptions(t);
    case "special_status":
      return specialStatusOptions(t);
    case "entrance_exam":
      return keyed(ENTRANCE_EXAMS, (v) => t(`options.entranceInRule.${v}`));
    case "course":
      return [{ value: "be_btech", label: t("options.courseInRule.be_btech") }];
    case "fresh_or_renewal":
      return keyed(["fresh", "renewal"] as const, (v) => t(`options.freshOrRenewal.${v}`));
    default:
      return [];
  }
}

function stateQuestion(field: string) {
  const [code, key] = field.split(".");
  const q = STATE_BY_CODE.get(code)?.questions.find((x) => x.key === key);
  return q && { code, q };
}

export function fieldLabel(t: T, field: string): string {
  if (isStateKey(field)) {
    const found = stateQuestion(field);
    return found ? questionLabel(t, found.code, found.q) : field;
  }
  return field in RULE_FIELDS ? t(`ruleFields.${field as RuleField}`) : field;
}

export function valueLabel(t: T, field: string, value: unknown): string {
  if (typeof value === "boolean") return value ? t("rules.yes") : t("rules.no");
  const v = String(value);
  if (isStateKey(field)) {
    const found = stateQuestion(field);
    const option = found?.q.options.find((o) => o.value === v);
    return found && option ? optionLabel(t, found.code, found.q, option) : v;
  }
  if (field === "category") return categoryLabel(t, v, CATEGORY_LABELS.get(v) ?? v);
  if (field === "domicile_state") return stateLabel(t, v) ?? v;
  if (!(field in RULE_FIELDS)) return v;
  return labelOf(choiceLabels(t, field as RuleField), v) ?? v;
}

const MONEY = new Set(["family_income"]);
const PERCENT = new Set(["class12_pct", "class10_pct", "disability_pct"]);

// A limit or an answer in the field's own units: "₹8 L", "60%", "2".
export function amount(field: string, n: number): string {
  if (MONEY.has(field)) return formatLakh(n);
  if (PERCENT.has(field)) return `${n}%`;
  return String(n);
}

// Short subject for sentences like "Income ₹9 L is ₹1 L over the ₹8 L limit".
const SUBJECTS = [
  "family_income",
  "class12_pct",
  "class10_pct",
  "disability_pct",
  "entrance_rank",
  "cgpa",
  "siblings_claiming",
  "gap_years",
] as const;
type Subject = (typeof SUBJECTS)[number];
const subject = (t: T, field: string) =>
  (SUBJECTS as readonly string[]).includes(field) ? t(`subjects.${field as Subject}`) : fieldLabel(t, field);

// What the rule asks for, in a student's words.
export function ruleText(t: T, rule: PublishableRule): string {
  const label = fieldLabel(t, rule.field);
  switch (rule.op) {
    case "LTE":
      return rule.field === "family_income"
        ? t("rules.incomeUpTo", { amount: amount(rule.field, rule.value) })
        : t("rules.atMost", { subject: subject(t, rule.field), amount: amount(rule.field, rule.value) });
    case "GTE":
      return t("rules.atLeast", { subject: subject(t, rule.field), amount: amount(rule.field, rule.value) });
    case "BETWEEN":
      return t("rules.between", {
        subject: subject(t, rule.field),
        low: amount(rule.field, rule.value[0]),
        high: amount(rule.field, rule.value[1]),
      });
    case "PERCENTILE_GTE":
      return t("rules.topPercent", { subject: subject(t, rule.field), pct: String(100 - rule.value) });
    case "IS_TRUE":
      return rule.field === "aicte_approved" ? t("rules.aicte") : label;
    case "EQ":
      if (rule.field === "domicile_state") return t("rules.domicile", { state: valueLabel(t, rule.field, rule.value) });
      if (rule.field === "gender" && rule.value === "female") return t("rules.girlsOnly");
      return t("rules.fieldIs", { field: label, value: valueLabel(t, rule.field, rule.value) });
    case "IN":
      return t("rules.fieldIs", {
        field: label,
        value: joinList(t, rule.value.map((v) => valueLabel(t, rule.field, v)), "or"),
      });
  }
}

// The student's own answer for a rule's field, as shown beside it ("You: ₹9,00,000").
export function yourAnswer(t: T, field: string, p: Profile): string | undefined {
  const pct = (n: number | undefined) => (n === undefined ? undefined : `${n}%`);
  if (isStateKey(field)) {
    const v = p.state?.[field];
    return v === undefined || v === "unknown" ? undefined : valueLabel(t, field, v);
  }
  switch (field) {
    case "family_income":
      return p.family_income === undefined ? undefined : formatINR(p.family_income);
    case "class12_pct":
      return pct(p.class12_pct);
    case "class10_pct":
      return pct(p.class10_pct);
    case "disability_pct":
      return labelOf(disabilityOptions(t), p.disability);
    case "aicte_approved":
      return p.aicte_approved === "unknown" ? undefined : labelOf(aicteOptions(t), p.aicte_approved);
    case "entrance_exam":
      return p.entrance ? valueLabel(t, field, p.entrance.exam) : undefined;
    case "entrance_rank":
      return p.entrance?.score === undefined ? undefined : String(p.entrance.score);
    case "parent_occupation":
    case "special_status": {
      const vs = p[field];
      return vs?.length ? vs.map((v) => valueLabel(t, field, v)).join(t("common.listSeparator")) : undefined;
    }
    case "domicile_state":
    case "category":
    case "gender":
    case "course":
    case "year":
    case "institution_type":
    case "minority": {
      const v = p[field];
      return v === undefined ? undefined : valueLabel(t, field, v);
    }
    default:
      return undefined;
  }
}

// One sentence for a numeric fail: "Income ₹9 L is ₹1 L over the ₹8 L limit."
export function gapText(t: T, check: RuleCheck, p: Profile): string | undefined {
  const { rule, gap } = check;
  if (!gap) return undefined;
  const yours = numericAnswer(rule.field, p);
  if (yours === undefined) return undefined;
  const words = { subject: subject(t, rule.field), yours: amount(rule.field, yours), by: amount(rule.field, round(gap.amount)) };
  switch (rule.op) {
    case "LTE":
      return t("rules.over", { ...words, limit: amount(rule.field, rule.value) });
    case "GTE":
      return t("rules.under", { ...words, limit: amount(rule.field, rule.value) });
    case "BETWEEN":
      return t("rules.outside", { ...words, low: amount(rule.field, rule.value[0]), high: amount(rule.field, rule.value[1]) });
    default:
      return undefined;
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

function numericAnswer(field: string, p: Profile): number | undefined {
  switch (field) {
    case "family_income":
      return p.family_income;
    case "class12_pct":
      return p.class12_pct;
    case "class10_pct":
      return p.class10_pct;
    case "entrance_rank":
      return p.entrance?.score;
    default:
      return undefined;
  }
}

// A passing rule, said with the student's answer where that reads naturally.
export function passText(t: T, check: RuleCheck, p: Profile): string {
  const { rule } = check;
  const yours = numericAnswer(rule.field, p);
  if (yours !== undefined && rule.op === "LTE") {
    return t("rules.within", { subject: subject(t, rule.field), yours: amount(rule.field, yours), limit: amount(rule.field, rule.value) });
  }
  if (yours !== undefined && rule.op === "GTE") {
    return t("rules.meets", { subject: subject(t, rule.field), yours: amount(rule.field, yours), limit: amount(rule.field, rule.value) });
  }
  return ruleText(t, rule);
}

// Why a far miss is out, for the "Why aren't others here?" list: "Family income up to ₹4.5 L;
// yours is ₹9,00,000".
export function missText(t: T, check: RuleCheck, p: Profile): string {
  const gap = gapText(t, check, p);
  if (gap) return gap.replace(/[.।]$/, "");
  const yours = yourAnswer(t, check.rule.field, p);
  return yours ? t("rules.yoursIs", { rule: ruleText(t, check.rule), yours }) : ruleText(t, check.rule);
}

export type RowResult = "pass" | "fail" | "unknown" | "confirm";
export interface ReasonRow {
  result: RowResult;
  text: string;
  field: string;
}

// One row per group: the rule that passed, the rules that failed, the questions still open, or
// the rules to confirm on the official site.
export function reasonRows(t: T, groups: GroupCheck[], p: Profile): ReasonRow[] {
  return groups.flatMap((g): ReasonRow[] => {
    if (g.outcome === "pass") {
      const c = g.checks.find((x) => x.outcome === "pass")!;
      return [{ result: "pass", text: passText(t, c, p), field: c.rule.field }];
    }
    if (g.outcome === "fail") {
      return g.checks.map((c) => ({ result: "fail", text: ruleText(t, c.rule), field: c.rule.field }));
    }
    if (g.outcome === "unknown") {
      return g.checks
        .filter((c) => c.outcome === "unknown" && !c.rule.ambiguous && c.rule.op !== "PERCENTILE_GTE" && fieldTier(c.rule.field) !== "notAsked")
        .map((c) => ({ result: "unknown", text: ruleText(t, c.rule), field: c.rule.field }));
    }
    return g.checks
      .filter((c) => c.outcome !== "fail")
      .map((c) => ({
        result: "confirm",
        text: t(c.rule.ambiguous ? "rules.confirmDisputed" : "rules.confirm", { rule: ruleText(t, c.rule) }),
        field: c.rule.field,
      }));
  });
}
