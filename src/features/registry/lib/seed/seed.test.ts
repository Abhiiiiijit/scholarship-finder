import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import { schemeDraftSchema } from "@/domain/registry/scheme-input";
import type { Db } from "@/server/db/types";
import { getScheme, listSchemes } from "@/server/repositories/scheme-repo";
import { seedNotes, seedStatement, seedStatements } from ".";
import { PHASE0_SCHEMES } from "./phase0";

const ids = PHASE0_SCHEMES.map((s) => s.trackerId);

describe("Phase 0 seed data", () => {
  it("holds the 29 verified and 18 partly quoted schemes, and none of the unopened or dropped ones", () => {
    expect(PHASE0_SCHEMES.filter((s) => s.quality === "verified")).toHaveLength(29);
    expect(PHASE0_SCHEMES.filter((s) => s.quality === "partial")).toHaveLength(18);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(PHASE0_SCHEMES.map((s) => s.slug)).size).toBe(ids.length);
    for (const left of ["C1", "HR2", "P2", "P3", "HP1", "HP2", "DL4", "GA2", "LK1", "SK1", "SK2", "BR2", "OD1", "OD2", "OD3", "KA1", "TN1", "TN2"]) {
      expect(ids).not.toContain(left);
    }
  });

  it("passes the editor's draft checks", () => {
    for (const s of PHASE0_SCHEMES) {
      const parsed = schemeDraftSchema.safeParse(s);
      expect(parsed.error?.issues ?? [], s.trackerId).toEqual([]);
    }
  });

  it("links every rule to an official page", () => {
    for (const s of PHASE0_SCHEMES) for (const r of s.rules) expect(r.sourceUrl, s.trackerId).toMatch(/^https:\/\//);
  });

  it("notes rules that are summaries or have no quote yet", () => {
    const m2 = PHASE0_SCHEMES.find((s) => s.trackerId === "M2")!;
    const notes = seedNotes(m2, schemeDraftSchema.parse(m2));
    expect(notes).toContain("Rule 4 (MH.cap_admission) is a summary: paste the exact wording.");
    expect(notes).toContain("Rule 6 (MH.stay) needs a quote.");
    expect(notes).not.toContain("Rule 1 (domicile_state)");
  });
});

describe("seeding the registry", () => {
  let db: Db;

  beforeEach(async () => {
    const pg = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
    await migrate(pg, { migrationsFolder: "drizzle" });
    db = pg as unknown as Db;
  });

  const run = async () => {
    for (const stmt of seedStatements(PHASE0_SCHEMES)) await db.execute(sql.raw(stmt));
  };

  it("adds every scheme as a draft with its rules, quotes and last-verified date", async () => {
    await run();
    const rows = await listSchemes(db);
    expect(rows).toHaveLength(PHASE0_SCHEMES.length);
    expect(rows.every((r) => r.scheme.status === "DRAFT")).toBe(true);
    expect(rows.every((r) => r.scheme.lastVerifiedAt?.toISOString() === "2026-10-24T06:30:00.000Z")).toBe(true);
    expect(rows.every((r) => r.scheme.reviewNotes)).toBe(true);
    for (const s of PHASE0_SCHEMES) {
      const row = rows.find((r) => r.scheme.trackerId === s.trackerId)!;
      expect(row.ruleCount, s.trackerId).toBe(s.rules.length);
    }

    const m1 = rows.find((r) => r.scheme.trackerId === "M1")!;
    const { scheme, rules } = (await getScheme(db, m1.scheme.id))!;
    expect(scheme).toMatchObject({ stateCode: "MH", source: "State: MH (MahaDBT)", cannotCombineWith: [] });
    expect(rules.map((r) => [r.field, r.op, r.value])).toEqual([
      ["domicile_state", "EQ", "MH"],
      ["family_income", "LTE", 800000],
      ["MH.cap_admission", "IS_TRUE", true],
      ["institution_type", "IN", ["govt", "aided", "unaided", "central"]],
    ]);
    expect(rules[1].quote).toBe("\"The Total Annual Income of Family / Guardian should not be more than 8 Lakhs.\"");
  });

  it("leaves existing schemes alone when run again", async () => {
    await run();
    const m1 = (await listSchemes(db)).find((r) => r.scheme.trackerId === "M1")!;
    await db.execute(sql`update scholarships set name = 'Edited by admin' where id = ${m1.scheme.id}`);
    await run();
    const rows = await listSchemes(db);
    expect(rows).toHaveLength(PHASE0_SCHEMES.length);
    expect(rows.find((r) => r.scheme.id === m1.scheme.id)!.scheme.name).toBe("Edited by admin");
    expect(rows.find((r) => r.scheme.id === m1.scheme.id)!.ruleCount).toBe(4);
  });

  it("escapes quotes inside rule text", () => {
    expect(seedStatement(PHASE0_SCHEMES.find((s) => s.trackerId === "M14")!)).toContain("won''t get benefit");
  });
});
