"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Column, Footnote, Screen } from "@/components/student/layout";
import { Checking, CountTile, LoadFailed, QuestionCard, ResultCard } from "@/components/student/results";
import { UNLOCK_FIELDS, UnlockQuestions, unansweredUnlocks, type UnlockKey } from "@/components/student/Unlocks";
import { formatDate, formatINR, todayInIndia } from "@/lib/format";
import type { SchemeMatch } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import type { SnapshotScheme } from "@/domain/rules/snapshot";
import { isLive } from "@/lib/student/answers";
import { fieldLabel, gapText, reasonRows } from "@/lib/student/explain";
import { labelOf, YEAR_OPTIONS } from "@/lib/student/labels";
import { answer, questionFor } from "@/lib/student/questions";
import { buildResults, counts, mainReason, type Results } from "@/lib/student/results";
import { useAnswers } from "@/lib/student/use-answers";
import { useSnapshot } from "@/lib/student/use-snapshot";
import { categoriesFor, STATE_BY_CODE, stateName } from "@/domain/states";

// S05 Checking, S06 Results, S07 Nothing fits yet and S09 Offline, all matched on this phone.

export default function ResultsPage() {
  const [profile, update] = useAnswers();
  const [snap, retry] = useSnapshot();
  const router = useRouter();

  useEffect(() => {
    if (profile && !profile.domicile_state) router.replace("/check/basics");
  }, [profile, router]);

  const results = useMemo(() => {
    if (!profile || snap.status !== "ready") return null;
    const now = new Date();
    return buildResults(profile, snap.snapshot, todayInIndia(now), now);
  }, [profile, snap]);

  if (!profile?.domicile_state) return <Screen />;
  const state = profile.domicile_state;
  const sources = isLive(state) ? `central, AICTE, ${stateName(state)} and private schemes` : "central, AICTE and private schemes";

  if (snap.status === "failed") {
    return (
      <Screen>
        <Column className="flex-1">
          <LoadFailed reason={snap.reason} onRetry={retry} />
        </Column>
      </Screen>
    );
  }

  return (
    <Screen>
      <Column className="gap-2.5 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">{results ? "Your scholarships" : "Checking your schemes"}</h1>
          <Link href="/check/basics" className="flex min-h-11 items-center text-sm font-semibold text-navy">
            Edit answers
          </Link>
        </div>
        <div className="font-mono text-[13px] leading-[18px] text-slate">{summaryLine(profile)}</div>
      </Column>
      <Column className="flex-1 gap-6 pt-4 pb-8">
        {results ? <Found results={results} profile={profile} update={update} /> : <Checking sources={sources} />}
      </Column>
    </Screen>
  );
}

