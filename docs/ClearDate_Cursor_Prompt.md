# Project: ClearDate — Drug Clearance Visualiser for Ibogaine Intake

Build a single-page, fully client-side web app. It will be hosted as a static site on Cloudflare Pages from a GitHub repo. There is no backend, no accounts, no analytics and no external network calls at runtime. No patient data ever leaves the browser.

## Purpose
This is a reference tool for clinicians in the ibogaine space. During patient intake, they enter the patient's recent drug doses and dosing regimens. The app plots how much of each drug and its metabolites (including metabolite chains) remains over time, relative to a planned ibogaine treatment date. It also shows CYP2D6 inhibition windows, a relative QT-risk track and receptor overlap warnings. It is NOT a medical device and is NOT for dosing decisions. This disclaimer must appear in the app footer and on every export.

## Tech stack
- Vite + vanilla TypeScript (or React + TypeScript if cleaner; keep dependencies minimal)
- Apache ECharts for all charting
- jsPDF + html2canvas (or ECharts native export) for PDF and PNG export
- Fuse.js for fuzzy type-ahead drug search (bundled, works offline)
- No other runtime dependencies unless essential
- Output: a static `dist/` folder deployable to Cloudflare Pages with build command `npm run build`

## Data: `public/drugs.json` (hand-editable library)
The library has two lists: **compounds** (every parent drug and every metabolite, each defined exactly once) and **products** (what a patient actually takes: a parent compound plus a route). Metabolites link to what they are formed from, so chains of any depth and shared metabolites work naturally. Example: oxazepam is defined once and is formed from temazepam and nordiazepam; nordiazepam is formed from diazepam, chlordiazepoxide's metabolites and clorazepate.

```json
{
  "categories": [
    { "id": "opioids", "name": "Opioids & OUD treatments", "order": 1 }
  ],
  "compounds": [
    {
      "id": "nordiazepam",
      "name": "Nordiazepam",
      "aliases": ["desmethyldiazepam", "nordazepam"],
      "isMetabolite": true,
      "formedFrom": [ { "compound": "diazepam", "fraction": 0.0 } ],
      "molecularWeight": 0,
      "halfLifeHours": { "typical": 0, "min": 0, "max": 0 },
      "cyp2d6": {
        "substrate": false,
        "halfLifeMultiplier": { "poor": 1, "intermediate": 1, "normal": 1, "ultrarapid": 1 },
        "inhibitor": "none | weak | moderate | strong",
        "inhibitionType": "none | reversible | mechanism-based"
      },
      "qt": { "tier": "none | conditional | possible | known", "weight": 0.0 },
      "receptors": [ { "target": "GABA-A", "action": "agonist | antagonist | partial agonist | positive allosteric modulator | inhibitor | modulator" } ],
      "lingeringEffects": { "durationDays": 0, "note": "" },
      "nonlinearKinetics": { "flag": false, "note": "" },
      "source": "",
      "sourceNotes": { "halfLife": "", "metabolism": "", "cyp2d6": "", "qt": "", "receptors": "" },
      "verified": false,
      "verifiedDate": ""
    }
  ],
  "products": [
    {
      "id": "buprenorphine_depot_sc",
      "name": "Buprenorphine extended-release injection",
      "aliases": ["Sublocade", "Brixadi", "bupe depot"],
      "category": "opioids",
      "class": "opioid partial agonist",
      "parentCompound": "buprenorphine",
      "route": "subcutaneous depot",
      "apparentHalfLifeHours": { "typical": 0, "min": 0, "max": 0 },
      "typicalDoseMg": 0,
      "source": "",
      "verified": false,
      "verifiedDate": ""
    }
  ]
}
```

Rules:
- `formedFrom.fraction` is the fraction of the source compound's elimination that becomes this metabolite. Fractions out of any one compound must sum to ≤ 1; the remainder is eliminated without forming a tracked metabolite. Validate this on load and show a warning if violated.
- `apparentHalfLifeHours` on a product is optional. When present (depots, extended release), it overrides the parent compound's half-life for that product, because elimination is release-limited.
- Amounts for metabolites are shown in mg of the metabolite when `molecularWeight` is set for both parent and metabolite (convert via molar ratio); otherwise in parent-mg-equivalents, labelled as such.
- Detect and reject cycles in `formedFrom`.
- `aliases` holds brand names, common abbreviations and street names (e.g. alprazolam: "Xanax", "bars"; MDMA: "ecstasy", "molly"; buprenorphine/naloxone: "Suboxone", "subs"). Products inherit their parent compound's aliases for search, plus their own.
- Every product has a `category`, which must match an `id` in `categories`. The nine categories, in order: `opioids` (Opioids & OUD treatments), `sedatives` (Benzodiazepines & sedatives), `antidepressants`, `antipsychotics`, `mood_anticonvulsants` (Mood stabilisers & anticonvulsants), `stimulants`, `psychedelics_dissociatives` (Psychedelics, entactogens & dissociatives), `cardiovascular`, `other_interactors` (Antimicrobials, antiemetics & other interactors). `class` is a free-text pharmacological class shown as secondary text.

