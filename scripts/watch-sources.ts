// The daily source check: reads every official page behind a published scheme and keeps the
// registry current with no one in the loop (see src/server/services/source-watch.ts).
//
//   npm run sources:check              apply changes to the database at DATABASE_URL
//   npm run sources:check -- --dry-run  read the pages and report, change nothing
//
// Prints a Markdown report; in GitHub Actions it also goes to the job summary.
import "dotenv/config";
import { appendFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import type { Db } from "../src/server/db/types";
import { databaseUrl } from "../src/server/db/url";
import { runWatch, type WatchSummary } from "../src/server/services/source-watch";

function report(s: WatchSummary, now: Date): string {
  const ok = s.pages.filter((p) => p.status === "ok").length;
  const lines = [
    `## Source check ${now.toISOString().slice(0, 10)}${s.dryRun ? " (dry run, nothing saved)" : ""}`,
    "",
    `Read ${ok} of ${s.pages.length} official pages.`,
    `Re-verified ${s.refreshed.length} schemes. Deadlines moved: ${s.deadlines.length}. Rules turned to "confirm": ${s.flagged.length}. Rules back to normal: ${s.unflagged.length}.`,
    s.snapshotVersion ? `New snapshot: v${s.snapshotVersion}.` : "No new snapshot: nothing students see changed.",
  ];
  if (s.deadlines.length) {
    lines.push("", "### Deadlines", ...s.deadlines.map((d) => `- ${d.name}: ${d.from ?? "none"} → ${d.to}`));
  }
  if (s.flagged.length) lines.push("", "### Quote no longer on the page (students now see \"confirm\")", ...s.flagged.map((f) => `- ${f.name}: ${f.field} (rule ${f.ruleId})`));
  if (s.notes.length) lines.push("", "### Notes", ...s.notes.map((n) => `- ${n.slug}: ${n.note}`));
  const unread = s.pages.filter((p) => p.status !== "ok");
  if (unread.length) lines.push("", "### Pages that could not be read", ...unread.map((p) => `- ${p.url}: ${p.reason}`));
  return lines.join("\n") + "\n";
}

async function main() {
  const now = new Date();
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema, casing: "snake_case" }) as unknown as Db;
  try {
    const summary = await runWatch(db, { now, dryRun: process.argv.includes("--dry-run") });
    const text = report(summary, now);
    console.log(text);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
