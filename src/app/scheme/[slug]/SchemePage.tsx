"use client";

import Link from "next/link";
import { Alert } from "@/components/Alert";
import { RuleRow } from "@/components/RuleRow";
import { StatusBadge } from "@/components/StatusBadge";
import { BackIcon, Column, Footnote, Screen } from "@/components/student/layout";
import { Checking, LoadFailed } from "@/components/student/results";
import { formatDate } from "@/lib/format";
import { match, type GroupCheck, type RuleCheck } from "@/lib/match";
import type { Profile } from "@/lib/profile";
import { fieldTier } from "@/lib/rules/fields";
import type { SnapshotScheme } from "@/lib/rules/snapshot";
import { useDocumentTicks } from "@/lib/student/documents";
import { gapText, ruleText, yourAnswer } from "@/lib/student/explain";
import { useAnswers } from "@/lib/student/use-answers";
import { useSnapshot } from "@/lib/student/use-snapshot";
import { STATE_BY_CODE } from "@/lib/states";

export function SchemePage({ slug }: { slug: string }) {
  const [profile] = useAnswers();
  const [snap, retry] = useSnapshot();

  return (
    <Screen>
      <Column className="pt-4">
        <Link href="/results" className="-ml-1 flex min-h-11 items-center gap-1 self-start text-[15px] font-semibold text-navy">
          <BackIcon />
          All results
        </Link>
      </Column>
      <Column className="flex-1 gap-6 pt-2 pb-8">
        {snap.status === "failed" ? (
          <LoadFailed reason={snap.reason} onRetry={retry} />
        ) : snap.status === "loading" || !profile ? (
          <Checking sources="this scheme's rules" />
        ) : (
          <Found scheme={snap.snapshot.schemes.find((s) => s.slug === slug)} profile={profile} />
        )}
      </Column>
    </Screen>
  );
}

function Found({ scheme, profile }: { scheme: SnapshotScheme | undefined; profile: Profile }) {
  if (!scheme) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-2xl leading-[30px] font-semibold">This scheme isn&apos;t listed right now</h1>
        <p className="m-0 text-[15px] leading-[22px] text-slate">
          It may have closed for this cycle, or it is being re-checked against the official page. We only list schemes
          verified in the last 90 days.
        </p>
        <Link href="/results" className="font-semibold text-navy">
          Back to your results
        </Link>
      </div>
    );
  }
  return <Scheme scheme={scheme} profile={profile} />;
}

const PROVIDER = { CENTRAL: "Central government", AICTE: "AICTE", STATE: "State government", PRIVATE: "Private" } as const;

function Scheme({ scheme, profile }: { scheme: SnapshotScheme; profile: Profile }) {
  const m = match(profile, scheme);
  const [ticks, toggle] = useDocumentTicks(scheme.slug);
  const documents = scheme.documents ?? [];
  const missing = documents.filter((d) => !ticks.includes(d));
  const portal = scheme.stateCode ? STATE_BY_CODE.get(scheme.stateCode)?.portal : undefined;
  const type = [PROVIDER[scheme.provider], ...(scheme.benefitTypes ?? [])].join(" · ");
  const applyVia = scheme.appliesVia === "State portal" && portal ? portal : scheme.appliesVia;

  const facts = [
    ["Amount", scheme.amountText ?? "See the official page"],
    ["Deadline", scheme.deadline ? formatDate(scheme.deadline) : "See the official page"],
    ["Type", type],
    ["Apply through", applyVia ?? "The official site"],
  ];

  return (
    <>
      <header className="flex flex-col items-start gap-2">
        <StatusBadge status={m.status} />
        <h1 className="m-0 text-[26px] leading-8 font-semibold tracking-tight">{scheme.name}</h1>
        <div className="flex items-center gap-1.5 text-[13px] leading-[18px] text-slate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8" />
            <path d="M12 8v4l3 2" />
          </svg>
          Last verified {formatDate(scheme.lastVerifiedAt.slice(0, 10))} against the official page
        </div>
      </header>

      {m.failed && <Alert tone="warning" title={gapText(m.failed, profile) ?? "One rule is not met yet."} />}

      <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 bg-white px-3.5 py-3">
            <dt className="text-xs leading-4 text-slate">{k}</dt>
            <dd className="m-0 text-[15px] leading-5 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-lg leading-6 font-semibold">The rules, and how you match</h2>
        {m.groups.map((g) => (
          <RuleGroup key={g.group} group={g} profile={profile} />
        ))}
      </section>

      {documents.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg leading-6 font-semibold">Documents you&apos;ll need</h2>
            <p className="m-0 text-[13px] leading-[18px] text-slate">Tick what you already have. Saved on this phone.</p>
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
            <Alert tone="warning" title={`You qualify, but still need ${missing.length} document${missing.length === 1 ? "" : "s"}:`}>
              {missing.join(", ")}.
            </Alert>
          )}
          {missing.length === 0 && <Alert tone="success" title="You have every document on the list." />}
        </section>
      )}

      <div className="flex flex-col gap-3">
        <a
          href={scheme.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink"
        >
          Apply on the official site
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" />
          </svg>
        </a>
        <Footnote />
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
  const either = group.checks.length > 1;
  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-white p-4">
      {either && <div className="text-xs leading-4 font-semibold tracking-[0.06em] text-slate uppercase">Any one of these</div>}
      {group.checks.map((c, i) => {
        const result = rowResult(c);
        const yours = yourAnswer(c.rule.field, profile);
        const detail =
          result === "confirm"
            ? c.rule.ambiguous
              ? "Sources differ on this rule. Confirm on the official site."
              : "We don't ask this yet. Confirm on the official site."
            : yours
              ? `You: ${yours}`
              : "You haven't answered this yet.";
        return (
          <div key={i} className="flex flex-col gap-2">
            <ul className="m-0 list-none p-0">
              <RuleRow result={result} text={ruleText(c.rule)} detail={detail} />
            </ul>
            <blockquote className="m-0 border-l-0 rounded-lg bg-ground px-3 py-2.5 text-[13px] leading-[19px] text-muted">
              &ldquo;{c.rule.quote}&rdquo;
              <br />
              <a href={c.rule.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-navy">
                Source: official page
              </a>
            </blockquote>
          </div>
        );
      })}
    </div>
  );
}