### Initial `drugs.json`: structure only, from `tools/candidates.json`
`tools/candidates.json` is provided with the project. It contains the full work queue: 9 categories, 227 candidate drugs (each with category, aliases, routes, a parent compound and its metabolite tree) and 443 compounds with names, aliases and `formedFrom` links. It contains **no pharmacokinetic values**.

Write a one-off script, `npm run init-data`, that builds the initial `public/drugs.json` from it:
- Copy `categories` as-is.
- Create every compound with its `id`, `name`, `aliases` and `formedFrom` links (fraction 0), and every other field at its empty default.
- Create one product per candidate route, with id `<parentCompound>_<route slug>`, name `"<candidate name> (<route>)"`, the candidate's `category` and `aliases`.
- Set every numeric value to 0 and `verified: false`. **Do not fill in any pharmacokinetic, CYP, QT or receptor values** — these are entered by hand in the local editor.
- Refuse to overwrite an existing `drugs.json` unless run with `--force`.

The app must handle entries without data: a product whose parent half-life is 0 appears in the picker greyed out with a "no data yet" tag and cannot be plotted. A metabolite with half-life 0 is skipped in the simulation with a warning on the chart.

**Demo data:** `tools/demo-drugs.json` contains three clearly fictional compounds ("Demozepam" with a two-step metabolite chain, "Testoline" as a CYP2D6 mechanism-based inhibitor, "Sampladone" with a QT weight) with round-number values, so the UI can be tested before real data exists. In dev builds only, Settings has "Load demo data", which shows a persistent "DEMO DATA" banner. Demo data never ships in the production build.

The UI shows an "unverified" badge on any compound or product where `verified` is false.

## Pharmacokinetic model (keep it simple)
- Y-axis shows **amount remaining (mg)** by default, with a toggle for **% of most recent dose**. Do NOT model plasma concentration.
- Use a **numerical compartment simulation**, not closed-form equations, so metabolite chains, shared metabolites, multiple doses and regimens are all handled the same way.
  - State: amount of each compound in the body.
  - Each step of length `dt`: for each compound, eliminated amount = `A · (1 − e^(−k·dt))` with `k = ln2 / t½`. Subtract it, then add `fraction × eliminated` to each child metabolite.
  - Process compounds in topological order (parents before metabolites) within each step.
  - Doses are added to the parent compound at their exact time. Absorption is treated as instantaneous.
  - Choose `dt` as min(1 hour, shortest active half-life ÷ 20).
- **Regimens:** a dose entry can be a single dose or a regimen (amount, every N hours or days, start date/time, end date/time). Expand regimens into individual doses internally.
- **Range bands:** run the simulation three times — all half-lives at min, typical and max — and draw a shaded band between min and max, with typical as the main line.
- **CYP2D6 phenotype** (poor / intermediate / normal / ultrarapid / unknown) comes from the Patient tab. For substrates, multiply the half-life by that phenotype's multiplier. If unknown, widen the band to cover poor-to-ultrarapid.
- **Nonlinear kinetics:** if flagged, show a warning icon on that compound with the note. Do not attempt to model it.
- **Clear threshold:** a product counts as clear when its parent and all downstream metabolites each fall below the amount left after X half-lives of that compound (default 5.5, ≈2.2% of its peak; adjustable in Settings). Draw a small "clear" tick on the timeline for each product.
- Run the simulation in a Web Worker if it makes the UI noticeably smoother.

