import type { SchemeMatch } from "@/domain/match";
import type { SnapshotScheme } from "@/domain/rules/snapshot";
import { formatDate } from "@/lib/format";
import { deadlineLine, type Results } from "./results";
import type { T } from "./i18n";

// "Send to family" (UX review issue 5): a plain-text summary built on the phone, for the parent who
// pays the fees and collects the papers but is not on this phone. It names schemes, amounts,
// deadlines and documents only, never the student's answers, and nothing goes to our server: the
// student chooses where to send it (rule 2).

export interface ShareContext {
  locale: string;
  today: string;
  // Absolute site address with the language prefix, e.g. "https://…/hi". Scheme links hang off it.
  base: string;
}

const schemeUrl = (c: ShareContext, s: SnapshotScheme) => `${c.base}/scheme/${s.slug}`;

function block(t: T, c: ShareContext, s: SnapshotScheme): string {
  return [
    `• ${s.name}`,
    s.amountText ? `  ${t("share.amount", { amount: s.amountText })}` : undefined,
    `  ${deadlineLine(t, c.locale, s, c.today).text}`,
    `  ${schemeUrl(c, s)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Documents asked for by more schemes come first; ties keep the order they first appeared in.
function documentsOf(schemes: SnapshotScheme[]): string[] {
  const seen = new Map<string, number>();
  for (const s of schemes) for (const d of s.documents ?? []) seen.set(d, (seen.get(d) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
}

export function resultsMessage(t: T, c: ShareContext, r: Results): string {
  const of = (status: SchemeMatch["status"]) => r.results.filter((m) => m.status === status).map((m) => m.scheme);
  const eligible = of("eligible");
  const check = [...of("needsInfo"), ...of("nearMiss")];
  const docs = documentsOf(eligible);

  const parts = [t("share.intro")];
  if (eligible.length > 0) {
    parts.push(`${t("share.canApply", { count: eligible.length })}\n${eligible.map((s) => block(t, c, s)).join("\n")}`);
  } else {
    parts.push(t("share.noneYet"));
  }
  if (check.length > 0) parts.push(`${t("share.toCheck", { count: check.length })}\n${check.map((s) => `• ${s.name}`).join("\n")}`);
  if (docs.length > 0) parts.push(`${t("share.documents")}\n${docs.map((d) => `• ${d}`).join("\n")}`);
  parts.push(t("share.footer"));
  return parts.join("\n\n");
}

export function schemeMessage(t: T, c: ShareContext, s: SnapshotScheme, missing: string[]): string {
  const parts = [
    s.name,
    [
      s.amountText ? t("share.amount", { amount: s.amountText }) : undefined,
      s.deadline ? t("share.deadline", { date: formatDate(s.deadline, c.locale) }) : t("results.noDeadline"),
    ]
      .filter(Boolean)
      .join("\n"),
  ];
  if (missing.length > 0) parts.push(`${t("share.stillNeed")}\n${missing.map((d) => `• ${d}`).join("\n")}`);
  parts.push(`${t("share.rulesAt")}\n${schemeUrl(c, s)}`);
  return parts.join("\n\n");
}
