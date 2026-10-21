# Task: ClearDate data supplement A — high-impact gaps

A short, targeted pass to run **before** continuing the main population at antipsychotics (order 94). It fixes the gaps that matter most for ibogaine intake. Afterwards, resume normal work with `docs/ClearDate_Prepopulate_Prompt_v2.1.md` (Part B, from order 94).

## Rules

Everything in `docs/ClearDate_Prepopulate_Prompt_v2.1.md` applies — read it first. In particular: its "Read first" files, the field instructions, the sourcing rules (provenance tags, `DRAFT —` source prefix, no invented citations, `null`/`unassessed` over guesses), never touching `verified` entries or `reviewer` sections, never setting `verified`, and running `npm run validate` after each part.

- `public/drugs.json` must be at `"schemaVersion": 2.1`; stop if not.
- Back up first to `backups/drugs.before-supplement-a.json` (never in `public/`).
- Don't change IDs, links, categories or component lists; record structural concerns in the report.

## Part 1 — Ibogaine and noribogaine (highest priority)

The treatment projection and the CYP2D6 poor-metaboliser warning depend entirely on these, and they currently have no data.

Compounds: `ibogaine`, `noribogaine`, `noribogaine_glucuronide`. Products: every product whose `candidateId` is `ibogaine` or `noribogaine`.

Fill every section per the v2.1 field instructions, paying particular attention to:
- **Kinetics** for ibogaine and noribogaine: terminal half-lives, ranges, and whether noribogaine needs `steadyState` or `earlyPhase`. Keep single-dose and multiple-dose data separate.
- **Formation**: ibogaine → noribogaine fraction, and `cyp2d6Multiplier` by phenotype if data supports it.
- **CYP2D6**: ibogaine is a CYP2D6 substrate; give `halfLifeMultiplier` per phenotype only from human PK data (e.g. studies comparing extensive and poor metabolisers, or CYP2D6-inhibited subjects). Assess whether either compound is itself a CYP2D6 inhibitor.
- **QT**: tier for each compound (the reviewer sets weights). Put hERG IC50 values and human concentration–QTc data for **both** compounds in `sourceNotes.qt`, with citations — the reviewer needs these to calibrate weights.
- **Receptors** and **clinicalRelevance** (noribogaine is active; assess the glucuronide).
- **Products**: `typicalDose.amount` stays `null` (not a label-dosed prescription product); confirm `doseUnit` and `input`.

Starting points (verify full citations yourself; do not cite anything you haven't confirmed exists): Glue et al. 2015 (*J Clin Pharmacol*) — noribogaine ascending-dose PK/QTc, and a separate study on CYP2D6 influence on ibogaine PK; Mash et al. (ibogaine/noribogaine disposition in treatment settings); Knuijver et al. 2022 (*Addiction*) — QTc course during ibogaine detoxification; Koenig & Hilber 2015 (*Molecules*) — hERG data.

## Part 2 — CYP2D6 inhibitor status that drives the inhibition track

The app shows CYP2D6 as inhibited while **any** inhibiting compound — parent or metabolite — remains. If a metabolite that carries the inhibition is `unassessed`, the track ends too early. Norfluoxetine is the critical example: its inhibitor field is currently `unassessed`, so the track would end when fluoxetine clears instead of weeks later.

Assess `cyp2d6.inhibitor` and `inhibitionType` for:

1. **These first**: `norfluoxetine`, `hydroxybupropion`, `threohydrobupropion`, `erythrohydrobupropion`, `methadone`.
2. **Every compound in the completed categories** (opioids, sedatives, antidepressants — parents and metabolites) where `inhibitor` is `unassessed`, or where `inhibitor` is set but `inhibitionType` is `unassessed` (e.g. bupropion, sertraline). This includes the remaining reset opioids: codeine, hydrocodone, oxycodone, tramadol, loperamide.

Use the FDA examples table and labels for strength; time-dependent (mechanism-based) inhibition only where documented. Where a parent is a strong or moderate inhibitor, explicitly state in the note whether its metabolites contribute and how long they persist. Set `none` only with a basis.

## Part 3 — Kinetics that block clear dates

These compounds have `active` or `unknown` relevance and no usable kinetics, so they make products "Incomplete". Ordered by the number of products blocked (as of the last pass):

| Compound | Blocks |
|---|---:|
| `norbuprenorphine` | 7 |
| `buprenorphine_3_glucuronide` | 7 |
| `morphine_3_glucuronide` | 7 |
| `morphine_6_glucuronide` | 7 |
| `hydromorphone_3_glucuronide` | 4 |
| `naloxone_3_glucuronide` | 3 |
| `6_monoacetylmorphine` | 3 |
| `1_hydroxymidazolam` | 3 |
| `hydroxyalprazolam`, `4_hydroxyalprazolam`, `10_hydroxynortriptyline`, `norhydrocodone`, `p_hydroxyphenobarbital`, `levoamphetamine`, `levomethamphetamine`, `desmethylselegiline`, `tapentadol_o_glucuronide`, `n_desmethyltramadol` | 2 each |
| `10_hydroxyamitriptyline`, `desmethylcitalopram`, `didesmethylcitalopram`, `codeine_6_glucuronide`, `norcodeine`, `3_methoxymorphinan`, `dextrorphan` | 1 each |

Also: **kratom** — `mitragynine`, `7_hydroxymitragynine`, `9_o_demethylmitragynine`, `mitragynine_pseudoindoxyl` (mitragynine has no kinetics, so kratom products show "No data yet").

Before starting, recompute this list from the current `public/drugs.json` with the app's clear-status logic (or a script that mirrors it: a product is blocked by any compound reachable from its components whose `clinicalRelevance` is not `inactive` and whose kinetics are neither intrinsic-with-a-usable-range nor `formation-limited`). Work in order of products blocked; add any compound not listed above.

For each, one of these resolves the block — choose the one the evidence supports:
- **Intrinsic kinetics** from human data (apparent half-lives measured after parent dosing are acceptable for formation-limited conjugates only if you also set `mode: "formation-limited"` with the evidence; otherwise record what was measured and why it applies).
- **`formation-limited`** where a source documents that the metabolite clears faster than it forms.
- **`inactive`** relevance where a source documents pharmacological inactivity (and nothing suggests toxicity, QT or CYP relevance).
- If none is supported, leave it, and say in the report what evidence would resolve it.

Note for M3G and M6G: renal impairment strongly prolongs them. Use normal-renal-function data and say so in the note.

### EDDP and EMDP (methadone)

Do **not** change their `clinicalRelevance` — the reviewer will decide. Instead, gather the evidence: the methadone label's statement on metabolite activity, and any human or in-vitro data on EDDP and QT/hERG (including PubMed 25903311 if accessible). Put a concise, cited summary in `sourceNotes.relevance` and fill their kinetics if available.

## Report: `docs/prepopulation_report_supplement_a.md`

1. **Before/after status counts** for all products — clear date computable / Incomplete / No data yet — overall and by category, computed with the same logic as Part 3.
2. **Part 1**: every ibogaine/noribogaine field filled, value, tag, source; the QT evidence summary.
3. **Part 2**: every inhibitor change (old → new, tag), and for each strong/moderate parent, which metabolites carry inhibition and their half-lives.
4. **Part 3**: each compound — resolution chosen (or why unresolved), value, tag; remaining blockers with what would resolve them.
5. **EDDP/EMDP evidence summary** for the reviewer's decision.
6. Conflicts and structure concerns, as before.

Validation result at the end, then the resume point: **antipsychotics, order 94 (quetiapine), using the v2.1 prompt.**
