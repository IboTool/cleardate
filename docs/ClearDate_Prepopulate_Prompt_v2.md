# Task: Draft-populate `public/drugs.json` for ClearDate (schema v2)

This prompt supersedes `docs/ClearDate_Prepopulate_Prompt.md`. Use it only after the v2 migration has run (`public/drugs.json` has `"schemaVersion": 2`). If it hasn't, stop and say so.

You are filling in a draft pharmacology dataset for **ClearDate**, a client-side reference tool that visualises drug clearance for clinicians doing intake before ibogaine treatment. A pharmacologist will review every value line by line. Your job is a well-sourced first draft that makes that review fast, **not** final data.

Accuracy and honesty about uncertainty matter far more than completeness. `null` with a note is always better than a plausible guess presented as fact.

## Read first

- `docs/ClearDate_Spec_v2.md` — **the schema you are filling.** Read "Schema v2" and "Simulation changes" in full; field meanings matter (e.g. `kinetics.mode`, `earlyPhase`, `steadyState`, `Range.rangeType`, product `components` and `input`).
- `docs/ClearDate_Cursor_Prompt.md` — v1 spec, for context on how values are used.
- `docs/ClearDate_Data_Sources.pdf` — which source to use for each field.
- `docs/prepopulation_report.md` — the previous pass (opioids). Read its conflicts and structure concerns.
- `docs/migration_v2_report.md` — what the migration changed and assumed.
- `tools/candidates.json` — the work queue (categories, candidates, compound links).

## Before you start

1. Copy `public/drugs.json` to `public/drugs.before-prepopulate-v2.json`.
2. Do not change any `id`, `candidateId`, `formedFrom` link structure, `category` or `components` list. If you believe one is wrong, record it in the report.
3. Do not modify code, `tools/candidates.json` or the specs.
4. Never change an entry with `verified: true`, and never change a section whose provenance is `reviewer`.

## Work plan

**Part A — Opioid revisit.** The opioid drafts were written for v1. Revisit them for the new v2 fields only:
- `kinetics.earlyPhase` where a distinct fast phase is documented (morphine is the known case; check others).
- `kinetics.steadyState` where chronic-dosing half-life differs meaningfully (methadone is the known case).
- `Range.rangeType` and `cv` for each existing half-life: use `cv` (from mean and SD) where mean − 2SD went negative (oxymorphone, MC5), and set `typical` where a defensible one exists.
- Depot products split by migration (Sublocade, Brixadi weekly, Brixadi monthly; Vivitrol): `input.releaseHalfLifeHours` from each product's own label.
- Release-form products split by migration (`_oral_ir`, `_oral_er` …): `releaseHalfLifeHours` for ER forms only where the label supports one; otherwise leave `null` with a note.
- Patch products: confirm `doseUnit`, `defaultDurationHours` and any skin-depot `releaseHalfLifeHours`.
- `formedFrom[].cyp2d6Multiplier` for codeine → morphine and tramadol → O-desmethyltramadol, if CPIC or label data support values.
- `bioavailability` for `buprenorphine_naloxone_sublingual` components (naloxone sublingual especially).
- Review every compound the migration auto-assigned as `formation-limited`; confirm or change the mode, with a note.

**Part B — Remaining categories.** Continue from `sedatives`, candidate order 27, through the remaining categories in order. Work candidate by candidate: the primary compound, every compound in its metabolite tree not already filled, then its products. Shared compounds (e.g. oxazepam, amphetamine, MDA, nortriptyline, desipramine) are filled once, the first time they appear.

## Field instructions

### Compounds

