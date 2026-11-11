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

// The plain-language line under a state question, if it has one.
export function questionHint(t: T, code: string, q: StateQuestion): string | undefined {
  return q.hint && domain(t, `hints.${code}.${q.key}`, q.hint);
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
      hint: questionHint(t, s.code, q),
      options: q.options.map((o) => ({ value: o.value, label: optionLabel(t, s.code, q, o) })),
    })),
  };
}

export function localStateByCode(t: T, code: string | null | undefined): StateConfig | undefined {
  const s = code ? STATE_BY_CODE.get(code) : undefined;
  return s && localState(t, s);
}

// The domicile select: live states first, then the rest, each sorted in the reader's language.
// Once the rules have downloaded, each live state says how many of its schemes are published, so
// a state whose schemes are still being checked never looks covered (UX review issue 1).
export function stateOptions(t: T, locale: string, stateSchemes?: Map<string, number>) {
  const sorted = (list: { code: string }[], counted: boolean) =>
    list
      .map((s) => {
        const name = stateLabel(t, s.code) ?? s.code;
        return {
          value: s.code,
          name,
          label: counted && stateSchemes ? t("basics.stateWithCount", { state: name, count: stateSchemes.get(s.code) ?? 0 }) : name,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, locale))
      .map(({ value, label }) => ({ value, label }));
  return { live: sorted(STATES, true), other: sorted(OTHER_STATES, false) };
}
