# ClearDate — Spec v2.2: Prodrugs, alcohol, non-pharmacokinetic exposures and conditional metabolites

A **delta** on v2 and v2.1 (as implemented). Everything there still applies unless changed here. It implements the structural proposals from `docs/prepopulation_report_supplement_b.md` (Part 4) that the data model couldn't represent. Work on a branch (`v2.2`) based on `main` **after** the `library` branch has been merged, keep `npm test` and `npm run validate` passing after each step, and commit per step. Ask before guessing.

## 1. Prodrugs and mass conversion

**Problem:** psilocybin, 1P-LSD, clorazepate and GBL are converted almost completely and almost immediately to another compound (psilocin, LSD, nordiazepam, GHB). They have no usable half-life of their own, so their products show "No data yet", and the existing `saltFactor` (salt → free base, ≤ 1.5) is the wrong concept for a molecular conversion — GBL → GHB has a mass factor above 1 because hydrolysis adds water.

**Schema** — product `components[]` entries gain two optional fields:

```json
{ "compound": "psilocin", "ratio": 1, "saltFactor": null, "bioavailability": null,
  "administeredAs": "psilocybin", "massFactor": 0.7186 }
```

- `administeredAs`: the compound id actually taken (must exist in `compounds`). Display only: the dose form, library, tooltips and export say "administered as psilocybin, modelled as psilocin".
- `massFactor` (0 < x ≤ 2): mass of the modelled compound per unit mass of the administered compound (molar conversion). Dose delivered to the modelled compound = `D × ratio × (saltFactor ?? 1) × (massFactor ?? 1) × (bioavailability ?? 1)`.
- Product provenance/notes gain a `conversion` section.
- The administered compound keeps its own library entry (relevance, receptors, notes); it just isn't simulated for these products.

**Clear status:** unaffected in principle — clear dates follow the modelled compound's tree. Label the product "prodrug — modelled as \<compound\>" in the tooltip and export assumptions.

## 2. Alcohol: zero-order elimination

**Problem:** ethanol is eliminated at a roughly constant rate over usual concentrations; a half-life is the wrong model.

**Schema** — `kinetics.mode` gains `"zero-order"`:

```json
"kinetics": { "mode": "zero-order", "zeroOrderRateMgPerKgPerHour": { "typical": null, "min": null, "max": null, "rangeType": null, "cv": null } }
```

- Elimination: `dA/dt = −rate × bodyWeightKg` while `A > 0`, floored at 0. Uses the patient's weight — the **one exception** to "weight doesn't change the curves". If weight is missing, the product shows "Needs body weight" instead of a clear date.
- Range bands use the rate's min/max; the **clear date uses the slowest rate** (conservative rule).
- **Clear** for zero-order compounds = amount reaches zero (not a fraction of peak).
- Ethanol's metabolite `acetaldehyde` keeps its existing link; formation fraction as data allows.
- **Dose entry** for ethanol products: unit "standard drinks" (default 14 g ethanol each, configurable in Settings with a note on country differences) or grams of ethanol; regimens ("N drinks per day").
- Withdrawal risk is not modelled by elimination — keep it in `lingeringEffects` and show the lingering band as usual.
- Validator: `zero-order` requires the rate `Range`; without it the product is "No data yet".

## 3. Exposures that aren't modelled pharmacokinetically

**Problem:** nitrous oxide leaves the body within minutes, but its clinically relevant effect (functional vitamin B12 inactivation) lasts much longer; 5-HTP and L-tryptophan are endogenous precursors whose relevance is serotonergic, not washout. A half-life answers the wrong question for all three.

**Schema** — `kinetics.mode` gains `"not-modelled"`, with a required `kinetics.notModelledReason` string shown to users.

- Products whose primary compound is `not-modelled` are plotted as **exposure markers** (a tick or short bar at each dose time, or across the exposure interval for zero-order input) plus their **lingering-effects band**, never as a decay curve.
- Status: **"Not modelled — \<reason\>"**, a distinct status from "No data yet", shown in the tooltip, library and export. It never produces a clear date; the lingering band is the clinically relevant output.
- Dose entry for nitrous oxide: exposure sessions with duration (no mass dose).

## 4. Endogenous metabolites

**Problem:** indole-3-acetic acid (from DMT) is also produced endogenously; treating all of it as a decaying exogenous dose is wrong, and it currently blocks DMT products.

**Schema** — compounds gain optional `endogenous: true` with a note.

- Endogenous compounds are simulated if they have kinetics (as the exogenous excess), but **never block clear status** when their kinetics are unknown, provided their relevance has been reviewed. Label: "endogenous — excess over baseline not modelled".
- The library shows an "endogenous" chip.

## 5. Conditional metabolite formation

