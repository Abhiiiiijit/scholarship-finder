// Falls back to the docker-compose database so `npm run dev:local` works without a .env file.
export const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://scholarship:scholarship@localhost:5432/scholarship";
