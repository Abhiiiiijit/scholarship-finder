import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

const client = postgres(databaseUrl, { max: 5 });

export const db = drizzle(client, { schema, casing: "snake_case" });
