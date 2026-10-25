import type { MatchStatus } from "@/domain/match";
import { BADGE_LABELS, type SchemeBadge } from "@/lib/registry/status";

export type BadgeStatus = Exclude<MatchStatus, "notEligible"> | SchemeBadge | "notEligible";

const TONES: Record<BadgeStatus, [string, string]> = {
  eligible: ["bg-pass-tint text-pass", "Eligible to apply"],
  nearMiss: ["bg-warn-tint text-warn", "Near miss"],
  needsInfo: ["bg-info-tint text-info", "Needs info"],
  notEligible: ["bg-line-soft text-muted", "Not eligible"],
  live: ["bg-pass-tint text-pass", BADGE_LABELS.live],
  draft: ["bg-line-soft text-muted", BADGE_LABELS.draft],
  recheck: ["bg-info-tint text-info", BADGE_LABELS.recheck],
  stale: ["bg-warn-tint text-warn", BADGE_LABELS.stale],
  closed: ["bg-line-soft text-muted", BADGE_LABELS.closed],
  onHold: ["bg-warn-tint text-warn", BADGE_LABELS.onHold],
  retired: ["bg-line-soft text-muted", BADGE_LABELS.retired],
};

export function StatusBadge({ status, label }: { status: BadgeStatus; label?: string }) {
  const [tone, text] = TONES[status];
  return (
    <span className={`inline-block whitespace-nowrap rounded-md px-2 py-1 text-xs leading-4 font-semibold ${tone}`}>
      {label ?? text}
    </span>
  );
}