## Custom drug wizard (session-only, no network)
An **"Add custom drug"** button opens a step-by-step wizard:
1. **Basics:** name, aliases, route, category (dropdown of the nine), class, typical dose.
2. **Half-life:** typical, min and max (hours or days, with unit selector).
3. **Metabolites:** an "add metabolite" button under each compound, building a tree up to **three levels deep**. Each metabolite has a name, fraction formed, half-life range and optional molecular weight. A metabolite can also be **linked to an existing library compound** (e.g. pick "Oxazepam" from the library rather than redefining it).
4. **CYP2D6:** substrate yes/no with phenotype multipliers; inhibitor strength and type.
5. **QT:** tier and relative weight, per compound.
6. **Receptors:** add target + action rows, per compound.
7. **Lingering effects and nonlinear-kinetics notes.**
8. **Source:** free-text citation and optional URL.

Behaviour:
- Custom entries get a distinct **"user-entered"** badge everywhere they appear, including exports.
- They live only in the browser: included in the localStorage autosave and in saved patient files, so reopening a case restores them. They are never sent anywhere.
- A **"Copy as library entry"** button produces valid `drugs.json` JSON (compounds + product) for the clinic to paste into the shared library.
- Validate inputs: positive half-lives, min ≤ typical ≤ max, metabolite fractions summing to ≤ 1, no cycles.
- No LLM or other external lookups.

## Tracks under the main chart (each toggleable, sharing the time axis)
1. **CYP2D6 inhibition track:** horizontal band showing when CYP2D6 is likely inhibited, coloured by strength.
   - Reversible: active while any inhibiting compound (parent or metabolite) is above its clear threshold.
   - Mechanism-based: as above, PLUS a recovery tail afterwards using an enzyme-recovery half-life (default 51 h, marked "verify", adjustable in Settings).
   - If inhibition overlaps the ibogaine date, show a prominent warning: "CYP2D6 likely inhibited at treatment — ibogaine exposure may resemble a poor metaboliser's." Also recompute the projected ibogaine curve with the poor-metaboliser multiplier.
2. **QT track:** a qualitative "relative QT load" curve: `Σ (qt.weight × amountRemaining / typicalDoseMg of the originating product)` across all compounds including metabolites. Label clearly as qualitative, NOT predicted milliseconds. Colour segments by the highest active tier. Show the patient's baseline QTc (and formula used) as a label on the track.
3. **Lingering effects track:** faded band after clearance for compounds with `lingeringEffects` (e.g. benzodiazepine protracted withdrawal, serotonergic recovery after MDMA), with the note on hover.
4. **Receptor overlap:** NOT a track. A compact warning list of any receptor target hit by two or more compounds with non-trivial amounts remaining at the ibogaine date.

## Timeline and dates
- Real dates and times throughout; doses carry both date and time.
- Vertical markers: **Today** (subtle line), **Planned ibogaine date** (bold, glowing), and per-product "clear" ticks.
- X-axis auto-spans from earliest dose to 14 days past the last ibogaine dose, and can be panned and zoomed freely beyond.
- "Add ibogaine treatment" button opens a mini form for a flood dose plus optional boosters (mg, with mg/kg shown live from body weight, and time). Plots projected ibogaine and noribogaine forward.

## UI and design
- Dark mode only for the app. Elegant and modern: deep charcoal / near-black background, subtle glassmorphism panels, one accent colour, clean sans-serif typography (e.g. Inter). App name "ClearDate" as a subtle glowing wordmark.
- Each product gets a distinct colour. Parent = solid line with soft glow and gradient fill underneath. Metabolites = dashed lines in the same hue, with deeper chain levels progressively lighter or more finely dashed. Range bands = low-opacity fills.
- Smoothness from dense sampling (≥500 rendered points per curve, downsampled from the simulation), NOT spline smoothing, to avoid overshoot.
- Curves draw in left to right on load and when a dose is added.
- Scroll-wheel zoom, drag to pan, ECharts dataZoom slider along the bottom, and a "reset view" button.
- Click a product in the legend or chart to highlight it and its metabolites and dim others.
- Crosshair tooltip on hover: date/time, amount remaining for each visible compound, whether CYP2D6 is inhibited, and relative QT load at that moment.
- Layout: chart takes most of the screen. Left side panel with tabs **Doses**, **Patient**, **Settings**.
- **Doses tab:** type-ahead product picker (see below), single-dose or regimen form, "Add custom drug" button, list of entered doses with edit/delete.
- **Type-ahead drug picker:**
  - A single search box; results appear as the user types, from the first character.
  - Searches name, aliases, route, class and category across library and custom entries together, using Fuse.js with typo tolerance (e.g. "dextromorphan" still finds dextromethorphan).
  - Ranking: exact match first, then prefix matches on name or alias, then fuzzy matches. Typing "dex" lists dextromethorphan, dextroamphetamine, dexmedetomidine, etc., with prefix matches at the top.
  - **While typing:** one flat list in ranked order (never grouped, so the best match is always first). Each result shows the generic name, route, a small coloured category tag, and the matched alias in small text when the match came from an alias (e.g. "Alprazolam · oral · Sedatives — matched 'Xanax'"), plus "unverified", "user-entered" or "no data yet" badges.
  - **Browsing (box empty and opened):** recently used drugs at the top, then all products grouped under collapsible category headers in category order, alphabetical within each. A row of category filter chips above the list narrows both browsing and typed results to one or more categories. Custom drugs appear in their chosen category with the "user-entered" badge.
  - The matched characters are highlighted in each result.
  - Keyboard: ↑/↓ to move, Enter to select (the top result is preselected, so typing then Enter picks it), Esc to close.
  - Selecting a result focuses the dose amount field, so entry flows: type → Enter → amount → date.
  - If there are no matches, show "No match — add as custom drug?", which opens the wizard with the name prefilled.

