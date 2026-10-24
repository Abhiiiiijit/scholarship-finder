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

1. **Database.** Sign up at [neon.com](https://neon.com), create a project, and pick the region closest to India (Singapore). On the project dashboard, open **Connect** and copy the **pooled** connection string (its host contains `-pooler`). It looks like `postgresql://user:password@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
2. **Create the tables.** From your laptop, run the migrations against Neon once:
   ```bash
   DATABASE_URL="<neon connection string>" npm run db:migrate
   ```
   Run this again whenever a PR adds a file under `drizzle/`.
3. **App.** Sign in at [vercel.com](https://vercel.com) with GitHub, choose **Add New → Project**, and import `scholarship-finder` (grant Vercel access to the repo if it isn't listed). Vercel detects Next.js; leave the build settings as they are.
4. **Environment variable.** Before the first deploy, under **Environment Variables**, add `DATABASE_URL` with the Neon connection string. Then click **Deploy**.
5. **Done.** You get a `*.vercel.app` link. Every push to `main` redeploys it, and every PR gets its own preview link. To use a subdomain such as `scholarships.abhijitbosedas.com`, add it under **Settings → Domains** and create the CNAME record Vercel shows.

Admin sign-in and email reminders add more environment variables when they are built; they will be listed here then.

### Develop in the browser (GitHub Codespaces)

On the repo page, choose **Code → Codespaces → Create codespace on main**. In its terminal, run `npm install && npm run dev:local`, then open the forwarded port 3000. Codespaces includes Docker, so the local database works there unchanged.

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
src/lib/rules/    rule schema (operators, publish requirements)
drizzle/          generated SQL migrations
```
