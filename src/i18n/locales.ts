// The languages students can read Paatra in (see the "Paatra in Indian languages" plan). English is
// the source: every other language must have the same keys (messages.test.ts). Admin stays English.
export const ALL_LOCALES = ["en", "hi"] as const;
export type AppLocale = (typeof ALL_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";

// A language reaches the live site only after a native speaker has read every screen on a phone.
// Until then it is served on preview deploys and locally, never in production.
const REVIEWED: Record<AppLocale, boolean> = { en: true, hi: false };
const production = process.env.PAATRA_DEPLOY === "production";
export const LOCALES: readonly AppLocale[] = ALL_LOCALES.filter((l) => REVIEWED[l] || !production);

// Each language names itself in the picker, and offers itself in its own words on S03.
export const LANGUAGES: Record<AppLocale, { name: string; offer: string; switchTo: string }> = {
  en: { name: "English", offer: "Paatra is also in English.", switchTo: "Read in English" },
  hi: { name: "हिन्दी", offer: "Paatra हिन्दी में भी है।", switchTo: "हिन्दी में पढ़ें" },
};

// The language most students of a live state read, offered once they pick that domicile.
export const STATE_LANGUAGE: Partial<Record<string, AppLocale>> = {
  BR: "hi",
  DL: "hi",
  HP: "hi",
  HR: "hi",
  JK: "hi",
  LA: "hi",
  MP: "hi",
};

// The student's pick, remembered on the phone so the next visit opens in it. Only a language code.
export const LOCALE_COOKIE = "paatra.lang";

// Indian dates and deadlines, wherever the server renders.
export const TIME_ZONE = "Asia/Kolkata";

export function isLocale(value: string | undefined): value is AppLocale {
  return (LOCALES as readonly string[]).includes(value ?? "");
}
