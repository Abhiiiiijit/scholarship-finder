"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ChoiceGroup } from "@/features/eligibility/components/controls";
import { Column, FormLayout, Screen, StepHeader, StickyCTA } from "@/features/eligibility/components/layout";
import { UnlockQuestions } from "@/features/eligibility/components/Unlocks";
import { StateLanguageOffer } from "@/features/eligibility/components/LanguageSwitch";
import type { Profile } from "@/domain/profile";
import { isLive } from "@/features/eligibility/store/answers";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import type { StateConfig, StateQuestion } from "@/domain/states";
import { localStateByCode, stateLabel } from "@/features/eligibility/lib/domain-labels";

// S03 State questions, or S04 State not live yet when the student's state has no checked schemes.

export function StateView() {
  const t = useTranslations();
  const [profile, update] = useAnswers();
  const router = useRouter();
  const code = profile?.domicile_state;

  useEffect(() => {
    if (profile && !code) router.replace("/check/basics");
  }, [profile, code, router]);

  if (!profile || !code) return <Screen />;
  const config = localStateByCode(t, code);
  return (
    <Screen>
      <Column>
        <StepHeader label={t("state.step")} progress={100} backHref="/check/basics" />
        <div className="pt-3 empty:hidden">
          <StateLanguageOffer state={code} />
        </div>
      </Column>
      {config && isLive(code) ? <StateQuestions config={config} profile={profile} update={update} /> : <NotLive name={stateLabel(t, code) ?? code} profile={profile} update={update} />}
    </Screen>
  );
}

const asked = (q: StateQuestion, p: Profile) => !q.onlyFor || !p.category || q.onlyFor.includes(p.category);

function StateQuestions({
  config,
  profile,
  update,
}: {
  config: StateConfig;
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
}) {
  const t = useTranslations("state");
  const shown = config.questions.filter((q) => asked(q, profile));
  const skipped = config.questions.filter((q) => !asked(q, profile));
  const category = config.categories.find((c) => c.value === profile.category)?.label;

  const setAnswer = (key: string, value: string | undefined) =>
    update((p) => {
      const state = { ...p.state };
      if (value === undefined) delete state[`${config.code}.${key}`];
      else state[`${config.code}.${key}`] = value;
      return { ...p, state };
    });

  const n = shown.length;
  return (
    <>
      <Column className="flex-1 pt-[22px] pb-6 lg:pt-10 lg:pb-12">
        <FormLayout
          intro={
            <>
              <h1 className="m-0 text-2xl leading-[30px] font-semibold lg:text-[32px] lg:leading-10">
                {n === 0 ? t("noQuestions", { state: config.name }) : t("questions", { count: n, state: config.name })}
              </h1>
              <p className="m-0 text-sm leading-5 text-slate lg:text-base lg:leading-6">
                {t("intro", { portal: config.portal })}
              </p>
            </>
          }
        >
          {shown.map((q) => {
            const long = q.options.some((o) => o.label.length > 14);
            const short = q.options.every((o) => o.label.length <= 8);
            return (
              <ChoiceGroup
                key={q.key}
                legend={q.label}
                hint={q.hint}
                layout={long ? "list" : q.options.length === 2 ? "grid2" : short ? "grid3" : "chips"}
                options={q.options}
                value={profile.state?.[`${config.code}.${q.key}`]}
                onChange={(v) => setAnswer(q.key, v)}
              />
            );
          })}

          {skipped.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-xl bg-line-soft px-4 py-3.5">
              <div className="text-sm font-semibold">{skipped.map((q) => q.label).join(" / ")}</div>
              <div className="text-[13px] leading-[18px] text-slate">{t("notNeeded", { category: category ?? "" })}</div>
            </div>
          )}

          <section className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[17px] leading-6 font-semibold">{t("unlockTitle")}</h2>
              <p className="m-0 text-[13px] leading-[18px] text-slate">{t("unlockIntro")}</p>
            </div>
            <UnlockQuestions profile={profile} update={update} />
          </section>
        </FormLayout>
      </Column>
      <StickyCTA label={t("seeResults")} href="/results" />
    </>
  );
}

function NotLive({
  name,
  profile,
  update,
}: {
  name: string;
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
}) {
  const t = useTranslations("state");
  return (
    <>
      <Column className="flex-1 pt-[22px] pb-6 lg:pt-10 lg:pb-12">
        <FormLayout
          intro={
            <>
              <h1 className="m-0 text-2xl leading-[30px] font-semibold lg:text-[32px] lg:leading-10">{t("notLiveTitle", { state: name })}</h1>
              <p className="m-0 text-[15px] leading-[22px] text-slate lg:text-base lg:leading-6">
                {t("notLiveIntro")}
              </p>
            </>
          }
        >
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-4">
            <div className="text-[15px] leading-[21px] font-semibold">{t("stillSee")}</div>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-[15px] leading-[21px] text-muted">
              <li>{t("stillCentral")}</li>
              <li>{t("stillAicte")}</li>
              <li>{t("stillPrivate")}</li>
            </ul>
          </div>
          <section className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-[17px] leading-6 font-semibold">{t("unlockTitle")}</h2>
              <p className="m-0 text-[13px] leading-[18px] text-slate">{t("unlockIntro")}</p>
            </div>
            <UnlockQuestions profile={profile} update={update} />
          </section>
          <p className="m-0 text-[13px] leading-[18px] text-slate">
            {t("wrongState")}{" "}
            <Link href="/check/basics" className="font-semibold text-navy underline">
              {t("changeIt")}
            </Link>
          </p>
        </FormLayout>
      </Column>
      <StickyCTA label={t("seeOthers")} href="/results" />
    </>
  );
}
