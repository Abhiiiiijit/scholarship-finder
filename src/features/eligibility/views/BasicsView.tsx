"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChoiceGroup, SelectField } from "@/features/eligibility/components/controls";
import { Column, FormLayout, Screen, StepHeader, StickyCTA } from "@/features/eligibility/components/layout";
import { IncomeField, PercentField } from "@/features/eligibility/components/NumberFields";
import type { Profile } from "@/domain/profile";
import { isLive, withState } from "@/features/eligibility/store/answers";
import { aicteOptions, courseOptions, genderOptions, institutionOptions, yearOptions } from "@/features/eligibility/lib/labels";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { localCategories, stateLabel, stateOptions } from "@/features/eligibility/lib/domain-labels";

// S02 Basics: the state first, then the common questions. Every answer saves on change.

export function BasicsView() {
  const t = useTranslations();
  const locale = useLocale();
  const [profile, update] = useAnswers();
  const [undo, setUndo] = useState<{ previous: Profile; from: string } | null>(null);

  // The course has one option in the MVP, so it is preselected.
  useEffect(() => {
    if (profile && !profile.course) update((p) => ({ ...p, course: "be_btech" }));
  }, [profile, update]);

  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);

  if (!profile) return <Screen />;

  const set = <K extends keyof Profile>(key: K) => (value: Profile[K]) =>
    update((p) => {
      const next = { ...p, [key]: value };
      if (value === undefined) delete next[key];
      return next;
    });

  const chooseState = (code: string) => {
    const lost = profile.category !== undefined || Object.keys(profile.state ?? {}).length > 0;
    if (lost && profile.domicile_state) setUndo({ previous: profile, from: stateLabel(t, profile.domicile_state) ?? profile.domicile_state });
    update((p) => withState(p, code || undefined));
  };

  const state = profile.domicile_state;
  const live = isLive(state);
  const states = stateOptions(t, locale);

  return (
    <Screen>
      <Column>
        <StepHeader label={t("basics.step")} progress={50} backHref="/" />
      </Column>
      <Column className="flex-1 pt-[22px] pb-6 lg:pt-10 lg:pb-12">
        <FormLayout
          intro={
            <>
              <h1 className="m-0 text-2xl leading-[30px] font-semibold lg:text-[32px] lg:leading-10">{t("basics.title")}</h1>
              <p className="m-0 text-sm leading-5 text-slate lg:text-base lg:leading-6">
                {t("basics.intro")}
              </p>
            </>
          }
        >
          <SelectField
            label={t("basics.stateLabel")}
            hint={t("basics.stateHint")}
            groups={[
              { label: t("basics.liveGroup", { count: states.live.length }), options: states.live },
              { label: t("basics.otherGroup", { count: states.other.length }), options: states.other },
            ]}
            placeholder={t("basics.statePlaceholder")}
            value={state ?? ""}
            onChange={(e) => chooseState(e.target.value)}
          />

          {undo && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">
              <span>{t("basics.cleared", { state: undo.from })}</span>
              <button
                type="button"
                className="min-h-11 px-2 font-semibold underline"
                onClick={() => {
                  update(() => undo.previous);
                  setUndo(null);
                }}
              >
                {t("basics.undo")}
              </button>
            </div>
          )}

          <IncomeField hint={t("basics.incomeHint")} value={profile.family_income} onChange={set("family_income")} />

          <ChoiceGroup
            legend={state && live ? t("basics.categoryOfState", { state: stateLabel(t, state) ?? state }) : t("basics.category")}
            hint={state ? t("basics.categoryNames") : t("basics.categoryHint")}
            options={localCategories(t, state)}
            value={profile.category}
            onChange={set("category")}
          />

          <ChoiceGroup legend={t("basics.gender")} hint={t("basics.genderHint")} options={genderOptions(t)} value={profile.gender} onChange={set("gender")} />

          <SelectField
            label={t("basics.course")}
            groups={[{ options: courseOptions(t) }]}
            value={profile.course ?? "be_btech"}
            onChange={() => set("course")("be_btech")}
          />

          <ChoiceGroup legend={t("basics.year")} options={yearOptions(t)} value={profile.year} onChange={set("year")} />

          <PercentField label={t("basics.class12")} hint={t("basics.class12Hint")} value={profile.class12_pct} onChange={set("class12_pct")} />

          <ChoiceGroup legend={t("basics.institution")} hint={t("basics.institutionHint")} layout="grid2" options={institutionOptions(t)} value={profile.institution_type} onChange={set("institution_type")} />

          <ChoiceGroup
            legend={t("basics.aicte")}
            hint={t("basics.aicteHint")}
            options={aicteOptions(t)}
            value={profile.aicte_approved}
            onChange={set("aicte_approved")}
          />
        </FormLayout>
      </Column>
      <StickyCTA
        label={t("basics.continue")}
        href="/check/state"
        disabled={!state}
        note={t("basics.privacyNote")}
      />
    </Screen>
  );
}
