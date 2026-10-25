"use client";

import Link from "next/link";
import { useState } from "react";
import { RuleRow } from "@/components/ui/RuleRow";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { MatchStatus } from "@/domain/match";
import type { RowResult } from "@/features/eligibility/lib/explain";
import type { Question } from "@/features/eligibility/lib/questions";
import { IncomeField, PercentField } from "./NumberFields";

// ResultCard, QuestionCard and CountTile from the screen spec, plus the S05 and S09 states.

export function ResultCard({
  status,
  badgeLabel,
  schemeName,
  meta,
  headline,
  rules,
  note,
  verified,
  linkLabel,
  href,
}: {
  status: Exclude<MatchStatus, "notEligible">;
  badgeLabel?: string;
  schemeName: string;
  meta: string;
  headline?: string;
  rules: { result: RowResult; text: string }[];
  note?: string;
  verified: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-col items-start gap-1.5">
        <StatusBadge status={status} label={badgeLabel} />
        <h3 className="m-0 text-lg leading-6 font-semibold">{schemeName}</h3>
        <div className="text-sm leading-5 text-slate">{meta}</div>
      </div>
      {headline && <div className="text-[15px] leading-[21px] font-semibold text-warn">{headline}</div>}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rules.map((r, i) => (
          <RuleRow key={i} result={r.result} text={r.text} />
        ))}
      </ul>
      {note && <div className="rounded-lg bg-ground px-3 py-2.5 text-[13px] leading-[18px] text-slate">{note}</div>}
      <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
        <span className="text-xs leading-4 text-slate">Verified {verified}</span>
        <Link href={href} className="flex min-h-11 items-center text-[15px] font-semibold text-navy">
          {linkLabel}
        </Link>
      </div>
    </article>
  );
}

export function QuestionCard({
  question,
  why,
  onAnswer,
}: {
  question: Question;
  why: string;
  onAnswer: (value: string | number) => void;
}) {
  const [pending, setPending] = useState<number>();
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-white p-3">
      <div className="text-[15px] leading-5 font-semibold">{question.question}</div>
      <div className="text-[13px] leading-[18px] text-slate">{why}</div>
      {question.kind === "choice" ? (
        <div className={question.options.length <= 3 && question.options.every((o) => o.label.length <= 12) ? "grid grid-cols-3 gap-2" : "flex flex-col gap-2"}>
          {question.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onAnswer(o.value)}
              className="min-h-11 rounded-[10px] border border-field bg-white px-3 py-2 text-[15px] leading-5 text-ink hover:border-navy"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {question.kind === "income" ? (
            <IncomeField label={question.question} value={pending} onChange={setPending} />
          ) : (
            <PercentField label={question.question} value={pending} onChange={setPending} />
          )}
          <button
            type="button"
            disabled={pending === undefined}
            onClick={() => pending !== undefined && onAnswer(pending)}
            className="min-h-11 rounded-[10px] bg-navy px-4 text-[15px] font-semibold text-white disabled:bg-disabled disabled:text-muted"
          >
            Check
          </button>
        </div>
      )}
    </div>
  );
}

const TILE = {
  eligible: ["bg-pass-tint text-pass", "can apply"],
  nearMiss: ["bg-warn-tint text-warn", "near misses"],
  needsInfo: ["bg-info-tint text-info", "answers needed"],
} as const;

export function CountTile({ kind, count, href }: { kind: keyof typeof TILE; count: number; href: string }) {
  const [tone, label] = TILE[kind];
  return (
    <a href={href} className={`flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5 no-underline ${tone}`}>
      <b className="text-[22px] leading-[26px]">{count}</b>
      <span className="text-xs leading-4">{label}</span>
    </a>
  );
}

// S05 Checking: shown while the rules download; matching itself takes milliseconds.
export function Checking({ sources }: { sources: string }) {
  const bar = (w: string, h = "h-3.5") => <div className={`${h} rounded-md bg-line-soft ${w}`} />;
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="text-sm leading-5 text-slate">
        Checking {sources}, rule by rule.
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex animate-pulse flex-col gap-3 rounded-[14px] border border-line bg-white p-4 motion-reduce:animate-none">
          {bar("w-24", "h-5")}
          {bar("w-4/5", "h-[22px]")}
          {bar("w-3/5", "h-4")}
          {i === 0 && (
            <>
              {bar("w-[90%]")}
              {bar("w-3/4")}
            </>
          )}
        </div>
      ))}
      <p className="m-0 text-[13px] leading-[18px] text-slate">
        This takes under a second. If the network is slow, your answers are already saved on this phone.
      </p>
    </div>
  );
}

const FAILURES = {
  offline: ["You're offline", "We couldn't load the latest schemes."],
  slow: ["This is taking too long", "The network is slow and the latest schemes didn't arrive."],
  error: ["Something went wrong", "We couldn't load the latest schemes."],
  empty: ["No schemes are published yet", "Paatra is still checking its first schemes against the official pages."],
} as const;

// S09 Offline or error.
export function LoadFailed({ reason, onRetry }: { reason: keyof typeof FAILURES; onRetry: () => void }) {
  const [title, cause] = FAILURES[reason];
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-5 py-10">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate">
        <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M14 10.2A10 10 0 0 1 19 13M2 8.8a15 15 0 0 1 4.3-2.6M10.5 5.1A15 15 0 0 1 22 8.8M12 20h.01" />
      </svg>
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl leading-[30px] font-semibold">{title}</h1>
        <p className="m-0 text-[15px] leading-[22px] text-slate">{cause} Your answers are saved on this phone, so nothing is lost.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-[52px] w-full items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white hover:bg-ink"
      >
        Try again
      </button>
      <p className="m-0 text-[13px] leading-[18px] text-slate">
        We don&apos;t show results from an old copy, because a scheme may have changed or closed since.
      </p>
    </div>
  );
}
