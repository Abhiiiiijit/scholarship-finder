import type { Profile } from "../profile";
import { isStateKey } from "../rules/fields";
import { STATE_BY_CODE, categoriesFor } from "../states";
import { GENDER_OPTIONS, INSTITUTION_OPTIONS, YEAR_OPTIONS, type Option } from "./labels";

// The inline QuestionCard on S06 for an unanswered field that blocks a result. It reuses the
// field's own values; "Not sure" is left out because it would leave the result unchanged.

export type Question =
  | { field: string; question: string; kind: "choice"; options: Option[] }
  | { field: string; question: string; kind: "income" | "percent" };

export function questionFor(field: string, p: Profile): Question | undefined {
  if (isStateKey(field)) {
    const [code, key] = field.split(".");
    const q = STATE_BY_CODE.get(code)?.questions.find((x) => x.key === key);
    if (!q || code !== p.domicile_state) return undefined;
    return { field, question: q.label, kind: "choice", options: q.options.filter((o) => o.value !== "unknown") };
  }
  switch (field) {
    case "family_income":
      return { field, question: "Annual family income", kind: "income" };
    case "class12_pct":
      return { field, question: "Class 12 percentage", kind: "percent" };
    case "category":
      return { field, question: "Category", kind: "choice", options: categoriesFor(p.domicile_state) };
    case "gender":
      return { field, question: "Gender", kind: "choice", options: GENDER_OPTIONS };
    case "year":
      return { field, question: "Year of study", kind: "choice", options: YEAR_OPTIONS };
    case "institution_type":
      return { field, question: "Your college is", kind: "choice", options: INSTITUTION_OPTIONS };
    case "aicte_approved":
      return {
        field,
        question: "Is your course AICTE-approved?",
        kind: "choice",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      };
    default:
      return undefined;
  }
}

// Saves a QuestionCard answer into the profile; undefined clears it.
export function answer(p: Profile, field: string, value: string | number | undefined): Profile {
  if (isStateKey(field)) {
    const state = { ...p.state };
    if (value === undefined) delete state[field];
    else state[field] = String(value);
    return { ...p, state };
  }
  const next = { ...p, [field]: value } as Profile;
  if (value === undefined) delete (next as Record<string, unknown>)[field];
  return next;
}
