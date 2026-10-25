import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createTranslator, IntlErrorCode } from "next-intl";
import { LOCALES } from "./locales";
import en from "./messages/en.json";

// Every language has exactly English's keys, and every message parses as ICU.

const dir = fileURLToPath(new URL("./messages/", import.meta.url));
const load = (file: string) => JSON.parse(readFileSync(`${dir}${file}`, "utf8")) as Record<string, unknown>;

function keys(o: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("has a file for each locale and no others", () => {
    expect(readdirSync(dir).map((f) => f.replace(/\.json$/, "")).sort()).toEqual([...LOCALES].sort());
  });

  for (const locale of LOCALES) {
    it(`${locale} has the same keys as English`, () => {
      expect(keys(load(`${locale}.json`)).sort()).toEqual(keys(en).sort());
    });

    it(`${locale} messages are valid ICU`, () => {
      const invalid: string[] = [];
      const t = createTranslator({
        locale,
        messages: load(`${locale}.json`),
        // Missing values are expected here; only a syntax error counts.
        onError: (e) => e.code === IntlErrorCode.INVALID_MESSAGE && invalid.push(e.message),
      });
      for (const key of keys(en)) t(key as never);
      expect(invalid).toEqual([]);
    });
  }
});
