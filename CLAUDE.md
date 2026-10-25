# CLAUDE.md

Context for AI agents working in this repo. Read this first, then the file you are about to change.

@AGENTS.md

## What this is

**Paatra** (पात्र, "eligible") tells an Indian B.E./B.Tech student which scholarships they qualify for, and shows the official rule, quoted word for word with a link, behind every answer. The repo is still named `scholarship-finder`.

- **Users.** Students on a phone (no account), and one admin (`Abhiiiiijit`) who keeps the scheme registry accurate.
- **Scope (MVP).** B.E./B.Tech only. Students domiciled in 16 live states and UTs: MH, JK, LA, HP, HR, DL, GA, MP, LD, SK, TR, BR, OD, TG, KA, TN (`STATES` in `src/domain/states.ts`). The other 20 are `OTHER_STATES`: they see central, AICTE and private schemes plus a "your state isn't covered yet" note (S04). About 65 hand-verified schemes: central, AICTE, state and private.
- **Live.** Student site https://scholarship-finder-umber-phi.vercel.app, admin at `/admin` (Vercel + Neon, every push to `main` deploys).
- **Product docs.** PRD: https://claude.ai/artifact/UuWcGVMCpGCvRBoVYHSGRi (tabs: main doc, Parameters by state, Phase 0 data plan, Quoted rules, Tech stack, Task checklist). Screen designs and flow: https://claude.ai/artifact/SoXLK4qi2qy9RPzAuigieR. Screen ids (S01–S09 student, A01–A04 admin) in code comments refer to the design.

## Non-negotiable rules

