# Task: Drug Library view, and honest data-status wording

Two related changes. Work on a branch (`library`), keep `npm test` and `npm run validate` passing, add tests, and commit in logical steps. Ask me if anything is ambiguous rather than guessing.

## Part 1 — Drug Library

A read-only, searchable browser of everything in `public/drugs.json`: each drug's products, kinetics, metabolites, safety fields, verification status and sources. It answers "where does this number come from?" for clinicians.

### Entry point and container

- A **"Library"** button in the app header, next to **Help**, styled like the existing header controls (book icon + label).
- Opens a **full-screen overlay** in the app's glass-panel style over a dimmed app. Close with an × button, Esc, or the browser back button. The patient session and chart state are untouched.
- **Deep links:** the overlay is driven by the URL hash — `#library` opens it, `#library/<id>` opens a specific drug (product candidate or compound id). Back/forward navigate between entries. The help page and the main app can link straight to an entry.
- **Read-only.** No editing, and no "add to patient" action.

### Layout

- **Wide screens:** two columns. Left (~30%): search and list. Right (~70%): the selected entry's detail, scrolling independently. Nothing selected → a short intro panel with library stats.
- **Tablet / narrow:** the list fills the overlay; selecting an entry shows its detail with a back arrow to the list.

### Left column: search and list

- **Search** reuses the app's existing Fuse.js type-ahead index (names, aliases, brand and street names, typo tolerance). Results update as you type.
- **Filter chips:** categories (multi-select, same colours as elsewhere) and status: Verified / Draft / Incomplete data / No data yet.
- **List grouped by category** under collapsible headers with counts, in category order, alphabetical within each. One row per **drug** (candidate), showing name, routes in small text, and a status dot.
- A toggle **"Show metabolites as entries"** (off by default) adds metabolite-only compounds as their own rows, indented or tagged "metabolite of …".
- Keyboard: ↑/↓ moves through the list, Enter opens, `/` focuses search.

### Right pane: entry detail

Top to bottom, in panels matching the app's style. Use the app's own model and status functions for every derived value — don't reimplement logic.

1. **Header**: name, aliases, category tag, class. Status badge:
   - **Verified** — "Verified \<date\>".
   - **Verified — incomplete data** (as the app already defines it).
   - **Draft** — "Draft · AI-assisted, pending verification".
   - **No data yet**.
