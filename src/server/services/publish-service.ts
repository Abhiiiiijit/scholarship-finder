import "server-only";
import { eq } from "drizzle-orm";
import { publishProblems, type SchemeDraft } from "@/lib/registry/scheme-input";
import type { Snapshot } from "@/lib/rules/snapshot";
import { scholarships } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { getScheme } from "@/server/repositories/scheme-repo";
import { snapshotRule, writeSnapshot } from "@/server/repositories/snapshot-repo";

// Publishing and withdrawing: the quote gate, the verified stamp and a new snapshot, in one transaction.

export class PublishError extends Error {
  constructor(public problems: string[]) {
    super(problems.join("; "));
  }
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

