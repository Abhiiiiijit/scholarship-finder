import { isFresh } from "@/domain/rules/snapshot";

// The A01 status badge, set by the system from the stored status, freshness and deadline.
export type SchemeBadge = "draft" | "live" | "recheck" | "stale" | "closed" | "onHold" | "retired";

export const BADGE_LABELS: Record<SchemeBadge, string> = {
  draft: "Draft",
  live: "Live",
  recheck: "Re-check due",
  stale: "Hidden: stale",
  closed: "Closed this cycle",
  onHold: "On hold",
  retired: "Retired",
};

const RECHECK_DAYS = 30;

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export function schemeBadge(
  s: { status: string; lastVerifiedAt: Date | null; deadline: string | null },
  today: string,
  now: Date,
): SchemeBadge {
  if (s.status === "RETIRED") return "retired";
  if (s.status === "ON_HOLD") return "onHold";
  if (s.status !== "PUBLISHED") return "draft";
  if (!isFresh(s.lastVerifiedAt, now)) return "stale";
  if (s.deadline && s.deadline < today) return "closed";
  if (s.deadline && s.deadline <= addDays(today, RECHECK_DAYS)) return "recheck";
  return "live";
}

// "Needs attention" on A01: anything a person has to act on.
export const NEEDS_ATTENTION: SchemeBadge[] = ["draft", "recheck", "stale", "onHold"];

// Status filter on A01. "Live" means reaching students, so it includes schemes due a re-check.
export const STATUS_FILTERS = [
  ["draft", "Draft", ["draft"]],
  ["live", "Live", ["live", "recheck"]],
  ["recheck", "Re-check due", ["recheck"]],
  ["closed", "Closed", ["closed"]],
  ["stale", "Hidden: stale", ["stale"]],
  ["onHold", "On hold", ["onHold"]],
  ["retired", "Retired", ["retired"]],
] as const satisfies readonly (readonly [string, string, readonly SchemeBadge[]])[];

export function matchesStatus(badge: SchemeBadge, filter: string): boolean {
  const found = STATUS_FILTERS.find(([key]) => key === filter);
  return !found || (found[2] as readonly SchemeBadge[]).includes(badge);
}
