import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./locales";

// English keeps its URLs (/results); other languages get a prefix (/hi/results). Pages stay static:
// the language comes from the URL, never from a header or cookie read while rendering.
export const routing = defineRouting({
  locales: LOCALES as [string, ...string[]],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  // The phone's choice is handled by proxy.ts with our own cookie; never guess from the browser.
  localeDetection: false,
  localeCookie: false,
});
