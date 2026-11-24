import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { rules, scholarships, sources } from "@/server/db/schema";
import { schemeDraftSchema } from "@/domain/registry/scheme-input";
import type { PageResult } from "@/domain/sources/decide";
import type { Db } from "@/server/db/types";
import { saveScheme } from "@/server/repositories/scheme-repo";
import { latestSnapshot } from "@/server/repositories/snapshot-repo";
import { pageResult } from "./page-fetch";
import { publishScheme } from "./publish-service";
import { runWatch } from "./source-watch";

const url = "https://mahadbt.maharashtra.gov.in/SchemeData/M1";
const published = new Date("2026-10-01T12:00:00Z");
const day = (n: number) => new Date(published.getTime() + n * 86_400_000);
const PAGE = "Candidate should be Domicile of Maharashtra State. The Total Annual Income of Family / Guardian should not be more than 8 Lakhs. ".repeat(3);

let db: Db;
let id: number;

const pages = (text: string | PageResult) => async () => (typeof text === "string" ? pageResult(text) : text);
const ruleRows = () => db.select().from(rules).where(eq(rules.scholarshipId, id)).orderBy(rules.id);
const schemeRow = async () => (await db.select().from(scholarships).where(eq(scholarships.id, id)))[0];

beforeEach(async () => {
  const pg = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
  id = await saveScheme(
    db,
    schemeDraftSchema.parse({
      slug: "mh-ebc", name: "EBC", provider: "STATE", stateCode: "MH", officialUrl: url, deadline: "2026-11-30",
      rules: [
        { group: 1, field: "domicile_state", op: "EQ", value: "MH", quote: '"Candidate should be Domicile of Maharashtra State."', sourceUrl: url },
        { group: 2, field: "family_income", op: "LTE", value: 800000, quote: '"should not be more than 8 Lakhs"', sourceUrl: url },
      ],
    }),
  );
  await publishScheme(db, id, "Abhiiiiijit", published);
});

describe("runWatch", () => {
  it("re-verifies a scheme whose page still carries its quotes", async () => {
    const s = await runWatch(db, { now: day(10), read: pages(PAGE) });
    expect(s.refreshed).toEqual(["mh-ebc"]);
    expect((await schemeRow()).lastVerifiedAt).toEqual(day(10));
    expect((await ruleRows()).every((r) => r.quoteFoundAt?.getTime() === day(10).getTime())).toBe(true);
    expect((await latestSnapshot(db))?.version).toBe(s.snapshotVersion);
    expect(await db.select().from(sources)).toHaveLength(1);
  });

  it("turns a rule whose quote vanished into 'confirm' for students, and back when it returns", async () => {
    await runWatch(db, { now: day(10), read: pages(PAGE) });
    const changed = PAGE.replaceAll("8 Lakhs", "6 Lakhs");
    const s = await runWatch(db, { now: day(11), read: pages(changed) });
    expect(s.flagged).toHaveLength(1);
    expect(s.refreshed).toEqual([]);
    const snap = await latestSnapshot(db);
    expect(snap!.schemes[0].rules.map((r) => r.ambiguous)).toEqual([false, true]);

    const back = await runWatch(db, { now: day(20), read: pages(PAGE) });
    expect(back.unflagged).toHaveLength(1);
    expect((await latestSnapshot(db))!.schemes[0].rules.every((r) => !r.ambiguous)).toBe(true);
  });

  it("moves the deadline to a later last date on the official page", async () => {
    const s = await runWatch(db, { now: day(10), read: pages(`${PAGE} Last date to apply online extended to 31-12-2026.`) });
    expect(s.deadlines).toEqual([{ slug: "mh-ebc", from: "2026-11-30", to: "2026-12-31" }]);
    expect((await latestSnapshot(db))!.schemes[0].deadline).toBe("2026-12-31");
  });

  it("leaves everything as it was when the site blocks scripts", async () => {
    const s = await runWatch(db, { now: day(10), read: pages({ status: "blocked", reason: "refuses automated reads (403)" }) });
    expect(s.snapshotVersion).toBeNull();
    expect((await schemeRow()).lastVerifiedAt).toEqual(published);
    expect((await db.select().from(sources))[0].lastStatus).toBe("blocked");
  });

  it("saves nothing on a dry run", async () => {
    const before = await latestSnapshot(db);
    const s = await runWatch(db, { now: day(10), read: pages(PAGE), dryRun: true });
    expect(s.refreshed).toEqual(["mh-ebc"]);
    expect((await latestSnapshot(db))?.version).toBe(before?.version);
    expect(await db.select().from(sources)).toHaveLength(0);
  });

  it("starts over when a person publishes again", async () => {
    await runWatch(db, { now: day(10), read: pages(PAGE) });
    await runWatch(db, { now: day(11), read: pages(PAGE.replaceAll("8 Lakhs", "6 Lakhs")) });
    await publishScheme(db, id, "Abhiiiiijit", day(12));
    expect((await ruleRows()).every((r) => r.quoteMissingSince === null && r.quoteFoundAt === null)).toBe(true);
    expect((await db.select().from(sources))[0].baselineHash).toBeNull();
  });
});
