# ClearDate — Spec v2: Data Model and Kinetics

This is a **delta** on `docs/ClearDate_Cursor_Prompt.md` (v1). Everything in v1 still applies unless this document changes it. Implement it on top of the working v1 codebase, in the order given under "Implementation order".

## Why v2

The first data-population pass (opioids, `docs/prepopulation_report.md`) showed the v1 data model can't represent what the literature actually reports:

- `0` meant both "unknown" and "none". Unknown metabolite half-lives were skipped, so clear dates silently ignored them, and unassessed QT tiers read as "no risk".
- Many metabolites (especially conjugates) have no published half-life but clear at the parent's pace.
- One half-life per compound can't represent two-phase drugs (morphine), acute vs chronic dosing (methadone), or depots and patches.
- CYP2D6 phenotype changes how much active metabolite forms (codeine → morphine, tramadol → O-desmethyltramadol), not just clearance.
- `typicalDoseMg` is unavailable for most entries, which breaks the QT load formula.
- Combination products (buprenorphine/naloxone), salt forms and patch dosing (µg/h) weren't representable.

## Core principles

1. **Unknown is `null`, never `0`.** Any numeric field without data is `null`. Enumerated safety fields have an explicit `unassessed` value. The UI never presents an unassessed field as a negative finding.
2. **Missing data is shown, not hidden.** If a clear date depends on a compound with unknown kinetics, the app says so instead of giving a confident date.
3. **Every assumption is labelled.** Values the app derives or assumes (formation-limited tracking, default spread, normalized curves) are marked on the chart, in tooltips and on the export.

## Schema v2: `public/drugs.json`

Top level gains `"schemaVersion": 2`.

### Shared type: `Range`

```json
{ "typical": 22.2, "min": 8, "max": 59, "rangeType": "observed-range", "cv": null }
```

- Every number may be `null`.
- `rangeType`: `observed-range` | `mean-2sd` | `cohort-means` | `cv` | `single-value` | `null`.
- `cv` (coefficient of variation, 0–2) is used when `rangeType` is `cv`. The app derives a lognormal 95% band: `σ = √ln(1+cv²)`, bounds `typical · e^(±1.96σ)`. This avoids negative lower bounds from mean − 2SD.
- `single-value`: only a mean is published. The app applies the **assumed spread** from Settings (default CV 30%) and labels the band "assumed spread".

### Compound

```json
{
  "id": "morphine",
  "name": "Morphine",
  "aliases": ["MS Contin"],
  "isMetabolite": true,
  "formedFrom": [
    {
      "compound": "codeine",
      "fraction": 0.075,
      "cyp2d6Multiplier": { "poor": 0.1, "intermediate": 0.5, "normal": 1, "ultrarapid": 1.5 }
    }
  ],
  "molecularWeight": 285.34,
  "kinetics": {
    "mode": "intrinsic",
    "halfLifeHours": { "typical": 15, "min": null, "max": null, "rangeType": "single-value", "cv": null },
    "earlyPhase": { "fraction": 0.9, "halfLifeHours": { "typical": 2, "min": null, "max": null, "rangeType": "single-value", "cv": null } },
    "steadyState": null
  },
  "cyp2d6": {
    "substrate": "unassessed",
    "halfLifeMultiplier": null,
    "inhibitor": "unassessed",
    "inhibitionType": "unassessed"
  },
  "qt": { "tier": "unassessed", "weight": null, "referenceAmountMg": null },
  "receptors": [ { "target": "mu-opioid receptor", "action": "agonist" } ],
  "receptorsAssessed": true,
  "lingeringEffects": { "durationDays": null, "note": "" },
  "nonlinearKinetics": { "flag": "unassessed", "note": "" },
  "provenance": {
    "halfLife": "checked", "metabolism": "estimate", "molecularWeight": "recall",
    "cyp2d6": "gap", "qt": "gap", "receptors": "recall",
    "lingeringEffects": "gap", "nonlinearKinetics": "gap"
  },
  "sourceNotes": { "halfLife": "", "metabolism": "", "molecularWeight": "", "cyp2d6": "", "qt": "", "receptors": "", "lingeringEffects": "", "nonlinearKinetics": "" },
  "source": "",
  "verified": false,
  "verifiedDate": ""
}
```

