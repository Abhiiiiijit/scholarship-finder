import type { useTranslations } from "next-intl";

// The translator the pure helpers in lib/ take as their first argument, so the screens pass the
// one from useTranslations() and the tests pass one made with createTranslator.
export type T = ReturnType<typeof useTranslations<never>>;

// "SC, ST or VJNT" / "Bihar, Delhi and Goa", in the reader's language.
export function joinList(t: T, items: string[], word: "and" | "or"): string {
  if (items.length < 2) return items.join("");
  return t(`common.${word}`, { items: items.slice(0, -1).join(t("common.listSeparator")), last: items.at(-1)! });
}
