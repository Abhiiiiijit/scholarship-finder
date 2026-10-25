// The docker-compose database, so `npm run dev:local`, drizzle-kit and the seed script work without
// a .env file. The app itself reads DATABASE_URL through src/server/env.ts.
export const LOCAL_DATABASE_URL = "postgres://scholarship:scholarship@localhost:5432/scholarship";

export const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
