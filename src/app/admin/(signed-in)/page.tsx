import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
import { ChipLink } from "@/components/Chip";
import { StatusBadge } from "@/components/StatusBadge";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { daysAgo, formatDate, todayInIndia } from "@/lib/format";
import { NEEDS_ATTENTION, schemeBadge } from "@/lib/registry/status";
import { listSchemes } from "@/lib/registry/store";
import { STATE_BY_CODE } from "@/lib/states";
import { StateFilter } from "./StateFilter";

export const metadata = { title: "Registry · Scholarship Finder admin" };

const KINDS = [
  ["", "All"],
  ["central", "Central"],
  ["aicte", "AICTE"],
  ["state", "State"],
  ["private", "Private"],
  ["attention", "Needs attention"],
] as const;

export default async function Registry({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const { kind = "", state = "" } = (await searchParams) as { kind?: string; state?: string };
  const now = new Date();
  const today = todayInIndia(now);

  const all = (await listSchemes(db)).map((r) => ({ ...r, badge: schemeBadge(r.scheme, today, now) }));
  const rows = all.filter(({ scheme, badge }) => {
    if (state && scheme.stateCode !== state) return false;
    if (kind === "attention") return NEEDS_ATTENTION.includes(badge);
    return !kind || scheme.provider === kind.toUpperCase();
  });
  const count = (b: string) => all.filter((r) => r.badge === b).length;
  const href = (k: string) => `/admin?${new URLSearchParams({ ...(k && { kind: k }), ...(state && { state }) })}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[28px] leading-[34px] font-bold">Registry</h1>
          <p className="text-sm text-slate">
            Only Live schemes reach students. A scheme goes Live when every rule has a quote and you mark it verified.
          </p>
        </div>
        <ButtonLink href="/admin/schemes/new">Add scheme</ButtonLink>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
        <Tile label="Entered" value={all.length} />
        <Tile label="Live" value={count("live") + count("recheck")} tone="text-pass" />
        <Tile label="Re-check due (deadline in 30 days)" value={count("recheck")} tone="text-info" />
        <Tile label="Hidden: not verified in 90 days" value={count("stale")} tone="text-warn" />
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => (
          <ChipLink key={k} label={label} selected={kind === k} href={href(k)} />
        ))}
        <Suspense>
          <StateFilter value={state} />
        </Suspense>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[880px] border-collapse text-sm leading-5">
          <thead>
            <tr className="text-left text-xs tracking-[0.04em] text-slate">
              {["SCHEME", "SOURCE", "RULES QUOTED", "LAST VERIFIED", "DEADLINE", "STATUS"].map((h) => (
                <th key={h} className="border-b border-line px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ scheme, ruleCount, quotedCount, badge }) => (
              <tr key={scheme.id} className="border-b border-line-soft last:border-0">
                <td className="px-4 py-3.5">
                  <Link href={`/admin/schemes/${scheme.id}`} className="font-semibold text-navy hover:text-ink">
                    {scheme.trackerId && <span className="mr-2 font-mono text-slate">{scheme.trackerId}</span>}
                    {scheme.name}
                  </Link>
                </td>
                <td className="px-4 py-3.5">{scheme.source ?? sourceFallback(scheme.provider, scheme.stateCode)}</td>
                <td className={`px-4 py-3.5 font-mono ${quotedCount < ruleCount || ruleCount === 0 ? "font-semibold text-warn" : ""}`}>
                  {quotedCount} / {ruleCount}
                </td>
                <td className={`px-4 py-3.5 ${badge === "stale" ? "font-semibold text-warn" : ""}`}>
                  {daysAgo(scheme.lastVerifiedAt, now)}
                </td>
                <td className="px-4 py-3.5">{formatDate(scheme.deadline)}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={badge} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate">
                  {all.length === 0 ? "No schemes yet. Add the first one." : "No schemes match these filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] leading-[18px] text-slate">
        Weekly: open each Live scheme&apos;s official page. Unchanged, publish it again to re-verify. Changed, edit the
        rules, then publish.
      </p>
    </>
  );
}

function Tile({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-white px-4 py-3.5">
      <span className="text-[13px] text-slate">{label}</span>
      <b className={`text-2xl leading-7 ${tone}`}>{value}</b>
    </div>
  );
}

function sourceFallback(provider: string, stateCode: string | null) {
  if (provider === "STATE" && stateCode) return `State: ${STATE_BY_CODE.get(stateCode)?.name ?? stateCode}`;
  return provider.charAt(0) + provider.slice(1).toLowerCase();
}
