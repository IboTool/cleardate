# ClearDate

Client-side drug clearance visualiser for ibogaine-clinic intake. Reference use only — not a medical device.

## What's in this starter

| Path | Purpose |
|---|---|
| `docs/ClearDate_Cursor_Prompt.md` | The full build spec. Give this to Cursor. |
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

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | App at http://localhost:5173. In dev, Settings → *Load demo data* adds the fictional compounds in `tools/demo-drugs.json`. |
| `npm run build` | Runs the validator (`prebuild`), type-checks and writes the static site to `dist/`. The build fails if `drugs.json` has errors. Demo data is never bundled. |
| `npm run preview` | Serves `dist/` locally. |
| `npm test` | Unit tests (PK simulation, search, serialisation). |
| `npm run init-data` | Creates `public/drugs.json` from `tools/candidates.json` with every value empty. Refuses to overwrite an existing file; `--force` overwrites, `--out <path>` writes elsewhere. |
| `npm run validate` | Checks `public/drugs.json` (or a path given as an argument) and prints errors, warnings and per-category progress. Exits non-zero on errors. |
| `npm run editor` | Local data editor at http://127.0.0.1:5174. |

## Deploying to Cloudflare Pages

1. Push the repo to GitHub.
2. In the Cloudflare dashboard: Workers & Pages → Create → Pages → *Connect to Git*, and pick the repo.
3. Framework preset *None*. Build command `npm run build`. Build output directory `dist`.
4. Deploy. Every push to the production branch redeploys; other branches get preview URLs.

The site is fully static: no backend, no analytics, no external requests at runtime (the Inter font is bundled). A Content-Security-Policy in `index.html` restricts everything to the site's own origin. Patient sessions live only in the browser's `localStorage`; *Save file* / *Load file* move them between machines as `.cleardate.json` files, which `.gitignore` keeps out of the repo.

## Editing `drugs.json`

The library has three lists.

- **`compounds`**: every parent drug and every metabolite, each defined once. A metabolite lists what it is formed from in `formedFrom`, as `{ "compound": "<parent id>", "fraction": 0.6 }`. `fraction` is the share of the parent that becomes this metabolite. A compound can be formed from several parents (oxazepam comes from temazepam and nordiazepam), and chains can be any depth. For each parent, the fractions of its metabolites must add up to 1 or less, and links must not form a cycle.
- **`products`**: what a patient actually takes, meaning a parent compound plus a route (`"id": "<parent>_<route>"`). Products carry the category, class, aliases and typical dose. A depot or extended-release product can set `apparentHalfLifeHours`, which replaces the compound's half-life for that product only.
- **`categories`**: the picker groups, in display order.

Empty values are `0` for numbers, `"none"` or `false` for enums and flags, and empty strings or lists. A product whose parent half-life is `0` shows in the picker as *no data yet* and can't be dosed. A compound only counts as `verified` when it has a source, a verification date and a non-zero half-life.

**With the local editor** (recommended): run `npm run editor`. It walks through `tools/candidates.json` in order. For each drug you see the parent, its metabolite tree and its products, with a form section for each part of the schema (half-life, metabolism, CYP2D6, QT, receptors, lingering effects, source). It also links to the data sources and validates live. *Mark verified* stamps today's date. Save with the button or Ctrl+S. Saves are atomic, keep a rolling backup in `tools/editor/.backups/`, and are refused if the file changed on disk since the editor loaded it (for example, edited by hand or by another tool), so concurrent edits are never overwritten. To work on a copy, set `CLEARDATE_DRUGS=path/to/copy.json` before starting the editor.

**By hand**: edit the JSON in any editor and run `npm run validate`. The editor and `init-data` write a canonical form (keys in schema order, entries sorted by `id`, 2-space indent) so git diffs stay small. Fields the schema doesn't know about are kept as-is.

**Custom drugs** entered by clinicians in the app (the *Add custom drug* wizard) are stored only in their session. Each has *Copy as library entry*, which copies JSON ready to paste into `compounds` / `products`.

## The model and its limitations

**What it computes.** Each product is simulated separately with linear, first-order kinetics. Every dose enters the parent compound instantly, each compound eliminates with `k = ln 2 / t½`, and the `fraction` of each eliminated parent appears in its metabolites. Each step removes `A · (1 − e^(−k·dt))` from every compound, parents first, and passes the fractions on to metabolites. The step `dt` is the shortest half-life currently holding drug ÷ 20, at most 1 h. Against the analytic Bateman solution the error is under 1 %. Doses are step boundaries. Amounts are shown in mg of parent-equivalent, or in mg of the metabolite when both molecular weights are known.

- **Range band.** Three runs, with min, typical and max half-lives. If the patient's CYP2D6 phenotype is set, substrate half-lives are multiplied by that phenotype's factor. If it is unknown, the band widens from the smallest to the largest multiplier.
- **Clear date.** A compound is considered cleared when it falls below its peak × 2^−X (default X = 5.5 half-lives, about 2 %; set in Settings). A product is clear when its whole metabolite tree is. The slowest-case date comes from the max run.
- **CYP2D6 track.** Intervals where an inhibitor is above its clear threshold. Mechanism-based inhibitors add a recovery tail of X × enzyme recovery half-life (default 51 h). If inhibition overlaps the ibogaine time, the ibogaine projection uses the poor-metaboliser multiplier.
- **QT track.** A relative load: Σ tier weight × amount ÷ reference dose (the product's typical dose, or else the largest entered dose). Coloured by the highest tier active. It is qualitative and does **not** predict QTc in ms.
- **Receptor overlap.** At the flood-dose time, any target hit by compounds from two or more different products is listed.
- **Lingering effects.** Shown after a compound clears, for its documented duration.

**What it does not model.** Absorption (every dose is instant, so early peaks are overstated and depots rely on `apparentHalfLifeHours`), distribution phases, saturable or nonlinear kinetics (these are flagged, not modelled), enzyme induction, interactions other than CYP2D6 inhibition, renal or hepatic impairment, age, pregnancy, active transport, enterohepatic recirculation, and individual variation beyond the min–max range. Half-lives are population values from labels and the literature. Metabolites with no half-life, and everything downstream of them, are skipped with a warning. The tool does not know what the patient actually took, or when.

**Use.** Reference only, to support a clinician's own judgement during intake. It is not a medical device and is not for dosing decisions. Every value in `drugs.json` should be reviewed by a pharmacologist before the app is relied on. Unverified entries are flagged throughout the app and in exports.

## Implementation notes

- Vite + TypeScript, no framework. ECharts (modular import) for the timeline, Fuse.js for fuzzy search, jsPDF for the PDF (loaded only when exporting). Chart images use ECharts' own renderer.
- Code map: `src/pk.ts` (simulation, tested in `pk.test.ts`), `src/model.ts` (library index, scenario: clear dates, tracks, warnings), `src/chart.ts` (chart option), `src/search.ts` (ranked search: exact → prefix → fuzzy), `src/validate.ts` (shared by the app, the CLI and the editor), `src/ui/` (picker, wizard, form pieces), `tools/` (data tooling and editor).
- A full scenario computes in tens of milliseconds, so it runs on the main thread (no Web Worker).
