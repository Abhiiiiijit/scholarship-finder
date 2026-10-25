"use client";

import { useLocale } from "next-intl";
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

// The other languages, each named in its own script. Hidden while only English is live.
export function LanguageSwitch() {
  const current = useLocale();
  const switchTo = useSwitch();
  const others = LOCALES.filter((l) => l !== current);
  if (others.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {others.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => switchTo(l)}
          className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-navy hover:bg-line-soft"
        >
          {LANGUAGES[l].name}
        </button>
      ))}
    </div>
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
