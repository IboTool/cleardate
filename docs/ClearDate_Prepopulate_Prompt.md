# Task: Draft-populate `public/drugs.json` for ClearDate

You are filling in a draft pharmacology dataset for **ClearDate**, a client-side reference tool that visualises drug clearance for clinicians doing intake before ibogaine treatment. A pharmacologist will review every value you enter line by line. Your job is to give them a well-sourced first draft that makes that review fast, **not** to produce final data.

Accuracy and honesty about uncertainty matter far more than completeness. A blank field with a note is better than a plausible guess presented as fact.

## Files in this folder

- `docs/ClearDate_Cursor_Prompt.md` — the full app spec. **Read the "Data: `public/drugs.json`" section first**; it defines the schema and rules. Follow it exactly.
- `tools/candidates.json` — the work queue: `categories`, `candidates` (227 drugs, each with `category`, `aliases`, `routes`, `parentCompound`, `metaboliteTree`, `untrackedMetabolites`, `reviewHints`) and `compounds` (443 compounds with `formedFrom` links).
- `docs/ClearDate_Data_Sources.pdf` — which source to use for each field, and how to read sources consistently. Follow its "Field-by-field source map" and "Reading the sources consistently" sections.
- `public/drugs.json` — may already exist (built by `npm run init-data`) with structure and all-zero values. If it does, fill it in place. If it doesn't, create it from `tools/candidates.json` following the schema and the init rules in the spec.

## Before you start

1. If `public/drugs.json` exists, copy it to `public/drugs.before-prepopulate.json`.
2. Do not change any `id`, any `formedFrom` link structure, or any `category`. If you believe a link or category is wrong, leave it and record it in the report (see below).
3. Do not modify `tools/candidates.json`, the docs, or any code.

## What to fill in

Work **category by category**, in the category order in `candidates.json`. Within a category, work candidate by candidate: the parent compound, every compound in its `metaboliteTree` not already filled, then its products. Shared compounds (e.g. oxazepam, morphine, amphetamine, MDA) are filled once, the first time they appear.

For each **compound**:

| Field | Instruction |
|---|---|
| `halfLifeHours` | Terminal elimination half-life in healthy adults. `typical` = mean/median; `min`/`max` = reported range (or mean ± 2 SD). If only one value is available, set all three to it and say so in `sourceNotes.halfLife`. Use steady-state values where they differ meaningfully (e.g. methadone, fluoxetine) and say which. |
| `formedFrom[].fraction` | Fraction of the parent's elimination that forms this metabolite, from mass-balance or urinary recovery data. Often not published precisely: give a defensible estimate tagged `[estimate]` with the basis. If there is no basis at all, leave 0 and note it. Fractions out of one parent must sum to ≤ 1. |
| `molecularWeight` | Free base, from PubChem. Note if a salt is conventionally used for dosing. |
| `cyp2d6.substrate` / `halfLifeMultiplier` | Substrate only if CYP2D6 is a clinically meaningful pathway. Multipliers only from PM/IM/UM vs NM half-life or AUC data (label, CPIC). Otherwise leave all at 1 and note "no phenotype data". |
| `cyp2d6.inhibitor` / `inhibitionType` | Strength per the FDA classification where listed. `mechanism-based` only where time-dependent inhibition is documented (e.g. paroxetine, MDMA). |
| `qt.tier` | CredibleMeds-style tier (`known` / `possible` / `conditional` / `none`). Tag `[recall — check CredibleMeds]` unless you have checked it. |
| `qt.weight` | **Leave at 0.** This is set by the reviewer's clinical judgement. You may put relevant hERG IC50 or thorough-QT data in `sourceNotes.qt` to help them. |
| `receptors` | Main clinically relevant targets only (typically 1–6), with the action. Prefer IUPHAR/BPS Guide to Pharmacology. Don't list every weak off-target hit. |
| `lingeringEffects` | Only where well documented (e.g. benzodiazepine protracted withdrawal, irreversible MAOI enzyme recovery, post-MDMA serotonergic changes). Otherwise leave empty. |
| `nonlinearKinetics` | Flag where documented (e.g. phenytoin, MDMA, paroxetine) with a one-line note. |

For each **product**:

| Field | Instruction |
|---|---|
| `class` | Short pharmacological class, e.g. "opioid partial agonist", "SSRI". |
| `apparentHalfLifeHours` | Only for depots and extended-release forms where release limits elimination (e.g. buprenorphine SC depot, paliperidone palmitate, haloperidol decanoate). From the product label. Otherwise leave absent or 0. |
| `typicalDoseMg` | **Prescription products only:** the usual adult maintenance dose from the label (section 2 / SmPC 4.2). **Leave 0 for illicit, novel and non-prescription recreational substances**, and note "reviewer to set". |
| `aliases` | Keep the existing ones; add brand names from the label where missing. |

## Sourcing rules — the most important part

- `verified` stays **false** on every entry. Never set `verified: true` or `verifiedDate`.
- `source` on every entry you touch starts with `DRAFT — AI-prepopulated, unverified.` followed by the main source(s).
- Every `sourceNotes` entry starts with a provenance tag:
  - `[checked]` — you read this value in the named source during this session (give the source and section, e.g. "DailyMed, Dolophine label, §12.3").
  - `[recall]` — from your training knowledge; you did not open the source. Name the source you believe it comes from.
  - `[estimate]` — derived or approximated; state the basis.
  - `[gap]` — no reliable value found; field left at its default.
- **Never invent a citation, URL, DOI, page or section number.** If you can't name where a value came from, tag it `[recall]` or `[gap]`.
- If you have web access, check prescription-drug values against DailyMed and use `[checked]`. If you don't, everything is `[recall]` or `[estimate]` — that's acceptable, but be explicit.
- Where sources disagree materially (e.g. half-life ranges differ by >50%), use the wider range and record both in `sourceNotes`.
- Don't fill a field just because the schema has it. Leaving a default is always acceptable.

## Validation

After each category, check the file: valid JSON; schema-conformant; enums only from the allowed values; `min ≤ typical ≤ max`; half-lives > 0 wherever filled; fractions per parent ≤ 1. If `npm run validate` exists, run it and fix any errors you introduced. Keep 2-space indentation and the existing key order and sort order so the git diff stays clean.

## Report: `docs/prepopulation_report.md`

Write this as you go, so partial progress is useful if you stop early:

1. **Summary:** compounds and products touched per category; counts of `[checked]`, `[recall]`, `[estimate]` and `[gap]` values.
2. **Priority review list:** entries where an error would matter most — QT tier `known`/`possible`, strong or mechanism-based CYP2D6 inhibitors, half-lives over 48 h, depots, and anything tagged `[estimate]` on a half-life or fraction. One line each: id, field, value, tag, reason.
3. **Gaps:** entries left mostly empty, and why.
4. **Conflicts:** fields where sources disagree, with both values.
5. **Structure concerns:** any `formedFrom` link, metabolite or category in `candidates.json` you think is wrong — do not fix these, just list them with your reasoning.

## Scope and pacing

The full queue is large. If you can't finish in one session, complete whole categories rather than partial ones, update the report, and say exactly where you stopped (category and candidate `order`) so the next session can resume.
