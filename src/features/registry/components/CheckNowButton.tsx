"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { runSourceCheckAction, type CheckResult } from "@/features/registry/actions/source-actions";

// A04: runs the source check now and reloads the status below it.
export function CheckNowButton({ schemeId, label }: { schemeId?: number; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckResult | null>(null);
  const [failed, setFailed] = useState(false);

  const run = () =>
    startTransition(async () => {
      setResult(null);
      setFailed(false);
      try {
        setResult(await runSourceCheckAction(schemeId));
        router.refresh();
      } catch {
        setFailed(true);
      }
    });

  const compact = schemeId !== undefined;
  return (
    <div className={`flex flex-col gap-2 ${compact ? "items-start" : ""}`}>
      <Button variant={compact ? "secondary" : "primary"} onClick={run} disabled={pending} className={compact ? "min-h-9 px-3 text-sm" : ""}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={pending ? "animate-spin" : ""}>
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />
        </svg>
        {pending ? "Checking…" : label}
      </Button>
      {!compact && pending && <p className="text-[13px] text-slate">Reading every official page. This can take a few minutes.</p>}
      {failed && <Alert tone="warning" title="The check did not finish. Try again in a minute." />}
      {result && !compact && (
        <Alert tone="success" title={`Read ${result.pagesRead} of ${result.pagesTotal} pages.`}>
          {summaryLine(result)}
        </Alert>
      )}
      {result && compact && <span className="text-[13px] text-slate">{summaryLine(result)}</span>}
    </div>
  );
}

function summaryLine(r: CheckResult): string {
  const parts = [
    r.refreshed && `${r.refreshed} re-verified`,
    r.deadlines && `${r.deadlines} deadline${r.deadlines === 1 ? "" : "s"} moved`,
    r.flagged && `${r.flagged} rule${r.flagged === 1 ? "" : "s"} now "confirm"`,
    r.unflagged && `${r.unflagged} back to normal`,
  ].filter(Boolean);
  const changes = parts.length ? parts.join(", ") : "No changes";
  return `${changes}.${r.snapshotVersion ? ` Students get rules version ${r.snapshotVersion}.` : ""}`;
}
