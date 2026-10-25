import { isFresh, type Snapshot, type SnapshotScheme } from "@/domain/rules/snapshot";
import { match, matchAll, type MatchSummary, type RuleCheck, type SchemeMatch } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import { fieldLabel, missText } from "./explain";
import { daysUntil, formatDate, formatLakh } from "@/lib/format";
import type { T } from "./i18n";

// Everything S06 and S07 show, computed on the phone from the downloaded snapshot.

export interface FarMiss {
  scheme: SnapshotScheme;
  reasons: string[];
  failed: RuleCheck[];
}

export interface Results extends MatchSummary {
  // Not eligible and not a near miss: shown under "Why aren't others here?".
  farMisses: FarMiss[];
  // Waiting on an optional question before they are checked at all.
  hidden: SchemeMatch[];
  // Would fit, but the deadline has passed: shown under "Closed for this year" so a scheme the
  // student has heard of never just disappears. Most recently closed first.
  closed: SchemeMatch[];
}

// State schemes are only matched for the student's own domicile state; a state that is not live
// yet has none in the snapshot, so its students see central, AICTE and private schemes.
export function schemesFor(p: Profile, snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    schemes: snapshot.schemes.filter((s) => s.provider !== "STATE" || s.stateCode === p.domicile_state),
  };
}

const open = (s: SnapshotScheme, today: string, now: Date) =>
  (s.deadline === null || s.deadline >= today) && isFresh(s.lastVerifiedAt, now);

export function buildResults(t: T, p: Profile, snapshot: Snapshot, today: string, now = new Date()): Results {
  const mine = schemesFor(p, snapshot);
  const summary = matchAll(p, mine, today, now);
  const all = mine.schemes.filter((s) => open(s, today, now)).map((s) => match(p, s));

  const farMisses = all
    .filter((m) => m.status === "notEligible")
    .map((m) => {
      const failed = m.groups.filter((g) => g.outcome === "fail").flatMap((g) => g.checks);
      return { scheme: m.scheme, failed, reasons: failed.map((c) => missText(t, c, p)) };
    })
    .sort((a, b) => a.scheme.name.localeCompare(b.scheme.name));
  const hidden = all.filter((m) => m.status !== "notEligible" && m.hiddenUntil.length > 0);

  const closed = mine.schemes
    .filter((s) => s.deadline !== null && s.deadline < today && isFresh(s.lastVerifiedAt, now))
    .map((s) => match(p, s))
    .filter((m) => m.status !== "notEligible" && m.hiddenUntil.length === 0)
    .sort((a, b) => b.scheme.deadline!.localeCompare(a.scheme.deadline!) || a.scheme.name.localeCompare(b.scheme.name));

  return { ...summary, farMisses, hidden, closed };
}

export function counts(r: Results) {
  const n = (s: SchemeMatch["status"]) => r.results.filter((m) => m.status === s).length;
  return { eligible: n("eligible"), nearMiss: n("nearMiss"), needsInfo: n("needsInfo") };
}

// S07's one-sentence reason when nothing fits: usually income above the government caps.
export function mainReason(t: T, r: Results, p: Profile): string {
  const byField = new Map<string, number>();
  for (const m of r.farMisses) for (const f of new Set(m.failed.map((c) => c.rule.field))) byField.set(f, (byField.get(f) ?? 0) + 1);
  const top = [...byField.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!top) {
    return r.hidden.length > 0
      ? t("results.mainHidden")
      : t("results.mainNone");
  }
  if (top === "family_income" && p.family_income !== undefined) {
    const limits = r.farMisses
      .flatMap((m) => m.failed)
      .filter((c) => c.rule.field === "family_income" && c.rule.op === "LTE")
      .map((c) => c.rule.value as number);
    const lo = Math.min(...limits);
    const hi = Math.max(...limits);
    const range =
      lo === hi
        ? t("results.mainIncomeAt", { limit: formatLakh(lo) })
        : t("results.mainIncomeBetween", { low: formatLakh(lo), high: formatLakh(hi) });
    return t("results.mainIncome", { range, yours: formatLakh(p.family_income) });
  }
  return t("results.mainField", { field: fieldLabel(t, top).toLowerCase() });
}

// Two weeks or less before the deadline, the card says how many days are left, in the warning colour.
export const URGENT_DAYS = 14;

// The deadline line on a result card: "Apply by 30 Sep 2026 · 5 days left", "Deadline not
// announced yet" or "Closed on 5 Oct 2026".
export function deadlineLine(t: T, locale: string, s: SnapshotScheme, today: string): { text: string; urgent: boolean } {
  if (s.deadline === null) return { text: t("results.noDeadline"), urgent: false };
  const date = formatDate(s.deadline, locale);
  const left = daysUntil(today, s.deadline);
  if (left < 0) return { text: t("results.closedOn", { date }), urgent: false };
  const applyBy = t("results.applyBy", { date });
  return left <= URGENT_DAYS
    ? { text: `${applyBy} · ${t("results.daysLeft", { count: left })}`, urgent: true }
    : { text: applyBy, urgent: false };
}
