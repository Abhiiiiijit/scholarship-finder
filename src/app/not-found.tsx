import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Brand, Column, Screen } from "@/features/eligibility";

export async function generateMetadata() {
  return { title: (await getTranslations("meta"))("notFound") };
}

export default function NotFound() {
  const t = useTranslations();
  return (
    <Screen>
      <Column width="narrow" className="flex-1 gap-5 pt-5 pb-8">
        <Brand />
        <div className="flex flex-col gap-2 pt-10">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">{t("errors.notFoundTitle")}</h1>
          <p className="m-0 text-[15px] leading-[22px] text-slate">{t("errors.notFoundBody")}</p>
        </div>
        <Link
          href="/"
          className="flex h-[52px] items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink"
        >
          {t("common.goToStart")}
        </Link>
      </Column>
    </Screen>
  );
}
