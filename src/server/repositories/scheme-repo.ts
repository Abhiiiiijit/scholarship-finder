import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { rules, scholarships } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import type { SchemeDraft } from "@/domain/registry/scheme-input";

// Scheme and rule reads and writes. Business rules (the publish gate) live in publish-service.ts.
export type { Db };

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
    reviewNotes: d.reviewNotes,
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

