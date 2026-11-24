import Link from "next/link";
import { daysAgo, formatDate } from "@/lib/format";
import type { recentRuns, sourceStatus } from "@/server/repositories/source-repo";
import type { WatchSummary } from "@/server/services/source-watch";
import { CheckNowButton } from "@/features/registry/components/CheckNowButton";
import { fieldLabel } from "@/features/registry/lib/options";

type Status = Awaited<ReturnType<typeof sourceStatus>>[number];
type Run = Awaited<ReturnType<typeof recentRuns>>[number];
type Health = "ok" | "missing" | "unreadable" | "unchecked";

const HEALTH: Record<Health, { label: string; tone: string }> = {
  ok: { label: "Up to date", tone: "bg-pass-tint text-pass" },
  missing: { label: "Quote gone: students see “confirm”", tone: "bg-warn-tint text-warn" },
  unreadable: { label: "Site can’t be read", tone: "bg-info-tint text-info" },
  unchecked: { label: "Not checked yet", tone: "bg-line-soft text-muted" },
};

// Indian time, since the daily check runs at 6 AM IST.
const when = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function health(s: Status): Health {
  if (s.rules.some((r) => r.quoteMissingSince)) return "missing";
  if (s.sources.length === 0 || s.sources.some((x) => !x.lastFetched)) return "unchecked";
  if (s.sources.some((x) => x.lastStatus !== "ok")) return "unreadable";
  return "ok";
}

const lastChecked = (s: Status) =>
  s.sources.reduce<Date | null>((a, x) => (x.lastFetched && (!a || x.lastFetched > a) ? x.lastFetched : a), null);

