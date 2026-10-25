// The languages students can read Paatra in (see the "Paatra in Indian languages" plan). English is
// the source: every other language must have the same keys (messages.test.ts). Admin stays English.
export const LOCALES = ["en"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "en";

// Indian dates and deadlines, wherever the server renders.
export const TIME_ZONE = "Asia/Kolkata";