| Field | Instruction |
|---|---|
| `kinetics.mode` | `intrinsic` if you can give a terminal half-life. `formation-limited` for conjugates and other metabolites documented (or strongly expected) to clear faster than they form — say which in the note. `unknown` otherwise. |
| `kinetics.halfLifeHours` | **Terminal** (slowest) phase in healthy adults after a single dose. Fill `typical`, then the bounds per `rangeType`: `observed-range` (reported min–max), `mean-2sd`, `cohort-means` (range of study means), `cv` (give `cv` = SD/mean; leave min/max `null`), or `single-value` (only a mean exists; leave min/max `null`). |
| `kinetics.earlyPhase` | Only where a distinct faster phase dominates early disposition. `fraction` = share of the dose cleared by the early phase. If the source doesn't let you estimate `fraction`, tag `[estimate]` and explain, or leave `null`. |
| `kinetics.steadyState` | Only where chronic-dosing half-life differs meaningfully from single-dose. `afterDays` = when it applies (e.g. time to steady state). |
| `formedFrom[].fraction` | From mass-balance or urinary recovery. `null` if no basis. Known fractions per parent sum to ≤ 1. |
| `formedFrom[].cyp2d6Multiplier` | Only from label or CPIC data on metabolite exposure by phenotype. Otherwise `null`. |
| `molecularWeight` | Free base, from PubChem. `null` if not confirmed. |
| `cyp2d6.substrate` | `yes` / `no` only when you have evidence either way; otherwise leave `unassessed`. `halfLifeMultiplier` only from phenotype PK data; otherwise `null`. |
| `cyp2d6.inhibitor`, `inhibitionType` | FDA classification where listed. `none` only if a source supports no clinically relevant inhibition; otherwise leave `unassessed`. `mechanism-based` only where time-dependent inhibition is documented. |
| `qt.tier` | CredibleMeds-style. Set a tier only with a basis; tag `[recall — check CredibleMeds]` unless checked. `none` only with a basis; otherwise leave `unassessed`. |
| `qt.weight`, `qt.referenceAmountMg` | **Leave `null`.** Reviewer-set. You may put hERG IC50 or thorough-QT data in `sourceNotes.qt`. |
| `receptors`, `receptorsAssessed` | Main clinically relevant targets (typically 1–6) with action, preferring IUPHAR/BPS. Set `receptorsAssessed: true` once you've assessed them, even if the list is empty. |
| `lingeringEffects` | Only where well documented; `durationDays` `null` unless a defensible figure exists (put ranges in the note). |
| `nonlinearKinetics.flag` | `yes` with a note where documented; `no` only with a basis; else `unassessed`. |

### Products

| Field | Instruction |
|---|---|
| `class` | Short pharmacological class. |
| `components` | Don't change the list. Fill `saltFactor` where the label dose is a salt (free-base MW ÷ salt MW) and `bioavailability` for the route where documented; otherwise `null`. |
| `doseUnit`, `formulation` | Confirm against the label; correct with a note if the migration's inference is wrong. |
| `input` | `releaseHalfLifeHours` for depots and ER forms from the specific product label (as a `Range`). `defaultDurationHours` for patches. `null` where unsupported — don't borrow another product's value. |
| `typicalDose` | **Prescription products only:** usual adult maintenance dose from the label, with `basis`. **Leave `amount: null` for illicit, novel and non-prescription recreational substances**, noting "reviewer to set". |
| `secondaryCategories` | Leave as is unless clearly needed; record suggestions in the report. |

## Sourcing rules

- `verified` stays **false**. Never set `verified: true` or `verifiedDate`.
- `source` on every entry you touch starts with `DRAFT — AI-prepopulated, unverified.` followed by the main source(s).
- Set `provenance.<section>` for every section you touch, and start the matching `sourceNotes.<section>` with the same tag:
  - `checked` — you read this value in the named source during this session (give source and section, e.g. "DailyMed, Dolophine label, §12.3").
  - `recall` — from training knowledge; you did not open the source. Name the source you believe it comes from.
  - `estimate` — derived or approximated; state the basis.
  - `gap` — no reliable value found; left `null` / `unassessed`.
- **Never invent a citation, URL, DOI, page or section number.**
- Where sources disagree materially, use the wider range and record both in `sourceNotes`.
- Leaving `null` or `unassessed` is always acceptable. Never use `0` for unknown — the validator rejects it.

## Validation

After each category (and after Part A), run `npm run validate` and fix any errors you introduced. Keep 2-space indentation, existing key order and sort order so the git diff stays clean.

## Report: `docs/prepopulation_report_v2.md`

Write as you go:

1. **Summary**: per category, compounds and products touched; counts by provenance tag; compounds by `kinetics.mode`; resume point.
2. **Part A changes**: each opioid entry changed, field, old → new, tag.
3. **Priority review list**: QT `known`/`possible`; strong or mechanism-based CYP2D6 inhibitors; terminal half-life > 48 h; depots, patches and ER release half-lives; any `estimate` on half-life, phase, fraction, release or bioavailability; every `formation-limited` assignment. One line each: id, field, value, tag, reason.
4. **Gaps**: entries left mostly `unknown`/`unassessed`, and why.
5. **Conflicts**: fields where sources disagree, with both values.
6. **Structure concerns**: links, components, splits or categories you think are wrong (not changed).

## Scope and pacing

Complete Part A first, then whole categories. If you stop early, update the report and state exactly where you stopped (category and candidate `order`).
