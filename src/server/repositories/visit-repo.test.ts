import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import type { Db } from "@/server/db/types";
import { addVisit, visitCount } from "./visit-repo";

let db: Db;
const now = new Date("2026-11-26T12:00:00+05:30");

beforeEach(async () => {
  const pg = drizzle({ client: new PGlite(), schema, casing: "snake_case" });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
});

describe("visit counters", () => {
  it("starts at zero and counts each site on its own", async () => {
    expect(await visitCount(db, "paatra")).toBe(0);
    expect(await addVisit(db, "paatra", now)).toBe(1);
    expect(await addVisit(db, "paatra", now)).toBe(2);
    expect(await addVisit(db, "portfolio", now)).toBe(1);
    expect(await visitCount(db, "paatra")).toBe(2);
  });

  it("refuses a site that is not on the list", async () => {
    await expect(db.execute(sql`INSERT INTO visit_counts (site, count) VALUES ('spam', 1)`)).rejects.toThrow();
  });
});
