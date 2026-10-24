import { ENTRANCE_EXAMS, GENDERS, INSTITUTION_TYPES, MINORITIES, PARENT_OCCUPATIONS, SPECIAL_STATUSES, YEARS } from "../profile";
import { RULE_FIELDS, type RuleField } from "../rules/fields";
import { STATE_BY_CODE, STATES } from "../states";

// Option lists for the scheme editor (A02), from the screen spec's "Admin field values".

export type Option = { value: string; label: string };
const o = (value: string, label = value): Option => ({ value, label });

export const PROVIDER_OPTIONS: Option[] = [
  o("CENTRAL", "Central"),
  o("AICTE", "AICTE"),
  o("STATE", "State"),
  o("PRIVATE", "Private"),
];

export function sourceOptions(): { label: string; options: Option[] }[] {
  return [
    { label: "Central", options: [o("Central: NSP"), o("Central: ministry page")] },
    { label: "AICTE", options: [o("AICTE")] },
    { label: "State", options: STATES.map((s) => o(`State: ${s.code} (${s.portal})`, `${s.name} (${s.portal})`)) },
    { label: "Private", options: [o("Private: CSR or company"), o("Private: trust or foundation")] },
  ];
}

export const APPLIES_VIA = [
  "NSP",
  "AICTE portal",
  "State portal",
  "Through the institution",
  "Scheme's own portal",
].map((v) => o(v));

export const BENEFIT_TYPES = ["Tuition fee", "Exam fee", "Maintenance allowance", "Hostel allowance", "Lump sum"];

export const DOCUMENTS = [
  "Income certificate (revenue officer)",
  "Domicile or residence certificate",
  "Caste certificate",
  "Caste validity certificate",
  "Non-creamy layer certificate",
  "Disability certificate",
  "Class 10 marksheet",
  "Class 12 marksheet",
  "Allotment or admission letter",
  "Fee receipt",
  "College bonafide certificate",
  "Previous year marksheet (renewals)",
  "Aadhaar-seeded bank account",
  "Family ID (PPP, Samagra)",
  "Ration card",
];

export const OPERATOR_LABELS = {
  EQ: "equals",
  IN: "one of",
  LTE: "at most",
  GTE: "at least",
  BETWEEN: "between",
  IS_TRUE: "is yes",
  PERCENTILE_GTE: "percentile at least",
} as const;

// PERCENTILE_GTE stays hidden until board cut-off tables exist.
export const EDITOR_OPERATORS = ["EQ", "IN", "LTE", "GTE", "BETWEEN", "IS_TRUE"] as const;

const NATIONAL_CATEGORIES = [o("general", "General"), o("sc", "SC"), o("st", "ST"), o("obc", "OBC"), o("ews", "EWS")];
const ALL_STATE_CODES = STATES.map((s) => o(s.code, s.name));

const CHOICES: Partial<Record<RuleField, Option[]>> = {
  gender: GENDERS.map((g) => o(g)),
  minority: MINORITIES.map((m) => o(m)),
  course: [o("be_btech", "B.E. / B.Tech")],
  year: YEARS.map((y) => o(y)),
  fresh_or_renewal: [o("fresh"), o("renewal")],
  institution_type: INSTITUTION_TYPES.map((i) => o(i)),
  parent_occupation: PARENT_OCCUPATIONS.map((p) => o(p)),
  special_status: SPECIAL_STATUSES.map((s) => o(s)),
  entrance_exam: ENTRANCE_EXAMS.map((e) => o(e)),
  domicile_state: ALL_STATE_CODES,
};

export type ValueKind = "number" | "choice" | "boolean";

export interface FieldInfo {
  key: string;
  label: string;
  kind: ValueKind;
  options: Option[];
}

// Every field a rule on this scheme may use: the locked list plus its own state's keys.
export function editorFields(stateCode: string | null): FieldInfo[] {
  const state = stateCode ? STATE_BY_CODE.get(stateCode) : undefined;
  const common = (Object.keys(RULE_FIELDS) as RuleField[]).map((key): FieldInfo => {
    const f = RULE_FIELDS[key];
    const options =
      key === "category" ? (state?.categories ?? NATIONAL_CATEGORIES) : (CHOICES[key] ?? []);
    const kind: ValueKind = f.kind === "number" ? "number" : f.kind === "boolean" ? "boolean" : "choice";
    return { key, label: f.label, kind, options };
  });
  const stateKeys = (state?.questions ?? []).map(
    (q): FieldInfo => ({ key: `${state!.code}.${q.key}`, label: `${state!.code}: ${q.label}`, kind: "choice", options: q.options }),
  );
  return [...common, ...stateKeys];
}
