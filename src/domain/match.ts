import type { Profile } from "./profile";
import { fieldTier, isStateKey } from "./rules/fields";
import type { PublishableRule } from "./rules/schema";
import { isFresh, type Snapshot, type SnapshotScheme } from "./rules/snapshot";

// The matcher from PRD section 4, step 6. Pure, so the browser and the server run the same code.

// A numeric fail counts as a near-miss only within 20% of the limit (PRD section 5).
export const NEAR_MISS_GAP = 0.2;

export type RuleOutcome = "pass" | "fail" | "unknown";
// "confirm" is an unknown or disputed rule the student cannot settle by answering a question:
// sources disagree, the field is not asked in the MVP, or it needs board percentile tables.
export type GroupOutcome = RuleOutcome | "confirm";
export type MatchStatus = "eligible" | "nearMiss" | "needsInfo" | "notEligible";

export interface RuleCheck {
  rule: PublishableRule;
  outcome: RuleOutcome;
  // How far a numeric fail is from the limit: amount in the field's units, ratio of the limit.
  gap?: { amount: number; ratio: number };
}

export interface GroupCheck {
  group: number;
  outcome: GroupOutcome;
  checks: RuleCheck[];
}

export interface SchemeMatch {
  scheme: SnapshotScheme;
  status: MatchStatus;
  groups: GroupCheck[];
  // Near-misses only: the one rule failed.
  failed?: RuleCheck;
  // Unanswered fields that would settle this scheme.
  unknownFields: string[];
  // Rules to check on the official site.
  confirm: RuleCheck[];
  // Optional questions that must be answered before this scheme is shown at all.
  hiddenUntil: string[];
}

export interface MatchSummary {
  results: SchemeMatch[];
  // Questions that would decide shown schemes, most useful first.
  questions: { field: string; schemes: number }[];
  // "Answer this to check N more scholarships".
  unlocks: { field: string; schemes: number }[];
}

// What the profile says about a field: nothing, a numeric range, or a set of values.
type Answer =
  | { kind: "none" }
  | { kind: "range"; lo: number; hi: number }
  | { kind: "set"; values: (string | boolean)[] };

const none: Answer = { kind: "none" };
const num = (n: number | undefined): Answer => (n === undefined ? none : { kind: "range", lo: n, hi: n });
const one = (v: string | boolean | undefined): Answer =>
  v === undefined ? none : { kind: "set", values: [v] };
const many = (vs: string[] | undefined): Answer =>
  vs && vs.length > 0 ? { kind: "set", values: vs } : none;

function resolveField(field: string, p: Profile): Answer {
  if (isStateKey(field)) {
    const v = p.state?.[field];
    return v === undefined || v === "unknown" ? none : one(v);
  }
  switch (field) {
    case "family_income":
      return num(p.family_income);
    case "class12_pct":
      return num(p.class12_pct);
    case "class10_pct":
      return num(p.class10_pct);
    case "domicile_state":
      return one(p.domicile_state);
    case "category":
      return one(p.category);
    case "minority":
      return one(p.minority);
    case "gender":
      return one(p.gender);
    case "course":
      return one(p.course);
    case "year":
      return one(p.year);
    case "institution_type":
      return one(p.institution_type);
    case "aicte_approved":
      return p.aicte_approved === "yes" ? one(true) : p.aicte_approved === "no" ? one(false) : none;
    case "disability_pct":
      // The form asks in bands, so "under 40%" is a range, not a number.
      if (p.disability === "none") return { kind: "range", lo: 0, hi: 0 };
      if (p.disability === "lt40") return { kind: "range", lo: Number.MIN_VALUE, hi: 39.99 };
      if (p.disability === "gte40") return { kind: "range", lo: 40, hi: 100 };
      return none;
    case "parent_occupation":
      return many(p.parent_occupation);
    case "special_status":
      return many(p.special_status);
    case "entrance_exam":
      return one(p.entrance?.exam);
    case "entrance_rank":
      return num(p.entrance?.score);
    case "fresh_or_renewal":
      // A 1st-year or lateral-entry student is applying fresh; later years could be either.
      return p.year === "1" || p.year === "2_lateral" ? one("fresh") : none;
    default:
      return none;
  }
}

const gapOf = (amount: number, limit: number) => ({
  amount,
  ratio: limit === 0 ? Infinity : amount / Math.abs(limit),
});

