import type { Profile } from "@/domain/profile";
import { isStateKey } from "@/domain/rules/fields";
import { STATE_BY_CODE } from "@/domain/states";
import { localCategories, optionLabel, questionHint, questionLabel } from "./domain-labels";
import type { T } from "./i18n";
import { aicteOptions, genderOptions, institutionOptions, yearOptions, type Option } from "./labels";

// The inline QuestionCard on S06 for an unanswered field that blocks a result. It reuses the
// field's own values; "Not sure" is left out because it would leave the result unchanged.

export type Question =
  | { field: string; question: string; hint?: string; kind: "choice"; options: Option[] }
  | { field: string; question: string; hint?: string; kind: "income" | "percent" };

export function questionFor(t: T, field: string, p: Profile): Question | undefined {
  if (isStateKey(field)) {
    const [code, key] = field.split(".");
    const q = STATE_BY_CODE.get(code)?.questions.find((x) => x.key === key);
    if (!q || code !== p.domicile_state) return undefined;
    return {
      field,
      question: questionLabel(t, code, q),
      hint: questionHint(t, code, q),
      kind: "choice",
      options: q.options.filter((o) => o.value !== "unknown").map((o) => ({ value: o.value, label: optionLabel(t, code, q, o) })),
    };
  }
  switch (field) {
    case "family_income":
      return { field, question: t("questions.family_income"), kind: "income" };
    case "class12_pct":
      return { field, question: t("questions.class12_pct"), hint: t("basics.class12Hint"), kind: "percent" };
    case "category":
      return { field, question: t("questions.category"), hint: t("basics.categoryNames"), kind: "choice", options: localCategories(t, p.domicile_state) };
    case "gender":
      return { field, question: t("questions.gender"), kind: "choice", options: genderOptions(t) };
    case "year":
      return { field, question: t("questions.year"), kind: "choice", options: yearOptions(t) };
    case "institution_type":
      return { field, question: t("questions.institution_type"), hint: t("basics.institutionHint"), kind: "choice", options: institutionOptions(t) };
    case "aicte_approved":
      return {
        field,
        question: t("questions.aicte_approved"),
        hint: t("basics.aicteHint"),
        kind: "choice",
        options: aicteOptions(t).filter((o) => o.value !== "unknown"),
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
