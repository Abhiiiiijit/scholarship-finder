import "server-only";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { rules, scholarships, sources } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

// Queries for the daily source check. The decisions live in src/domain/sources/decide.ts.

export type SourceRow = typeof sources.$inferSelect;

// The URLs the check will read: every published scheme's official page and rule sources. Read-only.
export async function watchedUrls(db: Db): Promise<string[]> {
  const published = await db
    .select({ id: scholarships.id, officialUrl: scholarships.officialUrl })
    .from(scholarships)
    .where(eq(scholarships.status, "PUBLISHED"));
  const ids = published.map((s) => s.id);
  const ruleUrls = ids.length
    ? await db.select({ url: rules.sourceUrl }).from(rules).where(inArray(rules.scholarshipId, ids))
    : [];
  return [...new Set([...published.map((s) => s.officialUrl), ...ruleUrls.map((r) => r.url)].filter((u) => u.trim() !== ""))];
}

// Every published scheme's official URL and rule source URLs get a row; rows for URLs a scheme no
// longer uses are removed. Returns the published schemes with their rules and sources.
export async function syncSources(db: Db) {
  const published = await db.select().from(scholarships).where(eq(scholarships.status, "PUBLISHED"));
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