- **Chart legend and dose list** are also grouped by category, using the same category colours as the tags.
- Usable on a tablet.

## Patient tab
Name, date of birth (age auto-calculated), sex, body weight (kg with lb toggle), CYP2D6 phenotype (poor / intermediate / normal / ultrarapid / unknown), baseline QTc in ms with Bazett/Fridericia selector, and free-text notes. Weight is used only for mg/kg display; it does NOT change the curves.

## Settings tab
- Clear threshold in half-lives (default 5.5; show % remaining live)
- Y-axis: linear or log scale
- Units: mg amount or % of dose
- Show/hide metabolites, range bands, and each track
- Date format (day-first or month-first) and 12/24-hour time
- CYP2D6 recovery half-life (default 51 h, labelled "verify")
- Clinic name (for export headers)
- **"Clear all data"** button with confirmation (also clears custom drugs)

## Persistence and files
- Autosave session (patient, doses, custom drugs, settings) to localStorage, with a small indicator: "Stored only in this browser".
- **Save patient file:** download session as `<patient-name>-<date>.cleardate.json`, including custom drugs.
- **Load patient file:** open a `.json` and restore session. If a custom drug ID clashes with a library ID, keep both and rename the custom one.
- **Export PDF and PNG:** always rendered in a clean, print-friendly LIGHT theme. PDF includes header (clinic name, patient details, baseline QTc, CYP2D6 status, export date), the chart with active tracks, a dose table, clear dates, warnings (CYP2D6, nonlinear kinetics, receptor overlaps, unverified and user-entered data) and footer disclaimer:
  > "Reference visualisation only. Not medical advice and not for dosing decisions. Pharmacokinetic values are population estimates and may not reflect this patient. Verify all data independently."

## Data tooling (local only — never deployed)

### Validator: `npm run validate`
A Node script (`tools/validate-drugs.ts`) that reads `public/drugs.json` and checks it. It runs automatically as a `prebuild` step, so a broken file stops the build and can never be deployed. The app also uses the same validation module on load, and the custom drug wizard and editor use it live.

Checks:
- **Structure:** every required field present with the right type; enums (QT tier, inhibitor strength, inhibition type, receptor action) restricted to allowed values; IDs are lowercase snake_case.
- **Links:** every `formedFrom.compound` and `parentCompound` exists; every product `category` exists in `categories`; no cycles; fractions out of any compound sum to ≤ 1.
- **Sanity:** min ≤ typical ≤ max; half-lives > 0 for any entry marked verified; no duplicate IDs; duplicate aliases flagged; `verified: true` requires a non-empty `source` and `verifiedDate`.

Output: a short report grouped into **errors** (break the app; exit code 1), **warnings** (look odd; exit code 0) and **progress** (e.g. "Compounds: 40 / 443 verified · Products: 22 / 312 verified", plus a per-category breakdown), with the entry ID for every message. Entries with no data yet (all zeros, unverified) are counted as "not started", not reported as errors.

