"use client";

import { useTranslations } from "next-intl";
import type { Profile } from "@/domain/profile";
import type { T } from "@/features/eligibility/lib/i18n";
import {
  disabilityOptions,
  entranceOptions,
  labelOf,
  minorityOptions,
  parentOccupationOptions,
  PERCENTILE_EXAMS,
  specialStatusOptions,
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

// Each row's title and folded detail line, as "unlocks.<prefix>Title" / "unlocks.<prefix>Detail".
const ROWS = [
  { key: "disability", text: "disability" },
  { key: "minority", text: "minority" },
  { key: "parent_occupation", text: "parent" },
  { key: "special_status", text: "family" },
  { key: "entrance", text: "entrance" },
  { key: "class10_pct", text: "class10" },
] as const satisfies readonly { key: UnlockKey; text: string }[];

const list = (t: T, options: readonly { value: string; label: string }[], values: string[] | undefined) =>
  values?.map((v) => labelOf(options, v)).join(t("common.listSeparator"));

function answerOf(t: T, key: UnlockKey, p: Profile): string | undefined {
  switch (key) {
    case "disability":
      return labelOf(disabilityOptions(t), p.disability);
    case "minority":
      return labelOf(minorityOptions(t), p.minority);
    case "parent_occupation":
      return list(t, parentOccupationOptions(t), p.parent_occupation);
    case "special_status":
      return list(t, specialStatusOptions(t), p.special_status);
    case "entrance": {
      if (!p.entrance) return undefined;
      const exam = labelOf(entranceOptions(t), p.entrance.exam) ?? p.entrance.exam;
      return p.entrance.score === undefined ? exam : t("unlocks.examScore", { exam, score: String(p.entrance.score) });
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
  const t = useTranslations();
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    update((p) => {
      const next = { ...p, [key]: value };
      if (value === undefined) delete next[key];
      return next;
    });

  const rows = only ? ROWS.filter((r) => only.includes(r.key)) : [...ROWS];
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col rounded-[14px] border border-line bg-white">
      {rows.map((r) => (
        <UnlockRow
          key={r.key}
          title={t(`unlocks.${r.text}Title`)}
          detail={detailFor?.(r.key) ?? t(`unlocks.${r.text}Detail`)}
          answer={answerOf(t, r.key, profile)}
        >
          {r.key === "disability" && (
            <ChoiceGroup legend={t("unlocks.disabilityQuestion")} layout="list" options={disabilityOptions(t)} value={profile.disability} onChange={(v) => set("disability", v)} />
          )}
          {r.key === "minority" && (
            <ChoiceGroup legend={t("unlocks.minorityQuestion")} options={minorityOptions(t)} value={profile.minority} onChange={(v) => set("minority", v)} />
          )}
          {r.key === "parent_occupation" && (
            <CheckList legend={t("unlocks.parentQuestion")} options={parentOccupationOptions(t)} value={profile.parent_occupation} onChange={(v) => set("parent_occupation", v)} />
          )}
          {r.key === "special_status" && (
            <CheckList legend={t("unlocks.familyQuestion")} options={specialStatusOptions(t)} value={profile.special_status} onChange={(v) => set("special_status", v)} />
          )}
          {r.key === "entrance" && (
            <div className="flex flex-col gap-4">
              <ChoiceGroup
                legend={t("unlocks.entranceQuestion")}
                layout="list"
                options={entranceOptions(t)}
                value={profile.entrance?.exam}
                onChange={(exam) => set("entrance", exam ? { exam, score: profile.entrance?.score } : undefined)}
              />
              {profile.entrance && profile.entrance.exam !== "none" && (
                <DecimalField
                  label={PERCENTILE_EXAMS.includes(profile.entrance.exam) ? t("unlocks.percentile") : t("unlocks.rank")}
                  value={profile.entrance.score}
                  placeholder={t("fields.scorePlaceholder")}
                  example="92.5"
                  decimals={7}
                  onChange={(score) => set("entrance", { exam: profile.entrance!.exam, score })}
                />
              )}
            </div>
          )}
          {r.key === "class10_pct" && (
            <PercentField label={t("unlocks.class10Question")} hint={t("unlocks.class10Hint")} value={profile.class10_pct} onChange={(v) => set("class10_pct", v)} />
          )}
        </UnlockRow>
      ))}
    </div>
  );
}

export function unansweredUnlocks(t: T, p: Profile): UnlockKey[] {
  return ROWS.map((r) => r.key).filter((k) => answerOf(t, k, p) === undefined);
}
