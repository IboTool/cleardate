# Task: Chemical structures for every compound

Add a 2D chemical structure drawing, plus PubChem identity data, to each compound's Library entry. Structures are **generated** from PubChem SMILES with RDKit — no images are copied from anywhere.

Implement on a branch (`structures`) from `main` **after the `v2.2` branch is merged** (both change the schema and `drugs.json`). Keep `npm test` and `npm run validate` passing; commit in logical steps. Ask rather than guess.

## 1. Schema (2.3, additive)

Each compound gains an optional `identity` object; a migration adds `"identity": null` to every compound and sets `"schemaVersion": 2.3`.

Example (methadone, a racemate — so no stereo in the SMILES):

```json
"identity": {
  "pubchemCid": 4095,
  "smiles": "CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2",
  "inchiKey": "USSIQXCVUWKGNF-UHFFFAOYSA-N",
  "formula": "C21H27NO",
  "confidence": "confirmed",
  "candidates": [],
  "note": ""
}
```

- `smiles`: PubChem **isomeric** SMILES of the **parent (neutral, non-salt)** compound.
- `confidence`: `confirmed` | `probable` | `unconfirmed` | `not-applicable`.
- `candidates`: for `probable`/`unconfirmed`, the CIDs considered, each with name and reason.
- New provenance/review section `identity` (and it joins the review workflow's compound sections).
- `molecularWeight` is filled from PubChem **only where it is currently null** (provenance `checked`, note "PubChem CID \<n\>"). Where an existing value differs by more than 0.5 g/mol, don't overwrite — list it in the report.

## 2. Lookup: `npm run structures:lookup` (dev only, needs network)

A Node script (`tools/structures/lookup.ts`) using the PubChem PUG REST API. Respect PubChem's limits (≤ 5 requests/second, retry with back-off). Never run in the build or the app.

For each compound, by name, then by each alias:

1. Resolve name → CID(s). For salts or hydrates, map to the **parent** CID.
2. Fetch isomeric SMILES, InChIKey, formula, molecular weight, and PubChem's synonyms.
3. Assign confidence:
   - **confirmed** — the compound's name or an alias is an exact (case-insensitive) PubChem synonym of exactly one parent CID; stereo agrees with the name (names with `es-`, `lev-`, `levo`, `dextro`, `d-`, `l-`, `(S)`, `(R)`, `R,R` … must have matching defined stereocentres; a racemate name must not resolve to a single enantiomer); and, if the compound already has a molecular weight, it agrees within 0.5 g/mol.
   - **probable** — a single plausible CID, but one check couldn't be applied (e.g. no existing MW, or the name doesn't specify stereo while PubChem's record does).
   - **unconfirmed** — several plausible CIDs, stereo conflict, MW conflict, or only a fuzzy match. Store the candidates; don't pick one.
   - **not-applicable** — mixtures, peptides and natural products without one defined structure. Set this for at least: `kavalactones`, `semaglutide`, `tirzepatide`, and any compound whose notes describe it as a mixture or extract; give the reason in `note`.
4. Watch for known traps and default them to `unconfirmed` unless matching is unambiguous: generic hydroxylated or "nor"/"desmethyl" metabolites whose position or isomer isn't specified (e.g. `hydroxynorketamine`, `10_hydroxynortriptyline`, `hydroxyetizolam`, `hydroxytriazolam`), vague names (`clopidogrel_active_thiol_metabolite`, `cvt_2738`), and designer-drug metabolites.
5. Write results into `drugs.json` (keeping its formatting, key order and sort order) and a lock file `tools/structures/pubchem-lock.json` (CID → SMILES/InChIKey/formula/MW, plus retrieval date) committed to the repo, so rendering is reproducible offline. Cache raw responses under `tools/structures/.cache/` (gitignored).
6. Never change a section with provenance `reviewer`, and never touch `verified` entries' other fields.

## 3. Rendering: `npm run structures:render` (offline)

A Node script using **`@rdkit/rdkit`** (the official RDKit WebAssembly build; dev dependency) that renders every compound with `confidence` `confirmed` or `probable` from its stored SMILES.

- Output `public/structures/<id>.svg` (dark theme) and `public/structures/<id>.light.svg` (light theme, for print/export).
- Style matching the app: transparent background; bonds and carbon labels in the theme's text colour; heteroatoms in a muted palette derived from the app's colour tokens (one consistent mapping — e.g. N, O, S, halogens, P); wedge/hash stereo bonds shown; no atom indices; consistent bond length so molecules of similar size render at similar scale; viewBox fitted to the molecule with a small margin.
- Optimise the SVG output (strip metadata, round coordinates) — target a few KB each.
- Deterministic: the same SMILES always produces byte-identical SVGs, so diffs stay clean.
- Add rendering to `prebuild` (fast, offline), so images never drift from the data; remove orphaned SVGs for compounds that no longer qualify.

## 4. Library display

In each compound's entry (and in the drug's header for its primary compound):

- **confirmed** → the structure (dark SVG), with formula, molecular weight, a PubChem link ("PubChem CID 4095"), and the InChIKey with a copy button.
- **probable** → the structure with a subtle "Probable match — pending review" label.
- **unconfirmed** → **no drawing**; a placeholder "Structure pending confirmation" with the candidate CIDs listed for transparency.
- **not-applicable** → a placeholder with the reason ("Mixture of six kavalactones", "Peptide").
- Images lazy-loaded; `alt` text "Chemical structure of \<name\>".
- Metabolite-tree nodes can show a small thumbnail on hover (optional, if it stays tidy).

## 5. Editor

- An **identity** section in the review workflow: shows the drawing, CID, SMILES, InChIKey, confidence and candidates. The reviewer can Confirm, or set a different CID (then `npm run structures:lookup -- --id <compoundId>` refreshes that one entry and its rendering).
- Confirming as reviewer sets confidence to `confirmed` and provenance `reviewer`.

## 6. Help page, About, README

- Help (Library section): structures are generated from PubChem data with RDKit; unconfirmed identities are not drawn.
- About / acknowledgements: PubChem (NCBI) as the source of identifiers and SMILES; RDKit (BSD licence).
- README: the two commands, when to run lookup, and that the lock file makes rendering reproducible.
- Regenerate affected help screenshots.

## 7. Tests

- Matching: salt → parent CID; exact synonym → confirmed; stereo-specific name vs racemic record → not confirmed; multiple CIDs → unconfirmed with candidates; MW conflict → unconfirmed; mixtures → not-applicable. Use recorded fixtures, not live network calls.
- Rendering: valid SVG, theme colours applied, deterministic output, no SVG for unconfirmed.
- Library: correct display for each confidence level.
- Migration to 2.3 idempotent; validator accepts the new fields.

## 8. Outputs

- `docs/structures_report.md`: counts by confidence; every `unconfirmed` and `probable` compound with candidates and reason; molecular weights filled; MW conflicts; not-applicable list.
- Append to `user_to_do.md` (without editing existing content) a section `## Structure identities to confirm <date>` listing the unconfirmed and probable compounds.

Final summary: counts by confidence, total SVG size, anything unusual, and how to re-run lookup for a single compound.
