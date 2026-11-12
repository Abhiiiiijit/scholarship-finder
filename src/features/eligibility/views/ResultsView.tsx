"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Column, Footnote, Screen } from "@/features/eligibility/components/layout";
import { Checking, CountTile, LoadFailed, QuestionCard, ResultCard } from "@/features/eligibility/components/results";
import { LanguageSwitch } from "@/features/eligibility/components/LanguageSwitch";
import { StudentThemeToggle } from "@/features/eligibility/components/StudentThemeToggle";
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
import { amountLine, buildResults, byPay, counts, deadlineLine, mainReason, stateSchemeCounts, type Results } from "@/features/eligibility/lib/results";
import { resultsMessage } from "@/features/eligibility/lib/share";
import { ShareButtons } from "@/features/eligibility/components/ShareButtons";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { useMediaQuery } from "@/features/eligibility/hooks/use-media-query";
import { useSnapshot } from "@/features/eligibility/hooks/use-snapshot";
import { STATE_BY_CODE } from "@/domain/states";
import { localCategories, stateLabel } from "@/features/eligibility/lib/domain-labels";

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
    const today = todayInIndia(now);
    const stateSchemes = profile.domicile_state ? (stateSchemeCounts(snap.snapshot).get(profile.domicile_state) ?? 0) : 0;
    return { today, stateSchemes, ...buildResults(t, profile, snap.snapshot, today, now) };
  }, [t, profile, snap]);

  if (!profile?.domicile_state) return <Screen />;
  const state = profile.domicile_state;
  const sources = isLive(state) ? t("results.sourcesLive", { state: stateLabel(t, state) ?? state }) : t("results.sourcesOther");

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
          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <StudentThemeToggle />
            <Link href="/check/basics" className="flex min-h-11 items-center text-sm font-semibold text-navy">
              {t("common.editAnswers")}
            </Link>
          </div>
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
    stateLabel(t, p.domicile_state),
    p.family_income !== undefined ? formatINR(p.family_income) : undefined,
    labelOf(localCategories(t, p.domicile_state), p.category),
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
  return [providerLabel(t, s), amountLine(t, s)].filter(Boolean).join(" · ");
}

