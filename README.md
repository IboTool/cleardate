# ClearDate

Client-side drug clearance visualiser for ibogaine-clinic intake. Reference use only — not a medical device.

**Using ClearDate:** see the [help page](help.html) (`/help.html` on the deployed site, or the *Help* button in the app). This README is for developers.

**The drug data.** Drug data was drafted with the assistance of AI language models from published, cited sources (FDA labels, Baselt, CredibleMeds, the Flockhart table, CPIC, the IUPHAR/BPS Guide to Pharmacology and the primary literature). Every value records its source. Entries are reviewed and verified by hand against those sources; entries marked **Draft** have not yet been verified. The library will keep growing. `npm run validate` prints the current verification progress; in the app, the *Library* button (`#library`) shows every entry with its status and sources, and the help page and PDF export show live verified counts.

## What's in this starter

| Path | Purpose |
|---|---|
| `docs/ClearDate_Cursor_Prompt.md` | The full build spec (v1). Give this to Cursor. |
| `docs/ClearDate_Spec_v2.md` | Delta spec for the v2 data model and kinetics (implemented). |
| `docs/migration_v2_report.md` | What `npm run migrate-v2` changed in `public/drugs.json`, and what to review. |
| `start-cleardate.bat` / `start-editor.bat` / `stop-cleardate.bat` | Windows launchers: start the app / the data editor and open the browser; stop both. |
| `docs/ClearDate_Candidate_Drug_List.md` | Human-readable candidate list (213 rows, by category). |
| `docs/ClearDate_Data_Sources.pdf` | Where to find each value, with links. |
| `tools/candidates.json` | Machine-readable work queue: 9 categories, 227 drugs, 443 compounds with metabolite links. Structure only — no PK values. |
| `tools/build_candidates.py` | Regenerates `candidates.json` if you edit the Markdown list. |

## Getting started

1. Create an empty GitHub repo and copy these files into it, keeping the folder layout.
2. Open the repo in Cursor. In Agent mode, attach `docs/ClearDate_Cursor_Prompt.md` and ask it to build the project as specified.
3. When it's done:
   ```bash
   npm install
   npm run init-data   # builds public/drugs.json from tools/candidates.json (structure only)
   npm run dev         # the app; use Settings → Load demo data to try the UI
   npm run editor      # local data editor — work through the queue
   npm run validate    # check drugs.json and see progress
   ```
4. Commit after each editor session.
5. Deploy: in Cloudflare Pages, connect the repo. Build command `npm run build`, output directory `dist`.

## Editing the candidate list

Edit `docs/ClearDate_Candidate_Drug_List.md`, then:

```bash
python3 tools/build_candidates.py docs/ClearDate_Candidate_Drug_List.md tools/candidates.json
```

Rows that combine several drugs or contain metabolite chains are handled by the `OVR` table in the script; add an entry there for any new row of that kind. Brand and street names live in the `ALIASES` table.

## Launching on Windows

Double-click **`start-cleardate.bat`**. It runs `npm install` the first time, starts the dev server in a window titled *ClearDate server* (port 5173), waits until it answers and opens http://localhost:5173/ in the default browser. If the server is already running it just opens the browser.

