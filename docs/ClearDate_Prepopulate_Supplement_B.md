# Task: ClearDate data supplement B — drugs common at intake

The full candidate queue (orders 1–227) has had a draft pass. This is a final targeted pass on the gaps that matter most in practice: drugs clinicians see constantly at intake, and CYP2D6 inhibitors missing from the inhibition track. After this, the work moves to clinician review in the editor.

## Rules

Everything in `docs/ClearDate_Prepopulate_Prompt_v2.1.md` applies — read it first: field instructions, sourcing rules (provenance tags, `DRAFT —` source prefix, no invented citations, `null`/`unassessed` over guesses), never touching `verified` entries or `reviewer` sections, never setting `verified`, running `npm run validate` after each part. Also read `docs/ClearDate_Prepopulate_Supplement_A.md` for the blocker-resolution approach used before.

- `public/drugs.json` must be at `"schemaVersion": 2.1`; stop if not.
- Back up first to `backups/drugs.before-supplement-b.json`.
- Don't change IDs, links, categories or component lists. Where the right fix is **structural** (a component, link or product change), don't make it — write it up as a recommendation in the report (Part 4) and in `user_to_do.md`.

Compute product statuses with the app's own functions (`productDataStatus`, `productTree`, `effectiveRelevance` in `src/model.ts`), as in the previous pass. Report before/after counts.

## Part 1 — Blockers for common intake drugs

Resolve in this order. For each compound, one of these resolves the block — choose what the evidence supports: **intrinsic kinetics** from human data; **`formation-limited`** where a source documents faster elimination than formation; **`inactive`** relevance where a source documents pharmacological inactivity (and nothing suggests toxicity, QT or CYP relevance). Otherwise leave it and state what evidence would resolve it.

| Products affected | Blocking compounds |
|---|---|
| Buprenorphine (all forms, incl. buprenorphine/naloxone and depots) | `norbuprenorphine`, `buprenorphine_3_glucuronide` |
| Amphetamine, lisdexamfetamine, methamphetamine | `4_hydroxyamphetamine`, `4_hydroxymethamphetamine` |
| Cannabis (Δ9-THC) | `11_oh_thc` (and check `thc_cooh`) |
| Cocaine | `norcocaine` (and check every other compound in cocaine's tree) |
| MDMA, MDA, MDEA | `hma` (and check `hmma`, `hmea`) |
| DMT, ayahuasca DMT | `indole_3_acetic_acid` (endogenous — document its endogenous status), `dmt_n_oxide` |
| 5-MeO-DMT | `bufotenine` |
| Ketamine, esketamine | `hydroxynorketamine` (and `dehydronorketamine`) |
| Hydromorphone, hydrocodone | `hydromorphone_3_glucuronide` |
| Heroin | `6_monoacetylmorphine` |
| Haloperidol | `reduced_haloperidol` |
| Diltiazem | `n_desmethyldiltiazem` |

Then recompute the full blocker list with the app's functions and continue in order of products blocked, prioritising drugs likely at ibogaine intake (opioids, benzodiazepines, stimulants, cannabis, alcohol, psychedelics, antidepressants).

Note for buprenorphine: norbuprenorphine has a long terminal phase in published human data; distinguish healthy-volunteer from maintenance-patient data and single-dose from steady-state, and use `steadyState` if they differ meaningfully.

## Part 2 — "No data yet" products likely at intake

These have no usable kinetics for their primary compound. Populate in this order:

1. `7_hydroxymitragynine` (concentrated 7-OH kratom products are increasingly common at intake)
2. `harmine`, `harmaline` (ayahuasca; MAO-A inhibition matters for ibogaine — make sure their MAO inhibition, reversibility and duration are in the notes and `lingeringEffects`)
3. `clorazepate` (prodrug of nordiazepam — document presystemic conversion; see Part 4)
4. `gbl` (converts to GHB)
5. `phenibut`
6. `bromazolam`, `flubromazolam` (designer benzodiazepines)
7. `isotonitazene`, `carfentanil` (adulterants)
8. `delta8_thc` products
9. `isocarboxazid` (irreversible MAOI — enzyme recovery duration in `lingeringEffects`)
10. `kavalactones`, `mesembrine`, `salvinorin_a`, `methoxetamine`, `alpha_pvp`, `mdpv`, synthetic cannabinoids, `ibotenic_acid`

**Do not give a half-life** to these — report them under Part 4 instead:
- **`psilocybin`** and **`1p_lsd`** — prodrugs converted almost immediately to psilocin and LSD. Record the conversion evidence in their notes; the likely structural fix (product component = the active compound with a mass conversion factor) is for the reviewer.
- **`ethanol`** — zero-order (saturable) elimination, which this model can't represent. Record typical elimination rates in the notes for the reviewer.
- **`nitrous_oxide`** — eliminated in minutes by exhalation; its relevance is functional B12 inactivation, which lasts far longer. Put that in `lingeringEffects`.
- **`5_htp`**, **`l_tryptophan`** — endogenous precursors; record serotonergic relevance in notes and `lingeringEffects` only.

## Part 3 — CYP2D6 inhibitors missing from or understated on the track

1. **`haloperidol`** — both inhibitor fields are `unassessed`, so it doesn't appear on the track at all. Assess strength and mechanism; include `reduced_haloperidol`.
2. **`mdma`** — mechanism-based, strength `unassessed`. Look for human probe-substrate data (e.g. dextromethorphan studies after MDMA).
3. **`methadone`** — still strength `unassessed`.
4. Metabolites shown at "at least weak" because strength is unassessed: `desethylamiodarone`, `3_hydroxyquinidine`, `desmethylterbinafine`, plus any phenothiazine entries.
5. Sweep: any compound whose `sourceNotes.cyp2d6` reports inhibition evidence but whose `inhibitionType` is `unassessed`.

**Strength rule:** assign a tier only from **clinical** probe-substrate data, using the FDA thresholds for a sensitive CYP2D6 substrate's AUC ratio — **strong ≥ 5, moderate ≥ 2 and < 5, weak ≥ 1.25 and < 2** — or from the FDA examples table or a label statement. Physiologically based models may support an `estimate`-tagged tier if clearly described as model-derived (as in Supplement A). In-vitro Ki/IC50 alone never sets a tier; record it in the note and set the mechanism if the data support it.

## Part 4 — Structural recommendations (report only)

For each, describe the problem, the evidence, and the specific change you recommend (e.g. "psilocybin_oral components → psilocin, ratio 1, saltFactor = MW psilocin / MW psilocybin ≈ 204.3/284.2 = 0.719, confirm"). Include at least: psilocybin, 1P-LSD, clorazepate, ethanol, nitrous oxide, and anything else found during Parts 1–3. Don't make these changes.

## Report: `docs/prepopulation_report_supplement_b.md`

1. Before/after product status counts, overall and by category.
2. Part 1: each blocker — resolution chosen (or why unresolved), value, tag, source.
3. Part 2: each product — what was filled, tag, source.
4. Part 3: each inhibitor change (old → new, tag, basis), and those left unassessed with the evidence found.
5. Part 4: structural recommendations.
6. Conflicts and validation result.

Then append clinician items (decisions, structural recommendations, any estimate-tier inhibitors) to `user_to_do.md` under a new heading `## From supplement B <date>`, without editing existing content.
