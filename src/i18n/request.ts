import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { DEFAULT_LOCALE, LOCALES, TIME_ZONE, type AppLocale } from "./locales";

// The locale is the [locale] root segment, so every page can still be prerendered per language.
export default getRequestConfig(async ({ locale }) => {
  const requested = locale ?? (await rootLocale());
  const chosen: AppLocale = hasLocale(LOCALES, requested) ? requested : DEFAULT_LOCALE;
  return { locale: chosen, messages: (await import(`./messages/${chosen}.json`)).default, timeZone: TIME_ZONE };
});
