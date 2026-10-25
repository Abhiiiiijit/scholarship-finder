---
name: add-scheme
description: Add a new scholarship scheme to Paatra, or re-verify an existing one, with every eligibility rule quoted word for word from the official source. Use when asked to add, enter, seed, fix the rules of, or re-check a scheme.
---

# Add or re-verify a scheme

Every rule a student sees must carry the official wording and a link. A wrong rule costs a student a scholarship, so accuracy beats speed: when the source is unclear, mark it, don't guess.

## 1. Find the official source

- Use the scheme owner's own page or PDF: the ministry, AICTE, the state portal (MahaDBT, SSP, ePASS…), NSP, or the private trust. Not news sites, coaching blogs or aggregators.
- Check the scheme is in scope: B.E./B.Tech students, a central, AICTE or private scheme, or a state scheme from one of the live states in `src/domain/states.ts` (`STATES`). A scheme from another state waits for that state (see the `add-state` skill).
- Check it isn't already in the registry: search `src/lib/registry/seed/phase0.ts` for the name, slug and tracker id (C1, M4, P2…), and ask the owner whether it exists in the live registry.
- If the page will not open from this environment, say so. Never fill rules from memory.

## 2. Turn the eligibility text into rules

Each rule is `{ group, field, op, value, quote, sourceUrl, ambiguous }`.

- **field**: one of `RULE_FIELDS` in `src/domain/rules/fields.ts`, or a key of the scheme's own state (`MH.cap_admission`). If nothing fits, stop and use the `add-rule-field` skill; do not bend a field to mean something else.
- **op**: `EQ`, `IN`, `LTE`, `GTE`, `BETWEEN`, `IS_TRUE`. Not `PERCENTILE_GTE` (the editor refuses it until board tables exist); record percentile rules in review notes instead.
- **value**: the stored keys, not labels. Income in rupees (`800000`), percentages as numbers (`60`), choices as profile values (`"female"`, `["1", "2_lateral"]`, category keys from the state's `categories`, e.g. `"obc"`, `"bc_a"`). Check `src/domain/profile.ts` and `src/lib/registry/options.ts` for valid values.
- **group**: rules in one group are OR-ed, groups are AND-ed. "SC or ST" is one `IN` rule; "income ≤ 8 L, or any income for orphans" is two rules in the same group.
- **quote**: copy the exact sentence from the source, in quote marks. Never paraphrase. A summary is allowed only in a draft and must say so in review notes.
- **sourceUrl**: the page or PDF the quote is from (often the same as `officialUrl`).
- **ambiguous**: `true` when official sources disagree. Students then see "confirm on the official site".

Fields the MVP does not ask (`fresh_or_renewal`, `cgpa`, `siblings_claiming`, `gap_years`, `listed_institute`) are fine to store; they show as "confirm on the official site".

Also fill: `slug` (lowercase-hyphen), `trackerId`, `name`, `provider` (`CENTRAL`/`AICTE`/`STATE`/`PRIVATE`), `stateCode` (state schemes only), `source`, `appliesVia`, `sourceFormat`, `officialUrl`, `amountText`, `benefitTypes`, `documents` (from `DOCUMENTS` in `options.ts`), `cannotCombineWith`, `opensOn`, `deadline`, and `reviewNotes` for anything the matcher cannot check.

## 3. Enter it

- **Through the admin editor (preferred for one scheme):** `/admin` → New scheme. Save as draft, then let the owner publish.
- **In code (a batch):** add an entry to `PHASE0_SCHEMES` in `src/lib/registry/seed/phase0.ts` using the `rule()` helper, with `quality` (`verified` / `partial`) and `gaps`. `npm run db:seed` inserts drafts and skips any slug or tracker id already present, so it never overwrites admin edits.

## 4. Test

- `npm test`: `seed.test.ts` checks every seed scheme parses with `schemeDraftSchema` and that verified ones pass `publishProblems()`.
- For a scheme with unusual logic, add a case to `src/domain/match.test.ts` with a profile that should pass, one that should fail, and one near-miss.

## 5. Publish (owner only)

Publishing changes what students see. Only the owner (Abhijit) publishes or approves a publish, through **Mark verified and publish** in the editor. That checks the URL opens, refuses unquoted rules, stamps `lastVerifiedAt` and writes a new snapshot. Never insert `PUBLISHED` rows or snapshots by hand without their explicit go-ahead.

## Re-verifying

A scheme drops out of results 90 days after `lastVerifiedAt`. To re-verify: open the official page, compare every quote and number against it, update anything that changed (and the deadline), then publish again. If the page changed in a way you cannot map, set the scheme `ON_HOLD` and write why in review notes.
