import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createTranslator, IntlErrorCode } from "next-intl";
import { OTHER_STATES, STATES } from "@/domain/states";
import { ALL_LOCALES } from "./locales";
import en from "./messages/en.json";

// Every language has exactly English's keys, every message parses as ICU, and every language but
// English names each state, state question and state answer in its own words ("domain").

const dir = fileURLToPath(new URL("./messages/", import.meta.url));
const load = (locale: string) => JSON.parse(readFileSync(`${dir}${locale}.json`, "utf8")) as Record<string, unknown>;

function keys(o: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const translated = ALL_LOCALES.filter((l) => l !== "en");

describe("messages", () => {
  it("has a file for each locale and no others", () => {
    expect(readdirSync(dir).map((f) => f.replace(/\.json$/, "")).sort()).toEqual([...ALL_LOCALES].sort());
  });

  for (const locale of ALL_LOCALES) {
    const messages = load(locale);

    it(`${locale} has the same keys as English`, () => {
      const own = keys(messages).filter((k) => !k.startsWith("domain."));
      expect(own.sort()).toEqual(keys(en).sort());
    });

    it(`${locale} messages are valid ICU`, () => {
      const invalid: string[] = [];
      const t = createTranslator({
        locale,
        messages,
        // Missing values are expected here; only a syntax error counts.
        onError: (e) => e.code === IntlErrorCode.INVALID_MESSAGE && invalid.push(e.message),
      });
      for (const key of keys(messages)) t(key as never);
      expect(invalid).toEqual([]);
    });

    it(`${locale} has no doubled sentence ends`, () => {
      const t = createTranslator({ locale, messages, onError: () => {} });
      expect(keys(messages).filter((k) => /[.।]{2}/.test(String(t.raw(k as never))))).toEqual([]);
    });
  }

  for (const locale of translated) {
    it(`${locale} names every state, state question and state answer`, () => {
      const t = createTranslator({ locale, messages: load(locale) });
      const has = (k: string) => t.has(`domain.${k}` as never);
      const missing = [
        ...[...STATES, ...OTHER_STATES].filter((s) => !has(`states.${s.code}`)).map((s) => s.code),
        ...STATES.flatMap((s) =>
          s.questions.flatMap((q) => [
            ...(has(`questions.${s.code}.${q.key}`) ? [] : [`${s.code}.${q.key}`]),
            // Labels that are only names (DTU, CBSE, IIIT-Delhi) read the same in every language.
            ...q.options
              .filter((o) => !/^[A-Z]+(-[A-Z][a-z]+)?$/.test(o.label) && !has(`options.${s.code}.${q.key}.${o.value}`) && !has(`answers.${o.value}`))
              .map((o) => `${s.code}.${q.key}=${o.value}`),
          ]),
        ),
      ];
      expect(missing).toEqual([]);
    });
  }
});
