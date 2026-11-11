import { z } from "zod";
import { publishableRuleSchema } from "./schema";

// Results hide anything not verified in the last 90 days (PRD section 6).
export const FRESH_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const isoDate = z.iso.date();

export const snapshotSchemeSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  provider: z.enum(["CENTRAL", "AICTE", "STATE", "PRIVATE"]),
  stateCode: z.string().nullable(),
  officialUrl: z.url(),
  amountText: z.string().nullable(),
  deadline: isoDate.nullable(),
  lastVerifiedAt: z.iso.datetime({ offset: true }),
  rules: z.array(publishableRuleSchema).min(1),
  // For the scheme page (S08). Optional so snapshots published before they were added still load.
  appliesVia: z.string().nullable().optional(),
  benefitTypes: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
  // For families comparing schemes (UX review issues 3 and 10): a rough yearly amount, this
  // cycle's opening date, and the months applications usually run when dates aren't out yet.
  yearlyAmount: z.number().int().positive().nullable().optional(),
  opensOn: isoDate.nullable().optional(),
  usualWindow: z.object({ from: z.number().int().min(1).max(12), to: z.number().int().min(1).max(12) }).nullable().optional(),
});

// Bumped when a snapshot may hold something an older page cannot read safely. A page that meets a
// newer one refuses it (S09, retry) instead of guessing. Snapshots before version 2 carry none.
// 2: course scope fields (course_level, stream, course_tag) and the B.E./B.Tech default.
export const SNAPSHOT_SCHEMA_VERSION = 2;

// The published file students download: rules-<version>.json.
export const snapshotSchema = z.object({
  version: z.number().int().positive(),
  schemaVersion: z.number().int().positive().max(SNAPSHOT_SCHEMA_VERSION).optional(),
  generatedAt: z.iso.datetime({ offset: true }),
  schemes: z.array(snapshotSchemeSchema),
});

export type SnapshotScheme = z.infer<typeof snapshotSchemeSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;

export function isFresh(lastVerifiedAt: string | Date | null, now: Date): boolean {
  if (!lastVerifiedAt) return false;
  return now.getTime() - new Date(lastVerifiedAt).getTime() <= FRESH_DAYS * DAY_MS;
}

export interface SnapshotInput extends Omit<SnapshotScheme, "lastVerifiedAt" | "rules"> {
  status: string;
  lastVerifiedAt: Date | null;
  rules: unknown[];
}

// Applies the freshness filter once, at publish, and refuses any rule without a quote and link.
export function buildSnapshot(schemes: SnapshotInput[], version: number, now: Date): Snapshot {
  return snapshotSchema.parse({
    version,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    schemes: schemes
      .filter((s) => s.status === "PUBLISHED" && isFresh(s.lastVerifiedAt, now))
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        provider: s.provider,
        stateCode: s.stateCode,
        officialUrl: s.officialUrl,
        amountText: s.amountText,
        deadline: s.deadline,
        lastVerifiedAt: s.lastVerifiedAt!.toISOString(),
        rules: s.rules,
        appliesVia: s.appliesVia ?? null,
        benefitTypes: s.benefitTypes ?? [],
        documents: s.documents ?? [],
        yearlyAmount: s.yearlyAmount ?? null,
        opensOn: s.opensOn ?? null,
        usualWindow: s.usualWindow ?? null,
      })),
  });
}