**Problem:** cocaethylene (cocaine + alcohol) and ethylphenidate (methylphenidate + alcohol) only form when alcohol is present, but currently every cocaine or methylphenidate dose is treated as forming them — overstating exposure and blocking clear dates.

**Schema** — `formedFrom[]` edges gain optional `condition: { "requiresCompound": "ethanol" }`.

- A conditional edge is active only for the parts of the simulation where the required compound's simulated amount is > 0 at the same time as the parent. Otherwise the metabolite isn't formed and doesn't affect clear status.
- If active and the fraction is unknown, the existing normalized-curve rule applies.
- When active, the tooltip and export say "formed because alcohol was also taken".

## 6. Migration: `npm run migrate-v2.2`

One-off and idempotent; backs up to `backups/drugs.v2.1-backup.json`; sets `"schemaVersion": 2.2`; writes `docs/migration_v2_2_report.md`. Provenance for every value it sets is `estimate`, with notes citing Supplement B Part 4 — the reviewer confirms.

| Change | Values |
|---|---|
| `psilocybin_oral` | component → `psilocin`, `administeredAs: "psilocybin"`, `massFactor: 0.7186` (204.27 / 284.25) |
| `1p_lsd_oral` | component → `lsd`, `administeredAs: "1p_lsd"`, `massFactor: 0.8522` (323.43 / 379.5); dose unit µg |
| `clorazepate_oral` | component → `nordiazepam`, `administeredAs: "clorazepate"`, `massFactor: 0.6620` (270.71 / 408.92, label strengths as clorazepate dipotassium — note to confirm) |
| `gbl_oral` | component → `ghb`, `administeredAs: "gbl"`, `massFactor: 1.2092` (104.10 / 86.09, assumes complete conversion); note GHB's own nonlinear kinetics |
| `ethanol` | `kinetics.mode: "zero-order"`, rate `Range` all null (reviewer fills from the rate context already in its notes); ethanol products: dose unit "standard drinks" |
| `nitrous_oxide` | `kinetics.mode: "not-modelled"`, reason "Exhaled within minutes; clinically relevant effect is prolonged vitamin B12 inactivation — see lingering effects" |
| `5_htp`, `l_tryptophan` | `kinetics.mode: "not-modelled"`, reason "Endogenous serotonin precursor; relevance is serotonergic interaction, not washout" |
| `indole_3_acetic_acid` | `endogenous: true` |
| `cocaethylene` ← `cocaine`, `ethylphenidate` ← `methylphenidate` | edge `condition: { "requiresCompound": "ethanol" }` |

Check every listed id exists before applying; if any is missing or already changed, stop and report. Report before/after product status counts using the app's status functions.

Also apply the `clorazepate` / `psilocybin` / `1p_lsd` / `gbl` component rules to `tools/product-rules.ts` and `init-data` so a fresh build matches.

## 7. Validator, editor, library, help

- **Validator:** new fields and modes as above; `massFactor` in (0, 2]; `administeredAs` exists; `condition.requiresCompound` exists; `zero-order` and `not-modelled` rules; `endogenous` must be boolean.
- **Editor:** fields for `administeredAs`/`massFactor` (with a molar-mass helper that computes the factor from the two compounds' `molecularWeight` when both are set), zero-order rate `Range`, `notModelledReason`, `endogenous`, edge `condition`. Review-workflow sections: `conversion` (product), and the new kinetics fields under `halfLife`.
- **Library:** show "administered as / modelled as", zero-order rate, "not modelled" reason, endogenous chip, conditional edges (dashed, labelled "with alcohol").
- **Help page and README:** short subsections on prodrugs, alcohol (needs weight; standard-drink size setting), not-modelled exposures, and conditional metabolites; regenerate affected screenshots.

## 8. Tests

- Prodrug dose: delivered amount equals `D × ratio × massFactor` to the modelled compound; administered compound not simulated; labels present.
- Zero-order: linear decline at `rate × weight`; clear at zero; slowest rate sets the clear date; "Needs body weight" without weight; standard-drink conversion and setting.
- Not-modelled: no curve, exposure marker and lingering band drawn; status text; no clear date.
- Endogenous: unknown kinetics don't block once relevance is reviewed.
- Conditional edge: no metabolite without overlapping ethanol; formed with overlap; clear status changes accordingly.
- Migration: fixture → expected snapshot; idempotent; stops on missing ids.

## 9. Order

1. Types, schema 2.2, validator.
2. `migrate-v2.2` + tests (run on a temp copy; apply to `public/drugs.json` only after step 3 passes).
3. Simulation and status: prodrug components, zero-order, not-modelled, endogenous, conditional edges.
4. Dose entry (standard drinks, exposure sessions), chart rendering (exposure markers), tooltips, export.
5. Editor and library.
6. Help, README, screenshots.

Final summary: what was built, migration report highlights (status counts before/after), deviations, open questions.
