# Scholarship Finder

Find the scholarships an Indian B.E./B.Tech student qualifies for, with the official rule quoted for every result.

The MVP covers 16 states and UTs and about 65 hand-verified schemes (central, AICTE, state and private). Every rule in the registry carries a verbatim quote and a link to the official page, and anything not re-verified in 90 days is hidden from results.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Database | PostgreSQL (Docker locally, Neon in production), Drizzle ORM |
| Rules | Zod schemas in `src/lib/rules`, shared by the admin editor and the matcher |
| Tests | Vitest |
| Hosting | Vercel |

Matching will run in the student's browser against a published rules snapshot, so answers stay on the phone unless the student asks for email reminders.

## Run locally

Requires Node.js 22+ and Docker.

```bash
npm install
npm run dev:local   # starts Postgres, applies migrations, runs the app at http://localhost:3000
```

No `.env` is needed for local work: the app falls back to the Docker database. To point at Neon instead, copy `.env.example` to `.env` and paste the Neon connection string.

## Admin sign-in

`/admin` is behind GitHub sign-in (Auth.js) and only lets in the logins in `ADMIN_GITHUB_LOGINS` (default `Abhiiiiijit`).

1. Create a GitHub OAuth app (Settings → Developer settings → OAuth Apps) with callback URL `http://localhost:3000/api/auth/callback/github`.
2. Put its client ID and secret in `.env` as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`, and add `AUTH_SECRET` from `npx auth secret`.

On Vercel, set the same three variables and add the production callback URL to the OAuth app. Never commit `.env`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev:local` | Postgres up, migrations, dev server |
| `npm test` | Unit tests |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:down` | Stop Postgres (data is kept in a Docker volume) |

## Layout

```
src/app/          pages and route handlers
src/db/           Drizzle schema and client
src/lib/rules/    rule schema (operators, publish requirements), rule fields, published snapshot
src/lib/match.ts  match(): eligible / near-miss / needs-info, runs in the browser
src/lib/profile.ts  the student's answers
drizzle/          generated SQL migrations
```
