"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Column, Footnote, Screen } from "@/features/eligibility/components/layout";
import { Checking, CountTile, LoadFailed, QuestionCard, ResultCard } from "@/features/eligibility/components/results";
import { UNLOCK_FIELDS, UnlockQuestions, unansweredUnlocks, type UnlockKey } from "@/features/eligibility/components/Unlocks";
import { formatDate, formatINR, todayInIndia } from "@/lib/format";
import type { SchemeMatch } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import type { SnapshotScheme } from "@/domain/rules/snapshot";
import { isLive } from "@/features/eligibility/store/answers";
import { fieldLabel, gapText, reasonRows } from "@/features/eligibility/lib/explain";
import { joinList, type T } from "@/features/eligibility/lib/i18n";
import { labelOf } from "@/features/eligibility/lib/labels";
import { answer, questionFor } from "@/features/eligibility/lib/questions";
import { buildResults, counts, mainReason, type Results } from "@/features/eligibility/lib/results";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { useMediaQuery } from "@/features/eligibility/hooks/use-media-query";
import { useSnapshot } from "@/features/eligibility/hooks/use-snapshot";
import { categoriesFor, STATE_BY_CODE, stateName } from "@/domain/states";

// S05 Checking, S06 Results, S07 Nothing fits yet and S09 Offline, all matched on this phone.

export function ResultsView() {
  const t = useTranslations();
  const [profile, update] = useAnswers();
  const [snap, retry] = useSnapshot();
  const router = useRouter();

  useEffect(() => {
    if (profile && !profile.domicile_state) router.replace("/check/basics");
  }, [profile, router]);

  const results = useMemo(() => {
    if (!profile || snap.status !== "ready") return null;
    const now = new Date();
    return buildResults(t, profile, snap.snapshot, todayInIndia(now), now);
  }, [t, profile, snap]);

  if (!profile?.domicile_state) return <Screen />;
  const state = profile.domicile_state;
  const sources = isLive(state) ? t("results.sourcesLive", { state: stateName(state) ?? state }) : t("results.sourcesOther");

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
      <Column className="gap-2.5 pt-5 lg:pt-10">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold lg:text-[32px] lg:leading-10">{results ? t("results.title") : t("results.checkingTitle")}</h1>
          <Link href="/check/basics" className="flex min-h-11 items-center text-sm font-semibold text-navy">
            {t("common.editAnswers")}
          </Link>
        </div>
        <div className="font-mono text-[13px] leading-[18px] text-slate">{summaryLine(t, profile)}</div>
      </Column>
      <Column className="flex-1 gap-6 pt-4 pb-8 lg:gap-8 lg:pt-6 lg:pb-12">
        {results ? <Found results={results} profile={profile} update={update} /> : <Checking sources={sources} />}
      </Column>
    </Screen>
  );
}

