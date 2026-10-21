# Task: Build the ClearDate help page (`help.html`)

Create a comprehensive, user-facing help page for ClearDate, reachable from a button at the top of the app, with plenty of real screenshots. The audience is clinicians and staff at iboga/ibogaine treatment clinics: medically literate, busy, not developers.

Read first: `README.md`, `docs/ClearDate_Cursor_Prompt.md`, `docs/ClearDate_Spec_v2.md`, `docs/ClearDate_Spec_v2.1.md`, and the app's source (UI components, settings, export, editor exclusions). **Document only what the app actually does.** Before writing each section, use the feature in the running app. If something in the specs isn't implemented or behaves differently, document the real behaviour and list the discrepancy in your final summary — don't describe features that don't exist.

## Deliverables

1. **`help.html`** at the project root, built by Vite as a second page alongside the app (multi-page build: add it to `build.rollupOptions.input`). It ends up at `/help.html` on the deployed site.
2. **A help button in the app header** — "Help" with a `?` icon, top right, styled like the existing header controls. It links to `help.html` in the same tab.
3. **A back link on the help page** — "← Back to ClearDate" in the help page header (and again at the bottom), linking to `/`.
4. **Screenshot script**: `npm run screenshots` (Playwright, dev dependency only), which regenerates every screenshot from a fixed scenario. Screenshots must be reproducible, because the drug data will change before launch and they'll need retaking.
5. **Screenshots** in `public/help/img/`, referenced from `help.html`.
6. A short **"For developers"** link from the help page's About section to the GitHub repo README, and a link from `README.md` to the help page.

## Constraints

- **Same look as the app.** Reuse the app's CSS tokens (colours, fonts, spacing, panel styles) from a shared stylesheet rather than copying values. Dark theme by default, matching the app. Add a `@media print` stylesheet that prints cleanly in light colours, like the app's export.
- **No external network calls**, consistent with the app: no CDN fonts, scripts, analytics, embeds or remote images. Everything is bundled or local.
- **Navigating to the help page and back must not lose the user's session.** Verify that the autosaved session (patient, doses, settings) is fully restored on return, including any unsaved form state if the app keeps it. If anything is lost, fix the app (e.g. save before navigating) and say so in your summary.
- **Responsive**: readable on a laptop and a tablet; images scale down; tables scroll horizontally on narrow screens.
- **Accessible**: semantic headings, descriptive `alt` text on every screenshot, keyboard-navigable, sufficient contrast on the dark theme.
- **Live figures, not hardcoded ones.** The help page reads `/drugs.json` at load time and fills in: number of drugs (candidates/products), compounds, verified entries, and the library's last-updated date (most recent `verifiedDate`, or the file's commit date injected at build time if that's simpler). If loading fails, show the text without numbers.
- Keep the page as one HTML file plus a small script and stylesheet; no framework needed.

## Screenshot scenario

Create `tools/help-scenario.json`: a **clearly fictional patient** ("Demo Patient", made-up DOB, weight, CYP2D6 "normal", baseline QTc 420 ms Fridericia) with a set of doses that shows off the features. Use real library drugs that currently have kinetics data, for example:

- a methadone regimen (daily, several weeks) — shows steady state, QT lane
- fluoxetine daily, stopped 3 weeks before treatment — shows norfluoxetine's long tail and the CYP2D6 inhibition track
- a diazepam taper — shows the metabolite chain and a lingering-effects band
- one depot or patch product, if one has data
- one drug that triggers an "Incomplete" or "with assumptions" status
- an ibogaine treatment: flood dose plus one booster

Never use a real person's name or real patient details.