1. **No rule without a quote.** A rule reaches students only with a verbatim `quote` from the official source and a `sourceUrl`. This is enforced three times: `publishableRuleSchema` (`src/domain/rules/schema.ts`), `publishProblems()` on the editor, and a deferred Postgres trigger (`drizzle/0003_publish_gate.sql`). Never weaken any of them, and never paraphrase a quote. A close summary is allowed in a draft only, and `seedNotes()` flags it for replacement.
2. **Student answers never leave the phone.** They live in `localStorage` (`paatra.answers.v1`, document ticks in `paatra.documents.v1`). Matching runs in the browser against the published snapshot. Do not add any API that receives a profile, analytics on answers, or server-side matching for students.
3. **Freshness.** A scheme not re-verified in 90 days (`FRESH_DAYS`) is left out of the snapshot. Unknown is never a fail: a skipped question becomes "needs info", never "not eligible".
4. **Email alerts are future scope.** "Email me when a scheme fits" and deadline reminders were deliberately removed from the MVP (PR #11). Do not add email capture or stored student emails.
5. **Live data changes need the owner's go-ahead.** Publishing, retiring or editing schemes in the live Neon database, running migrations on it, and changing Vercel settings all wait for Abhijit's explicit approval.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 (this Next.js differs from older versions: see `AGENTS.md`) |
| Data | PostgreSQL via Drizzle ORM: Docker locally, Neon in production. PGlite in tests |
| Validation | Zod 4, shared by the editor, the snapshot and the matcher |
| Auth | Auth.js (next-auth v5) with GitHub; only logins in `ADMIN_GITHUB_LOGINS` (default `Abhiiiiijit`) get in |
| Tests | Vitest |
| Hosting | Vercel (Hobby) + Neon (free) |

## How it fits together

```
admin (A02 editor) ──save──▶ Postgres: scholarships, rules (rule_field / rule_op enums)
        │
        └─"Mark verified and publish"─▶ publishScheme(): checks quotes, stamps lastVerifiedAt,
                                         writeSnapshot() → snapshots table (rules-<version>.json)
student phone ──GET /api/rules/latest──▶ latest snapshot (cached)
        └─ match(profile, scheme) in the browser ─▶ eligible / nearMiss / needsInfo / notEligible
```

- **Rules.** Each rule is `{ group, field, op, value, quote, sourceUrl, ambiguous }`. Rules in the same group are OR-ed; groups are AND-ed. Operators: `EQ IN LTE GTE BETWEEN IS_TRUE PERCENTILE_GTE` (percentile is stored but always answers "confirm on the official site", and the editor refuses it).
- **Fields.** `RULE_FIELDS` in `src/domain/rules/fields.ts` is the locked list. Each has a tier: `common` (asked on S02; missing means a question on results), `unlock` (optional; schemes needing it stay hidden behind "answer this to check N more"), `notAsked` (always "confirm on the official site"). State keys look like `MH.cap_admission`, come from each state's `questions` in `src/domain/states.ts`, and behave like `common`.
- **Enums.** `rules.field` and `rules.op` are Postgres enums `rule_field` / `rule_op` built from `RULE_FIELD_KEYS` and `OPERATORS`. Adding a field or a state question changes the enum, so it needs `npm run db:generate` and a migration.
- **Matcher.** `src/domain/match.ts` is pure and shared. `resolveField()` maps a rule field to the profile. A numeric fail within 20% of the limit (`NEAR_MISS_GAP`) is a near-miss. Ambiguous rules, `notAsked` fields and percentile rules make a scheme "confirm", never plain "eligible". State schemes match only the student's own domicile state.
- **Publishing.** `publishScheme()` and `withdrawScheme()` in `src/server/services/publish-service.ts` always write a new full snapshot. Snapshots are append-only; the API serves the highest version.

## Key paths

| Path | What |
| --- | --- |
| `src/app/page.tsx`, `check/basics`, `check/state`, `results`, `scheme/[slug]` | Student routes S01–S09: thin pages that set the title and render a view; `error.tsx`, `not-found.tsx` |
| `src/features/eligibility/` | The student feature. `views/` (client screens), `components/` (widgets, page chrome), `hooks/` (`useAnswers`, `useSnapshot`), `store/` (localStorage: answers, document ticks), `api/` (`snapshot-client.ts`), `lib/` (results, plain-language reasons in `explain.ts`, inline questions, labels). Routes import from its `index.ts` |
| `src/app/admin/` | Admin routes: `login/`, and under `(signed-in)/` the layout, `error.tsx`, A01 registry and A02 editor pages that check `requireAdmin()`, load data and render a view |
| `src/features/registry/` | The admin feature. `views/` (`RegistryView`, `SchemeEditorView`), `components/` (`StateFilter`), `actions/scheme-actions.ts` (server actions: save, publish, withdraw), `lib/` (`options.ts` labels, `seed/phase0.ts` Phase 0 schemes). Routes import from its `index.ts` |
| `src/app/api/rules/latest/route.ts` | Public snapshot endpoint |
| `src/domain/` | Pure TypeScript shared by the browser and the server: no React, Next or database imports (Zod only) |
| `src/domain/rules/` | `schema.ts` (operators, publish requirement), `fields.ts` (field list and tiers), `snapshot.ts` (snapshot schema, 90-day filter) |
| `src/domain/match.ts`, `src/domain/profile.ts` | Matcher and the student profile schema |
| `src/domain/states.ts` | The 16 live states: portal, categories, state questions; `OTHER_STATES` |
| `src/domain/registry/` | `scheme-input.ts` (editor schema, `publishProblems`), `status.ts` (A01 badges) |
| `src/components/ui/` | Shared UI used by both features: `Button`, `Chip`, `Alert`, `StatusBadge`, `RuleRow`, form fields |
| `src/server/` | Server-only code (each file imports `server-only`): `env.ts` (checked settings), `db/` (Drizzle client, `schema.ts`), `repositories/` (`scheme-repo.ts`, `snapshot-repo.ts`: queries only), `services/` (`publish-service.ts`: quote gate + snapshot; `url-check.ts`), `auth/` (Auth.js, allowlist, `requireAdmin()`) |
| `src/lib/fixtures/section5.ts` | PRD section 5 worked example, the matcher's reference test |
| `src/server/db/schema.ts`, `drizzle/` | Drizzle schema and generated SQL migrations (never edit an applied migration) |
| `src/server/auth/`, `src/proxy.ts` | Admin sign-in, allowlist, `requireAdmin()` |
| `public/brand/` | Paatra logos (light/dark), mark, tagline |

## Commands

```bash
npm run dev:local     # Docker Postgres + migrations + dev server on :3000 (no .env needed)
npm test              # Vitest; registry tests run migrations on in-memory PGlite, no Docker
npm run lint
npm run typecheck
npm run build
npm run db:generate   # after editing src/server/db/schema.ts, fields.ts or a state's questions
npm run db:migrate    # apply migrations (DATABASE_URL picks the database)
npm run db:seed       # load Phase 0 schemes as drafts; `-- --sql` prints SQL instead
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, test and build on every PR. Run all four before pushing.

## Conventions

- **Code style.** Short comments that say why, naming the PRD section or screen id when it helps. Match the surrounding file; no new dependencies without a reason.
- **Admin code.** Every admin page and server action calls `requireAdmin()` itself; `proxy.ts` is only the first gate. Server actions also Zod-check every argument: they are public endpoints.
- **Server code.** Only `src/server/` touches the database or secrets, and each file there imports `server-only`. Pages and actions call repositories for reads and `publish-service.ts` for anything with a business rule; they never write queries themselves. Read settings from `src/server/env.ts`, not `process.env`.
- **Labels.** Stored values are snake_case keys; people see labels from `src/features/registry/lib/options.ts` (admin) and `src/features/eligibility/lib/labels.ts` / `explain.ts` (students). `satisfies Record<...>` keeps label maps in step with the profile enums, so a new value fails typecheck until it has a label.
- **Copy.** Plain, short English for a first-year student on a phone. Say what to do next. Name the product Paatra.
- **Brand.** Navy `#1B3A6B`, green `#1F8A4C` (`#4CC38A` on navy), gold `#E9A23B`.
- **Tests.** Change the matcher, snapshot or publish gate only with a test. The section 5 test must keep passing unchanged unless the PRD changes.
- **Git.** One focused PR per change into `main`. Never stack PRs on another PR's branch (GitHub does not retarget them reliably).

## Skills

Repo skills in `.claude/skills/` walk through the common jobs step by step:

| Skill | Use it to |
| --- | --- |
| `add-scheme` | Add or re-verify a scheme with quoted rules |
| `add-state` | Bring a new state or UT live |
| `add-rule-field` | Add a rule field (or a value) end to end: enum, profile, matcher, questions, labels |
| `release-checklist` | Publish to students or ship a PR safely |