function summaryLine(t: T, p: Profile): string {
  return [
    stateName(p.domicile_state),
    p.family_income !== undefined ? formatINR(p.family_income) : undefined,
    labelOf(categoriesFor(p.domicile_state), p.category),
    p.year ? t("results.summaryYear", { year: t(`options.yearShort.${p.year}`) }) : t("results.summaryCourse"),
    p.class12_pct !== undefined ? t("results.summaryClass12", { pct: String(p.class12_pct) }) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

function providerLabel(t: T, s: SnapshotScheme): string {
  if (s.provider === "STATE") return (s.stateCode && STATE_BY_CODE.get(s.stateCode)?.portal) || t("results.providerState");
  return t(({ CENTRAL: "results.providerCentral", AICTE: "results.providerAicte", PRIVATE: "results.providerPrivate" } as const)[s.provider]);
}

function meta(t: T, s: SnapshotScheme): string {
  return [providerLabel(t, s), s.amountText, s.deadline ? t("results.closes", { date: formatDate(s.deadline) }) : undefined]
    .filter(Boolean)
    .join(" · ");
}

function Card({ m, profile }: { m: SchemeMatch; profile: Profile }) {
  const t = useTranslations();
  const rows = reasonRows(t, m.groups, profile).map((r) =>
    r.result === "unknown"
      ? { ...r, text: t(questionFor(t, r.field, profile) ? "results.answerAbove" : "results.answerInEdit", { rule: r.text }) }
      : r,
  );
  const failed = m.failed;
  const nearIncome = failed?.rule.field === "family_income" && failed.rule.op === "LTE";
  return (
    <ResultCard
      status={m.status as Exclude<SchemeMatch["status"], "notEligible">}
      schemeName={m.scheme.name}
      meta={meta(t, m.scheme)}
      headline={failed ? gapText(t, failed, profile) : undefined}
      rules={rows}
      note={
        nearIncome
          ? t("results.incomeNote", { limit: formatINR(failed!.rule.value as number) })
          : undefined
      }
      verified={formatDate(m.scheme.lastVerifiedAt.slice(0, 10))}
      linkLabel={m.status === "eligible" ? t("results.rulesAndDocuments") : t("results.seeRules")}
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

// One card per row on a phone, two side by side from tablet width.
function Cards({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2.5 md:grid-cols-2 md:gap-4">{children}</div>;
}

function Found({ results, profile, update }: { results: Results; profile: Profile; update: (fn: (p: Profile) => Profile) => void }) {
  const t = useTranslations();
  const wide = useMediaQuery("(min-width: 1024px)");
  const c = counts(results);
  const of = (s: SchemeMatch["status"]) => results.results.filter((m) => m.status === s);
  const nothing = c.eligible === 0 && c.nearMiss === 0;

  const questions = results.questions
    .map((q) => ({ q, card: questionFor(t, q.field, profile) }))
    .filter((x) => x.card !== undefined);
  const asked = new Set(questions.map((x) => x.q.field));
  const decided = results.results.filter((m) => m.unknownFields.some((f) => asked.has(f))).length;
  const why = (field: string) => {
    const names = results.results.filter((m) => m.unknownFields.includes(field)).map((m) => m.scheme.name);
    return names.length === 1 ? t("results.decidesOne", { scheme: names[0] }) : t("results.decidesMany", { count: names.length });
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
    return n ? t("unlocks.checksMore", { count: n }) : undefined;
  };

  const summary = nothing ? (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-xl leading-7 font-semibold">{t("results.nothingTitle")}</h2>
      <p className="m-0 text-[15px] leading-[22px] text-muted">{mainReason(t, results, profile)}</p>
    </section>
  ) : (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      <CountTile kind="eligible" count={c.eligible} href="#eligible" />
      <CountTile kind="nearMiss" count={c.nearMiss} href="#near" />
      <CountTile kind="needsInfo" count={questions.length} href="#answers" />
    </div>
  );

  const eligible = c.eligible > 0 && (
    <Group id="eligible" title={t("results.eligibleGroup")}>
      <Cards>
        {of("eligible").map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} />
        ))}
      </Cards>
    </Group>
  );

  const toAnswer = questions.length > 0 && (
    <section id="answers" className="flex scroll-mt-4 flex-col gap-2.5 rounded-[14px] bg-info-tint p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-[17px] leading-6 font-semibold">
          {t("results.answerQuestions", { count: questions.length, decided })}
        </h2>
        <p className="m-0 text-[13px] leading-[18px] text-info">{t("results.updatesOnTap")}</p>
      </div>
      {questions.map(({ q, card }) => (
        <QuestionCard key={q.field} question={card!} why={why(q.field)} onAnswer={(v) => update((p) => answer(p, q.field, v))} />
      ))}
    </section>
  );

  const needsInfo = c.needsInfo > 0 && (
    <Group id={questions.length > 0 ? undefined : "answers"} title={t("results.needsInfoGroup")}>
      <Cards>
        {of("needsInfo").map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} />
        ))}
      </Cards>
    </Group>
  );

  const nearMiss = c.nearMiss > 0 && (
    <Group id="near" title={t("results.nearMissGroup")}>
      <Cards>
        {of("nearMiss").map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} />
        ))}
      </Cards>
    </Group>
  );

  const unanswered = unansweredUnlocks(t, profile);
  const unlocks = (nothing ? unanswered.length > 0 : unlockKeys.length > 0) && (
    <Group title={nothing ? t("results.waysToFindMore") : t("results.checkMore")}>
      <UnlockQuestions profile={profile} update={update} only={nothing ? unanswered : unlockKeys} detailFor={more} />
      {nothing && (
        <p className="m-0 text-[13px] leading-[18px] text-slate">
          {t("results.checkIncome")}{" "}
          <Link href="/check/basics" className="font-semibold text-navy underline">
            {t("common.editAnswers")}
          </Link>
        </p>
      )}
    </Group>
  );

  const later = nothing && (
    <p className="m-0 text-[13px] leading-[18px] text-slate">
      {t("results.later")}
    </p>
  );

  const whyNot = <WhyNot results={results} />;
  const footnote = (
    <Footnote>{t("results.footnote")}</Footnote>
  );

  const side = [toAnswer, unlocks, later].some(Boolean) || results.farMisses.length > 0 || results.hidden.length > 0;
  if (wide && side) {
    // Laptop: the schemes on the left; the questions that decide more of them stay beside the cards.
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,22rem)] items-start gap-10">
        <div className="flex flex-col gap-8">
          {summary}
          {eligible}
          {needsInfo}
          {nearMiss}
          {footnote}
        </div>
        <aside className="flex flex-col gap-6">
          {toAnswer}
          {unlocks}
          {later}
          {whyNot}
        </aside>
      </div>
    );
  }

  return (
    <>
      {summary}
      {eligible}
      {toAnswer}
      {needsInfo}
      {nearMiss}
      {unlocks}
      {later}
      {whyNot}
      {footnote}
    </>
  );
}

function WhyNot({ results }: { results: Results }) {
  const t = useTranslations();
  if (results.farMisses.length === 0 && results.hidden.length === 0) return null;
  return (
    <details className="rounded-[14px] border border-line bg-white px-4 py-3.5">
      <summary className="min-h-6 cursor-pointer text-[15px] leading-[22px] font-semibold">{t("results.whyNot")}</summary>
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
            <b className="font-semibold text-ink">{m.scheme.name}</b>
            {t("results.hiddenUntil", {
              questions: joinList(
                t,
                m.hiddenUntil.map((f) => t("results.theQuestion", { field: fieldLabel(t, f).toLowerCase() })),
                "and",
              ),
            })}
          </p>
        ))}
      </div>
    </details>
  );
}