(Example values are illustrative of structure only.)

Field rules:

- **`formedFrom[].fraction`**: number 0–1 or `null` (unknown). Known fractions out of one parent must sum to ≤ 1.
- **`formedFrom[].cyp2d6Multiplier`**: optional per-phenotype multiplier on the formation fraction, or `null`. Effective fraction = `fraction × multiplier`; if the effective fractions out of a parent sum to > 1, scale them down proportionally and show a warning.
- **`kinetics.mode`**:
  - `intrinsic`: use `halfLifeHours` (and `earlyPhase` / `steadyState` if present).
  - `formation-limited`: the compound is eliminated much faster than it forms, so it tracks its parent(s). No half-life needed. Typical for glucuronide and sulfate conjugates. Simulated with an elimination half-life of one-tenth of its fastest parent's effective half-life, and labelled "tracks parent (formation-limited)" in the UI and export. The export notes that conjugates can accumulate in renal impairment.
  - `unknown`: kinetics not established. The compound cannot be simulated (see "Clear status").
- **`kinetics.halfLifeHours`**: the terminal (slowest) phase — the one that determines clearance.
- **`kinetics.earlyPhase`** (optional): `{ fraction, halfLifeHours }`, where `fraction` is the share of each dose cleared by a faster early phase. Each dose is split: `fraction` into a fast pool, `1 − fraction` into a slow pool, eliminating independently; both pools feed metabolites. Amount plotted is the sum.
- **`kinetics.steadyState`** (optional): `{ afterDays, halfLifeHours }`. If the patient's regimen of any product containing this compound has run ≥ `afterDays` continuously, use this half-life (and no early phase) for that product's simulation run, and note "steady-state half-life used" in the tooltip and export. Otherwise use the single-dose values.
- **`cyp2d6.substrate`**: `yes` | `no` | `unassessed`. `halfLifeMultiplier`: per-phenotype object or `null`.
- **`cyp2d6.inhibitor`**: `unassessed` | `none` | `weak` | `moderate` | `strong`. **`inhibitionType`**: `unassessed` | `none` | `reversible` | `mechanism-based`.
- **`qt.tier`**: `unassessed` | `none` | `conditional` | `possible` | `known`. **`qt.weight`**: number or `null`. **`qt.referenceAmountMg`**: the body amount the weight is calibrated to, or `null`. Both are set only by the reviewer.
- **`receptorsAssessed`**: `false` means the receptor list hasn't been researched, so an empty list is not "no targets".
- **`nonlinearKinetics.flag`**: `yes` | `no` | `unassessed`.
- **`provenance`**: per-section, `checked` | `recall` | `estimate` | `gap` | `reviewer` | `null`. `reviewer` is set automatically when a human edits a field in the editor (changeable).
- `molecularWeight`, `lingeringEffects.durationDays`: number or `null`.

### Product

```json
{
  "id": "buprenorphine_naloxone_sublingual",
  "candidateId": "buprenorphine",
  "name": "Buprenorphine/naloxone (Sublingual)",
  "aliases": ["Suboxone", "Zubsolv"],
  "category": "opioids",
  "secondaryCategories": [],
  "class": "opioid partial agonist + opioid antagonist",
  "route": "Sublingual",
  "formulation": "IR",
  "components": [
    { "compound": "buprenorphine", "ratio": 1, "saltFactor": null, "bioavailability": null },
    { "compound": "naloxone", "ratio": 0.25, "saltFactor": null, "bioavailability": null }
  ],
  "doseUnit": "mg",
  "input": { "type": "bolus", "releaseHalfLifeHours": null, "defaultDurationHours": null },
  "typicalDose": { "amount": null, "unit": "mg", "basis": "maintenance" },
  "provenance": { "class": "recall", "aliases": "recall", "components": "checked", "input": null, "typicalDose": "gap" },
  "sourceNotes": { "class": "", "aliases": "", "components": "", "input": "", "typicalDose": "" },
  "source": "",
  "verified": false,
  "verifiedDate": ""
}
```

Field rules:

