# ClearDate — Spec v2.1 Addendum

A **delta** on `docs/ClearDate_Spec_v2.md` (as implemented). Everything in v1 and v2 still applies unless changed here. It comes from the second data-population pass (`docs/prepopulation_report_v2.md`), which showed the v2 model blocks clear dates on irrelevant metabolites, can't store range-only evidence, and leaves some partially specified fields without defined behaviour. It also adds the editor review workflow.

## 1. Metabolite clinical relevance

**Problem:** most conjugates have no published half-life and aren't confirmed formation-limited, so they're `unknown`. Under v2 rules that makes nearly every product "Incomplete", even when the unknown metabolite is pharmacologically inactive and irrelevant to treatment safety.

**Schema:** add to every compound:

```json
"clinicalRelevance": "active" | "inactive" | "unknown"
```

- `active`: pharmacologically active, toxic (e.g. normeperidine), QT-relevant, or a CYP inhibitor. Anything that could matter on treatment day.
- `inactive`: documented as pharmacologically inactive and not toxic, QT-relevant or CYP-inhibiting.
- `unknown`: not assessed.
- New provenance and `sourceNotes` section: `relevance`.
- Parent compounds (`isMetabolite: false`) and compounds that are also dosed directly are always treated as `active`, whatever the field says. The validator warns if they're set otherwise.

**Clear status changes (replaces the v2 rule):**

- A product is **clear** when every reachable compound whose relevance is `active` or `unknown` is clear.
- `inactive` compounds are still simulated and plotted when their kinetics are known, but never hold up the clear date and never make a product "Incomplete".
- An `inactive` compound with `unknown` kinetics is listed in the export's "Assumptions and missing data" section as "inactive metabolite, kinetics unknown — excluded from clear date", so the exclusion is visible.
- An `unknown`-relevance compound with `unknown` kinetics still makes the product "Incomplete" (unchanged).
- Chart: `inactive` metabolites are drawn fainter and hidden by default (Settings: "Show inactive metabolites", default off).

## 2. Range-only evidence

**Problem:** depot labels (Sublocade 43–60 days, Brixadi weekly 3–5 days and monthly 19–26 days, Vivitrol 5–10 days) report only a range. The validator rejects `min`/`max` without `typical`, so the data sits in notes.

- A `Range` may now have `typical: null` with both `min` and `max` set, when `rangeType` is `observed-range` or `cohort-means`.
- The app derives `typical = √(min × max)` (geometric midpoint) and labels it "assumed midpoint of reported range" in tooltips and the export.
- `kinetics.mode: "intrinsic"` requires either `typical` or both `min` and `max`. Same for `releaseHalfLifeHours` when set.

## 3. Undefined partial data: the conservative rule

**General principle:** when a field is partially specified and the app has to choose, it uses **whichever option gives the later clear date**, and labels the choice as an assumption. Document this in the README.

Specific cases:

- **`earlyPhase` with `fraction: null`** (e.g. morphine): simulate without the early phase, so the whole dose follows the terminal half-life. Label: "early phase ignored (fraction unknown) — conservative".
- **`steadyState` with `afterDays: null`** (e.g. methadone, desalkylflurazepam): when any regimen is present, run both the single-dose and steady-state kinetics for that product and use the **later** clear date for status. The band spans both runs. Label: "steady-state onset unknown — later of single-dose and steady-state clearance used".
- **`steadyState` with `afterDays` set but `halfLifeHours` null**: ignore `steadyState`.
- Validator: these partial states are **warnings**, not errors, and appear in the progress report so they get resolved.

## 4. Phenotype multipliers of zero

- `formedFrom[].cyp2d6Multiplier` values may be **0** (e.g. codeine → morphine in poor metabolisers, per CPIC). A zero means the metabolite isn't formed for that phenotype. The chart notes "not formed in \<phenotype\> metabolisers" and the product's clear status ignores that branch.
- `cyp2d6.halfLifeMultiplier` values must stay > 0.
- A phenotype map may also be **partial**, with only some phenotypes known. Missing phenotypes are treated as 1 (normal) and labelled as assumed.