2. **At a glance**: one sentence computed with the app's simulation and clear-status logic for a **single dose of the primary product, normal metaboliser, current clear-threshold setting**: e.g. *"After a single dose, typically below the clear threshold in ~11 days (range 5–19 days)."* Use the band's min/typical/max. If the status is Incomplete, say "not before ~X days" and name the missing compounds; with assumptions, list them; no data → say so. For depots and patches, state the assumed input (one injection; one patch for its default wear time). Note "for a normal CYP2D6 metaboliser" where the compound is a CYP2D6 substrate.
3. **Products**: one card per product (route/formulation): dose unit, formulation, input model (bolus / release half-life / patch with default wear time), typical dose if set, and for combinations the components with ratio, salt factor and bioavailability.
4. **Kinetics** (per compound in the drug's tree, starting with the parent): kinetic mode; terminal half-life as a **small range bar** (min–typical–max, with how the range was derived: observed range, mean ± 2 SD, CV, cohort means, single value with assumed spread, or assumed midpoint); early phase and steady state if present; nonlinear kinetics flag.
5. **Metabolite chain**: a small inline SVG tree (parent → metabolites, following `formedFrom`), each node showing name, clinical relevance (active / inactive / unknown chip), half-life or "unknown", and formation fraction / phenotype multipliers on the edges where set. Nodes are clickable and open that compound's entry. On a metabolite's own entry, show "Formed from …" and "Part of: \<drugs\>".
6. **Safety**: CYP2D6 — substrate, phenotype multipliers, inhibitor strength and mechanism (with "strength unassessed" wording as the track uses); QT tier (chip in the tier colours; weight/reference amount if set); lingering effects; MAO or other notable notes if present in lingering effects.
7. **Receptors**: chips — target + action.
8. **Sources** — see "Sources and provenance display" below.
9. **Report a correction**: a link opening a pre-filled GitHub issue (title "Correction: \<name\> (\<id\>)", body with the entry id, section dropdown text and a prompt for the source). No network calls from the app — it's a normal link the user clicks. Take the repo URL from one config constant.

Unassessed or unknown values are always shown as "unassessed" / "unknown", never blank and never as "none".

### Sources and provenance display

- **Clean citations by default.** For each section, show a tidy list of the sources cited: extract URLs and named sources from `source` and `sourceNotes.<section>`, dedupe, and show each as a link with a readable label (domain + title or label-derived text, e.g. "DailyMed — Dolophine label"). Strip the `DRAFT —` prefix and `[checked]`/`[recall]`/… tags from this view.
- **"Show evidence notes"** expander per section reveals the full raw note text, verbatim.
- **Provenance tags**:
  - **Draft entries**: show a small, subtle provenance marker per section — e.g. a dot with a tooltip — "checked against source", "from model recall — not yet checked", "estimate", "no data found", "reviewed". A legend sits at the bottom of the pane.
  - **Verified entries**: hide the per-section tags; show "Reviewed and verified \<date\>" in the header instead. Raw notes are still available in the expander.

### Intro panel and stats

When nothing is selected, show: total drugs, compounds, products; counts by status (verified / draft / incomplete / no data); last verification date; the data-status statement (Part 2); and a link to the help page's library section.

### Implementation notes

- Lazy-load the library UI on first open so it doesn't slow the app's first paint.
- 443 compounds don't need list virtualisation; keep scrolling smooth.
- No external requests (fonts, scripts, images), consistent with the rest of the app.
- Accessible: focus trapped in the overlay while open and restored on close; semantic headings; labelled controls; sufficient contrast.

### Tests

- Hash routing: open, deep link, back/forward, close restores the app with the session intact.
- Search and filters (category, status, metabolite toggle).
- "At a glance" values equal the main simulation's clear time for the same single dose, including Incomplete ("not before") and no-data cases.
- Source extraction: URLs deduped, tags and `DRAFT —` removed in the clean view, raw text unchanged in the expander.
- Provenance markers shown for drafts, hidden for verified entries.
- Metabolite tree links navigate to the right compound.

## Part 2 — Honest data-status wording

The drug data was drafted with AI language models from published, cited sources and is pending verification by hand. The current wording in places says it was "entered by hand" or "entered manually"; that's not accurate yet. Update every user-facing place so it says, in substance:

> Drug data was drafted with the assistance of AI language models from published, cited sources (FDA labels, Baselt, CredibleMeds, the Flockhart table, CPIC, the IUPHAR/BPS Guide to Pharmacology and the primary literature). Every value records its source. Entries are reviewed and verified by hand against those sources; entries marked **Draft** have not yet been verified. The library will keep growing.

Where to apply it:

1. **Help page** — section 7 ("The drug library and its sources"), section 1 where it describes the data, the FAQ, and anywhere else that says "entered by hand/manually". Add a short subsection on the **Library** view with screenshots (update `npm run screenshots` to capture the library list, a detail pane, the metabolite tree and the sources expander). Show the live verified/draft counts.
2. **README.md** — the data description.
3. **The Library intro panel** — as above.
4. **The PDF export** — add one line near the disclaimer: "Drug data: AI-assisted drafts from cited sources; \<n\> of \<total\> entries verified as of \<date\>. Draft entries used in this report: \<list or count\>." Compute it from the drugs actually used in the export.
5. **The app** — if the main UI has any "about the data" text or tooltip, align it.

Make the counts live (from `drugs.json`), so the wording stays accurate as verification progresses. Once every entry is verified, the "Draft" parts naturally disappear; keep the sentence about AI-assisted drafting and hand verification, since it remains true.

Search the whole repo (help, README, app strings, export, docs meant for users) for "by hand", "manually", "hand-entered", "hand-encoded" and similar, and list every change in your summary.

## Final summary

Tell me: what was built; screenshots added; every wording change (file and old → new); any spec discrepancies or open questions.
