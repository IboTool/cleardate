# Migration to schema 2.2

Run on 2026-10-20 by `npm run migrate-v2.2` (docs/ClearDate_Spec_v2.2.md §6). The v2.1 file is kept as `backups/drugs.v2.1-backup.json`. Every value set here is tagged `estimate` with a note citing Supplement B Part 4; the reviewer confirms.

Library after migration: 443 compounds, 340 products.

## Product status before and after

Computed with the app's status function (`productDataStatus`, "treat unknown as formation-limited" off, no alcohol in the scenario).

| Status | Before | After |
|---|---|---|
| Clear date computable | 199 | 204 |
| Incomplete (missing kinetics) | 119 | 118 |
| No data yet | 22 | 15 |
| Not modelled | 0 | 3 |

| Product | Before | After |
|---|---|---|
| `1p_lsd_oral` | no-data | incomplete |
| `5_htp_oral` | no-data | not-modelled |
| `clorazepate_oral` | no-data | ok |
| `gbl_oral` | no-data | ok |
| `l_tryptophan_oral` | no-data | not-modelled |
| `methylphenidate_oral_er` | incomplete | ok |
| `methylphenidate_oral_ir` | incomplete | ok |
| `methylphenidate_transdermal` | incomplete | ok |
| `nitrous_oxide_inhaled` | no-data | not-modelled |
| `psilocybin_oral` | no-data | incomplete |

## Prodrugs (§1)

| Product | Modelled as | Administered as | massFactor | Dose unit |
|---|---|---|---|---|
| `psilocybin_oral` | `psilocin` | `psilocybin` | 0.7186 | unchanged |
| `1p_lsd_oral` | `lsd` | `1p_lsd` | 0.8522 | µg |
| `clorazepate_oral` | `nordiazepam` | `clorazepate` | 0.662 | unchanged |
| `gbl_oral` | `ghb` | `gbl` | 1.2092 | unchanged |

The `components` and new `conversion` sections are tagged `estimate`. Clorazepate assumes label strengths as the dipotassium salt (confirm); GBL assumes complete conversion and GHB's own nonlinear kinetics are not represented.

## Alcohol (§2)

`ethanol`: `kinetics.mode` → `zero-order`, `zeroOrderRateMgPerKgPerHour` all null (reviewer fills it from the rate context in the half-life note). Until then its products show "No data yet". Dose unit → standard drinks: `ethanol_oral`.

## Not modelled (§3)

| Compound | Reason shown to users |
|---|---|
| `nitrous_oxide` | Exhaled within minutes; clinically relevant effect is prolonged vitamin B12 inactivation — see lingering effects |
| `5_htp` | Endogenous serotonin precursor; relevance is serotonergic interaction, not washout |
| `l_tryptophan` | Endogenous serotonin precursor; relevance is serotonergic interaction, not washout |

Entered as exposure sessions with a duration (dose unit `session`, zero-order input): `nitrous_oxide_inhaled`.

## Endogenous (§4)

`indole_3_acetic_acid`: `endogenous: true`. Its unknown kinetics stop blocking clear dates once its clinical relevance is reviewer-confirmed.

## Conditional metabolites (§5)

- `cocaethylene` ← `cocaine`: formed only while `ethanol` is also present.
- `ethylphenidate` ← `methylphenidate`: formed only while `ethanol` is also present.
