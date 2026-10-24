import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "../../db/schema";
import { rules, scholarships, snapshots } from "../../db/schema";
import { buildSnapshot, type Snapshot } from "../rules/snapshot";
import { publishProblems, type SchemeDraft } from "./scheme-input";

// Registry reads and writes. Takes the database as an argument so tests can run it on PGlite.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type SchemeRow = typeof scholarships.$inferSelect;
export type RuleRow = typeof rules.$inferSelect;

export async function listSchemes(db: Db) {
  const rows = await db
    .select({
      scheme: scholarships,
      ruleCount: sql<number>`count(${rules.id})::int`,
      quotedCount: sql<number>`count(${rules.id}) filter (where btrim(${rules.quote}) <> '' and btrim(${rules.sourceUrl}) <> '')::int`,
    })
    .from(scholarships)
    .leftJoin(rules, eq(rules.scholarshipId, scholarships.id))
    .groupBy(scholarships.id)
    .orderBy(asc(scholarships.provider), asc(scholarships.stateCode), asc(scholarships.name));
  return rows;
}

export async function getScheme(db: Db, id: number) {
  const [scheme] = await db.select().from(scholarships).where(eq(scholarships.id, id));
  if (!scheme) return null;
  const schemeRules = await db
    .select()
    .from(rules)
    .where(eq(rules.scholarshipId, id))
    .orderBy(asc(rules.group), asc(rules.id));
  return { scheme, rules: schemeRules };
}

function schemeValues(d: SchemeDraft) {
  return {
    trackerId: d.trackerId,
    slug: d.slug,
    name: d.name,
    provider: d.provider,
    stateCode: d.stateCode,
    source: d.source,
    appliesVia: d.appliesVia,
    sourceFormat: d.sourceFormat,
    officialUrl: d.officialUrl,
    amountText: d.amountText,
    benefitTypes: d.benefitTypes,
    documents: d.documents,
    cannotCombineWith: d.cannotCombineWith,
    opensOn: d.opensOn,
    deadline: d.deadline,
  };
}

// Saves the scheme facts and replaces its rules. A published scheme stays published, and the
// database refuses the save if that would leave it with an unquoted rule.
export async function saveScheme(db: Db, draft: SchemeDraft, id?: number): Promise<number> {
  return db.transaction(async (tx) => {
    let schemeId = id;
    if (schemeId === undefined) {
      const [row] = await tx.insert(scholarships).values(schemeValues(draft)).returning({ id: scholarships.id });
      schemeId = row.id;
    } else {
      const updated = await tx
        .update(scholarships)
        .set({ ...schemeValues(draft), updatedAt: new Date() })
        .where(eq(scholarships.id, schemeId))
        .returning({ id: scholarships.id });
      if (updated.length === 0) throw new Error(`Scheme ${schemeId} not found`);
      await tx.delete(rules).where(eq(rules.scholarshipId, schemeId));
    }
    if (draft.rules.length > 0) {
      await tx.insert(rules).values(
        draft.rules.map((r) => ({
          scholarshipId: schemeId!,
          group: r.group,
          field: r.field,
          op: r.op,
          value: r.value,
          quote: r.quote.trim(),
          sourceUrl: r.sourceUrl.trim(),
          ambiguous: r.ambiguous,
        })),
      );
    }
    return schemeId;
  });
}

export class PublishError extends Error {
  constructor(public problems: string[]) {
    super(problems.join("; "));
  }
}

function snapshotRule(r: RuleRow) {
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

// "Mark verified and publish": stamps today as last verified and writes a new snapshot.
export async function publishScheme(db: Db, id: number, createdBy: string, now: Date): Promise<Snapshot> {
  return db.transaction(async (tx) => {
    const found = await getScheme(tx as unknown as Db, id);
    if (!found) throw new PublishError([`Scheme ${id} not found`]);
    const problems = publishProblems({
      officialUrl: found.scheme.officialUrl,
      rules: found.rules.map((r) => snapshotRule(r) as SchemeDraft["rules"][number]),
    });
    if (problems.length > 0) throw new PublishError(problems);
    await tx
      .update(scholarships)
      .set({ status: "PUBLISHED", lastVerifiedAt: now, updatedAt: now })
      .where(eq(scholarships.id, id));
    return writeSnapshot(tx as unknown as Db, createdBy, now);
  });
}

// Takes a scheme out of results (on hold or retired) and republishes the snapshot without it.
export async function withdrawScheme(
  db: Db,
  id: number,
  status: "ON_HOLD" | "RETIRED" | "DRAFT",
  createdBy: string,
  now: Date,
): Promise<Snapshot> {
  return db.transaction(async (tx) => {
    await tx.update(scholarships).set({ status, updatedAt: now }).where(eq(scholarships.id, id));
    return writeSnapshot(tx as unknown as Db, createdBy, now);
  });
}

export async function latestSnapshot(db: Db): Promise<Snapshot | null> {
  const [row] = await db.select({ payload: snapshots.payload }).from(snapshots).orderBy(desc(snapshots.version)).limit(1);
  return (row?.payload as Snapshot | undefined) ?? null;
}
