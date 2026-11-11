"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LANGUAGES, LOCALE_COOKIE, LOCALES, STATE_LANGUAGE, type AppLocale } from "@/i18n/locales";

// Switches the student screens to another language and remembers the pick on this phone (a cookie
// holding only the language code), so the next visit opens in it. Answers are untouched.
function useSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  return (locale: AppLocale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    router.replace(pathname, { locale });
  };
}

// Every live language in one dropdown, each named in its own script. Hidden while only English is
// live. A native select, so the phone opens its own picker.
export function LanguageSwitch() {
  const t = useTranslations("common");
  const current = useLocale() as AppLocale;
  const switchTo = useSwitch();
  if (LOCALES.length < 2) return null;
  return (
    <label className="relative flex min-h-11 items-center">
      <span className="sr-only">{t("language")}</span>
      <select
        value={current}
        onChange={(e) => switchTo(e.target.value as AppLocale)}
        className="min-h-9 appearance-none rounded-full border border-line bg-white py-1 pr-8 pl-3 text-sm font-semibold text-navy hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-navy"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {LANGUAGES[l].name}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute right-3 size-3 text-navy">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}

// S03: once a student picks a domicile whose students mostly read another language, offer it once,
// in that language's own words. Never switches by itself.
export function StateLanguageOffer({ state }: { state: string }) {
  const current = useLocale();
  const switchTo = useSwitch();
  const offered = STATE_LANGUAGE[state];
  if (!offered || offered === current || !LOCALES.includes(offered)) return null;
  const { offer, switchTo: label } = LANGUAGES[offered];
  return (
    <div lang={offered} className="flex items-center justify-between gap-3 rounded-xl bg-info-tint px-4 py-2 text-sm text-info">
      <span>{offer}</span>
      <button type="button" onClick={() => switchTo(offered)} className="min-h-11 px-1 font-semibold text-navy underline">
        {label}
      </button>
    </div>
  );
}
