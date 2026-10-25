---
name: add-state
description: Bring a new Indian state or UT live in Paatra (move it from OTHER_STATES to STATES with its portal, categories and state questions, migrate the rule_field enum, and add its schemes). Use when asked to add, cover, or launch a state.
---

# Bring a state live

Students from a state that is not live see only central, AICTE and private schemes. A state goes live only when its row in the PRD's "Parameters by state" verification log is **Matches** or **Corrected** (PRD: https://claude.ai/artifact/UuWcGVMCpGCvRBoVYHSGRi). If it isn't, stop and tell the owner what is missing.

## 1. Gather from the PRD row

- Two-letter code and name (already in `OTHER_STATES` in `src/domain/states.ts`).
- Scholarship portal name.
- The state's own category list, in its own words (e.g. `BC-A · BC-B · EBC`).
- The few state questions that decide most of its schemes (residence certificate, counselling route, family ID, hostel or day scholar…). Keep it to five or fewer.
- The state's schemes and their quoted rules (PRD "Quoted rules" tab, or the official portal).

## 2. Add the state config

In `src/domain/states.ts`:

1. Remove the state from `OTHER_STATES`.
2. Add a `StateConfig` to `STATES`, keeping the existing order:
   ```ts
   {
     code: "RJ", name: "Rajasthan", portal: "SSO Rajasthan", categories: cats("General · SC · ST · OBC · MBC · EWS"),
     questions: [residence("Rajasthan domicile certificate"), q("jan_aadhaar", "Jan Aadhaar card", HAVE)],
   },
   ```
   - `cats()` turns labels into keys (`"MBC/DNC"` → `mbc_dnc`). Rules must use those keys.
   - Reuse the option sets (`YES_NO`, `YES_NO_UNSURE`, `YES_NO_APPLIED`, `HAVE`, `STAY`). Keep a `unknown` "Not sure" option where students may not know: it counts as unanswered, never as a no.
   - Use `onlyFor` for questions that apply to some categories only.
3. If the state's OBC-like categories should match national OBC rules, check `OBC_LIKE` in `src/lib/registry/seed/phase0.ts` and add the new keys.
4. Update the comment at the top of `states.ts` if the count is mentioned.

## 3. Migrate the enum

State question keys (`RJ.residence`, `RJ.jan_aadhaar`) become values of the Postgres enum `rule_field`.

```bash
npm run db:generate   # writes drizzle/00NN_*.sql with ALTER TYPE "rule_field" ADD VALUE ...
```

Read the generated SQL: it should only add enum values. Commit it with the change. Never edit a migration that has already been applied.

## 4. Add the schemes

Follow the `add-scheme` skill for each scheme, with `provider: "STATE"` and the new `stateCode`. Every state scheme needs a `domicile_state` rule (`EQ "RJ"`) or a residence rule, quoted.

## 5. Check the screens

- `npm run dev:local`, then walk through as a student from the new state: `/check/basics` lists it under "State schemes available", `/check/state` shows its questions, results show its schemes. The landing page lists live states from `STATES` automatically.
- In `/admin`, the state appears in the filter and the editor's state picker, and its keys appear in the rule field list.

## 6. Test and ship

- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Add a test in `src/features/eligibility/lib/student.test.ts` or `match.test.ts` for a student from the new state.
- Open a PR. After merge, the migration must be applied to live Neon (`npm run db:migrate` with the unpooled URL) **before** any rule using the new keys is saved there, and only with the owner's go-ahead. Then update the PRD's state coverage and task checklist.