The script loads the scenario into the app (via a dev-only hook or localStorage injection — don't add a production-visible import path), sets a fixed "today" date so screenshots are stable, and captures at 1440×900, device scale factor 2, dark theme. Crop to the relevant region for close-ups. Save as optimised PNG or WebP with descriptive filenames (`chart-overview.png`, `dose-entry-regimen.png` …).

Callouts: where a screenshot needs explanation, use numbered markers rendered as HTML overlays on the help page (positioned over the image), with the numbered explanations below it — not text baked into the image, so they stay editable and accessible.

Aim for roughly 20–30 screenshots across the sections below. Every screenshot gets a one-line caption.

## Page structure and content

Use these sections, with a sticky table of contents on wide screens and a collapsible one on narrow screens. Write in plain, direct clinical English. Short paragraphs; lists where steps are sequential.

### 1. What ClearDate is

Two or three short paragraphs:
- A free reference tool for iboga/ibogaine providers to support patient intake and treatment planning.
- You enter a patient's recent medications and substances; it plots how long each drug and its metabolites are likely to remain, relative to the planned ibogaine date, with CYP2D6 and QT context.
- One hero screenshot of the main chart with the scenario loaded.

### 2. Important — read before use (disclaimer)

Prominent, near the top, visually distinct (bordered panel), and repeated in short form in the page footer. Content:

- ClearDate is a **reference and planning aid only**. It is not medical advice, not a medical device, and must not be relied on for clinical decisions or dosing.
- It does not replace clinical judgment, patient history, ECG monitoring, laboratory testing, drug screening or established clinical protocols.
- Pharmacokinetic values are **population estimates**. Individual patients can differ substantially (genetics, liver and kidney function, age, body composition, drug interactions, adherence, product variation). Self-reported doses may be inaccurate.
- The model plots **estimated amount remaining in the body**, not blood concentration, and does not predict effects, toxicity or QT intervals in milliseconds.
- A "clear" date means the modelled amount has fallen below a chosen threshold, not that a drug's effects, withdrawal or receptor changes have resolved.
- Where data is missing, the tool shows this rather than guessing — "Incomplete" and "with assumptions" statuses must be read, not ignored.
- Ibogaine carries serious cardiac risk. Nothing in this tool indicates that treatment is safe for a given patient.
- Provided as-is, without warranty of any kind (reference the open-source licence). Users are responsible for complying with the laws and regulations that apply where they practise.

### 3. Privacy

- All patient data stays in the browser. No accounts, no server, no analytics, no tracking, no cookies. Nothing is uploaded.
- Data is autosaved in this browser only (show the "Stored only in this browser" indicator in a screenshot).
- Saved patient files are files on your own computer; treat them like any other patient record.
- On shared computers, use **Clear all data** at the end of each session (screenshot of the button and confirmation).
- The code is open source, so these claims can be checked.

### 4. Quick start

Six to eight numbered steps with a screenshot for most: enter patient details → add doses (type-ahead search) → set the ibogaine date / add the ibogaine treatment → read the chart and statuses → check the CYP2D6 and QT tracks → export the PDF → save the patient file or clear data.

### 5. Using ClearDate (detailed)

Subsections, each with screenshots:

- **Patient details**: every field; age from DOB; weight used only for mg/kg; CYP2D6 phenotype (what "unknown" does — wider bands); baseline QTc and formula.
- **Finding drugs**: type-ahead search, brand and street names, typo tolerance, category browsing and filter chips, badges (unverified, draft, no data yet, user-entered, incomplete).
- **Entering doses**: single doses, regimens (repeating doses with start/end), dose units, combination products (e.g. buprenorphine/naloxone — how the second ingredient is computed), patches and infusions (rate, applied, removed), depot injections, editing and deleting doses.
- **The ibogaine treatment**: flood dose and boosters, mg/kg display, the treatment marker, projected ibogaine and noribogaine curves.
- **Reading the chart**: parent vs metabolite lines, range bands (fast to slow), today and treatment markers, "clear" ticks, zoom/pan/reset, hover tooltip contents, highlighting a drug, linear vs log scale, mg vs % of dose, inactive metabolites (hidden by default) and normalised "timing only" curves.
- **Clear statuses**: a table explaining each — "Clear by \<date\>", "Clear by \<date\> — with assumptions", "Incomplete — not before \<date\>", "No data yet", "Verified — incomplete data" — with what to do about each.
- **CYP2D6 track**: inhibition windows, reversible vs mechanism-based (recovery tail), the warning when inhibition overlaps treatment, and the poor-metaboliser projection.
- **QT lanes**: one lane per QT-relevant compound, colours by risk tier, unassessed lanes, opacity, the baseline QTc label, and the optional summed load (and why it's often unavailable).
- **Lingering effects and receptor overlap**: what the bands and warnings mean, and that they are qualitative.
- **Custom drugs**: the wizard step by step; session-only; "user-entered" badge; how to request that a drug be added to the library.
- **Settings**: every setting with a one-line explanation, including the clear threshold (default 5.5 half-lives ≈ 2% remaining) and the assumed-spread and unknown-metabolite options.
- **Saving, loading, exporting**: patient files, PDF and PNG export (screenshot of an exported PDF page), what the export's "Assumptions and missing data" section contains.

### 6. How the model works

A plain-language explanation for clinicians, with one or two simple diagrams (inline SVG in the app's colours) — e.g. a parent → metabolite chain, and a decay curve showing half-lives and the clear threshold.

- Amount remaining, first-order elimination, half-lives, and why "clear" uses a threshold (5.5 half-lives ≈ 98% eliminated by default).
- Metabolite chains and shared metabolites.
- Two-phase drugs, steady state, depots and patches (release compartments) — briefly.
- CYP2D6 phenotype effects on clearance and on metabolite formation.
- Clinical relevance of metabolites: why inactive metabolites don't hold up the clear date.
- **The conservative rule**: when data is partial, the tool uses the choice that gives the later clear date, and labels it.
- Range bands and the "assumed spread" when only an average is published.
- Limitations: no plasma concentrations, no absorption delays for ordinary oral doses, no hepatic/renal impairment adjustments, no drug–drug interaction modelling beyond CYP2D6, nonlinear kinetics flagged but not modelled.

### 7. The drug library and its sources

- **Every drug value was entered by hand from published, cited sources, and each value carries its citation in the library.** No values are generated or inferred automatically.
- Primary sources: FDA prescribing information (DailyMed) and EU/UK product information; Baselt, *Disposition of Toxic Drugs and Chemicals in Man*; the Flockhart CYP table and FDA drug-interaction tables; CredibleMeds (QT risk tiers, entered by hand and cited, used under their terms); CPIC and ClinPGx (pharmacogenomics); the IUPHAR/BPS Guide to Pharmacology and the PDSP Ki Database (receptor targets); and the primary pharmacokinetic literature (PubMed). Link each to its public homepage.
- How entries are reviewed and verified, and what the badges mean (unverified, verified, verified — incomplete data).
- Where data is genuinely unpublished (many metabolites), the tool says so instead of guessing.
- Live figures from `drugs.json` (see Constraints) and the categories covered.
- **The library will keep growing.** Requests for new drugs, corrections and source suggestions are welcome — see "Requests and feedback".

### 8. FAQ

Eight to twelve short Q&As, e.g.: Why does a drug show "Incomplete"? Why is the clear date later than I expected? Why isn't a drug listed? Does it account for kidney or liver disease? Why amount instead of blood levels? Is any data sent anywhere? Can I use it offline once loaded? What does "verified — incomplete data" mean? How do I correct an entry?

### 9. Requests and feedback

- How to request a drug or report an error: **GitHub Issues** on the repository (link). Leave a clearly marked placeholder for an additional contact method — `<!-- TODO(Ian): contact method -->` — and list it in your summary; don't invent an email address.
- What to include in a request: drug name, route/formulation, and ideally a source.

### 10. About

- Created by **Ian MacKenna**. Free to use.
- **Open source** — link to the GitHub repository (`https://github.com/IboTool/cleardate`; confirm the URL from the git remote). Name the licence from the repo's `LICENSE` file; if there is no `LICENSE` file, leave a TODO placeholder and list it in your summary rather than choosing one.
- App version (from `package.json`) and library version/date.
- Acknowledgements: the data sources above, and the open-source libraries the app uses (ECharts, Fuse.js, jsPDF, Inter font and any others in `package.json` dependencies), with their licences.
- "For developers" link to the repository README.

### Footer (every view)

Short disclaimer ("Reference and planning aid only — not medical advice, not for clinical decisions or dosing"), "← Back to ClearDate", and the repository link.

## Process

1. Read the specs and source; list the app's actual features and any discrepancies with the specs.
2. Add the multi-page build entry, shared stylesheet, header button and help page skeleton with the table of contents and back links. Verify session preservation.
3. Write the screenshot scenario and `npm run screenshots`; generate the images.
4. Write the content, section by section, with screenshots, callouts, captions and the two diagrams.
5. Check: `npm run build` succeeds and `dist/help.html` and its images are present; no external requests (check the network panel on both pages); `npm test` and `npm run validate` still pass; help page looks right at laptop and tablet widths and in print preview; every link works, including back to the app.
6. Commit in logical steps.

## Final summary

Tell me: what was built; the screenshot list; any spec-vs-app discrepancies found; any app fixes made (e.g. session preservation); TODO placeholders left for me (contact method, licence); and how to regenerate screenshots after the drug data changes.
