import { categoriesFor, OTHER_STATES, STATE_BY_CODE, STATES, stateName, type StateConfig, type StateQuestion } from "@/domain/states";
import type { T } from "./i18n";

// State names, categories and state questions live in src/domain/states.ts in English, because the
// admin shares them. Other languages add their words under "domain" in their message file; anything
// missing there (or in English, which has no "domain") falls back to the English text.

function domain(t: T, key: string, english: string): string {
  const k = `domain.${key}` as never;
  return t.has(k) ? t(k) : english;
}

export function stateLabel(t: T, code: string | null | undefined): string | undefined {
  const english = stateName(code);
  return code && english ? domain(t, `states.${code}`, english) : english;
}

export function categoryLabel(t: T, value: string, english: string): string {
  return domain(t, `categories.${value}`, english);
}

export function localCategories(t: T, code: string | null | undefined) {
  return categoriesFor(code).map((c) => ({ value: c.value, label: categoryLabel(t, c.value, c.label) }));
}

export function questionLabel(t: T, code: string, q: StateQuestion): string {
  return domain(t, `questions.${code}.${q.key}`, q.label);
}

export function optionLabel(t: T, code: string, q: StateQuestion, option: { value: string; label: string }): string {
  return domain(t, `options.${code}.${q.key}.${option.value}`, domain(t, `answers.${option.value}`, option.label));
}

// A state with its name, categories and questions in the reader's language.
export function localState(t: T, s: StateConfig): StateConfig {
  return {
    ...s,
    name: stateLabel(t, s.code) ?? s.name,
    categories: localCategories(t, s.code),
    questions: s.questions.map((q) => ({
      ...q,
      label: questionLabel(t, s.code, q),
      options: q.options.map((o) => ({ value: o.value, label: optionLabel(t, s.code, q, o) })),
    })),
  };
}

export function localStateByCode(t: T, code: string | null | undefined): StateConfig | undefined {
  const s = code ? STATE_BY_CODE.get(code) : undefined;
  return s && localState(t, s);
}

// The domicile select: live states first, then the rest, each sorted in the reader's language.
export function stateOptions(t: T, locale: string) {
  const sorted = (list: { code: string }[]) =>
    list
      .map((s) => ({ value: s.code, label: stateLabel(t, s.code) ?? s.code }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  return { live: sorted(STATES), other: sorted(OTHER_STATES) };
}
