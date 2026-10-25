import "server-only";
import { z } from "zod";
import { LOCAL_DATABASE_URL } from "./db/url";

// Server settings, checked once. A deployed app with no DATABASE_URL is a setup mistake, so it
// fails here with a clear message instead of quietly trying the local Docker database.
// `next build` imports this too and never connects, so the build may run without it.
const building = process.env.NEXT_PHASE === "phase-production-build";
const deployed = process.env.NODE_ENV === "production" && !building;

const envSchema = z.object({
  DATABASE_URL: deployed
    ? z.string({ error: "DATABASE_URL is not set. Add the Neon pooled connection string." }).startsWith("postgres")
    : z.string().startsWith("postgres").default(LOCAL_DATABASE_URL),
});

export const env = envSchema.parse(process.env);
