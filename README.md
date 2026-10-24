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

## Run it online

### Deploy (Vercel + Neon, free tiers)

1. **App.** Sign in at [vercel.com](https://vercel.com) with GitHub, choose **Add New → Project**, and import `scholarship-finder` (grant Vercel access to the repo if it isn't listed). Keep the detected Next.js settings and click **Deploy**. It builds without a database.
2. **Database.** In the Vercel project, open **Storage → Create Database → Neon**, keep the Free plan, pick the Singapore region, and connect it to the project for all environments. Vercel adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` itself.
3. **Redeploy** from **Deployments → ⋯ → Redeploy** so the app picks up the new variables.
4. **Create the tables.** From your laptop, copy `DATABASE_URL_UNPOOLED` from **Settings → Environment Variables** and run the migrations once:
   ```bash
   DATABASE_URL="<DATABASE_URL_UNPOOLED value>" npm run db:migrate
   ```
   Run this again whenever a PR adds a file under `drizzle/`.
5. **Done.** You get a `*.vercel.app` link. Every push to `main` redeploys it, and every PR gets its own preview link. To use a subdomain such as `scholarships.abhijitbosedas.com`, add it under **Settings → Domains** and create the CNAME record Vercel shows.

A separate Neon account works too: create a project at [neon.com](https://neon.com), copy its pooled connection string into a `DATABASE_URL` variable in Vercel, and use the direct (non-pooler) string for migrations.

For admin sign-in, also set `AUTH_SECRET`, `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` (see Admin sign-in below) and add `https://<your domain>/api/auth/callback/github` to the GitHub OAuth app. Email reminders add more variables when they are built.

### Develop in the browser (GitHub Codespaces)

On the repo page, choose **Code → Codespaces → Create codespace on main**. In its terminal, run `npm install && npm run dev:local`, then open the forwarded port 3000. Codespaces includes Docker, so the local database works there unchanged.

## Admin sign-in

`/admin` is behind GitHub sign-in (Auth.js) and only lets in the logins in `ADMIN_GITHUB_LOGINS` (default `Abhiiiiijit`).

1. Create a GitHub OAuth app (Settings → Developer settings → OAuth Apps) with callback URL `http://localhost:3000/api/auth/callback/github`.
2. Put its client ID and secret in `.env` as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`, and add `AUTH_SECRET` from `npx auth secret`.

On Vercel, set the same three variables and add the production callback URL to the OAuth app. Never commit `.env`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev:local` | Postgres up, migrations, dev server |
| `npm test` | Unit tests (registry tests run on an in-memory PGlite database, no Docker needed) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |
| `npm run db:down` | Stop Postgres (data is kept in a Docker volume) |

## Layout

```
src/app/          pages and route handlers (admin registry and editor under /admin, snapshot at /api/rules/latest)
src/components/   shared UI components from the design's component list
src/lib/registry/ scheme editor input, publish checklist, registry reads and writes
src/lib/states.ts the 16 states' portals, category lists and state questions
src/db/           Drizzle schema and client
src/lib/rules/    rule schema (operators, publish requirements), rule fields, published snapshot
src/lib/match.ts  match(): eligible / near-miss / needs-info, runs in the browser
src/lib/profile.ts  the student's answers
drizzle/          generated SQL migrations
```
