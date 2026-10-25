import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Repositories take the database as an argument so tests can run them on PGlite.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
