// Loads the Phase 0 schemes into the registry as drafts. Nothing is published.
//
//   npm run db:seed            insert into the database at DATABASE_URL
//   npm run db:seed -- --sql   print the statements instead (for a SQL console)
//
// Schemes whose tracker id or slug is already in the registry are skipped.
import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "../src/db/url";
import { PHASE0_SCHEMES } from "../src/lib/registry/seed/phase0";
import { seedStatement } from "../src/lib/registry/seed";

async function main() {
  if (process.argv.includes("--sql")) {
    for (const s of PHASE0_SCHEMES) console.log(`-- ${s.trackerId}\n${seedStatement(s)};\n`);
    return;
  }
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  let added = 0;
  try {
    for (const s of PHASE0_SCHEMES) {
      const [{ exists }] = await db.execute<{ exists: boolean }>(
        sql`select exists(select 1 from scholarships where tracker_id = ${s.trackerId} or slug = ${s.slug})`,
      );
      if (exists) {
        console.log(`skip ${s.trackerId}: already in the registry`);
        continue;
      }
      await db.execute(sql.raw(seedStatement(s)));
      added++;
      console.log(`added ${s.trackerId} (${s.quality})`);
    }
  } finally {
    await client.end();
  }
  console.log(`${added} of ${PHASE0_SCHEMES.length} schemes added as drafts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
