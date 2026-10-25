import type { GroupCheck, RuleCheck } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import { RULE_FIELDS, fieldTier, isStateKey, type RuleField } from "@/domain/rules/fields";
import type { PublishableRule } from "@/domain/rules/schema";
import { NATIONAL_CATEGORIES, STATE_BY_CODE, STATES, stateName } from "@/domain/states";
import { formatINR, formatLakh } from "../format";
import {
  AICTE_OPTIONS,
  DISABILITY_OPTIONS,
  ENTRANCE_OPTIONS,
  GENDER_OPTIONS,
  INSTITUTION_OPTIONS,
  MINORITY_OPTIONS,
  PARENT_OCCUPATION_OPTIONS,
  SPECIAL_STATUS_OPTIONS,
  YEAR_OPTIONS,
  labelOf,
  type Option,
} from "./labels";

// Plain-language reasons for every rule, so a result always says why: "Family income up to ₹8 L",
// "Income ₹9 L is ₹1 L over the ₹8 L limit". Pure, so the screens and the tests share it.

// Every state's category names, so a central scheme's "sc" or a state's "vjnt" reads right.
const CATEGORY_LABELS = new Map<string, string>();
for (const c of [...NATIONAL_CATEGORIES, ...STATES.flatMap((s) => s.categories)]) {
  if (!CATEGORY_LABELS.has(c.value)) CATEGORY_LABELS.set(c.value, c.label);
}

const CHOICE_LABELS: Partial<Record<RuleField, readonly Option[]>> = {
  gender: GENDER_OPTIONS,
  year: YEAR_OPTIONS.map((y) => ({ value: y.value, label: y.label.replace(/^(\w+)/, "$1 year") })),
  institution_type: INSTITUTION_OPTIONS,
  minority: MINORITY_OPTIONS,
  parent_occupation: PARENT_OCCUPATION_OPTIONS,
  special_status: SPECIAL_STATUS_OPTIONS,
  entrance_exam: ENTRANCE_OPTIONS.map((e) => ({ value: e.value, label: e.label.replace(/ \((rank|percentile)\)$/, "") })),
  course: [{ value: "be_btech", label: "B.E./B.Tech" }],
  fresh_or_renewal: [
    { value: "fresh", label: "Fresh application" },
    { value: "renewal", label: "Renewal" },
  ],
};

function stateQuestion(field: string) {
  const [code, key] = field.split(".");
  return STATE_BY_CODE.get(code)?.questions.find((q) => q.key === key);
}

export function fieldLabel(field: string): string {
  if (isStateKey(field)) return stateQuestion(field)?.label ?? field;
  return field in RULE_FIELDS ? RULE_FIELDS[field as RuleField].label : field;
}

