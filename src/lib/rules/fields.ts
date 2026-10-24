// The locked rule fields from the PRD's Phase 0 data plan, as the screen spec's "Rule field"
// select lists them. Each maps to one profile answer (see resolveField in ../match).
//
// The tier decides what an unanswered field does to a result:
// - common: asked on S02, so a missing answer becomes a question on the results screen
// - unlock: optional question; a scheme that needs it stays hidden behind "answer this to check N more"
// - notAsked: not asked in the MVP, so the rule shows "confirm on the official site"
// State keys ("MH.cap_admission") are asked on S03 and behave like common fields.
export type FieldTier = "common" | "unlock" | "notAsked";
export type FieldKind = "number" | "choice" | "multi" | "boolean";

export const RULE_FIELDS = {
  family_income: { label: "Annual family income", kind: "number", tier: "common" },
  category: { label: "Category", kind: "choice", tier: "common" },
  minority: { label: "Minority community", kind: "choice", tier: "unlock" },
  gender: { label: "Gender", kind: "choice", tier: "common" },
  disability_pct: { label: "Disability %", kind: "number", tier: "unlock" },
  domicile_state: { label: "Domicile state", kind: "choice", tier: "common" },
  course: { label: "Course", kind: "choice", tier: "common" },
  year: { label: "Year of study", kind: "choice", tier: "common" },
  fresh_or_renewal: { label: "Fresh or renewal", kind: "choice", tier: "notAsked" },
  class12_pct: { label: "Class 12 %", kind: "number", tier: "common" },
  class10_pct: { label: "Class 10 %", kind: "number", tier: "unlock" },
  entrance_exam: { label: "Entrance exam", kind: "choice", tier: "unlock" },
  entrance_rank: { label: "Entrance rank or percentile", kind: "number", tier: "unlock" },
  cgpa: { label: "CGPA", kind: "number", tier: "notAsked" },
  institution_type: { label: "Institution type", kind: "choice", tier: "common" },
  aicte_approved: { label: "AICTE-approved course", kind: "boolean", tier: "common" },
  parent_occupation: { label: "Parent occupation", kind: "multi", tier: "unlock" },
  special_status: { label: "Special status", kind: "multi", tier: "unlock" },
  siblings_claiming: { label: "Siblings claiming", kind: "number", tier: "notAsked" },
  gap_years: { label: "Gap years", kind: "number", tier: "notAsked" },
} as const satisfies Record<string, { label: string; kind: FieldKind; tier: FieldTier }>;

export type RuleField = keyof typeof RULE_FIELDS;

const STATE_KEY = /^[A-Z]{2}\.[a-z0-9_]+$/;

export function isStateKey(field: string): boolean {
  return STATE_KEY.test(field);
}

export function fieldTier(field: string): FieldTier {
  if (field in RULE_FIELDS) return RULE_FIELDS[field as RuleField].tier;
  // Unknown fields can never be answered, so they behave like fields the MVP does not ask.
  return isStateKey(field) ? "common" : "notAsked";
}
