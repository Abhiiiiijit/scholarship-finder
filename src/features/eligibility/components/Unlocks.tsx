"use client";

import type { Profile } from "@/domain/profile";
import {
  DISABILITY_OPTIONS,
  ENTRANCE_OPTIONS,
  labelOf,
  MINORITY_OPTIONS,
  PARENT_OCCUPATION_OPTIONS,
  SPECIAL_STATUS_OPTIONS,
} from "@/features/eligibility/lib/labels";
import { CheckList, ChoiceGroup } from "./controls";
import { DecimalField, PercentField } from "./NumberFields";
import { UnlockRow } from "./UnlockRow";

// The optional questions (S03, S07). Each one only decides schemes that are hidden until it is
// answered, so a student can skip all of them.

export type UnlockKey = "disability" | "minority" | "parent_occupation" | "special_status" | "entrance" | "class10_pct";

// The rule fields each optional question settles, to match the matcher's "unlocks" counts.
export const UNLOCK_FIELDS: Record<UnlockKey, string[]> = {
  disability: ["disability_pct"],
  minority: ["minority"],
  parent_occupation: ["parent_occupation"],
  special_status: ["special_status"],
  entrance: ["entrance_exam", "entrance_rank"],
  class10_pct: ["class10_pct"],
};

const ROWS: { key: UnlockKey; title: string; detail: string }[] = [
  { key: "disability", title: "Disability", detail: "checks AICTE Saksham and similar" },
  { key: "minority", title: "Minority community", detail: "checks central and state minority schemes" },
  { key: "parent_occupation", title: "Parent's occupation", detail: "farmer, registered labourer, armed forces" },
  { key: "special_status", title: "Family situation", detail: "orphan, single girl child, first to go to college" },
  { key: "entrance", title: "Entrance exam rank", detail: "some private schemes rank by it" },
  { key: "class10_pct", title: "Class 10 percentage", detail: "asked by some private schemes" },
];

const list = (options: readonly { value: string; label: string }[], values: string[] | undefined) =>
  values?.map((v) => labelOf(options, v)).join(", ");

function answerOf(key: UnlockKey, p: Profile): string | undefined {
  switch (key) {
    case "disability":
      return labelOf(DISABILITY_OPTIONS, p.disability);
    case "minority":
      return labelOf(MINORITY_OPTIONS, p.minority);
    case "parent_occupation":
      return list(PARENT_OCCUPATION_OPTIONS, p.parent_occupation);
    case "special_status":
      return list(SPECIAL_STATUS_OPTIONS, p.special_status);
    case "entrance": {
      if (!p.entrance) return undefined;
      const exam = labelOf(ENTRANCE_OPTIONS, p.entrance.exam);
      return p.entrance.score === undefined ? exam : `${exam}: ${p.entrance.score}`;
    }
    case "class10_pct":
      return p.class10_pct === undefined ? undefined : `${p.class10_pct}%`;
  }
}

export function UnlockQuestions({
  profile,
  update,
  only,
  detailFor,
}: {
  profile: Profile;
  update: (fn: (p: Profile) => Profile) => void;
  // Limit to these rows, e.g. the unanswered ones on S07.
  only?: UnlockKey[];
  // Replaces the default detail line, e.g. "checks 3 more schemes".
  detailFor?: (key: UnlockKey) => string | undefined;
}) {
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    update((p) => {
      const next = { ...p, [key]: value };
      if (value === undefined) delete next[key];
      return next;
    });

  const rows = only ? ROWS.filter((r) => only.includes(r.key)) : ROWS;
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-white">
      {rows.map((r) => (
        <UnlockRow key={r.key} title={r.title} detail={detailFor?.(r.key) ?? r.detail} answer={answerOf(r.key, profile)}>
          {r.key === "disability" && (
            <ChoiceGroup legend="Do you have a disability?" layout="list" options={DISABILITY_OPTIONS} value={profile.disability} onChange={(v) => set("disability", v)} />
          )}
          {r.key === "minority" && (
            <ChoiceGroup legend="Minority community" options={MINORITY_OPTIONS} value={profile.minority} onChange={(v) => set("minority", v)} />
          )}
          {r.key === "parent_occupation" && (
            <CheckList legend="Does a parent work as any of these?" options={PARENT_OCCUPATION_OPTIONS} value={profile.parent_occupation} onChange={(v) => set("parent_occupation", v)} />
          )}
          {r.key === "special_status" && (
            <CheckList legend="Do any of these apply to you?" options={SPECIAL_STATUS_OPTIONS} value={profile.special_status} onChange={(v) => set("special_status", v)} />
          )}
          {r.key === "entrance" && (
            <div className="flex flex-col gap-4">
              <ChoiceGroup
                legend="Entrance exam you were admitted through"
                layout="list"
                options={ENTRANCE_OPTIONS}
                value={profile.entrance?.exam}
                onChange={(exam) => set("entrance", exam ? { exam, score: profile.entrance?.score } : undefined)}
              />
              {profile.entrance && profile.entrance.exam !== "none" && (
                <DecimalField
                  label={/percentile/.test(labelOf(ENTRANCE_OPTIONS, profile.entrance.exam) ?? "") ? "Your percentile" : "Your rank"}
                  value={profile.entrance.score}
                  placeholder="e.g. 92.5"
                  decimals={7}
                  onChange={(score) => set("entrance", { exam: profile.entrance!.exam, score })}
                />
              )}
            </div>
          )}
          {r.key === "class10_pct" && (
            <PercentField label="Class 10 (SSC) percentage" value={profile.class10_pct} onChange={(v) => set("class10_pct", v)} />
          )}
        </UnlockRow>
      ))}
    </div>
  );
}

export function unansweredUnlocks(p: Profile): UnlockKey[] {
  return ROWS.map((r) => r.key).filter((k) => answerOf(k, p) === undefined);
}
