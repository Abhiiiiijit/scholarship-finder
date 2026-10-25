import { useTranslations } from "next-intl";
import { Brand, Column, Footnote, joinList, LanguageSwitch, Screen, StartButton, stateLabel } from "@/features/eligibility";
import { STATES } from "@/domain/states";

// S01 Landing.

const TRUST = [
  { key: "Quoted", icon: "M7 8h10M7 12h7M5 4h14v16l-4-3H5z" },
  { key: "Checked", icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2" },
  { key: "Why", icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8h.01" },
] as const;

export default function Landing() {
  const t = useTranslations();
  return (
    <Screen>
      <Column className="flex-1 gap-7 pt-5 pb-6 lg:gap-10 lg:pb-12">
        <header className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <span className="rounded-full border border-disabled px-2.5 py-1 text-xs leading-4 text-slate">{t("landing.scope")}</span>
          </div>
        </header>

        {/* Phone: one column in the designed order. Laptop: the pitch and start button beside what makes it trustworthy. */}
        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16 lg:pt-10">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3.5 pt-4 lg:pt-0">
              <h1 className="m-0 text-[34px] leading-10 font-semibold tracking-tight text-balance md:text-[44px] md:leading-[52px] lg:text-[52px] lg:leading-[60px]">
                {t("landing.headline")}
              </h1>
              <p className="m-0 max-w-2xl text-base leading-6 text-slate md:text-lg md:leading-7">
                {t("landing.pitch")}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 md:max-w-sm">
              <StartButton />
              <div className="text-center text-[13px] leading-[18px] text-slate">
                {t("landing.startNote")}
              </div>
            </div>
          </div>

          <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-white p-0">
            {TRUST.map((item) => (
              <li key={item.key} className="flex items-start gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none text-navy">
                  <path d={item.icon} />
                </svg>
                <div className="text-[15px] leading-[21px]">
                  <b className="font-semibold">{t(`landing.trust${item.key}Title`)}</b>
                  <br />
                  <span className="text-slate">{t(`landing.trust${item.key}Body`)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex max-w-3xl flex-col gap-1.5 text-[13px] leading-[19px] text-slate">
          <span>
            {t("landing.liveStates", {
              count: STATES.length,
              names: joinList(
                t,
                STATES.map((s) => stateLabel(t, s.code) ?? s.name),
                "and",
              ),
            })}
          </span>
          <span>{t("landing.elsewhere")}</span>
        </div>

        <Footnote />
      </Column>
    </Screen>
  );
}