- **`candidateId`**: the `tools/candidates.json` candidate this product belongs to (used by the editor).
- **`components`**: one or more `{ compound, ratio, saltFactor, bioavailability }`. A dose of amount `D` (in `doseUnit`) delivers `D × ratio × (saltFactor ?? 1) × (bioavailability ?? 1)` of each component into the body. The first component is the primary one, labelled by the dose. `saltFactor` converts labelled salt mass to free base (e.g. 0.89); `null` means the label dose is already free base or not assessed. `bioavailability` (0–1) is the fraction reaching the body by this route (e.g. sublingual naloxone is very low); `null` means "not applied" and the y-axis label says "administered amount" for that product. Clear dates don't depend on either factor, since clear status is relative to each compound's own peak; they only affect absolute amounts and the QT summed load.
- **`doseUnit`**: `mg` | `µg` | `µg/h` | `mg/h`.
- **`formulation`**: `IR` | `ER` | `SR` | `XL` | `XR` | `CR` | `depot` | `patch` | `null`.
- **`input`**:
  - `bolus`: instantaneous (v1 behaviour).
  - `first-order-release`: dose enters a release compartment and passes to the components with half-life `releaseHalfLifeHours` (depots, some ER forms). Flip-flop kinetics emerge naturally.
  - `zero-order`: constant-rate input in `doseUnit` per hour (patches, infusions) for a duration. If `releaseHalfLifeHours` is set, input passes through a release compartment first (skin depot after patch removal). `defaultDurationHours` prefills the wear time (e.g. 72).
- **`typicalDose`**: `{ amount, unit, basis }`, amount `null` when unknown. `basis`: `maintenance` | `single-use` | `per-injection` | `rate`. Used only for display and the dose form's placeholder; **no longer used by the QT calculation.**
- **`secondaryCategories`**: extra category IDs for browsing and filter chips (e.g. dextromethorphan also under `psychedelics_dissociatives`, tianeptine also under `antidepressants`).
- `apparentHalfLifeHours`, `parentCompound` and `typicalDoseMg` are **removed** (migrated as below).

## Simulation changes (`pk.ts`)

- **Per-product runs.** Simulate each dosed product's compound tree independently and sum where amounts are absolute. Everything is linear, so superposition holds. This keeps "morphine from codeine" (possibly normalized) separate from directly dosed morphine.
- **Two-pool compounds**: implement `earlyPhase` as two pools per compound (fast and slow), each eliminating at its own rate and each feeding metabolites.
- **Release compartments**: a per-dose-entry release pool for `first-order-release` and `zero-order` with `releaseHalfLifeHours`.
- **Zero-order input**: constant input rate over the wear/infusion interval; `dt` must also respect input start and stop times.
- **Formation-limited**: elimination half-life = one-tenth of the fastest parent's effective half-life (recomputed per run).
- **Unknown fraction (`null`)**: simulate that edge with fraction 1 and mark everything downstream of it as **normalized**: plotted as a dashed curve scaled to its own peak, on a secondary "relative (% of own peak)" axis, labelled "amount unknown — timing only". Its clear time is still valid because clear status is relative to its own peak.
- **CYP2D6**: apply `halfLifeMultiplier` to the compound and `cyp2d6Multiplier` to formation edges. Phenotype `unknown` runs poor and ultrarapid as the band edges.
- **Range bands**: min/typical/max runs as in v1, with bounds derived from each `Range` per `rangeType`. Phases and release half-lives use their own ranges in the same run (all min, all typical, all max).

## Clear status