### Local data editor: `npm run editor`
A separate local tool for populating `drugs.json` one drug at a time without hand-editing JSON.
- **Separate entry point** (`tools/editor/`), excluded from the production build and from `dist/`.
- **Tiny local server** (Node, no extra framework needed, or Vite dev middleware) that reads and writes `public/drugs.json`. Bound to `127.0.0.1` only. Writes are atomic (write to temp file, then rename) and keep a rolling backup of the previous version.
- **Stable formatting:** 2-space indentation, consistent key order, compounds and products sorted by ID — so every save produces a clean git diff.
- **Work queue:** loads the provided `tools/candidates.json` directly (no Markdown parsing). Its shape:
  ```json
  {
    "categories": [ { "id": "opioids", "name": "Opioids & OUD treatments", "order": 1 } ],
    "candidates": [
      { "id": "diazepam", "order": 27, "name": "Diazepam", "aliases": ["Valium"],
        "category": "sedatives", "parentCompound": "diazepam",
        "routes": ["Oral", "IV", "Rectal"],
        "metaboliteTree": ["nordiazepam", "oxazepam", "oxazepam_glucuronide", "temazepam", "temazepam_glucuronide"],
        "untrackedMetabolites": [], "reviewHints": "Long chain; protracted withdrawal", "sourceRow": 27 }
    ],
    "compounds": [
      { "id": "oxazepam", "name": "Oxazepam", "aliases": ["Serax"], "formedFrom": ["nordiazepam", "temazepam"],
        "isMetabolite": true, "alsoTakenDirectly": true }
    ]
  }
  ```
- **Queue navigation:** a left sidebar grouped by category (collapsible, with per-category progress like "Opioids 12/26"), and a main panel for the current candidate. Buttons: **Next**, **Previous**, **Skip**; filters for "not started", "draft" and "verified"; a search box over the queue. Status is derived from `drugs.json`: not started (parent half-life 0), draft (some data, not verified), verified (parent, all compounds in its metabolite tree and all its products verified).
- **Candidate view:** shows `reviewHints` and `untrackedMetabolites` as reference notes at the top, then the parent compound, then its metabolite tree (indented by depth, following `formedFrom`), then one product per route. **Shared compounds** (e.g. oxazepam, morphine, amphetamine) appear in every tree they belong to; if already verified from another candidate they show "✓ verified via Diazepam" and are collapsed, so each compound is only entered once.
- **Editing:** reuses the custom drug wizard's sections (basics and aliases, half-life, metabolite links and fractions, CYP2D6, QT, receptors, lingering effects and nonlinear notes) for each compound, plus product fields (route, apparent half-life, typical dose). The metabolite tree is already laid out from `candidates.json`; the editor has **no depth limit** (chlordiazepoxide's chain is five levels). The user can add or remove metabolites and routes; changes go to `drugs.json`, not back to `candidates.json`.
- If `public/drugs.json` doesn't exist yet, the editor offers to run `init-data` first.
- **Sources:** an entry-level `source` field, plus an optional note per section stored in `sourceNotes`, so it's clear where each number came from. A collapsible panel links the databases listed in `docs/ClearDate_Data_Sources.pdf`.
- **Verification:** a "Mark verified" toggle that stamps `verifiedDate` with today's date; disabled until validation passes and a source is filled in.
- **Live validation** with the shared validator, showing errors inline before save.
- **Save** writes immediately; an "unsaved changes" indicator and a confirm-on-leave prompt prevent lost work.

## Deliverables
- Working app with `npm run dev` and `npm run build`; data tooling with `npm run init-data`, `npm run validate` and `npm run editor`; `tools/demo-drugs.json` for dev testing
- Keep the provided files where they are: `tools/candidates.json`, `tools/build_candidates.py` (regenerates `candidates.json` from `docs/ClearDate_Candidate_Drug_List.md` if the list is edited) and everything in `docs/`
- Extend the existing `README.md` (keep its current sections) with: Cloudflare Pages deployment (connect GitHub repo, build command `npm run build`, output `dist`), how to edit `drugs.json` (compounds, products, `formedFrom` links) directly or with the local editor, how to run the validator, and the model and its limitations
- Clean, commented code; PK simulation in its own module (`pk.ts`) with unit tests that check:
  - single-compound decay matches `D · e^(−k·t)`
  - a parent → metabolite pair matches the Bateman equation
  - a three-level chain conserves mass (total tracked + eliminated = total dosed)
  - superposition of repeated doses
  - cycle detection and fraction validation
- Unit tests for search ranking: exact and prefix matches outrank fuzzy ones, aliases resolve to the right product, and a misspelling still returns the intended drug
