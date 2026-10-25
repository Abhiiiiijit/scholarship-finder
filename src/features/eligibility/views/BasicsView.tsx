"use client";

import { useEffect, useState } from "react";
import { ChoiceGroup, SelectField } from "@/features/eligibility/components/controls";
import { Column, FormLayout, Screen, StepHeader, StickyCTA } from "@/features/eligibility/components/layout";
import { IncomeField, PercentField } from "@/features/eligibility/components/NumberFields";
import type { Profile } from "@/domain/profile";
import { isLive, withState } from "@/features/eligibility/store/answers";
import { AICTE_OPTIONS, COURSE_OPTIONS, GENDER_OPTIONS, INSTITUTION_OPTIONS, YEAR_OPTIONS } from "@/features/eligibility/lib/labels";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { categoriesFor, OTHER_STATES, STATES, stateName } from "@/domain/states";

// S02 Basics: the state first, then the common questions. Every answer saves on change.

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
const STATE_GROUPS = [
  { label: `State schemes available (${STATES.length})`, options: [...STATES].sort(byName).map((s) => ({ value: s.code, label: s.name })) },
  { label: `Central and private schemes only (${OTHER_STATES.length})`, options: [...OTHER_STATES].sort(byName).map((s) => ({ value: s.code, label: s.name })) },
];

export function BasicsView() {
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
    if (lost && profile.domicile_state) setUndo({ previous: profile, from: stateName(profile.domicile_state) ?? profile.domicile_state });
    update((p) => withState(p, code || undefined));
  };

  const state = profile.domicile_state;
  const live = isLive(state);

  return (
    <Screen>
      <Column>
        <StepHeader label="Step 1 of 2 · Basics" progress={50} backHref="/" />
      </Column>
      <Column className="flex-1 pt-[22px] pb-6 lg:pt-10 lg:pb-12">
        <FormLayout
          intro={
            <>
              <h1 className="m-0 text-2xl leading-[30px] font-semibold lg:text-[32px] lg:leading-10">About you</h1>
              <p className="m-0 text-sm leading-5 text-slate lg:text-base lg:leading-6">
                Skip anything you are unsure of. A skipped answer shows as &ldquo;needs info&rdquo;, never as a no.
              </p>
            </>
          }
        >
          <SelectField
            label="Domicile state"
            hint="The state on your domicile certificate, not where you study. It decides the category list below and your next few questions."
            groups={STATE_GROUPS}
            placeholder="Choose your state"
            value={state ?? ""}
            onChange={(e) => chooseState(e.target.value)}
          />

          {undo && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2 text-sm text-white">
              <span>Cleared your category and {undo.from} answers.</span>
              <button
                type="button"
                className="min-h-11 px-2 font-semibold underline"
                onClick={() => {
                  update(() => undo.previous);
                  setUndo(null);
                }}
              >
                Undo
              </button>
            </div>
          )}

          <IncomeField hint="All earning members, as on your income certificate." value={profile.family_income} onChange={set("family_income")} />

          <ChoiceGroup
            legend={state && live ? `Category (${stateName(state)}'s list)` : "Category"}
            hint={state ? undefined : "Choose your state first to see its category list."}
            options={categoriesFor(state)}
            value={profile.category}
            onChange={set("category")}
          />

          <ChoiceGroup legend="Gender" hint="Some schemes are for girls only." options={GENDER_OPTIONS} value={profile.gender} onChange={set("gender")} />

          <SelectField
            label="Course"
            groups={[{ options: COURSE_OPTIONS }]}
            value={profile.course ?? "be_btech"}
            onChange={() => set("course")("be_btech")}
          />

          <ChoiceGroup legend="Year of study" options={YEAR_OPTIONS} value={profile.year} onChange={set("year")} />

          <PercentField label="Class 12 (HSC) percentage" value={profile.class12_pct} onChange={set("class12_pct")} />

          <ChoiceGroup legend="Your college is" layout="grid2" options={INSTITUTION_OPTIONS} value={profile.institution_type} onChange={set("institution_type")} />

          <ChoiceGroup
            legend="Is your course AICTE-approved?"
            hint="Most B.E./B.Tech courses are. Your college's website or admission letter says so."
            options={AICTE_OPTIONS}
            value={profile.aicte_approved}
            onChange={set("aicte_approved")}
          />
        </FormLayout>
      </Column>
      <StickyCTA
        label="Continue"
        href="/check/state"
        disabled={!state}
        note="Saved on this phone only. We never ask for Aadhaar or documents."
      />
    </Screen>
  );
}