## 5. Data corrections: `npm run migrate-v2.1`

A one-off, idempotent script. It backs up to `public/drugs.v2-backup.json`, sets `"schemaVersion": 2.1` and writes `docs/migration_v2_1_report.md` listing every change.

- **Add `clinicalRelevance`** to every compound: `active` if `isMetabolite` is false or the compound is a primary component of any product; otherwise `unknown`. Add `relevance` to `provenance` (`null`) and `sourceNotes` (`""`).
- **Add `reviewedDates: {}`** to every compound and product (see section 6).
- **CYP2D6 inhibitor status that was never assessed**: set `cyp2d6.inhibitor` and `inhibitionType` from `none` to `unassessed` for compounds where `inhibitor` is `none` and `sourceNotes.cyp2d6` says inhibition was not assessed (regex: `inhibit[^.]*?(unassessed|not assessed|pending|not established|unconfirmed)`, case-insensitive). On the current data this affects exactly: buprenorphine, codeine, dextromethorphan, hydrocodone, loperamide, norbuprenorphine, oxycodone, tapentadol and tramadol. If the script's hits differ from this list, it should stop and report rather than apply. Append "Inhibitor status reset to unassessed by migration v2.1 (note said not assessed)." to the note.
- **Remove `baclofen_intrathecal`.** Intrathecal pump dosing and CSF clearance can't be represented by this model. Add to `baclofen_oral`'s `sourceNotes.input`: "Intrathecal baclofen not modelled (pump/CSF kinetics). Abrupt intrathecal withdrawal is a separate clinical risk." Session files referencing it get the replacement prompt as in v2.
- **Validator rule (ongoing):** warn when `cyp2d6.inhibitor` is `none` but the cyp2d6 note matches the regex above.

## 6. Editor review workflow

(This section was intended for v2 but did not reach the implemented spec.)

The editor's main job is reviewing drafted values, not typing new ones. Most of the time the reviewer confirms a value rather than changes it, so confirming must be one action.

### Per-section review state

- A section is **reviewed** when its provenance is `reviewer`. `reviewedDates: { <section>: "YYYY-MM-DD" }` (added by the v2.1 migration) is stamped whenever a section becomes reviewed.
- Compound sections: `halfLife` (all of `kinetics`), `metabolism` (`formedFrom` fractions and multipliers), `relevance` (`clinicalRelevance`, metabolites only), `molecularWeight`, `cyp2d6`, `qt`, `receptors`, `lingeringEffects`, `nonlinearKinetics`. Product sections: `class`, `aliases`, `components`, `input`, `typicalDose`.
- A section can be marked **not applicable** (e.g. `lingeringEffects` for most drugs): it is set to its empty/`none` value with provenance `reviewer` and the note "N/A — reviewer".

### Section actions

Each section shows its fields, its provenance chip, its source note (with links opening in a new tab) and three actions:

- **Confirm** — keeps the values as they are, sets provenance `reviewer`, stamps the date, and moves to the next unreviewed section. Keyboard: `Enter` (when focus is not in a text field) or `Ctrl/Cmd+Enter`.
- **Edit** — editing any field sets provenance `reviewer` on save (as before).
- **Flag** — keeps the section unreviewed and adds a reviewer note (stored in `sourceNotes.<section>`, prefixed "REVIEWER FLAG:") for follow-up. Flagged sections get their own filter.

Confirm is disabled if the section fails validation. Confirming a section whose values are `null`/`unassessed` is allowed only via "Confirm as unknown", which keeps the nulls and adds "Confirmed unknown — reviewer" to the note, so unknowns are a deliberate decision rather than an oversight.

### Review mode

A focused mode (toggle in the header) that steps through **only unreviewed sections**, across the whole queue or within the current filter (category, priority list, provenance tag, flagged):

