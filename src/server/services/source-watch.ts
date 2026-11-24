import "server-only";
import { eq } from "drizzle-orm";
import { decideScheme, type PageResult } from "@/domain/sources/decide";
import { rules, scholarships, sources } from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { syncSources, watchedUrls } from "@/server/repositories/source-repo";
import { writeSnapshot } from "@/server/repositories/snapshot-repo";
import { fetchPage } from "./page-fetch";

// The daily source check (scripts/watch-sources.ts, run by .github/workflows/watch-sources.yml).
// Reads every official page behind a published scheme and applies what decideScheme() allows, with
// no person in the loop: re-verify, flag a vanished quote as "confirm", move a deadline. Writes one
// new snapshot when anything students see has changed.

export const WATCHER = "source-check";

export interface WatchSummary {
  pages: { url: string; status: PageResult["status"]; reason?: string }[];
  refreshed: string[];
  deadlines: { slug: string; from: string | null; to: string }[];
  flagged: string[];
  unflagged: string[];
  notes: { slug: string; note: string }[];
  snapshotVersion: number | null;
  dryRun: boolean;
}

class DryRun extends Error {}

export async function runWatch(
  db: Db,
  opts: { now: Date; dryRun?: boolean; read?: (url: string) => Promise<PageResult>; concurrency?: number },
): Promise<WatchSummary> {
  const { now, dryRun = false, read = (url: string) => fetchPage(url), concurrency = 4 } = opts;

  // Fetch first, outside the transaction: government sites can take a while.
  const urls = await watchedUrls(db);
  const pages = new Map<string, PageResult>();
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let url = queue.shift(); url !== undefined; url = queue.shift()) pages.set(url, await read(url));
    }),
  );

  const summary: WatchSummary = {
    pages: urls.map((url) => {
      const p = pages.get(url)!;
      return p.status === "ok" ? { url, status: p.status } : { url, status: p.status, reason: p.reason };
    }),
    refreshed: [],
    deadlines: [],
    flagged: [],
    unflagged: [],
    notes: [],
    snapshotVersion: null,
    dryRun,
  };

  try {
    await db.transaction(async (txn) => {
      const tx = txn as unknown as Db;
      let studentsSeeChange = false;
      for (const { scheme, rules: schemeRules, sources: schemeSources } of await syncSources(tx)) {
        const decision = decideScheme(
          { officialUrl: scheme.officialUrl, lastVerifiedAt: scheme.lastVerifiedAt, deadline: scheme.deadline },
          schemeSources,
          schemeRules,
          pages,
          now,
        );
        for (const note of decision.notes) summary.notes.push({ slug: scheme.slug, note });

        for (const change of decision.rules) {
          const before = schemeRules.find((r) => r.id === change.id)!;
          if (!before.quoteMissingSince && change.quoteMissingSince) {
            summary.flagged.push(`${scheme.slug} rule ${change.id}`);
            studentsSeeChange = true;
          }
          if (before.quoteMissingSince && !change.quoteMissingSince) {
            summary.unflagged.push(`${scheme.slug} rule ${change.id}`);
            studentsSeeChange = true;
          }
          await tx
            .update(rules)
            .set({ quoteFoundAt: change.quoteFoundAt, quoteMissingSince: change.quoteMissingSince })
            .where(eq(rules.id, change.id));
        }

        for (const b of decision.baselines) {
          await tx.update(sources).set({ baselineHash: b.baselineHash }).where(eq(sources.id, b.sourceId));
        }

        for (const s of schemeSources) {
          const page = pages.get(s.url);
          if (!page) continue;
          await tx
            .update(sources)
            .set(
              page.status === "ok"
                ? {
                    lastStatus: "ok",
                    lastError: null,
                    lastFetched: now,
                    lastHash: page.hash,
                    ...(s.lastHash !== null && s.lastHash !== page.hash ? { lastChangedAt: now } : {}),
                  }
                : { lastStatus: page.status, lastError: page.reason, lastFetched: now },
            )
            .where(eq(sources.id, s.id));
        }

        if (decision.refresh || decision.deadline) {
          await tx
            .update(scholarships)
            .set({
              ...(decision.refresh ? { lastVerifiedAt: now } : {}),
              ...(decision.deadline ? { deadline: decision.deadline } : {}),
              updatedAt: now,
            })
            .where(eq(scholarships.id, scheme.id));
          studentsSeeChange = true;
          if (decision.refresh) summary.refreshed.push(scheme.slug);
          if (decision.deadline) summary.deadlines.push({ slug: scheme.slug, from: scheme.deadline, to: decision.deadline });
        }
      }
      if (studentsSeeChange) summary.snapshotVersion = (await writeSnapshot(tx, WATCHER, now)).version;
      if (dryRun) throw new DryRun();
    });
  } catch (e) {
    if (!(e instanceof DryRun)) throw e;
  }
  return summary;
}