export function valueLabel(field: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const v = String(value);
  if (isStateKey(field)) return stateQuestion(field)?.options.find((o) => o.value === v)?.label ?? v;
  if (field === "category") return CATEGORY_LABELS.get(v) ?? v;
  if (field === "domicile_state") return stateName(v) ?? v;
  return labelOf(CHOICE_LABELS[field as RuleField] ?? [], v) ?? v;
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
const SUBJECT: Partial<Record<string, string>> = {
  family_income: "Income",
  class12_pct: "Class 12",
  class10_pct: "Class 10",
  disability_pct: "Disability",
  entrance_rank: "Entrance score",
  cgpa: "CGPA",
  siblings_claiming: "Siblings claiming",
  gap_years: "Gap years",
};
const subject = (field: string) => SUBJECT[field] ?? fieldLabel(field);

function orList(items: string[]): string {
  return items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items.at(-1)}`;
}

// What the rule asks for, in a student's words.
export function ruleText(rule: PublishableRule): string {
  const label = fieldLabel(rule.field);
  switch (rule.op) {
    case "LTE":
      return rule.field === "family_income"
        ? `Family income up to ${amount(rule.field, rule.value)}`
        : `${subject(rule.field)} at most ${amount(rule.field, rule.value)}`;
    case "GTE":
      return `${subject(rule.field)} at least ${amount(rule.field, rule.value)}`;
    case "BETWEEN":
      return `${subject(rule.field)} between ${amount(rule.field, rule.value[0])} and ${amount(rule.field, rule.value[1])}`;
    case "PERCENTILE_GTE":
      return `${subject(rule.field)} marks in the top ${100 - rule.value}% of your board`;
    case "IS_TRUE":
      return rule.field === "aicte_approved" ? "AICTE-approved course" : label;
    case "EQ":
      if (rule.field === "domicile_state") return `${valueLabel(rule.field, rule.value)} domicile`;
      if (rule.field === "gender" && rule.value === "female") return "Girl students only";
      return `${label}: ${valueLabel(rule.field, rule.value)}`;
    case "IN":
      return `${label}: ${orList(rule.value.map((v) => valueLabel(rule.field, v)))}`;
  }
}

// The student's own answer for a rule's field, as shown beside it ("You: ₹9,00,000").
export function yourAnswer(field: string, p: Profile): string | undefined {
  const pct = (n: number | undefined) => (n === undefined ? undefined : `${n}%`);
  if (isStateKey(field)) {
    const v = p.state?.[field];
    return v === undefined || v === "unknown" ? undefined : valueLabel(field, v);
  }
  switch (field) {
    case "family_income":
      return p.family_income === undefined ? undefined : formatINR(p.family_income);
    case "class12_pct":
      return pct(p.class12_pct);
    case "class10_pct":
      return pct(p.class10_pct);
    case "disability_pct":
      return labelOf(DISABILITY_OPTIONS, p.disability);
    case "aicte_approved":
      return p.aicte_approved === "unknown" ? undefined : labelOf(AICTE_OPTIONS, p.aicte_approved);
    case "entrance_exam":
      return p.entrance ? valueLabel(field, p.entrance.exam) : undefined;
    case "entrance_rank":
      return p.entrance?.score === undefined ? undefined : String(p.entrance.score);
    case "parent_occupation":
    case "special_status": {
      const vs = p[field];
      return vs?.length ? vs.map((v) => valueLabel(field, v)).join(", ") : undefined;
    }
    case "domicile_state":
    case "category":
    case "gender":
    case "course":
    case "year":
    case "institution_type":
    case "minority": {
      const v = p[field];
      return v === undefined ? undefined : valueLabel(field, v);
    }
    default:
      return undefined;
  }
}

// One sentence for a numeric fail: "Income ₹9 L is ₹1 L over the ₹8 L limit."
export function gapText(check: RuleCheck, p: Profile): string | undefined {
  const { rule, gap } = check;
  if (!gap) return undefined;
  const yours = numericAnswer(rule.field, p);
  if (yours === undefined) return undefined;
  const s = subject(rule.field);
  const mine = amount(rule.field, yours);
  const by = amount(rule.field, round(gap.amount));
  switch (rule.op) {
    case "LTE":
      return `${s} ${mine} is ${by} over the ${amount(rule.field, rule.value)} limit.`;
    case "GTE":
      return `${s} ${mine} is ${by} under the ${amount(rule.field, rule.value)} minimum.`;
    case "BETWEEN":
      return `${s} ${mine} is ${by} outside the ${amount(rule.field, rule.value[0])}–${amount(rule.field, rule.value[1])} range.`;
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
export function passText(check: RuleCheck, p: Profile): string {
  const { rule } = check;
  const yours = numericAnswer(rule.field, p);
  if (yours !== undefined && rule.op === "LTE") {
    return `${subject(rule.field)} ${amount(rule.field, yours)} is within the ${amount(rule.field, rule.value)} limit`;
  }
  if (yours !== undefined && rule.op === "GTE") {
    return `${subject(rule.field)} ${amount(rule.field, yours)} meets the ${amount(rule.field, rule.value)} minimum`;
  }
  return ruleText(rule);
}

// Why a far miss is out, for the "Why aren't others here?" list: "Family income up to ₹4.5 L;
// yours is ₹9,00,000".
export function missText(check: RuleCheck, p: Profile): string {
  const gap = gapText(check, p);
  if (gap) return gap.replace(/\.$/, "");
  const yours = yourAnswer(check.rule.field, p);
  return yours ? `${ruleText(check.rule)}; yours is ${yours}` : ruleText(check.rule);
}

export type RowResult = "pass" | "fail" | "unknown" | "confirm";
export interface ReasonRow {
  result: RowResult;
  text: string;
  field: string;
}

// One row per group: the rule that passed, the rules that failed, the questions still open, or
// the rules to confirm on the official site.
export function reasonRows(groups: GroupCheck[], p: Profile): ReasonRow[] {
  return groups.flatMap((g): ReasonRow[] => {
    if (g.outcome === "pass") {
      const c = g.checks.find((x) => x.outcome === "pass")!;
      return [{ result: "pass", text: passText(c, p), field: c.rule.field }];
    }
    if (g.outcome === "fail") {
      return g.checks.map((c) => ({ result: "fail", text: ruleText(c.rule), field: c.rule.field }));
    }
    if (g.outcome === "unknown") {
      return g.checks
        .filter((c) => c.outcome === "unknown" && !c.rule.ambiguous && c.rule.op !== "PERCENTILE_GTE" && fieldTier(c.rule.field) !== "notAsked")
        .map((c) => ({ result: "unknown", text: ruleText(c.rule), field: c.rule.field }));
    }
    return g.checks
      .filter((c) => c.outcome !== "fail")
      .map((c) => ({
        result: "confirm",
        text: `${ruleText(c.rule)}: ${c.rule.ambiguous ? "sources differ, " : ""}confirm on the official site`,
        field: c.rule.field,
      }));
  });
}
