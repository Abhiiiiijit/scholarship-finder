import { sql } from "drizzle-orm";
import {
  bigserial,
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  interval,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { OPERATORS } from "../lib/rules/schema";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const PROVIDERS = ["CENTRAL", "AICTE", "STATE", "PRIVATE"] as const;
export const STATUSES = ["DRAFT", "PUBLISHED", "ON_HOLD"] as const;

export const scholarships = pgTable(
  "scholarships",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    provider: text().notNull(),
    // Two-letter state or UT code; null for central, AICTE and private schemes.
    stateCode: text(),
    officialUrl: text().notNull(),
    amountText: text(),
    deadline: date(),
    status: text().notNull().default("DRAFT"),
    // Results hide anything not verified in the last 90 days.
    lastVerifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("scholarships_provider_check", sql`${t.provider} IN (${inList(PROVIDERS)})`),
    check("scholarships_status_check", sql`${t.status} IN (${inList(STATUSES)})`),
    index("scholarships_state_idx").on(t.stateCode),
  ],
);

export const rules = pgTable(
  "rules",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    scholarshipId: bigint({ mode: "number" })
      .notNull()
      .references(() => scholarships.id, { onDelete: "cascade" }),
    group: integer().notNull(),
    field: text().notNull(),
    op: text().notNull(),
    value: jsonb().notNull(),
    // Empty while drafting; the editor refuses to publish until every rule has both.
    quote: text().notNull().default(""),
    sourceUrl: text().notNull().default(""),
    // Sources disagree: students see "confirm on the official site" for this rule.
    ambiguous: boolean().notNull().default(false),
  },
  (t) => [
    check("rules_op_check", sql`${t.op} IN (${inList(OPERATORS)})`),
    index("rules_scholarship_idx").on(t.scholarshipId),
  ],
);

// PRD section 4, step 1.
export const sources = pgTable(
  "sources",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    scholarshipId: bigint({ mode: "number" }).references(() => scholarships.id, {
      onDelete: "set null",
    }),
    url: text().notNull(),
    kind: text(),
    tier: integer(),
    checkEvery: interval(),
    lastHash: text(),
    lastFetched: timestamp({ withTimezone: true }),
    etag: text(),
  },
  (t) => [check("sources_kind_check", sql`${t.kind} IN ('HTML', 'PDF')`)],
);