Double-click **`start-editor.bat`** to start the local data editor for reviewing `drugs.json` (http://127.0.0.1:5174, window *ClearDate editor*) the same way. Afterwards, run `tools\push-drugs.bat` to publish your edits.

Double-click **`stop-cleardate.bat`** to stop the app and the editor. It kills whatever is listening on ports 5173 (app), 5174 (data editor) and 4173 (`npm run preview`). Closing the *ClearDate server* window works too.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | App at http://localhost:5173. In dev, Settings → *Load demo data* adds the fictional compounds in `tools/demo-drugs.json`. |
| `npm run build` | Runs the validator (`prebuild`), type-checks and writes the static site to `dist/`. The build fails if `drugs.json` has errors. Demo data is never bundled. |
| `npm run preview` | Serves `dist/` locally. |
| `npm test` | Unit tests (PK simulation, model and clear status, migration, search, serialisation, sessions). |
| `npm run init-data` | Creates a schema 2.1 `public/drugs.json` from `tools/candidates.json` with every value unknown (`null` / `unassessed`). Uses the same product rules as the migrations, so it yields the same product set. Refuses to overwrite an existing file; `--force` overwrites, `--out <path>` writes elsewhere. |
| `npm run migrate-v2` | One-off migration of a v1 `drugs.json` to schema v2 (see below). Does nothing if the file is already v2. |
| `npm run migrate-v2.1` | One-off migration of a v2 `drugs.json` to schema 2.1 (see below). `--dry-run` reports without writing. Does nothing if the file is already 2.1. |
| `npm run validate` | Checks `public/drugs.json` (or a path given as an argument) and prints errors, warnings and per-category progress. Exits non-zero on errors. |
| `npm run editor` | Local data editor at http://127.0.0.1:5174. |
| `npm run screenshots` | Regenerates the help page screenshots in `public/help/img/` (and the callout positions in `callouts.json`) with Playwright, from the fictional patient and fixed date in `tools/help-scenario.json`. Run it after UI or library changes, then check the callout lists in `help.html`. First time only: `npx playwright install chromium`. |

## Deploying to Cloudflare Pages

The repo lives at https://github.com/IboTool/cleardate (branch `main`).

1. In the Cloudflare dashboard: Workers & Pages → Create → **Pages** tab → *Import an existing Git repository*, and pick `IboTool/cleardate`.
2. Production branch `main`. Framework preset *None* (or *Vite*). Build command `npm run build`. Build output directory `dist`. Leave the root directory empty.
3. Deploy. Then, under the project's *Custom domains*, add your domain.

Cloudflare builds the site itself: `npm run build` validates `drugs.json`, type-checks, and writes the static site to `dist/`, including `dist/index.html`. Don't commit `dist/`. `.node-version` pins Node 22 for the build. `public/_headers` sets security headers, makes browsers revalidate `drugs.json` on every load, and caches the hashed `assets/` files for a long time. Every push to `main` redeploys within a minute or two; other branches get preview URLs. If `drugs.json` has validation errors, the build fails and the previous version stays live.

**Pushing changes (Windows):**

- `push-cleardate.bat` validates `drugs.json`, commits everything (it asks for a message), and pushes.
- `tools\push-drugs.bat` commits and pushes only `public/drugs.json`, after validating it. Run it after an editor session to update the live library.

The site is fully static: no backend, no analytics, no external requests at runtime (the Inter font is bundled). A Content-Security-Policy in `index.html` restricts everything to the site's own origin. Patient sessions live only in the browser's `localStorage`; *Save file* / *Load file* move them between machines as `.cleardate.json` files, which `.gitignore` keeps out of the repo.

## Editing `drugs.json`

The file is schema 2.1 (`"schemaVersion": 2.1`); the field rules are in `docs/ClearDate_Spec_v2.md` and its addendum `docs/ClearDate_Spec_v2.1.md`. Three principles run through it:

- **Unknown is `null`, never `0`.** Every number without data is `null`. Safety enums (QT tier, CYP2D6 substrate / inhibitor / inhibition type, nonlinear kinetics) have an explicit `unassessed` value, and `receptorsAssessed: false` means an empty receptor list hasn't been researched. The app and the export always show these as "unassessed", never as "none". (The one deliberate zero is a CYP2D6 *formation* multiplier, see below.)
- **Provenance per section.** Each compound section (`halfLife`, `metabolism`, `relevance` for metabolites, `molecularWeight`, `cyp2d6`, `qt`, `receptors`, `lingeringEffects`, `nonlinearKinetics`) and each product section (`class`, `aliases`, `components`, `input`, `typicalDose`) has a tag: `checked`, `recall`, `estimate`, `gap` or `reviewer`, with a free-text note in `sourceNotes` and, once reviewed, a date in `reviewedDates`. Anything `recall` or `estimate` shows a *draft* badge.
- **Conservative choices.** When a field is only partly known and the app has to choose, it picks whichever option gives the **later** clear date, and labels the choice as an assumption (see *The model* below).

The library has three lists.

- **`compounds`**: every parent drug and every metabolite, each defined once.
  - Half-lives are **ranges**: `{ typical, min, max, rangeType, cv }`. `rangeType` says what the bounds mean (`observed-range`, `mean-2sd`, `cohort-means`, `cv`, `single-value`). With `cv` the app derives a lognormal 95 % band. With `single-value` it applies the *assumed spread* from Settings (default CV 30 %) and labels it as such. When a source gives only a range (e.g. a depot label's "43–60 days"), leave `typical` `null` and set both bounds with `rangeType` `observed-range` or `cohort-means`: the app uses the geometric midpoint √(min × max) and labels it "assumed midpoint of reported range".
  - `clinicalRelevance` is `active`, `inactive` or `unknown`. It decides whether a metabolite can hold up a clear date (see *Clear status*). Parent compounds and any compound a product doses directly always count as `active`, whatever the field says.
  - `kinetics.mode` is `intrinsic` (uses `halfLifeHours`, the terminal phase), `formation-limited` (the compound tracks its parent: typical for glucuronide and sulfate conjugates, no half-life needed) or `unknown` (can't be simulated).
  - Optional `kinetics.earlyPhase` (`{ fraction, halfLifeHours }`) models a fast first phase, such as morphine's. Optional `kinetics.steadyState` (`{ afterDays, halfLifeHours }`) switches to a different half-life once a regimen has run long enough, such as methadone's.
  - A metabolite lists its parents in `formedFrom`: `{ compound, fraction, cyp2d6Multiplier }`. `fraction` is the share of the parent that becomes this metabolite, or `null` if unknown. `cyp2d6Multiplier` scales the fraction per phenotype (codeine → morphine); a value of `0` means the metabolite isn't formed in that phenotype (e.g. morphine in poor metabolisers, per CPIC). A compound can have several parents, chains can be any depth, known fractions out of one parent must sum to 1 or less, and links must not form a cycle.
  - `cyp2d6.halfLifeMultiplier` scales the compound's own half-life per phenotype; its values must be above 0.
  - Both phenotype maps may be **partial**: list only the phenotypes with data. A missing phenotype counts as ×1 and is labelled as assumed.
  - QT weight and its calibration amount (`qt.weight`, `qt.referenceAmountMg`) are set only by a reviewer.
- **`products`**: what a patient actually takes.
  - `candidateId` ties the product to its entry in `tools/candidates.json`.
  - `components` lists what one dose delivers: `{ compound, ratio, saltFactor, bioavailability }`. Most products have one component. Buprenorphine/naloxone has two (ratio 1 and 0.25), and the first component is the one the dose is labelled by.
  - `doseUnit` is `mg`, `µg`, `µg/h` or `mg/h`. `formulation` is `IR`, `ER`, `SR`, `XL`, `XR`, `CR`, `depot` or `patch`.
  - `input` says how a dose enters the body: `bolus` (instant), `first-order-release` (a release compartment with `releaseHalfLifeHours`, for depots and ER forms), or `zero-order` (a constant rate for a wear time, for patches and infusions, optionally through a skin depot). `defaultDurationHours` prefills patch wear time.
  - `typicalDose` (`{ amount, unit, basis }`) is only a placeholder in the dose form.
  - `secondaryCategories` puts a product under more than one picker group.
- **`categories`**: the picker groups, in display order.

A product shows as *no data yet* and can't be dosed when its primary component has no usable kinetics (mode `unknown` with the formation-limited setting off, or no half-life).

**Verified means fully reviewed, not complete data.** An entry can be `verified` only when every one of its sections has provenance `reviewer` (reviewed, marked not applicable, or confirmed unknown), it has a source and a verification date, and it passes validation. A metabolite also needs `clinicalRelevance` set to `active` or `inactive`. A compound with `kinetics.mode` `unknown` can be verified only if its half-life section was explicitly *Confirmed unknown*. Such a compound still makes its products *Incomplete*; those products show the badge **verified — incomplete data** instead of the usual status, and the export says so. The validator reports errors for verified entries that break these rules, and its progress report counts "verified, incomplete data" separately.

**With the local editor** (recommended): run `npm run editor`. It walks through `tools/candidates.json` in order. For each drug you see the parent, its metabolite tree and the candidate's products, with a form section for each part of the schema. Every numeric field has an *unknown* checkbox. Half-lives use a range editor (typical / min / max, range type, CV), which shows the midpoint the app will use for range-only evidence. Kinetics have mode, early-phase and steady-state sub-forms. Metabolite links have per-edge fractions and CYP2D6 multipliers (each phenotype can be left unknown; formation multipliers can be 0). Metabolites have a *Clinical relevance* section. Products have components, dose unit, formulation, input model, typical dose and secondary categories. The editor also links to the data sources and validates live. Save with the button or Ctrl+S.

**Reviewing.** The editor's main job is reviewing drafted values, so confirming one is a single action. Every section has a provenance chip and a review bar:

- **Confirm** keeps the values, sets provenance `reviewer`, stamps `reviewedDates`, and moves to the next unreviewed section. It's disabled while the section has validation errors.
- **Confirm as unknown** replaces Confirm when the section still has `null` / `unassessed` values. It keeps them and adds "Confirmed unknown — reviewer" to the note, so an unknown is a deliberate decision.
- **N/A** (for CYP2D6, QT, receptors, lingering effects, nonlinear kinetics, product aliases and typical dose) sets the section to its none / empty value with the note "N/A — reviewer".
- **Flag** keeps the section unreviewed and adds "REVIEWER FLAG: …" to its note for follow-up.
- Editing any field also marks the section reviewed.

Keyboard: **Enter** (outside a text field) or **Ctrl+Enter** confirms the highlighted section, and **N** (*Next incomplete*) jumps to the next unreviewed or invalid section: first in the current entry, then the following entries, then the next drug in the queue filter.

The header has four views:

- **Queue**: one drug at a time, as above.
- **Review mode**: steps through *only unreviewed sections*, one at a time, with the entry's name and category, the full source note (links open in a new tab), related context (a metabolite's parent half-life; a compound's half-life, CYP2D6 and receptors next to its QT section), and Confirm / Flag / N/A / Skip / Back. It shows "Section 37 of 412 in this filter". It can be narrowed by category, section type, provenance tag, flagged sections or the priority list (on top of the sidebar filters), and it can step **by section type** (e.g. every unreviewed half-life in Sedatives, then every CYP2D6 section) for like-for-like judgements.
- **QT calibration**: every compound with a QT tier other than `none`, sortable and filterable by tier and category. Tier, weight and reference amount are edited inline with a Confirm per row, and the full QT source note is one click away. The scale note at the top is saved as `qtCalibrationNote` in `drugs.json`. A preview shows the relative contributions of up to three compounds at chosen amounts on the shared scale.
- **Priority review**: a sortable list of the entries where an error matters most: QT known/possible, strong or mechanism-based CYP2D6 inhibitors, terminal half-life over 48 h, depots and patches, estimated values, and migration auto-assumptions.

**Verify entry** is enabled only once every section is reviewed and validation passes, and it stamps today's date. A drug counts as verified when its parent, every compound in its metabolite tree and all its products are verified; a shared compound verified under another drug shows "✓ verified via \<drug\>". The sidebar shows each category's progress ("212 / 380 sections reviewed · 9 / 36 drugs verified"). Its filters pick out drugs with draft values, unknown kinetics, auto-assumptions, unreviewed sections, flagged sections or confirmed unknowns.

Saves are atomic, keep a rolling backup in `tools/editor/.backups/`, and are refused if the file changed on disk since the editor loaded it (for example, edited by hand or by another tool), so concurrent edits are never overwritten. To work on a copy, set `CLEARDATE_DRUGS=path/to/copy.json` before starting the editor.

**By hand**: edit the JSON in any editor and run `npm run validate`. The editor and `init-data` write a canonical form (keys in schema order, entries sorted by `id`, 2-space indent) so git diffs stay small. Fields the schema doesn't know about are kept as-is.

**Custom drugs** entered by clinicians in the app (the *Add custom drug* wizard) are stored only in their session. Each has *Copy as library entry*, which copies JSON ready to paste into `compounds` / `products`.

## The model and its limitations

**What it computes.** Each dosed product's compound tree is simulated separately with linear, first-order kinetics, and absolute amounts are summed across products (superposition holds because everything is linear).

- **Pools.** Each compound has a slow pool for the terminal half-life, plus a fast pool if it has an early phase; a dose is split between them by `earlyPhase.fraction`. Each pool eliminates with `k = ln 2 / t½`, and both feed the metabolites by their `fraction`.
- **Dose input.** Bolus doses enter instantly. Depots and ER forms pass through a release pool with their release half-life, so flip-flop kinetics emerge. Patches and infusions add a constant rate between applied and removed times, optionally through a skin depot.
- **Combination products.** Each component receives `dose × ratio × saltFactor × bioavailability`, where a `null` factor counts as 1.
- **Steps.** Pools are updated upstream-first with the exact solution for constant inflow over the step. The step is the shortest active half-life ÷ 20, at most 1 h, and never crosses a dose time or a patch start or stop. Against analytic solutions (Bateman, biexponential, infusion steady state) the error is under 1 %.
- **Units.** Amounts are shown in the product's mass unit (parent-equivalent, or the metabolite's own mass when both molecular weights are known).
- **Formation-limited compounds** are simulated with an elimination half-life of one-tenth of their fastest parent's effective half-life, so they track the parent. They're labelled "tracks parent (formation-limited)". The export notes that conjugates can accumulate in renal impairment.
- **Unknown fractions.** A metabolite link with a `null` fraction is simulated with fraction 1. Everything downstream of it is **normalized**: drawn dashed on the secondary "% of own peak" axis and labelled "amount unknown — timing only". Its clear time is still valid, because clearing is measured against the compound's own peak.
- **Range band.** Three runs: all-min, typical and all-max. Each range uses its own `rangeType` (a lognormal band for `cv`, the assumed spread for `single-value`, the reported bounds around the assumed midpoint for range-only evidence), and early phases and release half-lives use their own ranges in the same run. The patient's CYP2D6 phenotype scales substrate half-lives (`halfLifeMultiplier`) and metabolite formation (`cyp2d6Multiplier`). An unknown phenotype runs poor and ultrarapid as the band edges. A phenotype missing from a partial map counts as ×1, labelled as assumed.
- **Zero formation.** When a formation multiplier is 0 for the patient's phenotype, that branch isn't formed: it's left out of the chart and of the clear status, and the chart notes "not formed in \<phenotype\> metabolisers". With an unknown phenotype, only the band edge for that phenotype loses the branch.
- **Steady state.** If a regimen has run continuously for at least a compound's `steadyState.afterDays`, that product's run uses the steady-state half-life (and no early phase), and the tooltip and export say so.
- **The conservative rule for partial data.** When a field is only partly known, the app uses whichever option gives the later clear date and labels it:
  - an `earlyPhase` whose fraction or half-life is unknown is ignored, so the whole dose follows the terminal half-life ("early phase ignored (fraction unknown) — conservative");
  - a `steadyState` whose `afterDays` is unknown: with repeated dosing (a regimen, two or more doses, a patch or infusion, or a depot), the product runs with both single-dose and steady-state kinetics and the later clear date counts, with the band spanning both ("steady-state onset unknown — later of single-dose and steady-state clearance used"). A single dose uses single-dose kinetics. A `steadyState` with an unknown half-life is ignored.
  - The validator reports these partial states as warnings and counts them in its progress report, so they get resolved.
- **Clinical relevance.** A compound only holds up its product's clear date if it is clinically relevant:
  - `active` (and every parent or directly dosed compound) counts;
  - `unknown` counts too, so an unclassified metabolite with unknown kinetics still makes the product *Incomplete*;
  - `inactive` never counts. It is drawn fainter and hidden unless Settings → *Show inactive metabolites* is on. If it has unknown kinetics, or would clear later than the product, the exclusion is listed. When the classification was reviewed, the status stays "Clear by …" and the exclusion appears on hover and in the export ("inactive metabolite, kinetics unknown — excluded from clear date"). When it is still a draft, the status becomes "with assumptions" ("excluded as inactive (unreviewed classification)").
- **Clear status.** A compound is cleared when it falls below its peak × 2^−X (default X = 5.5 half-lives, about 2 %; set in Settings). A product is clear when every relevant compound reachable from its components is. The slowest-case date comes from the max run. Each product's status is one of:
  - **Clear by \<date\>**.
  - **Clear by \<date\> — with assumptions**: formation-limited tracking, assumed spread, an assumed range midpoint or phenotype multiplier, a steady-state switch, a conservative partial-data choice, a draft inactive exclusion or normalized curves were used. They're listed on hover and in the export.
  - **Incomplete — missing kinetics for: …**: some active or unknown-relevance compound in the tree has `unknown` kinetics (an active compound formed only through such a compound is listed as "formed only via …"). The date shown is a lower bound ("not before \<date\>"), and an incomplete product near the ibogaine date gives an amber warning, never green. Settings → *Treat unknown metabolites as formation-limited* (off by default) simulates such compounds as formation-limited instead, which turns the status into "with assumptions".
  - **No data yet**: the primary component can't be simulated, so the product can't be dosed.
- **CYP2D6 track.** Shows the intervals where an inhibitor is above its clear threshold. Mechanism-based inhibitors add a recovery tail of X × the enzyme recovery half-life (default 51 h). A compound with `inhibitionType` set (`reversible` / `mechanism-based`) but `inhibitor: "unassessed"` is drawn as a hatched band, "inhibition documented, strength unassessed", and counts as at least `weak` for the inhibition-at-treatment warning, which names it separately. Compounds with both fields unassessed stay off the track and are listed in the "CYP2D6 inhibition unassessed" warning instead. If inhibition overlaps the ibogaine time (or the patient is a poor metaboliser), the ibogaine projection uses the poor-metaboliser multiplier. If a CYP2D6 substrate in the projection has no `halfLifeMultiplier.poor`, the curve is left unadjusted and labelled "poor-metaboliser effect not quantified"; the warning, the tooltip and the export's Assumptions and missing data say "not quantified — no phenotype data for <compound>".
- **QT lanes.** There is one thin lane per compound whose QT tier isn't `none`, visible while that compound is above its clear threshold. The colour is the tier and the opacity is the fraction of the compound's own peak. Unassessed compounds get a grey hatched "QT unassessed" lane. The optional **summed relative QT load** (`Σ qt.weight × amount ÷ qt.referenceAmountMg`) works only when every active lane has a reviewer-set weight and reference amount and an absolute amount. Otherwise its toggle is disabled, and the tooltip names the compounds that lack calibration. None of this predicts QTc in ms.
- **Receptor overlap.** At the first ibogaine dose, any target hit by compounds from two or more different products is listed.
- **Lingering effects.** Shown after a compound clears, for its documented duration.
- **Export.** The PDF has an **Assumptions and missing data** section per product. It covers formation-limited compounds, normalized curves, assumed spreads and range midpoints, assumed phenotype multipliers, steady-state switches and the conservative partial-data choices. It also lists inactive metabolites excluded from the clear date, branches not formed for the phenotype, unassessed QT and CYP2D6, incomplete clear dates, and products that are verified but have incomplete data.

**What it does not model.** It doesn't model oral absorption: bolus doses are instant, so early peaks of IR forms are overstated. Release half-lives for ER forms and depots are mostly still `null` and need a reviewer. It also leaves out:

- distribution phases other than the optional early phase, and saturable or nonlinear kinetics (flagged, not modelled);
- enzyme induction, and interactions other than CYP2D6;
- renal or hepatic impairment, age and pregnancy;
- active transport and enterohepatic recirculation;
- individual variation beyond the range band.

Half-lives are population values from labels and the literature. Compounds with `unknown` kinetics are not simulated; the product is marked *incomplete* rather than silently ignoring them. The tool does not know what the patient actually took, or when.

**Use.** Reference only, to support a clinician's own judgement during intake. It is not a medical device and is not for dosing decisions. Every value in `drugs.json` should be reviewed by a pharmacologist before the app is relied on. Unverified entries are flagged throughout the app and in exports.

## Migrating from v1

`public/drugs.json` in this repo has already been migrated: 443 compounds; products went from 312 to 341 after the splits; 21 conjugates were auto-assigned as formation-limited. To migrate another v1 file:

1. Commit or back up your work, and close the data editor.
2. Run `npm run migrate-v2` (or `npm run migrate-v2 -- path/to/file.json`). It is idempotent: a file that already has `schemaVersion: 2` is left alone.
3. The original is kept as `backups/drugs.v1-backup.json`, and `docs/migration_v2_report.md` lists every change:
   - transform counts;
   - auto-assigned formation-limited conjugates;
   - split, merged and renamed products (old → new ids);
   - safety fields changed to `unassessed`;
   - known review items from the opioid pass.
4. Run `npm run migrate-v2.1` (see *Migrating to schema 2.1* below), then `npm run validate`, then work through the reports and the editor's **Priority review** view. Start with the auto-assumptions and the depot, ER and patch release half-lives.


**Backups** of the library go in `backups/`, which is gitignored and stays on your machine. Never put them in `public/`: everything there is published with the site. `npm run validate`, and therefore the build, fails if `public/` contains any `drugs*.json` other than `drugs.json`.

What the migration does, in short:

- **Unknowns.** Zeros become `null`. Untagged or `gap` safety sections become `unassessed`. The `[checked]` / `[recall]` / `[estimate]` / `[gap]` tags in source notes become provenance.
- **Half-lives** become ranges (`single-value` when min = typical = max).
- **Products** get `components` from `parentCompound` and an input model inferred from the route. A v1 `apparentHalfLifeHours` becomes a release half-life only when it is more than twice the intrinsic half-life; otherwise it's kept in a note for review.
- **Splits.** Combined release forms (`Oral IR/ER`, …) and combined depot brands are split into separate products. `buprenorphine_naloxone_sublingual` becomes a two-component product. The product rules live in `tools/product-rules.ts`, shared with `init-data`.

**Patient sessions** migrate on their own. The app reads the old `cleardate.session.v1` localStorage key and v1 `.cleardate.json` files and converts each `amountMg` to `amount` + `unit`. If a dose refers to a product that was split or removed (for example `morphine_oral_ir_er`), the app asks which replacement to use (`morphine_oral_ir` or `morphine_oral_er`). Doses that can't be converted, such as a fentanyl patch stored in mg that now needs µg/h, are kept but skipped with a warning until you edit them.

## Migrating to schema 2.1

`public/drugs.json` in this repo is already on 2.1 (`docs/migration_v2_1_report.md`). For another v2 file, close the editor and run `npm run migrate-v2.1` (add `--dry-run` to preview, or a path to migrate another file; a v1 file needs `npm run migrate-v2` first). It is idempotent. The v2 file is kept as `backups/drugs.v2-backup.json`, and the report lists every change:

- `clinicalRelevance` on every compound: `active` for parents and directly dosed metabolites, `unknown` for every other metabolite; `relevance` added to provenance and source notes;
- `reviewedDates: {}` on every compound and product;
- CYP2D6 inhibitors recorded as `none` whose note says inhibition was never assessed are reset to `unassessed`. The script checks the hits against the expected list in `tools/migrate-v21-lib.ts` and stops without writing anything if they differ;
- `baclofen_intrathecal` is removed (pump and CSF kinetics can't be modelled); sessions that used it are offered `baclofen_oral`.

## Implementation notes

- Vite + TypeScript, no framework. ECharts (modular import) for the timeline, Fuse.js for fuzzy search, jsPDF for the PDF (loaded only when exporting). Chart images use ECharts' own renderer.
- Code map: `src/pk.ts` (simulation, tested in `pk.test.ts`), `src/model.ts` (library index, scenario: clear dates, tracks, warnings), `src/chart.ts` (chart option), `src/search.ts` (ranked search: exact → prefix → fuzzy), `src/validate.ts` (shared by the app, the CLI and the editor), `src/tree.ts` (which compounds of a product are simulated, excluded or missing), `src/review.ts` (section review logic for the editor, tested in `review.test.ts`), `src/state.ts` (sessions, including v1 → v2 migration), `src/ui/` (picker, wizard, form pieces), `src/theme.css` (colour tokens and buttons shared by the app and the help page), `help.html` + `src/help/` (the help page, a second Vite entry), `tools/screenshots.ts` + `tools/help-scenario.json` (help screenshots), `tools/` (data tooling and editor; `tools/migrate-v2.ts` and `tools/product-rules.ts` for the v2 migration, `tools/migrate-v2.1.ts` and `tools/migrate-v21-lib.ts` for 2.1).
- A full scenario computes in tens of milliseconds, so it runs on the main thread (no Web Worker).