- One section on screen at a time: compound/product name and category, the fields, the drafted values, provenance, the full source note, and any related context (for a metabolite: its parent's half-life; for QT: the compound's other QT-relevant data).
- **Confirm**, **Edit**, **Flag**, **Skip** and **Back**; progress shown as "Section 37 of 412 in this filter".
- Option to step **by section type across entries** (e.g. all unreviewed `halfLife` sections in Sedatives, then all `cyp2d6` sections), which makes like-for-like judgements faster and more consistent.
- Within the normal entry view, **"Next incomplete"** (`N`) jumps to the next unreviewed or invalid section of the current entry, then to the next entry.

### QT calibration table

QT weights are relative, so they must be set on one consistent scale. A dedicated view:

- One row per compound with `qt.tier` other than `none` (including `unassessed`), sortable and filterable by tier and category.
- Columns: compound, category, tier, provenance, weight, reference amount (mg), terminal half-life, and the QT source note (expandable). hERG IC50 or thorough-QT figures in the note are shown in full.
- Tier, weight and reference amount are edited inline; Confirm per row. A short guidance note at the top states the scale (e.g. "weight 1.0 = reference-strength effect at the reference amount"), editable and saved in `drugs.json` as `qtCalibrationNote` at the top level.
- A small preview: pick two or three compounds and amounts and see their relative contributions on the shared scale.

### Verification

- **Verify entry** is enabled only when every section of the compound (or product) is reviewed or marked not applicable, and validation passes. It stamps `verified: true` and `verifiedDate`.
- A candidate counts as verified when its primary compound, every compound in its metabolite tree and all its products are verified (as before). Shared compounds verified under another candidate show "✓ verified via \<candidate\>".
- Validator: `verified: true` with any section not `reviewer` is an **error**.

### Progress

- The sidebar and the validator's progress report count **sections** reviewed as well as entries verified: e.g. "Sedatives — 212 / 380 sections reviewed · 9 / 36 drugs verified".
- Filters add: "unreviewed sections", "flagged", "confirmed unknown".


## 7. Validator summary of v2.1 changes

- Accept `schemaVersion` 2.1; `clinicalRelevance` required on every compound.
- Range-only rules (section 2); conservative-rule partial states as warnings (section 3); zero and partial formation multipliers (section 4); inhibitor-note warning (section 5).
- `verified: true` requires every section reviewed (section 6), including `relevance` for metabolites. A metabolite cannot be verified with `clinicalRelevance: "unknown"`.
- Progress report adds: metabolites by relevance, and products currently "Incomplete" broken down by whether the blocking compounds are `unknown`-relevance or `active`.

## 8. Tests to add

- Clear status ignores an `inactive` metabolite with unknown kinetics; an `unknown`-relevance one still makes the product "Incomplete".
- Range-only `Range` derives the geometric midpoint and labels it.
- `earlyPhase.fraction: null` gives the same curve as no early phase.
- `steadyState.afterDays: null` with a regimen uses the later of the two clear dates.
- A zero formation multiplier for the patient's phenotype removes that branch from the curve and from clear status.
- `migrate-v2.1`: fixture covering relevance defaults, the inhibitor reset (including the stop-if-hits-differ check), baclofen removal; idempotent.
- Review logic: Confirm sets provenance `reviewer` and stamps the date without changing values; "Confirm as unknown" keeps nulls; Verify is blocked while any section is unreviewed; the validator errors on a verified entry with an unreviewed section.

## 9. Implementation order

1. Types/schema 2.1, validator updates.
2. `migrate-v2.1` and its tests; update `init-data` to emit 2.1.
3. Simulation and clear-status changes (sections 1–4) with tests.
4. Chart and export labelling for the new assumptions; "Show inactive metabolites" setting.
5. Editor: `clinicalRelevance` field, range-only input, zero multipliers.
6. Editor review workflow (section 6).
7. README updates: clinical relevance, the conservative rule, the review workflow.

Commit after each step with tests passing.