export function checkRule(rule: PublishableRule, p: Profile): RuleCheck {
  if (rule.op === "PERCENTILE_GTE") return { rule, outcome: "unknown" };
  const a = resolveField(rule.field, p);
  if (a.kind === "none") return { rule, outcome: "unknown" };

  const inRange = (v: unknown): RuleOutcome => {
    if (a.kind !== "range" || typeof v !== "number") return "unknown";
    if (a.lo === v && a.hi === v) return "pass";
    return v >= a.lo && v <= a.hi ? "unknown" : "fail";
  };
  const anyOf = (vs: readonly unknown[]): RuleOutcome => {
    if (a.kind === "set") return a.values.some((v) => vs.includes(v)) ? "pass" : "fail";
    const each = vs.map(inRange);
    return each.includes("pass") ? "pass" : each.includes("unknown") ? "unknown" : "fail";
  };

  switch (rule.op) {
    case "EQ":
      return { rule, outcome: anyOf([rule.value]) };
    case "IN":
      return { rule, outcome: anyOf(rule.value) };
    case "IS_TRUE": {
      if (a.kind !== "set") return { rule, outcome: "unknown" };
      if (a.values.some((v) => v === true || v === "yes")) return { rule, outcome: "pass" };
      // Anything else ("applied", "not sure") is not a no yet.
      if (a.values.some((v) => v === false || v === "no")) return { rule, outcome: "fail" };
      return { rule, outcome: "unknown" };
    }
  }

  if (a.kind !== "range") return { rule, outcome: "unknown" };
  switch (rule.op) {
    case "LTE":
      if (a.hi <= rule.value) return { rule, outcome: "pass" };
      if (a.lo > rule.value) return { rule, outcome: "fail", gap: gapOf(a.lo - rule.value, rule.value) };
      return { rule, outcome: "unknown" };
    case "GTE":
      if (a.lo >= rule.value) return { rule, outcome: "pass" };
      if (a.hi < rule.value) return { rule, outcome: "fail", gap: gapOf(rule.value - a.hi, rule.value) };
      return { rule, outcome: "unknown" };
    case "BETWEEN": {
      const [min, max] = rule.value;
      if (a.lo >= min && a.hi <= max) return { rule, outcome: "pass" };
      if (a.hi < min) return { rule, outcome: "fail", gap: gapOf(min - a.hi, min) };
      if (a.lo > max) return { rule, outcome: "fail", gap: gapOf(a.lo - max, max) };
      return { rule, outcome: "unknown" };
    }
  }
}

// What a non-passing check means for its group.
function settle(c: RuleCheck): GroupOutcome {
  if (c.outcome === "pass") return "pass";
  const cannotAsk =
    c.rule.ambiguous || c.rule.op === "PERCENTILE_GTE" || fieldTier(c.rule.field) === "notAsked";
  if (cannotAsk) return "confirm";
  return c.outcome;
}

function evaluateGroup(group: number, checks: RuleCheck[]): GroupCheck {
  const settled = checks.map(settle);
  // OR inside a group: one pass is enough; an open question beats a disputed rule beats a fail.
  for (const outcome of ["pass", "unknown", "confirm"] as const) {
    if (settled.includes(outcome)) return { group, outcome, checks };
  }
  return { group, outcome: "fail", checks };
}

export function match(p: Profile, scheme: SnapshotScheme): SchemeMatch {
  const byGroup = new Map<number, PublishableRule[]>();
  for (const r of scheme.rules) byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), r]);
  const groups = [...byGroup.entries()]
    .sort(([a], [b]) => a - b)
    .map(([g, rs]) => evaluateGroup(g, rs.map((r) => checkRule(r, p))));

  const fails = groups.filter((g) => g.outcome === "fail");
  const unknownChecks = groups
    .filter((g) => g.outcome === "unknown")
    .flatMap((g) => g.checks.filter((c) => settle(c) === "unknown"));
  const unknownFields = [...new Set(unknownChecks.map((c) => c.rule.field))];
  const confirm = groups
    .filter((g) => g.outcome === "confirm")
    .flatMap((g) => g.checks.filter((c) => settle(c) === "confirm"));
  const hiddenUntil = unknownFields.filter((f) => fieldTier(f) === "unlock");
  const base = { scheme, groups, unknownFields, confirm, hiddenUntil };

  if (fails.length === 0) {
    const open = unknownFields.length > 0 || confirm.length > 0;
    return { ...base, status: open ? "needsInfo" : "eligible" };
  }
  if (fails.length === 1) {
    const closest = fails[0].checks
      .filter((c) => c.gap && c.gap.ratio <= NEAR_MISS_GAP)
      .sort((x, y) => x.gap!.ratio - y.gap!.ratio)[0];
    if (closest) return { ...base, status: "nearMiss", failed: closest };
  }
  return { ...base, status: "notEligible" };
}

const STATUS_ORDER: Record<MatchStatus, number> = { eligible: 0, nearMiss: 1, needsInfo: 2, notEligible: 3 };

function countFields(matches: SchemeMatch[], pick: (m: SchemeMatch) => string[]) {
  const counts = new Map<string, number>();
  for (const m of matches) for (const f of pick(m)) counts.set(f, (counts.get(f) ?? 0) + 1);
  // Stable sort keeps result order for ties, so the first result's question comes first.
  return [...counts.entries()]
    .map(([field, schemes]) => ({ field, schemes }))
    .sort((a, b) => b.schemes - a.schemes);
}

// `today` is the student's local date as YYYY-MM-DD; `now` checks freshness again in case the
// downloaded snapshot has aged since it was published.
export function matchAll(p: Profile, snapshot: Snapshot, today: string, now = new Date()): MatchSummary {
  const matches = snapshot.schemes
    .filter((s) => (s.deadline === null || s.deadline >= today) && isFresh(s.lastVerifiedAt, now))
    .map((s) => match(p, s))
    .filter((m) => m.status !== "notEligible");

  const shown = matches
    .filter((m) => m.hiddenUntil.length === 0)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.scheme.deadline ?? "9999").localeCompare(b.scheme.deadline ?? "9999") ||
        a.scheme.name.localeCompare(b.scheme.name),
    );
  const hidden = matches.filter((m) => m.hiddenUntil.length > 0);

  return {
    results: shown,
    questions: countFields(shown, (m) => m.unknownFields),
    unlocks: countFields(hidden, (m) => m.hiddenUntil),
  };
}
