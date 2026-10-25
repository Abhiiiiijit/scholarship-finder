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
});

// The published file students download: rules-<version>.json.
export const snapshotSchema = z.object({
  version: z.number().int().positive(),
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
      })),
  });
}