function summaryLine(p: Profile): string {
  const year = labelOf(YEAR_OPTIONS, p.year);
  return [
    stateName(p.domicile_state),
    p.family_income !== undefined ? formatINR(p.family_income) : undefined,
    labelOf(categoriesFor(p.domicile_state), p.category),
    year ? `B.Tech ${year.replace(/ \(.*\)$/, "")} yr` : "B.Tech",
    p.class12_pct !== undefined ? `12th ${p.class12_pct}%` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function providerLabel(s: SnapshotScheme): string {
  if (s.provider === "STATE") return (s.stateCode && STATE_BY_CODE.get(s.stateCode)?.portal) || "State";
  return { CENTRAL: "Central", AICTE: "AICTE", PRIVATE: "Private" }[s.provider];
}

function meta(s: SnapshotScheme): string {
  return [providerLabel(s), s.amountText, s.deadline ? `closes ${formatDate(s.deadline)}` : undefined].filter(Boolean).join(" · ");
}

function Card({ m, profile }: { m: SchemeMatch; profile: Profile }) {
  const rows = reasonRows(m.groups, profile).map((r) =>
    r.result === "unknown" ? { ...r, text: `${r.text}: ${questionFor(r.field, profile) ? "answer above" : "answer in Edit answers"}` } : r,
  );
  const failed = m.failed;
  const nearIncome = failed?.rule.field === "family_income" && failed.rule.op === "LTE";
  return (
    <ResultCard
      status={m.status as Exclude<SchemeMatch["status"], "notEligible">}
      schemeName={m.scheme.name}
      meta={meta(m.scheme)}
      headline={failed ? gapText(failed, profile) : undefined}
      rules={rows}
      note={
        nearIncome
          ? `The limit is checked against your income certificate. If it shows ${formatINR(failed!.rule.value as number)} or less, you pass this rule.`
          : undefined
      }
      verified={formatDate(m.scheme.lastVerifiedAt.slice(0, 10))}
      linkLabel={m.status === "eligible" ? "Rules and documents" : "See the rules"}
      href={`/scheme/${m.scheme.slug}`}
    />
  );
}

function Group({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-2.5">
      <h2 className="m-0 text-[13px] leading-4 font-semibold tracking-[0.06em] text-slate uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Found({ results, profile, update }: { results: Results; profile: Profile; update: (fn: (p: Profile) => Profile) => void }) {
  const c = counts(results);
  const of = (s: SchemeMatch["status"]) => results.results.filter((m) => m.status === s);
  const nothing = c.eligible === 0 && c.nearMiss === 0;

  const questions = results.questions
    .map((q) => ({ q, card: questionFor(q.field, profile) }))
    .filter((x) => x.card !== undefined);
  const asked = new Set(questions.map((x) => x.q.field));
  const decided = results.results.filter((m) => m.unknownFields.some((f) => asked.has(f))).length;
  const why = (field: string) => {
    const names = results.results.filter((m) => m.unknownFields.includes(field)).map((m) => m.scheme.name);
    return names.length === 1 ? `Decides ${names[0]}` : `Decides ${names.length} schemes`;
  };

  // Optional questions that would let hidden schemes be checked, with how many each unlocks.
  const unlockCounts = new Map<UnlockKey, number>();
  for (const u of results.unlocks) {
    const key = (Object.keys(UNLOCK_FIELDS) as UnlockKey[]).find((k) => UNLOCK_FIELDS[k].includes(u.field));
    if (key) unlockCounts.set(key, Math.max(unlockCounts.get(key) ?? 0, u.schemes));
  }
  const unlockKeys = [...unlockCounts.keys()];
  const more = (k: UnlockKey) => {
    const n = unlockCounts.get(k);
    return n ? `checks ${n} more scheme${n === 1 ? "" : "s"}` : undefined;
  };

  return (
    <>
      {nothing ? (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-xl leading-7 font-semibold">Nothing you can apply for right now</h2>
          <p className="m-0 text-[15px] leading-[22px] text-muted">{mainReason(results, profile)}</p>
        </section>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <CountTile kind="eligible" count={c.eligible} href="#eligible" />
          <CountTile kind="nearMiss" count={c.nearMiss} href="#near" />
          <CountTile kind="needsInfo" count={questions.length} href="#answers" />
        </div>
      )}

      {c.eligible > 0 && (
        <Group id="eligible" title="Eligible to apply">
          {of("eligible").map((m) => (
            <Card key={m.scheme.slug} m={m} profile={profile} />
          ))}
        </Group>
      )}

      {questions.length > 0 && (
        <section id="answers" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[14px] bg-info-tint p-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[17px] leading-6 font-semibold">
              Answer {questions.length} question{questions.length === 1 ? "" : "s"} to check {decided} more
            </h2>
            <p className="m-0 text-[13px] leading-[18px] text-info">Results update as soon as you tap.</p>
          </div>
          {questions.map(({ q, card }) => (
            <QuestionCard key={q.field} question={card!} why={why(q.field)} onAnswer={(v) => update((p) => answer(p, q.field, v))} />
          ))}
        </section>
      )}

      {c.needsInfo > 0 && (
        <Group id={questions.length > 0 ? undefined : "answers"} title="Needs an answer or a check">
          {of("needsInfo").map((m) => (
            <Card key={m.scheme.slug} m={m} profile={profile} />
          ))}
        </Group>
      )}

      {c.nearMiss > 0 && (
        <Group id="near" title="Near misses: one rule away">
          {of("nearMiss").map((m) => (
            <Card key={m.scheme.slug} m={m} profile={profile} />
          ))}
        </Group>
      )}

      {(nothing ? unansweredUnlocks(profile).length > 0 : unlockKeys.length > 0) && (
        <Group title={nothing ? "Ways to find more" : "Optional: check more schemes"}>
          <UnlockQuestions profile={profile} update={update} only={nothing ? unansweredUnlocks(profile) : unlockKeys} detailFor={more} />
          {nothing && (
            <p className="m-0 text-[13px] leading-[18px] text-slate">
              Check your income figure too: use the amount on your income certificate.{" "}
              <Link href="/check/basics" className="font-semibold text-navy underline">
                Edit answers
              </Link>
            </p>
          )}
        </Group>
      )}

      {nothing && (
        <p className="m-0 text-[13px] leading-[18px] text-slate">
          We add schemes every week. Your answers stay on this phone, so checking again later takes one tap.
        </p>
      )}

      <WhyNot results={results} />
      <Footnote>
        Eligibility is decided by the scheme. Always confirm on the official page before applying. Schemes not verified in
        the last 90 days are not shown.
      </Footnote>
    </>
  );
}

function WhyNot({ results }: { results: Results }) {
  if (results.farMisses.length === 0 && results.hidden.length === 0) return null;
  return (
    <details className="rounded-[14px] border border-line bg-white px-4 py-3.5">
      <summary className="min-h-6 cursor-pointer text-[15px] leading-[22px] font-semibold">Why aren&apos;t other schemes here?</summary>
      <div className="mt-2.5 flex flex-col gap-2.5 text-sm leading-5 text-slate">
        {results.farMisses.map((m) => (
          <p key={m.scheme.slug} className="m-0">
            <Link href={`/scheme/${m.scheme.slug}`} className="font-semibold text-ink">
              {m.scheme.name}
            </Link>
            : {m.reasons.join("; ")}.
          </p>
        ))}
        {results.hidden.map((m) => (
          <p key={m.scheme.slug} className="m-0">
            <b className="font-semibold text-ink">{m.scheme.name}</b>: hidden until you answer{" "}
            {m.hiddenUntil.map((f) => `the ${fieldLabel(f).toLowerCase()} question`).join(" and ")}.
          </p>
        ))}
      </div>
    </details>
  );
}
