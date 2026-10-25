import { schemeDraftSchema, type SchemeDraft } from "@/domain/registry/scheme-input";
import { PHASE0_VERIFIED_ON, type SeedScheme } from "./phase0";

// Loads the Phase 0 schemes as drafts. Each scheme is one INSERT that does nothing if its tracker
// id or slug is already in the registry, so the seed can run again without touching anything an
// admin has since edited or published. Plain SQL, so the same statements run through the app's
// database client or can be pasted into a SQL console.

const QUOTED = /["“”]/;

export function seedNotes(s: SeedScheme, draft: SchemeDraft): string {
  const notes = [...s.gaps];
  draft.rules.forEach((r, i) => {
    const label = `Rule ${i + 1} (${r.field})`;
    if (!r.quote.trim()) notes.push(`${label} needs a quote.`);
    else if (!QUOTED.test(r.quote)) notes.push(`${label} is a summary: paste the exact wording.`);
  });
  if (draft.rules.length === 0) notes.push("No rules yet.");
  return notes.join("\n");
}

const text = (v: string | null | undefined) => (v == null ? "NULL" : `'${v.replaceAll("'", "''")}'`);
const json = (v: unknown) => `${text(JSON.stringify(v))}::jsonb`;

export function seedStatement(s: SeedScheme, verifiedOn = PHASE0_VERIFIED_ON): string {
  const d = schemeDraftSchema.parse(s);
  const verifiedAt = `${verifiedOn}T12:00:00+05:30`;
  const scheme = [
    ["tracker_id", text(d.trackerId)],
    ["slug", text(d.slug)],
    ["name", text(d.name)],
    ["provider", text(d.provider)],
    ["source", text(d.source)],
    ["applies_via", text(d.appliesVia)],
    ["source_format", text(d.sourceFormat)],
    ["state_code", text(d.stateCode)],
    ["official_url", text(d.officialUrl)],
    ["amount_text", text(d.amountText)],
    ["benefit_types", json(d.benefitTypes)],
    ["documents", json(d.documents)],
    ["cannot_combine_with", json(d.cannotCombineWith)],
    ["review_notes", text(seedNotes(s, d))],
    ["opens_on", d.opensOn ? `${text(d.opensOn)}::date` : "NULL"],
    ["deadline", d.deadline ? `${text(d.deadline)}::date` : "NULL"],
    ["status", "'DRAFT'"],
    ["last_verified_at", `${text(verifiedAt)}::timestamptz`],
  ];
  const insert = `INSERT INTO scholarships (${scheme.map(([c]) => c).join(", ")}) VALUES (${scheme.map(([, v]) => v).join(", ")}) ON CONFLICT DO NOTHING RETURNING id`;
  if (d.rules.length === 0) return insert;
  const rows = d.rules.map(
    (r) => `(${r.group}, ${text(r.field)}::rule_field, ${text(r.op)}::rule_op, ${json(r.value)}, ${text(r.quote.trim())}, ${text(r.sourceUrl.trim())}, ${r.ambiguous})`,
  );
  return `WITH s AS (${insert}) INSERT INTO rules (scholarship_id, "group", field, op, value, quote, source_url, ambiguous) SELECT s.id, r.* FROM s, (VALUES ${rows.join(", ")}) AS r("group", field, op, value, quote, source_url, ambiguous)`;
}

export function seedStatements(schemes: SeedScheme[], verifiedOn = PHASE0_VERIFIED_ON): string[] {
  return schemes.map((s) => seedStatement(s, verifiedOn));
}
