import "server-only";
import { eq, sql } from "drizzle-orm";
import type { VisitSite } from "@/domain/visits";
import { visitCounts } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

export async function visitCount(db: Db, site: VisitSite): Promise<number> {
  const [row] = await db.select({ count: visitCounts.count }).from(visitCounts).where(eq(visitCounts.site, site));
  return row?.count ?? 0;
}

// One atomic upsert, so two phones arriving together both count.
export async function addVisit(db: Db, site: VisitSite, now: Date): Promise<number> {
  const [row] = await db
    .insert(visitCounts)
    .values({ site, count: 1, updatedAt: now })
    .onConflictDoUpdate({ target: visitCounts.site, set: { count: sql`${visitCounts.count} + 1`, updatedAt: now } })
    .returning({ count: visitCounts.count });
  return row.count;
}
