"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Brand, Column, Screen } from "@/features/eligibility";

// Any screen that throws lands here instead of the default Next.js error page.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen>
      <Column width="narrow" className="flex-1 gap-5 pt-5 pb-8">
        <Brand />
        <div className="flex flex-col gap-2 pt-10">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">{t("errors.title")}</h1>
          <p className="m-0 text-[15px] leading-[22px] text-slate">
            {t("errors.body")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white hover:bg-ink"
        >
          {t("common.tryAgain")}
        </button>
        <Link href="/" className="self-center text-sm font-semibold text-navy">
          {t("common.goToStart")}
        </Link>
      </Column>
    </Screen>
  );
}
