"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChoiceGroup } from "@/features/eligibility/components/controls";
import { Column, Screen, StepHeader, StickyCTA } from "@/features/eligibility/components/layout";
import { UnlockQuestions } from "@/features/eligibility/components/Unlocks";
import type { Profile } from "@/domain/profile";
import { isLive } from "@/features/eligibility/store/answers";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { STATE_BY_CODE, stateName, type StateConfig, type StateQuestion } from "@/domain/states";

// S03 State questions, or S04 State not live yet when the student's state has no checked schemes.

export function StateView() {
  const [profile, update] = useAnswers();
  const router = useRouter();
  const code = profile?.domicile_state;

  useEffect(() => {
    if (profile && !code) router.replace("/check/basics");
  }, [profile, code, router]);

  if (!profile || !code) return <Screen />;
  const config = STATE_BY_CODE.get(code);
  return (
    <Screen>
      <Column>
        <StepHeader label="Step 2 of 2 · Your state" progress={100} backHref="/check/basics" />
      </Column>
      {config && isLive(code) ? <StateQuestions config={config} profile={profile} update={update} /> : <NotLive name={stateName(code) ?? code} profile={profile} update={update} />}
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
      <Column className="flex-1 gap-[22px] pt-[22px] pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">
            {n === 0 ? `Your ${config.name} answers` : `${n} question${n === 1 ? "" : "s"} for ${config.name}`}
          </h1>
          <p className="m-0 text-sm leading-5 text-slate">
            These decide most {config.portal} results. Each state asks its own few.
          </p>
        </div>

        {shown.map((q) => {
          const long = q.options.some((o) => o.label.length > 14);
          const short = q.options.every((o) => o.label.length <= 8);
          return (
            <ChoiceGroup
              key={q.key}
              legend={q.label}
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
            <div className="text-[13px] leading-[18px] text-slate">Not needed for the {category} category.</div>
          </div>
        )}

        <section className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] leading-6 font-semibold">Optional: unlock more schemes</h2>
            <p className="m-0 text-[13px] leading-[18px] text-slate">Answer only the ones that apply to you.</p>
          </div>
          <UnlockQuestions profile={profile} update={update} />
        </section>
      </Column>
      <StickyCTA label="See my scholarships" href="/results" />
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
  return (
    <>
      <Column className="flex-1 gap-5 pt-[22px] pb-6">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">{name} schemes aren&apos;t checked yet</h1>
          <p className="m-0 text-[15px] leading-[22px] text-slate">
            We only show a state&apos;s schemes after a person has checked them against the official portal. Until then
            you&apos;ll see every other scheme you can apply for.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-4">
          <div className="text-[15px] leading-[21px] font-semibold">You&apos;ll still see</div>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[15px] leading-[21px] text-muted">
            <li>Central schemes on NSP</li>
            <li>AICTE schemes: Pragati, Saksham, Swanath</li>
            <li>Private and CSR scholarships open to your state</li>
          </ul>
        </div>
        <section className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] leading-6 font-semibold">Optional: unlock more schemes</h2>
            <p className="m-0 text-[13px] leading-[18px] text-slate">Answer only the ones that apply to you.</p>
          </div>
          <UnlockQuestions profile={profile} update={update} />
        </section>
        <p className="m-0 text-[13px] leading-[18px] text-slate">
          Wrong state? <Link href="/check/basics" className="font-semibold text-navy underline">
            Change it
          </Link>
        </p>
      </Column>
      <StickyCTA label="See central and private schemes" href="/results" />
    </>
  );
}