- A compound is **clear** when its amount ≤ `peak × 2^(−X)` (X = clear threshold in half-lives, default 5.5). This works for any kinetics, including two-phase, depots and patches.
- A product is **clear** when every compound reachable from its components is clear.
- A product's status is one of:
  - **Clear by \<date\>**
  - **Clear by \<date\> — with assumptions** (formation-limited tracking, assumed spread, steady-state switch or normalized curves; listed on hover and in the export)
  - **Incomplete — missing kinetics for: X, Y**. Shows the clear date of the parts that can be computed, labelled as a lower bound ("not before \<date\>").
  - **No data yet** (primary component has no usable kinetics; can't be plotted — as v1)
- Setting: **"Treat unknown metabolites as formation-limited"** (default **off**). When on, `unknown` compounds are simulated as formation-limited and the status becomes "with assumptions", listing them.
- The ibogaine-date check uses these statuses. An incomplete product overlapping the ibogaine date shows an amber warning, not green.

## QT display

- **Default: per-compound lanes.** One thin lane per compound with `qt.tier` other than `none`, visible while that compound is above its clear threshold. Colour = tier; opacity = fraction of its own peak. `unassessed` compounds get a grey hatched lane labelled "QT unassessed". Lanes for metabolites sit under their parent's lane.
- **Summed relative QT load** (optional overlay): `Σ qt.weight × amount / qt.referenceAmountMg`. It shows only when every compound with a lane at that time has `weight`, `referenceAmountMg` and an absolute (not normalized) amount. Otherwise the toggle is disabled with a tooltip saying which compounds lack calibration.
- Baseline QTc label unchanged.

## Dose entry changes

- The amount field uses the product's `doseUnit`. Combination products take the primary component's amount and show the others computed ("8 mg buprenorphine → 2 mg naloxone").
- **Patch / infusion** (`zero-order`): rate, applied at, removed at (prefilled from `defaultDurationHours`). A regimen repeats patch changes.
- **Depots** (`first-order-release`): amount and injection date; regimen for repeat injections.
- Session file and localStorage move to `version: 2`: `DoseEntry.amountMg` → `amount` + `unit`, plus optional `durationHours`. Loading a v1 session migrates it automatically.

## UI labelling

- Badges: `unverified`, `draft` (any section with provenance `recall` or `estimate`), `user-entered`, `no data yet`, `incomplete`.
- Tooltips list every assumption affecting the hovered curve.
- The export adds an **"Assumptions and missing data"** section listing, per product: formation-limited compounds, normalized curves, assumed spreads, steady-state switches, unassessed QT/CYP2D6, and incomplete clear dates.
- Unassessed fields are always shown as "unassessed", never as "none" or blank.

## Migration: `npm run migrate-v2`

A one-off, idempotent script (skips if `schemaVersion` is already 2). It backs up `public/drugs.json` to `public/drugs.v1-backup.json` and writes `docs/migration_v2_report.md`.

### Compounds

- Tag parsing: read each `sourceNotes` section's leading tag (`[checked]`, `[recall]`, `[estimate]`, `[gap]`, including forms like `[recall — check CredibleMeds]`) into `provenance`. No tag → `null`. Keep the note text unchanged.
- `halfLifeHours {typical,min,max}` → `kinetics.halfLifeHours`:
  - all three 0 → `kinetics.mode: "unknown"`, `halfLifeHours: null`.
  - otherwise `mode: "intrinsic"`; `rangeType`: `single-value` if min = typical = max, else `observed-range` (reviewer may change); `cv: null`.
- `earlyPhase` and `steadyState` → `null` (reviewer or the next data pass fills them).
- `formedFrom[].fraction` 0 → `null`; add `cyp2d6Multiplier: null`.
- `molecularWeight` 0 → `null`. `lingeringEffects.durationDays` 0 → `null`.
- Safety enums — **only where the section's provenance is `gap` or `null`**:
  - `qt.tier` `none` → `unassessed`
  - `cyp2d6.substrate` `false` → `unassessed`; `true` → `yes`
  - `cyp2d6.inhibitor` / `inhibitionType` `none` → `unassessed`
  - `nonlinearKinetics.flag` `false` → `unassessed`; `true` → `yes`
  - Where provenance is `checked`, `recall` or `estimate`, map `false` → `no`, `true` → `yes`, and keep `none` as `none`.
- `halfLifeMultiplier`: all 1 → `null`.
- `qt.weight` 0 → `null`; add `referenceAmountMg: null`.
- `receptorsAssessed`: `true` if `receptors` is non-empty or provenance is `checked`/`recall`/`estimate`; else `false`.
- **Conjugate heuristic**: compounds whose name contains "glucuronide" or "sulfate" and whose mode is `unknown` → `mode: "formation-limited"`, provenance `halfLife: "estimate"`, and append to the half-life note: "Auto-assigned by migration: conjugate assumed formation-limited. Review." List every one in the report.

### Products

- `parentCompound` → `components: [{ compound, ratio: 1, saltFactor: null, bioavailability: null }]`; `candidateId` = the old `parentCompound`.
- `typicalDoseMg` → `typicalDose { amount: value or null if 0, unit: "mg", basis: "maintenance" }`.
- `input` from the route:
  - route contains "transdermal" or "patch" → `zero-order`, `doseUnit: "µg/h"`, `defaultDurationHours: 72` (reviewer to confirm per product)
  - route contains "depot", "LAI", "decanoate", "palmitate", "pamoate" or "IM depot" → `first-order-release`, `formulation: "depot"`
  - route exactly `Oral ER` (single release form, e.g. paliperidone, ranolazine) → `first-order-release`, `formulation: "ER"`, `releaseHalfLifeHours: null`
  - otherwise `bolus`
- `apparentHalfLifeHours` (if present and non-zero):
  - if its typical value is **more than twice** the primary compound's typical intrinsic half-life → `input.releaseHalfLifeHours` as a `Range` (`single-value` if min = max), provenance `input: "estimate"`, note "Migrated from v1 apparent half-life; treated as release half-life (flip-flop approximation). Review."
  - otherwise (or if the compound's half-life is unknown) → drop it, set `releaseHalfLifeHours: null`, provenance `input: "gap"`, and copy the value into `sourceNotes.input` with "v1 apparent half-life ≈ intrinsic half-life; not converted to a release half-life to avoid double-counting. Review." (Current data: fentanyl transdermal converts; buprenorphine transdermal does not.)
- Parse the tagged segments embedded in product `source` (`[tag] key: text`) into `sourceNotes` and `provenance` (keys `class`, `typicalDose` (from `typicalDose`), `aliases`, `apparentHalfLife` → `input`). Leave `source` as its leading `DRAFT — …` sentence plus any URLs.
- Add `secondaryCategories: []`; set `["psychedelics_dissociatives"]` for dextromethorphan products and `["antidepressants"]` for tianeptine products.
- Remove `apparentHalfLifeHours`, `parentCompound`, `typicalDoseMg`.

### Product splits and merges

- **Release-form splits**: any route of the form `Oral IR/ER`, `Oral IR/CR`, `Oral IR/XR` or `Oral IR/SR/XL` becomes one product per form: id `<candidate>_oral_<form>` (e.g. `morphine_oral_ir`, `morphine_oral_er`, `bupropion_oral_sr`), route `Oral`, `formulation` set. The first is `bolus`; the others `first-order-release` with `releaseHalfLifeHours: null` (reviewer fills). Copy all fields and notes to each, appending "Split from \<old id\> by migration."
- **Depot splits**:
  - `buprenorphine_sc_depot_sublocade_brixadi` → `buprenorphine_sc_depot_sublocade` (aliases Sublocade), `buprenorphine_sc_depot_brixadi_weekly`, `buprenorphine_sc_depot_brixadi_monthly` (aliases Brixadi). Carry the depot notes from the report's product section (the per-product label values are recorded there) into each product's `sourceNotes.input` for the reviewer; leave `releaseHalfLifeHours` null.
  - `paliperidone_lai_palmitate_1_3_6_monthly` → `_1_monthly`, `_3_monthly`, `_6_monthly`.
  - `aripiprazole_lai_monthly_2_monthly` → `_monthly`, `_2_monthly`, plus `aripiprazole_lauroxil_im_depot` (alias Aristada).
  - `risperidone_lai_several`: keep as one, add `sourceNotes.input` "Several brands with different release profiles — split by brand before populating."
- **Combination product**: create `buprenorphine_naloxone_sublingual` (components buprenorphine ratio 1, naloxone ratio 0.25; aliases Suboxone, Zubsolv; `candidateId: "buprenorphine"`; provenance `components: "recall"`). Remove `naloxone_sl_with_buprenorphine`, and remove "Suboxone" from buprenorphine's own aliases.
- **Route clean-ups**: `loperamide_oral_incl_high_dose_misuse` → `loperamide_oral` (route "Oral"); `etizolam_oral_often_illicit` → `etizolam_oral`; `fluoxetine_oral_incl_weekly` → `fluoxetine_oral` plus `fluoxetine_oral_weekly_dr` (`formulation: "ER"`, release half-life null).
- Any patient-session dose entry referencing a removed or split product id loads with a prompt to pick the replacement.

### Shared product rules

Put the product rules above (input inference, release-form splits, depot splits, combination, clean-ups) in one module, `tools/product-rules.ts`, used by **both** `migrate-v2` and `init-data`, so a fresh `init-data` produces the same v2 product set.

### Migration report

`docs/migration_v2_report.md` lists: counts of each transform; every auto-assigned formation-limited compound; every split/merged/renamed product with old → new ids; every safety enum changed to `unassessed`; and these known items for review from the opioid pass: morphine early vs terminal phase, methadone acute vs steady-state, buprenorphine formulation-specific half-lives, oxymorphone and MC5 ranges (candidates for `rangeType: "cv"`), meperidine/normeperidine and oxycodone half-life ranges without a typical value, and kratom compounds.

## Validator changes

- Accept and require `schemaVersion: 2`. Reject `0` where `null` is required by the rules above (half-lives, fractions, MW, weights) with an error pointing to the field.
- `Range`: if any bound is set, `typical` must be set; `min ≤ typical ≤ max` where present; `cv` required if `rangeType` is `cv`; all values > 0.
- `mode: "intrinsic"` requires `halfLifeHours.typical`. `earlyPhase.fraction` in (0, 1).
- Components: compounds exist; `ratio > 0`; `saltFactor` in (0, 1.5]; `bioavailability` in (0, 1].
- Input: `first-order-release` and `zero-order` validate `releaseHalfLifeHours` when set; `zero-order` requires a rate unit.
- `verified: true` requires: no section with provenance `gap` among `halfLife` and `metabolism`; `mode` not `unknown`; a source and date. Warn (not error) if any section is still `recall` or `estimate`.
- Progress report adds: counts by provenance tag, compounds by `mode`, unassessed safety fields by category.

## Editor changes

- Every numeric field has an **"unknown"** checkbox that sets `null`. Range editor with `rangeType` selector and `cv` input.
- `mode` selector, `earlyPhase` and `steadyState` sub-forms, per-edge `fraction` (with unknown) and `cyp2d6Multiplier`.
- Product editor: components (add/remove, ratio, salt factor, bioavailability), `doseUnit`, `formulation`, input model with release half-life and default duration, `typicalDose`, `secondaryCategories`.
- **Provenance** chip per section (`checked` / `recall` / `estimate` / `gap` / `reviewer`). Editing a value sets it to `reviewer`.
- New **"Priority review"** view: a sortable list across all entries of: QT `known`/`possible`; strong or mechanism-based CYP2D6 inhibitors; terminal half-life > 48 h; depots and patches; any `estimate` on half-life, phase, fraction or release; migration auto-assumptions. Each row links to the entry.
- Queue filters add: "has draft values", "has unknown kinetics", "has auto-assumptions".
- The sidebar shows products grouped under their candidate via `candidateId` (combination products appear under their primary component's candidate).

## Tests to add

- Two-pool compound matches the analytic biexponential `D[f·e^(−k₁t) + (1−f)·e^(−k₂t)]`.
- Formation-limited metabolite's curve shape tracks its parent (normalized curves within 5% after the parent's peak).
- Null-fraction edge: normalized metabolite clear time equals the clear time with fraction 1.
- Zero-order input: steady-state amount ≈ `rate / k`; after removal, decay at the release half-life when a skin depot is set.
- First-order release slower than elimination: terminal slope equals the release rate (flip-flop).
- Combination product delivers `amount × ratio × saltFactor × bioavailability` to each component.
- CYP2D6 formation multiplier changes the metabolite's amount but not the parent's curve.
- Clear status: `unknown` downstream compound → "incomplete"; with the setting on → "with assumptions".
- QT summed load disabled when any lane lacks calibration.
- Migration: a fixture of v1 opioid entries (including tagged notes, zeros and a combined depot) migrates to an expected v2 snapshot; running it twice is a no-op.
- v1 session file loads and migrates to v2.

## Implementation order

1. Types and schema v2 (`types.ts`, `schema.ts`), `tools/product-rules.ts`.
2. `migrate-v2` script and its tests; update `init-data` to emit v2.
3. Validator v2.
4. Simulation changes in `pk.ts` with tests.
5. Clear status, chart labelling, QT lanes, export section.
6. Dose entry changes and session v2 migration.
7. Editor changes.
8. README: update the data model, the model-and-limitations section, and the migration steps.

Commit after each step with the tests passing.
