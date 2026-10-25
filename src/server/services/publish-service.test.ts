import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { rules, scholarships } from "@/server/db/schema";
import { exampleStudent, TODAY } from "@/lib/fixtures/section5";
import { matchAll } from "@/domain/match";
import { schemeDraftSchema, type SchemeDraftInput } from "@/domain/registry/scheme-input";
import type { Db } from "@/server/db/types";
import { getScheme, listSchemes, saveScheme } from "@/server/repositories/scheme-repo";
import { latestSnapshot } from "@/server/repositories/snapshot-repo";
import { publishScheme, PublishError, withdrawScheme } from "./publish-service";

const mahadbt = "https://mahadbt.maharashtra.gov.in/";
const now = new Date("2026-10-24T12:00:00+05:30");

const draft = (over: Partial<SchemeDraftInput> = {}) =>
  schemeDraftSchema.parse({
    trackerId: "M1",
    slug: "mh-rajarshi-shahu-ebc",
    name: "Rajarshi Shahu Maharaj fee scheme (EBC)",
    provider: "STATE",
    stateCode: "MH",
    source: "State: MH (MahaDBT)",
    appliesVia: "State portal",
    sourceFormat: "HTML",
    officialUrl: mahadbt,
    amountText: "Tuition reimbursement",
    documents: ["Income certificate (revenue officer)"],
    deadline: "2027-03-31",
    rules: [
      { group: 1, field: "domicile_state", op: "EQ", value: "MH", quote: "Maharashtra domicile", sourceUrl: mahadbt },
      { group: 2, field: "family_income", op: "LTE", value: 800000, quote: "Income up to ₹8 lakh", sourceUrl: mahadbt },
    ],
    ...over,
  });

let db: Db;

beforeEach(async () => {
  const pg = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
});

describe("registry store", () => {
  it("saves a draft with unquoted rules and lists its quote count", async () => {
    const id = await saveScheme(
      db,
      draft({ rules: [{ group: 1, field: "family_income", op: "LTE", value: 800000 }, ...draft().rules] }),
    );
    const [row] = await listSchemes(db);
    expect(row.scheme.id).toBe(id);
    expect(row.scheme.status).toBe("DRAFT");
    expect([row.quotedCount, row.ruleCount]).toEqual([2, 3]);
  });

  it("replaces the rules on save", async () => {
    const id = await saveScheme(db, draft());
    await saveScheme(db, draft({ rules: draft().rules.slice(0, 1) }), id);
    expect((await getScheme(db, id))!.rules.map((r) => r.field)).toEqual(["domicile_state"]);
  });

  it("refuses to publish while a rule has no quote", async () => {
    const id = await saveScheme(db, draft({ rules: [{ group: 1, field: "family_income", op: "LTE", value: 800000 }] }));
    await expect(publishScheme(db, id, "Abhiiiiijit", now)).rejects.toBeInstanceOf(PublishError);
    expect((await getScheme(db, id))!.scheme.status).toBe("DRAFT");
    expect(await latestSnapshot(db)).toBeNull();
  });

  it("publishes, stamps last verified and writes a snapshot the matcher can read", async () => {
    const id = await saveScheme(db, draft());
    const snap = await publishScheme(db, id, "Abhiiiiijit", now);
    expect(snap.version).toBe(1);
    const { scheme } = (await getScheme(db, id))!;
    expect(scheme.status).toBe("PUBLISHED");
    expect(scheme.lastVerifiedAt?.toISOString()).toBe(now.toISOString());
    const latest = await latestSnapshot(db);
    expect(latest?.schemes.map((s) => s.slug)).toEqual(["mh-rajarshi-shahu-ebc"]);
    const { results } = matchAll(exampleStudent, latest!, TODAY, now);
    expect(results[0]).toMatchObject({ status: "nearMiss", failed: { rule: { field: "family_income" } } });
  });

  it("drops a withdrawn scheme from the next snapshot", async () => {
    const id = await saveScheme(db, draft());
    await publishScheme(db, id, "Abhiiiiijit", now);
    const snap = await withdrawScheme(db, id, "ON_HOLD", "Abhiiiiijit", now);
    expect(snap.version).toBe(2);
    expect(snap.schemes).toEqual([]);
  });
});

describe("database publish gate", () => {
  it("refuses an unquoted rule on a published scheme even if the editor is bypassed", async () => {
    const id = await saveScheme(db, draft());
    await publishScheme(db, id, "Abhiiiiijit", now);
    await expect(
      db.insert(rules).values({ scholarshipId: id, group: 3, field: "gender", op: "EQ", value: "female" }),
    ).rejects.toThrow();
    await expect(saveScheme(db, draft({ rules: [{ group: 1, field: "gender", op: "EQ", value: "female" }] }), id)).rejects.toThrow();
  });

  it("refuses to flip a scheme with an unquoted rule to published", async () => {
    const id = await saveScheme(db, draft({ rules: [{ group: 1, field: "gender", op: "EQ", value: "female" }] }));
    await expect(db.update(scholarships).set({ status: "PUBLISHED" }).where(eq(scholarships.id, id))).rejects.toThrow();
  });
});

describe("rule field and operator enums", () => {
  it("refuses a field or operator the app doesn't know, and accepts a state's own key", async () => {
    const id = await saveScheme(db, draft());
    const insert = (field: string, op: string) =>
      db.execute(sql`insert into rules (scholarship_id, "group", field, op, value) values (${id}, 3, ${field}, ${op}, '"yes"')`);
    await expect(insert("hostel_type", "EQ")).rejects.toThrow();
    await expect(insert("gender", "NOT_EQ")).rejects.toThrow();
    await expect(insert("MH.cap_admission", "EQ")).resolves.toBeDefined();
  });
});
