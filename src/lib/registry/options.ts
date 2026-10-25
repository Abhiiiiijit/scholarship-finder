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

// What people see for each stored value. The `satisfies` checks keep these in step with the profile lists.
const labelled = <T extends string>(labels: Record<T, string>): Option[] =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => o(value, label));

const CHOICES: Partial<Record<RuleField, Option[]>> = {
  gender: labelled({ female: "Female", male: "Male", other: "Other" } satisfies Record<(typeof GENDERS)[number], string>),
  minority: labelled({
    none: "None", muslim: "Muslim", christian: "Christian", sikh: "Sikh", buddhist: "Buddhist", jain: "Jain", parsi: "Parsi",
  } satisfies Record<(typeof MINORITIES)[number], string>),
  course: [o("be_btech", "B.E. / B.Tech")],
  year: labelled({
    "1": "1st year", "2": "2nd year", "2_lateral": "2nd year (lateral entry)", "3": "3rd year", "4": "4th year", "5": "5th year",
  } satisfies Record<(typeof YEARS)[number], string>),
  fresh_or_renewal: [o("fresh", "Fresh"), o("renewal", "Renewal")],
  institution_type: labelled({
    govt: "Government", aided: "Government-aided", unaided: "Private unaided", deemed: "Deemed university", central: "Central institute",
  } satisfies Record<(typeof INSTITUTION_TYPES)[number], string>),
  parent_occupation: labelled({
    farmer: "Farmer", labourer: "Labourer", armed_forces: "Armed forces", ex_serviceman: "Ex-serviceman",
    capf: "CAPF or Assam Rifles", none: "None of these",
  } satisfies Record<(typeof PARENT_OCCUPATIONS)[number], string>),
  special_status: labelled({
    orphan: "Orphan", single_girl: "Single girl child", first_gen: "First-generation learner", none: "None of these",
  } satisfies Record<(typeof SPECIAL_STATUSES)[number], string>),
  entrance_exam: labelled({
    jee_main: "JEE Main", jee_adv: "JEE Advanced", mht_cet: "MHT CET", kcet: "KCET", ts_eapcet: "TS EAPCET", ojee: "OJEE",
    other: "Other", none: "None",
  } satisfies Record<(typeof ENTRANCE_EXAMS)[number], string>),
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

// Display text for a rule's field and value, e.g. "Year of study" and "1st year, 2nd year".
export function fieldLabel(key: string, stateCode: string | null = null): string {
  const code = key.match(/^([A-Z]{2})\./)?.[1] ?? stateCode;
  return editorFields(code).find((f) => f.key === key)?.label ?? key;
}

export function valueLabel(key: string, value: unknown, stateCode: string | null = null): string {
  const code = key.match(/^([A-Z]{2})\./)?.[1] ?? stateCode;
  const options = editorFields(code).find((f) => f.key === key)?.options ?? [];
  const one = (v: unknown) => options.find((opt) => opt.value === String(v))?.label ?? String(v);
  return Array.isArray(value) ? value.map(one).join(", ") : one(value);
}
