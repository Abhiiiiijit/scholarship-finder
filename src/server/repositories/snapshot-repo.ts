import "server-only";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { SchemeDraft } from "@/domain/registry/scheme-input";
import { buildSnapshot, type Snapshot } from "@/domain/rules/snapshot";
import { rules, scholarships, snapshots } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import type { RuleRow } from "@/server/repositories/scheme-repo";

// Snapshots are append-only: every write is a new, higher version and the API serves the highest.

export function snapshotRule(r: RuleRow) {
  return {
    group: r.group,
    field: r.field,
    op: r.op,
    value: r.value,
    quote: r.quote,
    sourceUrl: r.sourceUrl,
    ambiguous: r.ambiguous,
  };
}

// Writes rules-<version>.json from every published scheme verified in the last 90 days.
export async function writeSnapshot(db: Db, createdBy: string, now: Date): Promise<Snapshot> {
  const published = await db.select().from(scholarships).where(eq(scholarships.status, "PUBLISHED"));
  const ids = published.map((s) => s.id);
  const allRules = ids.length
    ? await db.select().from(rules).where(inArray(rules.scholarshipId, ids)).orderBy(asc(rules.group), asc(rules.id))
    : [];
  const [last] = await db.select({ version: snapshots.version }).from(snapshots).orderBy(desc(snapshots.version)).limit(1);
  const version = (last?.version ?? 0) + 1;

  const snapshot = buildSnapshot(
    published.map((s) => ({
      slug: s.slug,
      name: s.name,
      provider: s.provider as SchemeDraft["provider"],
      stateCode: s.stateCode,
      officialUrl: s.officialUrl,
      amountText: s.amountText,
      deadline: s.deadline,
      appliesVia: s.appliesVia,
      benefitTypes: s.benefitTypes,
      documents: s.documents,
      status: s.status,
      lastVerifiedAt: s.lastVerifiedAt,
      rules: allRules.filter((r) => r.scholarshipId === s.id).map(snapshotRule),
    })),
    version,
    now,
  );
  await db.insert(snapshots).values({ version, createdBy, schemeCount: snapshot.schemes.length, payload: snapshot });
  return snapshot;
}

export async function latestSnapshot(db: Db): Promise<Snapshot | null> {
  const [row] = await db.select({ payload: snapshots.payload }).from(snapshots).orderBy(desc(snapshots.version)).limit(1);
  return (row?.payload as Snapshot | undefined) ?? null;
}
