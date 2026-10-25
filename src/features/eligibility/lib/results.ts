import { isFresh, type Snapshot, type SnapshotScheme } from "@/domain/rules/snapshot";
import { match, matchAll, type MatchSummary, type RuleCheck, type SchemeMatch } from "@/domain/match";
import type { Profile } from "@/domain/profile";
import { fieldLabel, missText } from "./explain";
import { formatLakh } from "@/lib/format";

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

export function buildResults(p: Profile, snapshot: Snapshot, today: string, now = new Date()): Results {
  const mine = schemesFor(p, snapshot);
  const summary = matchAll(p, mine, today, now);
  const all = mine.schemes.filter((s) => open(s, today, now)).map((s) => match(p, s));

  const farMisses = all
    .filter((m) => m.status === "notEligible")
    .map((m) => {
      const failed = m.groups.filter((g) => g.outcome === "fail").flatMap((g) => g.checks);
      return { scheme: m.scheme, failed, reasons: failed.map((c) => missText(c, p)) };
    })
    .sort((a, b) => a.scheme.name.localeCompare(b.scheme.name));
  const hidden = all.filter((m) => m.status !== "notEligible" && m.hiddenUntil.length > 0);

  return { ...summary, farMisses, hidden };
}

export function counts(r: Results) {
  const n = (s: SchemeMatch["status"]) => r.results.filter((m) => m.status === s).length;
  return { eligible: n("eligible"), nearMiss: n("nearMiss"), needsInfo: n("needsInfo") };
}

// S07's one-sentence reason when nothing fits: usually income above the government caps.
export function mainReason(r: Results, p: Profile): string {
  const byField = new Map<string, number>();
  for (const m of r.farMisses) for (const f of new Set(m.failed.map((c) => c.rule.field))) byField.set(f, (byField.get(f) ?? 0) + 1);
  const top = [...byField.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  if (!top) {
    return r.hidden.length > 0
      ? "The schemes that could fit you need one of the optional answers below first."
      : "No published scheme fits your answers yet. We add schemes every week.";
  }
  if (top === "family_income" && p.family_income !== undefined) {
    const limits = r.farMisses
      .flatMap((m) => m.failed)
      .filter((c) => c.rule.field === "family_income" && c.rule.op === "LTE")
      .map((c) => c.rule.value as number);
    const lo = Math.min(...limits);
    const hi = Math.max(...limits);
    const range = lo === hi ? `at ${formatLakh(lo)}` : `between ${formatLakh(lo)} and ${formatLakh(hi)}`;
    return `Most schemes cap family income ${range}. Yours is ${formatLakh(p.family_income)}, so merit-based and private scholarships are your best chance.`;
  }
  return `Most schemes you missed have a rule on ${fieldLabel(top).toLowerCase()} that your answers don't meet.`;
}
