---
name: release-checklist
description: Checklist for shipping a Paatra change safely, from PR to live (CI, migrations on Neon, Vercel deploy, publishing schemes, smoke test). Use before opening or merging a PR, applying a migration, publishing schemes to students, or when asked to release or deploy.
---

# Release checklist

`main` deploys to production on Vercel on every push. Students and their scholarship decisions depend on what is live, so go through this every time.

## Before opening a PR

- [ ] One focused change, branched from the latest `main`. Never stack a PR on another PR's branch.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass locally (CI runs the same four).
- [ ] Matcher, snapshot or publish-gate changes come with tests; the section 5 worked example passes unchanged.
- [ ] Schema change? `npm run db:generate` ran and the new `drizzle/` file is committed. Applied migrations are never edited.
- [ ] No rule without a quote and link. No paraphrased quotes. None of the three publish gates weakened.
- [ ] Student answers still never leave the phone: no new endpoint receives a profile, no analytics on answers.
- [ ] No email capture or stored emails (future scope).
- [ ] Every new admin page and server action calls `requireAdmin()`.
- [ ] No secrets in the diff (`.env` stays local; `.env.example` gets placeholders only).
- [ ] Student-facing copy is plain, short and uses the name Paatra.
- [ ] PR description says what changed, how it was tested, and whether it needs a migration or a republish.

## Merging and deploying (owner's call)

The owner (Abhijit) merges. After merge:

1. **Migration first.** If the PR added a `drizzle/` file, apply it to live Neon with the unpooled URL before using the new schema:
   ```bash
   DATABASE_URL="<DATABASE_URL_UNPOOLED>" npm run db:migrate
   ```
   Do this only with the owner's explicit go-ahead.
2. **Deploy.** Vercel builds `main` automatically. Check the deployment is Ready in Vercel.
3. **Environment variables.** New variables go in Vercel → Settings → Environment Variables for the right environments, then redeploy.

## Publishing schemes to students (owner's call)

- [ ] Every rule's quote matches the official page today, with the right `sourceUrl`.
- [ ] Review notes ("Gaps to close") are resolved or the gaps are marked `ambiguous`.
- [ ] Deadline and amount are current.
- [ ] Publish through the editor's **Mark verified and publish**, which checks the URL, refuses unquoted rules and writes a new snapshot. Avoid hand-written SQL publishes; if one is unavoidable, the snapshot must match `buildSnapshot()` exactly.
- [ ] Schemes published before the snapshot gained `appliesVia`, `benefitTypes` and `documents` show them only after a republish.

## Smoke test on the live site

- [ ] https://scholarship-finder-umber-phi.vercel.app loads; `/api/rules/latest` returns the new snapshot version.
- [ ] Walk the PRD section 5 student (Maharashtra, ₹9 L income, B.Tech 1st year, Class 12 88.9%) through to results and a scheme page.
- [ ] A student from a non-live state sees the "not covered yet" note and the central, AICTE and private schemes.
- [ ] `/admin` signs in with GitHub and the registry lists schemes.

## Afterwards

- Update the PRD's Task checklist tab and roadmap if a task moved.
- If something broke: revert the PR on `main` (Vercel redeploys), or roll back in Vercel → Deployments → Promote a previous deployment. A bad scheme can be put `ON_HOLD` from the editor, which republishes the snapshot without it.
