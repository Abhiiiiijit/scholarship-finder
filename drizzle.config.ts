import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./src/server/db/url";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: databaseUrl },
});
