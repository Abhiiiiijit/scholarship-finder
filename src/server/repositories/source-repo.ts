import "server-only";
import { and, desc, eq, inArray, notInArray, type SQL } from "drizzle-orm";
import { rules, scholarships, sourceRuns, sources } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

// Queries for the daily source check. The decisions live in src/domain/sources/decide.ts.

export type SourceRow = typeof sources.$inferSelect;
export type SourceRunRow = typeof sourceRuns.$inferSelect;

// Published schemes, or only the given ones (the admin's "Check now" on one scheme).
const publishedWhere = (schemeIds?: number[]): SQL | undefined =>
  schemeIds ? and(eq(scholarships.status, "PUBLISHED"), inArray(scholarships.id, schemeIds)) : eq(scholarships.status, "PUBLISHED");

// The URLs the check will read: every published scheme's official page and rule sources. Read-only.
export async function watchedUrls(db: Db, schemeIds?: number[]): Promise<string[]> {
  const published = await db
    .select({ id: scholarships.id, officialUrl: scholarships.officialUrl })
    .from(scholarships)
    .where(publishedWhere(schemeIds));
  const ids = published.map((s) => s.id);
  const ruleUrls = ids.length
    ? await db.select({ url: rules.sourceUrl }).from(rules).where(inArray(rules.scholarshipId, ids))
    : [];
  return [...new Set([...published.map((s) => s.officialUrl), ...ruleUrls.map((r) => r.url)].filter((u) => u.trim() !== ""))];
}

// Every published scheme's official URL and rule source URLs get a row; rows for URLs a scheme no
// longer uses are removed. Returns the published schemes with their rules and sources.
export async function syncSources(db: Db, schemeIds?: number[]) {
  const published = await db.select().from(scholarships).where(publishedWhere(schemeIds));
  const ids = published.map((s) => s.id);
  const allRules = ids.length ? await db.select().from(rules).where(inArray(rules.scholarshipId, ids)) : [];

  const result = [];
  for (const scheme of published) {
    const schemeRules = allRules.filter((r) => r.scholarshipId === scheme.id);
    const urls = [...new Set([scheme.officialUrl, ...schemeRules.map((r) => r.sourceUrl)].filter((u) => u.trim() !== ""))];
    await db.delete(sources).where(and(eq(sources.scholarshipId, scheme.id), notInArray(sources.url, urls)));
    await db
      .insert(sources)
      .values(urls.map((url) => ({ scholarshipId: scheme.id, url, kind: /\.pdf($|\?)/i.test(url) ? "PDF" : "HTML" })))
      .onConflictDoNothing({ target: [sources.scholarshipId, sources.url] });
    const schemeSources = await db.select().from(sources).where(eq(sources.scholarshipId, scheme.id));
    result.push({ scheme, rules: schemeRules, sources: schemeSources });
  }
  return result;
}

// A person has just verified the scheme: its pages as they are now become the new baseline, and
// any "quote missing" flag is cleared until the next check looks again.
export async function resetWatchState(db: Db, schemeId: number) {
  await db.update(sources).set({ baselineHash: null }).where(eq(sources.scholarshipId, schemeId));
  await db.update(rules).set({ quoteFoundAt: null, quoteMissingSince: null }).where(eq(rules.scholarshipId, schemeId));
}

export async function insertRun(db: Db, run: typeof sourceRuns.$inferInsert) {
  await db.insert(sourceRuns).values(run);
}

export async function recentRuns(db: Db, limit = 10): Promise<SourceRunRow[]> {
  return db.select().from(sourceRuns).orderBy(desc(sourceRuns.startedAt), desc(sourceRuns.id)).limit(limit);
}

// Per published scheme: its sources' last check and its rules' quote state, for the A04 screen.
export async function sourceStatus(db: Db) {
  const published = await db
    .select({
      id: scholarships.id,
      trackerId: scholarships.trackerId,
      name: scholarships.name,
      lastVerifiedAt: scholarships.lastVerifiedAt,
      deadline: scholarships.deadline,
    })
    .from(scholarships)
    .where(eq(scholarships.status, "PUBLISHED"))
    .orderBy(scholarships.trackerId, scholarships.name);
  const ids = published.map((s) => s.id);
  if (ids.length === 0) return [];
  const allSources = await db.select().from(sources).where(inArray(sources.scholarshipId, ids));
  const allRules = await db
    .select({
      id: rules.id,
      scholarshipId: rules.scholarshipId,
      field: rules.field,
      sourceUrl: rules.sourceUrl,
      quoteFoundAt: rules.quoteFoundAt,
      quoteMissingSince: rules.quoteMissingSince,
    })
    .from(rules)
    .where(inArray(rules.scholarshipId, ids));
  return published.map((scheme) => ({
    scheme,
    sources: allSources.filter((s) => s.scholarshipId === scheme.id),
    rules: allRules.filter((r) => r.scholarshipId === scheme.id),
  }));
}
