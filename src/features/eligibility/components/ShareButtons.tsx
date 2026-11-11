"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE } from "@/i18n/locales";

// "Send to family": WhatsApp first (what most families use), then the phone's own share sheet, or
// copying the text where there is none. The text is built here on the phone and goes only where
// the student sends it.

// navigator.share exists only in the browser and never changes, so the server render says no.
const noSubscribe = () => () => {};
const hasShareSheet = () => typeof navigator.share === "function";

export function ShareButtons({ build, print = false }: { build: (base: string) => string; print?: boolean }) {
  const t = useTranslations("share");
  const locale = useLocale();
  const canShare = useSyncExternalStore(noSubscribe, hasShareSheet, () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  const text = () => build(`${window.location.origin}${locale === DEFAULT_LOCALE ? "" : `/${locale}`}`);

  const other = async () => {
    if (canShare) {
      try {
        await navigator.share({ text: text() });
      } catch {
        // Closing the share sheet is not an error worth showing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const secondary =
    "flex min-h-11 flex-1 items-center justify-center rounded-xl border border-field bg-white px-3 text-[15px] font-semibold text-navy hover:border-navy";

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <a
        href="https://wa.me/"
        onClick={(e) => {
          e.preventDefault();
          window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, "_blank", "noopener,noreferrer");
        }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pass px-4 text-base font-semibold text-white no-underline hover:opacity-90"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8z" />
        </svg>
        {t("whatsapp")}
      </a>
      <div className="flex gap-2">
        <button type="button" onClick={other} className={secondary}>
          {canShare ? t("otherApps") : copied ? t("copied") : t("copy")}
        </button>
        {print && (
          <button type="button" onClick={() => window.print()} className={secondary}>
            {t("print")}
          </button>
        )}
      </div>
      <p className="m-0 text-xs leading-4 text-slate">{t("privacy")}</p>
    </div>
  );
}
