"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/Alert";
import { RuleRow } from "@/components/ui/RuleRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BackIcon, Column, Footnote, Screen } from "@/features/eligibility/components/layout";
import { Checking, LoadFailed } from "@/features/eligibility/components/results";
import { formatDate } from "@/lib/format";
import { match, type GroupCheck, type RuleCheck } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import { fieldTier } from "@/domain/rules/fields";
import type { SnapshotScheme } from "@/domain/rules/snapshot";
import { useDocumentTicks } from "@/features/eligibility/store/documents";
import { gapText, ruleText, yourAnswer } from "@/features/eligibility/lib/explain";
import { useAnswers } from "@/features/eligibility/hooks/use-answers";
import { useSnapshot } from "@/features/eligibility/hooks/use-snapshot";
import { STATE_BY_CODE } from "@/domain/states";

export function SchemeView({ slug }: { slug: string }) {
  const t = useTranslations("scheme");
  const [profile] = useAnswers();
  const [snap, retry] = useSnapshot();

  return (
    <Screen>
      <Column className="pt-4 lg:pt-6">
        <Link href="/results" className="-ml-1 flex min-h-11 items-center gap-1 self-start text-[15px] font-semibold text-navy">
          <BackIcon />
          {t("allResults")}
        </Link>
      </Column>
      <Column className="flex-1 gap-6 pt-2 pb-8 lg:pb-12">
        {snap.status === "failed" ? (
          <LoadFailed reason={snap.reason} onRetry={retry} />
        ) : snap.status === "loading" || !profile ? (
          <Checking />
        ) : (
          <Found scheme={snap.snapshot.schemes.find((s) => s.slug === slug)} profile={profile} />
        )}
      </Column>
    </Screen>
  );
}

function Found({ scheme, profile }: { scheme: SnapshotScheme | undefined; profile: Profile }) {
  const t = useTranslations("scheme");
  if (!scheme) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-2xl leading-[30px] font-semibold">{t("notListedTitle")}</h1>
        <p className="m-0 text-[15px] leading-[22px] text-slate">
          {t("notListedBody")}
        </p>
        <Link href="/results" className="font-semibold text-navy">
          {t("backToResults")}
        </Link>
      </div>
    );
  }
  return <Scheme scheme={scheme} profile={profile} />;
}

const PROVIDER = {
  CENTRAL: "providerCentral",
  AICTE: "providerAicte",
  STATE: "providerState",
  PRIVATE: "providerPrivate",
} as const;

