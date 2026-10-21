# Task: Draft-populate `public/drugs.json` for ClearDate (schema v2.1)

This prompt supersedes the earlier prepopulation prompts. Use it only after the v2.1 migration has run (`public/drugs.json` has `"schemaVersion": 2.1`). If it hasn't, stop and say so.

You are filling in a draft pharmacology dataset for **ClearDate**, a client-side reference tool that visualises drug clearance for clinicians doing intake before ibogaine treatment. A pharmacologist will review every value line by line. Your job is a well-sourced first draft that makes that review fast, **not** final data.

Accuracy and honesty about uncertainty matter far more than completeness. `null` with a note is always better than a plausible guess presented as fact.

## Read first

- `docs/ClearDate_Spec_v2.1.md` — **changes to the schema below; read it first.** Sections 1–4 change what you write: `clinicalRelevance`, range-only ranges, the conservative rule for partial data, and zero formation multipliers.
- `docs/ClearDate_Spec_v2.md` — **the schema you are filling.** Read "Schema v2" and "Simulation changes" in full; field meanings matter (e.g. `kinetics.mode`, `earlyPhase`, `steadyState`, `Range.rangeType`, product `components` and `input`).
- `docs/ClearDate_Cursor_Prompt.md` — v1 spec, for context on how values are used.
- `docs/ClearDate_Data_Sources.pdf` — which source to use for each field.
- `docs/prepopulation_report.md` and `docs/prepopulation_report_v2.md` — the previous passes (opioids, sedatives). Read their conflicts and structure concerns.
- `docs/migration_v2_report.md` and `docs/migration_v2_1_report.md` — what the migrations changed and assumed.
- `tools/candidates.json` — the work queue (categories, candidates, compound links).

## Before you start

1. Copy `public/drugs.json` to `backups/drugs.before-prepopulate-v2.1.json`. Never put copies of the library in `public/`: everything there is published, and `npm run validate` fails on any `public/drugs*.json` other than `drugs.json`.
2. Do not change any `id`, `candidateId`, `formedFrom` link structure, `category` or `components` list. If you believe one is wrong, record it in the report.
3. Do not modify code, `tools/candidates.json` or the specs.
4. Never change an entry with `verified: true`, and never change a section whose provenance is `reviewer`.

## Work plan

**Part A — Revisit opioids and sedatives for v2.1 fields only.**
- `clinicalRelevance` for **every metabolite** in these two categories (see field instructions). This unblocks clear dates, so it's the priority.
- Depot release half-lives that were held back because only a range was reported: Sublocade, Brixadi weekly, Brixadi monthly and Vivitrol. Enter them as range-only `Range`s (`typical: null`, `min`/`max` from each product's label, `rangeType: "observed-range"`), with the label values already recorded in `sourceNotes.input`.
- `formedFrom[].cyp2d6Multiplier` for codeine → morphine and tramadol → O-desmethyltramadol: zero is now allowed and partial maps are allowed. Enter only what CPIC or label data support (e.g. a poor-metaboliser value), leave the rest out, and explain the basis in the note.
- `earlyPhase.fraction` for morphine and `steadyState.afterDays` for methadone and desalkylflurazepam: fill them if a source supports a value; otherwise leave `null` (the app now applies a labelled conservative rule).
- The CYP2D6 inhibitor fields reset to `unassessed` by the v2.1 migration (buprenorphine, codeine, dextromethorphan, hydrocodone, loperamide, norbuprenorphine, oxycodone, tapentadol, tramadol): assess inhibitor strength and type.

**Part B — Remaining categories.** Continue from `antidepressants`, candidate **order 63 (fluoxetine)**, through the remaining categories in order. Work candidate by candidate: the primary compound, every compound in its metabolite tree not already filled, then its products. Shared compounds (e.g. amphetamine, MDA, nortriptyline, desipramine) are filled once, the first time they appear. Fill `clinicalRelevance` for every metabolite as you go.

## Field instructions

### Compounds

| Field | Instruction |
|---|---|
| `kinetics.mode` | `intrinsic` if you can give a terminal half-life. `formation-limited` for conjugates and other metabolites documented (or strongly expected) to clear faster than they form — say which in the note. `unknown` otherwise. |
| `clinicalRelevance` | Metabolites only (parents and directly dosed compounds are always `active`). `active` if pharmacologically active, toxic, QT-relevant or a CYP inhibitor; `inactive` only where a source describes it as inactive (labels often say "pharmacologically inactive"); otherwise `unknown`. Tag provenance `relevance`. Getting this right matters more than an inactive metabolite's half-life: an `inactive` metabolite no longer blocks the clear date. |
| `kinetics.halfLifeHours` | **Terminal** (slowest) phase in healthy adults after a single dose. Fill `typical`, then the bounds per `rangeType`: `observed-range` (reported min–max), `mean-2sd`, `cohort-means` (range of study means), `cv` (give `cv` = SD/mean; leave min/max `null`), or `single-value` (only a mean exists; leave min/max `null`). If a source gives **only a range** and no mean/median, use `observed-range` with `typical: null` — don't invent a midpoint. |
| `kinetics.earlyPhase` | Only where a distinct faster phase dominates early disposition. `fraction` = share of the dose cleared by the early phase. If no source supports a fraction, leave it `null` — the app then ignores the early phase (conservative). |
| `kinetics.steadyState` | Only where chronic-dosing half-life differs meaningfully from single-dose. `afterDays` = when it applies (e.g. time to steady state); `null` if unsupported (the app then uses the later of the two clear dates). |
| `formedFrom[].fraction` | From mass-balance or urinary recovery. `null` if no basis. Known fractions per parent sum to ≤ 1. |
| `formedFrom[].cyp2d6Multiplier` | Only from label or CPIC data on metabolite exposure by phenotype. `0` is allowed (metabolite essentially not formed). A partial map is allowed: include only the phenotypes with data. Otherwise `null`. |
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
| `input` | `releaseHalfLifeHours` for depots and ER forms from the specific product label (as a `Range`; range-only is allowed). `defaultDurationHours` for patches. `null` where unsupported — don't borrow another product's value. |
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

## Report: `docs/prepopulation_report_v2_1.md`

Write as you go:

1. **Summary**: per category, compounds and products touched; counts by provenance tag; compounds by `kinetics.mode`; resume point.
2. **Part A changes**: each opioid or sedative entry changed, field, old → new, tag.
3. **Priority review list**: QT `known`/`possible`; strong or mechanism-based CYP2D6 inhibitors; terminal half-life > 48 h; depots, patches and ER release half-lives; any `estimate` on half-life, phase, fraction, release or bioavailability; every `formation-limited` assignment; every metabolite set `inactive` (so the reviewer can check exclusions from clear dates). One line each: id, field, value, tag, reason.
4. **Gaps**: entries left mostly `unknown`/`unassessed`, and why.
5. **Conflicts**: fields where sources disagree, with both values.
6. **Structure concerns**: links, components, splits or categories you think are wrong (not changed).

## Scope and pacing

Complete Part A first, then whole categories. If you stop early, update the report and state exactly where you stopped (category and candidate `order`).
