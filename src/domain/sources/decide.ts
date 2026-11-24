import { isFresh } from "@/domain/rules/snapshot";
import { findDeadline } from "./deadline";
import { quoteOnPage } from "./page-text";

// What the daily source check does to one scheme, decided from what its official pages say today.
// No person reviews these changes (Abhijit's call, 2026-11-24), so every step only ever:
//   - re-verifies a scheme when the machine can show its pages still say what was verified,
//   - turns a rule whose quote has vanished into "confirm on the official site" (never a plain fail
//     or pass on old wording),
//   - moves the deadline only to one clear, later "last date" on the official page.

// Re-verify at most weekly, so an unchanged registry does not write a new snapshot every day.
export const REFRESH_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PageResult =
  | { status: "ok"; hash: string; text: string; normalized: string }
  | { status: "blocked" | "error"; reason: string };

export interface WatchedSource {
  id: number;
  url: string;
  baselineHash: string | null;
}

export interface WatchedRule {
  id: number;
  sourceUrl: string;
  quote: string;
  quoteFoundAt: Date | null;
  quoteMissingSince: Date | null;
}

export interface WatchedScheme {
  officialUrl: string;
  lastVerifiedAt: Date | null;
  deadline: string | null;
}

export interface RuleChange {
  id: number;
  quoteFoundAt: Date | null;
  quoteMissingSince: Date | null;
}

export interface SchemeDecision {
  rules: RuleChange[];
  baselines: { sourceId: number; baselineHash: string }[];
  refresh: boolean;
  deadline: string | null;
  // One line each, for the run summary.
  notes: string[];
}

export function decideScheme(
  scheme: WatchedScheme,
  sources: WatchedSource[],
  rules: WatchedRule[],
  pages: ReadonlyMap<string, PageResult>,
  now: Date,
): SchemeDecision {
  const today = now.toISOString().slice(0, 10);
  const notes: string[] = [];
  const ruleChanges: RuleChange[] = [];
  const vouched = new Set<string>();
  let missing = 0;

  for (const r of rules) {
    const page = pages.get(r.sourceUrl);
    if (page?.status !== "ok") {
      if (r.quoteMissingSince) missing++;
      continue;
    }
    const onPage = quoteOnPage(r.quote, page.normalized);
    if (onPage === true) {
      vouched.add(r.sourceUrl);
      ruleChanges.push({ id: r.id, quoteFoundAt: now, quoteMissingSince: null });
      if (r.quoteMissingSince) notes.push(`rule ${r.id}: quote is back on the page`);
    } else if (onPage === false && r.quoteFoundAt) {
      // Seen before and gone now: the rule may have changed.
      missing++;
      if (!r.quoteMissingSince) {
        ruleChanges.push({ id: r.id, quoteFoundAt: r.quoteFoundAt, quoteMissingSince: now });
        notes.push(`rule ${r.id}: quote no longer on ${r.sourceUrl}`);
      }
    }
    // Never seen (a summary, or text the page renders differently): the check can't vouch for it
    // either way, so it is left alone.
  }

  // A page with no checkable quote is trusted only while it is exactly the page a person verified.
  const baselines: SchemeDecision["baselines"] = [];
  const freshNow = isFresh(scheme.lastVerifiedAt, now);
  for (const s of sources) {
    const page = pages.get(s.url);
    if (page?.status !== "ok") continue;
    if (s.baselineHash === null) {
      if (freshNow) {
        baselines.push({ sourceId: s.id, baselineHash: page.hash });
        vouched.add(s.url);
      }
    } else if (s.baselineHash === page.hash) {
      vouched.add(s.url);
    }
  }

  const unreadable = sources.filter((s) => pages.get(s.url)?.status !== "ok");
  for (const s of unreadable) {
    const page = pages.get(s.url);
    notes.push(`${s.url}: ${page && page.status !== "ok" ? page.reason : "not checked"}`);
  }
  const unvouched = sources.filter((s) => !vouched.has(s.url));
  const due = !scheme.lastVerifiedAt || now.getTime() - scheme.lastVerifiedAt.getTime() >= REFRESH_AFTER_DAYS * DAY_MS;
  const refresh = due && sources.length > 0 && unreadable.length === 0 && unvouched.length === 0 && missing === 0;
  if (due && !refresh && unreadable.length === 0 && missing === 0 && unvouched.length > 0) {
    notes.push(`changed since last verified, no quote to confirm it: ${unvouched.map((s) => s.url).join(", ")}`);
  }

  let deadline: string | null = null;
  const official = pages.get(scheme.officialUrl);
  if (official?.status === "ok") {
    const found = findDeadline(official.text, today);
    if (found && (scheme.deadline === null || found > scheme.deadline)) {
      deadline = found;
      notes.push(`deadline ${scheme.deadline ?? "none"} → ${found}`);
    }
  }

  return { rules: ruleChanges, baselines, refresh, deadline, notes };
}