// A04 Source check: what the daily check (and "Check now") did, and where each live scheme stands.
export function SourceCheckView({ schemes, runs }: { schemes: Status[]; runs: Run[] }) {
  const now = new Date();
  const last = runs[0];
  const counts = (h: Health) => schemes.filter((s) => health(s) === h).length;
  const names = new Map(schemes.map((s) => [s.scheme.id, s.scheme.name]));
  // What needs a look comes first; up-to-date schemes sink to the end.
  const order: Health[] = ["missing", "unreadable", "unchecked", "ok"];
  const sorted = [...schemes].sort((a, b) => order.indexOf(health(a)) - order.indexOf(health(b)));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-[28px] leading-[34px] font-bold">Source check</h1>
          <p className="text-sm text-slate">
            Every morning at 6 AM IST Paatra reads the official page behind each live scheme. Unchanged schemes are
            re-verified, a later “last date to apply” moves the deadline, and a rule whose quote has gone from the page
            shows students “confirm on the official site”.
          </p>
          <p className="text-sm">
            {last ? (
              <>
                Last check: <b>{when(last.startedAt)}</b> ({last.trigger === "admin" ? `Check now by ${last.triggeredBy}` : "daily"}
                {last.scholarshipId ? `, ${names.get(last.scholarshipId) ?? "one scheme"}` : ""})
              </>
            ) : (
              "No check has run yet."
            )}
          </p>
        </div>
        <CheckNowButton label="Check all now" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(Object.keys(HEALTH) as Health[]).map((h) => (
          <div key={h} className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-4 py-3.5">
            <span className="text-[13px] text-slate">{HEALTH[h].label}</span>
            <b className="text-2xl leading-7">{counts(h)}</b>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold">Recent checks</h2>
      <ul className="flex flex-col gap-2">
        {runs.map((run, i) => {
          const s = run.summary as WatchSummary;
          const read = s.pages.filter((p) => p.status === "ok").length;
          const unread = s.pages.filter((p) => p.status !== "ok");
          return (
            <li key={run.id} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-5">
              <details open={i === 0}>
                <summary className="cursor-pointer">
                  <b>{when(run.startedAt)}</b>
                  <span className="text-slate">
                    {" "}
                    · {run.trigger === "admin" ? `Check now by ${run.triggeredBy}` : "Daily"}
                    {run.scholarshipId ? ` · ${names.get(run.scholarshipId) ?? "one scheme"}` : ""} · read {read} of {s.pages.length} pages ·{" "}
                    {s.refreshed.length} re-verified · {s.deadlines.length} deadlines · {s.flagged.length} flagged
                    {run.snapshotVersion ? ` · rules v${run.snapshotVersion}` : ""}
                  </span>
                </summary>
                <div className="mt-2 flex flex-col gap-1.5 text-[13px]">
                  {s.refreshed.length > 0 && <p className="text-slate">Re-verified: {s.refreshed.length} schemes</p>}
                  {s.deadlines.map((d) => (
                    <p key={d.slug}>
                      Deadline moved, {d.name}: {formatDate(d.from)} → {formatDate(d.to)}
                    </p>
                  ))}
                  {s.flagged.map((f) => (
                    <p key={f.ruleId} className="text-warn">
                      Quote gone, {f.name}: {fieldLabel(f.field)}
                    </p>
                  ))}
                  {s.unflagged.map((f) => (
                    <p key={f.ruleId} className="text-pass">
                      Quote back, {f.name}: {fieldLabel(f.field)}
                    </p>
                  ))}
                  {unread.map((p) => (
                    <p key={p.url} className="break-all text-slate">
                      Not read: {p.url} ({p.reason})
                    </p>
                  ))}
                  {s.deadlines.length + s.flagged.length + s.unflagged.length + unread.length === 0 && (
                    <p className="text-slate">Nothing changed and every page was read.</p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
        {runs.length === 0 && <li className="text-sm text-slate">No checks yet. Use “Check all now” or wait for 6 AM IST.</li>}
      </ul>
      <h2 className="text-lg font-bold">Live schemes</h2>
      <ul className="grid gap-2.5 md:grid-cols-2">
        {sorted.map((s) => {
          const h = health(s);
          const read = s.sources.filter((x) => x.lastStatus === "ok").length;
          const missing = s.rules.filter((r) => r.quoteMissingSince);
          const found = s.rules.filter((r) => r.quoteFoundAt && !r.quoteMissingSince).length;
          const problems = s.sources.filter((x) => x.lastStatus && x.lastStatus !== "ok");
          const checked = lastChecked(s);
          return (
            <li key={s.scheme.id} className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface px-4 py-3.5 text-sm leading-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/admin/schemes/${s.scheme.id}`} className="font-semibold text-navy hover:text-ink">
                  {s.scheme.trackerId && <span className="mr-2 font-mono text-slate">{s.scheme.trackerId}</span>}
                  {s.scheme.name}
                </Link>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${HEALTH[h].tone}`}>{HEALTH[h].label}</span>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
                <div>
                  <dt className="text-slate">Checked</dt>
                  <dd>{checked ? when(checked) : "never"}</dd>
                </div>
                <div>
                  <dt className="text-slate">Pages read</dt>
                  <dd className="font-mono">
                    {read} / {s.sources.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate">Quotes found</dt>
                  <dd className="font-mono">
                    {found} / {s.rules.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate">Verified</dt>
                  <dd>{daysAgo(s.scheme.lastVerifiedAt, now)}</dd>
                </div>
              </dl>
              {missing.length > 0 && (
                <ul className="text-[13px] text-warn">
                  {missing.map((r) => (
                    <li key={r.id}>
                      {fieldLabel(r.field)}: quote gone since {when(r.quoteMissingSince!)}
                    </li>
                  ))}
                </ul>
              )}
              {problems.length > 0 && (
                <ul className="text-[13px] text-slate">
                  {problems.map((x) => (
                    <li key={x.id} className="break-all">
                      <a href={x.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {new URL(x.url).hostname}
                      </a>
                      : {x.lastError}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] text-slate">Deadline {formatDate(s.scheme.deadline)}</span>
                <CheckNowButton schemeId={s.scheme.id} label="Check now" />
              </div>
            </li>
          );
        })}
        {schemes.length === 0 && (
          <li className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-sm text-slate">No live schemes yet.</li>
        )}
      </ul>

    </>
  );
}