// `closed` shows a scheme whose deadline has passed: a grey "Closed" badge instead of its match.
function Card({ m, profile, today, closed = false }: { m: SchemeMatch; profile: Profile; today: string; closed?: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const rows = reasonRows(t, m.groups, profile).map((r) =>
    r.result === "unknown"
      ? { ...r, text: t(questionFor(t, r.field, profile) ? "results.answerAbove" : "results.answerInEdit", { rule: r.text }) }
      : r,
  );
  const failed = m.failed;
  const nearIncome = failed?.rule.field === "family_income" && failed.rule.op === "LTE";
  return (
    <ResultCard
      status={closed ? "closed" : (m.status as Exclude<SchemeMatch["status"], "notEligible">)}
      schemeName={m.scheme.name}
      meta={meta(t, m.scheme)}
      deadline={deadlineLine(t, locale, m.scheme, today)}
      headline={failed ? gapText(t, failed, profile) : undefined}
      rules={rows}
      note={
        nearIncome
          ? t("results.incomeNote", { limit: formatINR(failed!.rule.value as number) })
          : undefined
      }
      verified={formatDate(m.scheme.lastVerifiedAt.slice(0, 10), locale)}
      linkLabel={m.status === "eligible" && !closed ? t("results.rulesAndDocuments") : t("results.seeRules")}
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

function Found({
  results,
  profile,
  update,
}: {
  results: Results & { today: string; stateSchemes: number };
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const wide = useMediaQuery("(min-width: 1024px)");
  const [allQuestions, setAllQuestions] = useState(false);
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

  // A student who only skipped questions has not been turned down: say what to answer, not "nothing".
  const skippedOnly = nothing && questions.length > 0 && decided >= results.farMisses.length;
  const summary = nothing ? (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-xl leading-7 font-semibold">
        {skippedOnly ? t("results.answerFirstTitle", { count: questions.length }) : t("results.nothingTitle")}
      </h2>
      <p className="m-0 text-[15px] leading-[22px] text-muted">
        {skippedOnly ? t("results.answerFirstBody", { count: decided }) : mainReason(t, results, profile)}
      </p>
    </section>
  ) : (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      <CountTile kind="eligible" count={c.eligible} href="#eligible" />
      <CountTile kind="nearMiss" count={c.nearMiss} href="#near" />
      <CountTile kind="needsInfo" count={questions.length} href="#answers" />
    </div>
  );

  // A state listed as live whose schemes are still being checked: say so, instead of an empty state section.
  const state = profile.domicile_state;
  const coverage = state && isLive(state) && results.stateSchemes === 0 && (
    <Alert tone="info" title={t("results.noStateSchemesTitle", { state: stateLabel(t, state) ?? state })}>
      {t("results.noStateSchemesBody")}
    </Alert>
  );

  // Several state schemes that fit usually can't all be paid together; a parent would add them up.
  const eligibleState = of("eligible").filter((m) => m.scheme.provider === "STATE").length;
  const eligible = c.eligible > 0 && (
    <Group id="eligible" title={t("results.eligibleGroup")}>
      {eligibleState >= 2 && <p className="m-0 text-[13px] leading-[18px] text-slate">{t("results.overlapNote")}</p>}
      <Cards>
        {byPay(of("eligible")).map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} today={results.today} />
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
      {(allQuestions ? questions : questions.slice(0, FIRST_QUESTIONS)).map(({ q, card }) => (
        <QuestionCard key={q.field} question={card!} why={why(q.field)} onAnswer={(v) => update((p) => answer(p, q.field, v))} />
      ))}
      {!allQuestions && questions.length > FIRST_QUESTIONS && (
        <button
          type="button"
          onClick={() => setAllQuestions(true)}
          className="min-h-11 rounded-[10px] border border-field bg-surface px-3 text-[15px] font-semibold text-navy hover:border-navy"
        >
          {t("results.moreQuestions", { count: questions.length - FIRST_QUESTIONS })}
        </button>
      )}
    </section>
  );

  const needsInfo = c.needsInfo > 0 && (
    <Group id={questions.length > 0 ? undefined : "answers"} title={t("results.needsInfoGroup")}>
      <Cards>
        {of("needsInfo").map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} today={results.today} />
        ))}
      </Cards>
    </Group>
  );

  const nearMiss = c.nearMiss > 0 && (
    <Group id="near" title={t("results.nearMissGroup")}>
      <Cards>
        {of("nearMiss").map((m) => (
          <Card key={m.scheme.slug} m={m} profile={profile} today={results.today} />
        ))}
      </Cards>
    </Group>
  );

  // Collapsed, so closed schemes never crowd out the ones open now.
  const closed = results.closed.length > 0 && (
    <details id="closed" className="flex flex-col rounded-[14px] border border-line bg-surface px-4 py-3.5">
      <summary className="min-h-6 cursor-pointer text-[15px] leading-[22px] font-semibold">
        {t("results.closedGroup", { count: results.closed.length })}
      </summary>
      <div className="mt-2.5 flex flex-col gap-3">
        <p className="m-0 text-sm leading-5 text-slate">{t("results.closedIntro")}</p>
        <Cards>
          {results.closed.map((m) => (
            <Card key={m.scheme.slug} m={m} profile={profile} today={results.today} closed />
          ))}
        </Cards>
      </div>
    </details>
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

  // Shown once something fits; a student who is still answering has nothing to send yet.
  const share = !nothing && (
    <section className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-[17px] leading-6 font-semibold">{t("share.resultsTitle")}</h2>
        <p className="m-0 text-[13px] leading-[18px] text-slate">{t("share.resultsIntro")}</p>
      </div>
      <ShareButtons build={(base) => resultsMessage(t, { locale, today: results.today, base }, results)} />
    </section>
  );

  const whyNot = <WhyNot results={results} />;
  const footnote = (
    <Footnote>{t("results.footnote")}</Footnote>
  );

  const side = [toAnswer, unlocks, later, share].some(Boolean) || results.farMisses.length > 0 || results.hidden.length > 0;
  if (wide && side) {
    // Laptop: the schemes on the left; the questions that decide more of them stay beside the cards.
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,22rem)] items-start gap-10">
        <div className="flex flex-col gap-8">
          {coverage}
          {summary}
          {eligible}
          {needsInfo}
          {nearMiss}
          {closed}
          {footnote}
        </div>
        <aside className="flex flex-col gap-6">
          {share}
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
      {coverage}
      {summary}
      {eligible}
      {share}
      {toAnswer}
      {needsInfo}
      {nearMiss}
      {closed}
      {unlocks}
      {later}
      {whyNot}
      {footnote}
    </>
  );
}

// On a phone the first few questions decide most schemes; the rest wait behind "Show more".
const FIRST_QUESTIONS = 3;

function WhyNot({ results }: { results: Results }) {
  const t = useTranslations();
  if (results.farMisses.length === 0 && results.hidden.length === 0) return null;
  return (
    <details className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
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
