---
name: add-rule-field
description: Add a new eligibility rule field (or a new value of an existing one) to Paatra end to end, across the field list, Postgres enum, student profile, matcher, questions, labels and tests. Use when a scheme's rule needs something RULE_FIELDS cannot express.
---

# Add a rule field end to end

The field list is locked on purpose: every field is a question a student may be asked. Add one only when a real, quoted rule needs it and no existing field means the same thing. Confirm with the owner first if the field means a new question on the student screens.

A state-only question (one state's portal, certificate or counselling route) is not a rule field: add it to that state's `questions` in `src/lib/states.ts` instead and skip to step 3.

## 1. Decide the shape

- **key**: snake_case, e.g. `hostel_resident`.
- **kind**: `number`, `choice`, `multi` or `boolean`.
- **tier** (what happens when unanswered):
  - `common`: asked on S02 (`/check/basics`); unanswered becomes a question on results.
  - `unlock`: optional; schemes that need it stay hidden behind "answer this to check N more".
  - `notAsked`: not asked; always "confirm on the official site". Cheapest option, no UI work.

## 2. Touch every layer

| Step | File | Change |
| --- | --- | --- |
| Field list | `src/lib/rules/fields.ts` | Add to `RULE_FIELDS` with label, kind, tier |
| Enum migration | `drizzle/` | `npm run db:generate`; check the SQL only adds a `rule_field` value |
| Profile | `src/lib/profile.ts` | Add the answer to `profileSchema` (optional), plus a `const` values list for choices |
| Matcher | `src/lib/match.ts` | Map it in `resolveField()` (`num`, `one`, `many`, or a range for banded answers) |
| Admin labels | `src/lib/registry/options.ts` | Add choice labels to `CHOICES` with `satisfies Record<...>` so typecheck catches gaps |
| Student labels | `src/lib/student/labels.ts`, `explain.ts` | Option labels; how the rule and the student's answer read in plain English |
| Inline question | `src/lib/student/questions.ts` | `questionFor()` case if it can be answered on the results screen |
| Question UI | `src/app/check/basics/page.tsx` (common), or `UNLOCK_FIELDS` and `ROWS` in `src/components/student/Unlocks.tsx` (unlock) | Ask it |

`notAsked` fields need only the first two rows plus admin labels.

Adding a new **value** to an existing choice field (a new entrance exam, a new parent occupation) is smaller: add it to the list in `profile.ts`, then fix the labels typecheck points to. No migration, because values live in `rules.value` (jsonb), not in the enum.

## 3. Test

- Add `checkRule` cases in `src/lib/match.test.ts`: pass, fail, unanswered (must be `unknown`, never `fail`), and a near-miss if numeric.
- The PRD section 5 worked example (`src/lib/fixtures/section5.ts`) must still pass unchanged.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## 4. Ship

Open a PR. After merge, the migration is applied to live Neon (`npm run db:migrate` with the unpooled URL) with the owner's go-ahead, before any scheme using the field is saved in the live editor. Enum values cannot be removed easily, so get the key right first.

Stored answers are checked by `sanitize()` in `src/lib/student/answers.ts` against `profileSchema`, so a new profile key needs nothing extra there. Answers stay on the phone: a new field is stored in `localStorage` with the rest of the profile, never sent to the server.
