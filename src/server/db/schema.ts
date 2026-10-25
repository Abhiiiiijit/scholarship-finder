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
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { RULE_FIELD_KEYS } from "../../domain/rules/fields";
import { OPERATORS } from "../../domain/rules/schema";

const inList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

export const PROVIDERS = ["CENTRAL", "AICTE", "STATE", "PRIVATE"] as const;
export const STATUSES = ["DRAFT", "PUBLISHED", "ON_HOLD", "RETIRED"] as const;
export const SOURCE_FORMATS = ["HTML", "PDF"] as const;

// Rule fields and operators are Postgres enums, so the database refuses a key the app doesn't know.
// Labels for people live in src/lib/registry/options.ts (fieldLabel, OPERATOR_LABELS, valueLabel).
export const ruleField = pgEnum("rule_field", RULE_FIELD_KEYS);
export const ruleOp = pgEnum("rule_op", OPERATORS);

export const scholarships = pgTable(
  "scholarships",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    slug: text().notNull().unique(),
    // Row id in the PRD's Phase 0 tracker (C1, M4, P2 ...).
    trackerId: text().unique(),
    name: text().notNull(),
    provider: text().notNull(),
    // Where the rules come from, e.g. "Central: NSP" or "State: MH (MahaDBT)".
    source: text(),
    appliesVia: text(),
    sourceFormat: text(),
    // Two-letter state or UT code; null for central, AICTE and private schemes.
    stateCode: text(),
    officialUrl: text().notNull(),
    amountText: text(),
    benefitTypes: jsonb().$type<string[]>().notNull().default([]),
    documents: jsonb().$type<string[]>().notNull().default([]),
    // Tracker ids of schemes this one cannot be combined with.
    cannotCombineWith: jsonb().$type<string[]>().notNull().default([]),
    // What still needs checking before publishing: gaps in the source, rules the matcher can't check.
    reviewNotes: text(),
    opensOn: date(),
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
    check("scholarships_source_format_check", sql`${t.sourceFormat} IN (${inList(SOURCE_FORMATS)})`),
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
    field: ruleField().notNull(),
    op: ruleOp().notNull(),
    value: jsonb().notNull(),
    // Empty while drafting; the editor refuses to publish until every rule has both.
    quote: text().notNull().default(""),
    sourceUrl: text().notNull().default(""),
    // Sources disagree: students see "confirm on the official site" for this rule.
    ambiguous: boolean().notNull().default(false),
  },
  (t) => [
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

// Each publish writes the whole student-facing registry as one versioned file: rules-<version>.json.
export const snapshots = pgTable("snapshots", {
  version: bigserial({ mode: "number" }).primaryKey(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdBy: text().notNull(),
  schemeCount: integer().notNull(),
  payload: jsonb().notNull(),
});