function Scheme({ scheme, profile }: { scheme: SnapshotScheme; profile: Profile }) {
  const t = useTranslations();
  const m = match(profile, scheme);
  const [ticks, toggle] = useDocumentTicks(scheme.slug);
  const documents = scheme.documents ?? [];
  const missing = documents.filter((d) => !ticks.includes(d));
  const portal = scheme.stateCode ? STATE_BY_CODE.get(scheme.stateCode)?.portal : undefined;
  const type = [t(`scheme.${PROVIDER[scheme.provider]}`), ...(scheme.benefitTypes ?? [])].join(" · ");
  const applyVia = scheme.appliesVia === "State portal" && portal ? portal : scheme.appliesVia;

  const facts = [
    [t("scheme.amount"), scheme.amountText ?? t("scheme.seeOfficial")],
    [t("scheme.deadline"), scheme.deadline ? formatDate(scheme.deadline) : t("scheme.seeOfficial")],
    [t("scheme.type"), type],
    [t("scheme.applyThrough"), applyVia ?? t("scheme.officialSite")],
  ];

  const factList = (className: string) => (
    <dl className={`m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line ${className}`}>
      {facts.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 bg-white px-3.5 py-3">
          <dt className="text-xs leading-4 text-slate">{k}</dt>
          <dd className="m-0 text-[15px] leading-5 font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <>
      <header className="flex flex-col items-start gap-2">
        <StatusBadge status={m.status} label={t(`status.${m.status}`)} />
        <h1 className="m-0 text-[26px] leading-8 font-semibold tracking-tight lg:text-[32px] lg:leading-10">{scheme.name}</h1>
        <div className="flex items-center gap-1.5 text-[13px] leading-[18px] text-slate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l3 2" />
          </svg>
          {t("scheme.lastVerified", { date: formatDate(scheme.lastVerifiedAt.slice(0, 10)) })}
        </div>
      </header>

      {/* Phone: one column in the designed order. Laptop: the rules on the left, and the facts, documents and
          apply button on the right. */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6">
          {m.failed && <Alert tone="warning" title={gapText(t, m.failed, profile) ?? t("scheme.oneRuleNotMet")} />}

          {factList("lg:hidden")}

          <section className="flex flex-col gap-3">
            <h2 className="m-0 text-lg leading-6 font-semibold">{t("scheme.rulesTitle")}</h2>
            {m.groups.map((g) => (
              <RuleGroup key={g.group} group={g} profile={profile} />
            ))}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          {factList("max-lg:hidden")}

          {documents.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-lg leading-6 font-semibold">{t("scheme.documentsTitle")}</h2>
                <p className="m-0 text-[13px] leading-[18px] text-slate">{t("scheme.documentsIntro")}</p>
              </div>
              <div className="flex flex-col rounded-[14px] border border-line bg-white">
                {documents.map((d) => (
                  <label key={d} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line-soft px-4 py-2 text-[15px] leading-5 last:border-b-0">
                    <input type="checkbox" checked={ticks.includes(d)} onChange={(e) => toggle(d, e.target.checked)} className="size-5 flex-none accent-navy" />
                    {d}
                  </label>
                ))}
              </div>
              {m.status === "eligible" && missing.length > 0 && (
                <Alert tone="warning" title={t("scheme.stillNeed", { count: missing.length })}>
                  {missing.join(t("common.listSeparator"))}.
                </Alert>
              )}
              {missing.length === 0 && <Alert tone="success" title={t("scheme.haveAll")} />}
            </section>
          )}

          <div className="flex flex-col gap-3">
            <a
              href={scheme.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink"
            >
              {t("scheme.apply")}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" />
              </svg>
            </a>
            <Footnote />
          </div>
        </aside>
      </div>
    </>
  );
}

function rowResult(c: RuleCheck): "pass" | "fail" | "unknown" | "confirm" {
  if (c.outcome === "pass") return "pass";
  if (c.rule.ambiguous || c.rule.op === "PERCENTILE_GTE" || fieldTier(c.rule.field) === "notAsked") return "confirm";
  return c.outcome;
}

function RuleGroup({ group, profile }: { group: GroupCheck; profile: Profile }) {
  const t = useTranslations();
  const either = group.checks.length > 1;
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-4">
      {either && <div className="text-xs leading-4 font-semibold tracking-[0.06em] text-slate uppercase">{t("scheme.anyOne")}</div>}
      {group.checks.map((c, i) => {
        const result = rowResult(c);
        const yours = yourAnswer(t, c.rule.field, profile);
        const detail =
          result === "confirm"
            ? c.rule.ambiguous
              ? t("scheme.sourcesDiffer")
              : t("scheme.notAsked")
            : yours
              ? t("scheme.you", { answer: yours })
              : t("scheme.notAnswered");
        return (
          <div key={i} className="flex flex-col gap-2">
            <ul className="m-0 list-none p-0">
              <RuleRow result={result} text={ruleText(t, c.rule)} detail={detail} label={t(`status.${result}`)} />
            </ul>
            {/* The official wording, word for word in the source's language: never translated. */}
            <blockquote className="m-0 border-l-0 rounded-lg bg-ground px-3 py-2.5 text-[13px] leading-[19px] text-muted">
              &ldquo;{c.rule.quote}&rdquo;
              <br />
              <a href={c.rule.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy">
                {t("scheme.source")}
              </a>
            </blockquote>
          </div>
        );
      })}
    </div>
  );
}
