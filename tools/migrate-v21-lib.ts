// v2 → v2.1 library migration (docs/ClearDate_Spec_v2.1.md §5). Pure: no file access, so it is
// unit-tested directly. tools/migrate-v2.1.ts is the CLI wrapper.

import { clone, INHIBITOR_NOT_ASSESSED_RE, primaryCompound } from '../src/schema';
import type { Compound, Library, Product } from '../src/types';
import { applyV21ProductRules, type ProductChange } from './product-rules';

/** The compounds the spec expects the inhibitor reset to hit on the current data. */
export const EXPECTED_INHIBITOR_RESETS = [
  'buprenorphine', 'codeine', 'dextromethorphan', 'hydrocodone', 'loperamide', 'norbuprenorphine', 'oxycodone', 'tapentadol', 'tramadol',
];

export const INHIBITOR_RESET_NOTE = 'Inhibitor status reset to unassessed by migration v2.1 (note said not assessed).';

export interface V21Report {
  compounds: number;
  products: number;
  /** clinicalRelevance assigned: parents, metabolites dosed as a product's primary component, and the rest. */
  relevance: { parents: string[]; dosedMetabolites: string[]; unknown: string[] };
  reviewedDatesAdded: { compounds: number; products: number };
  inhibitorReset: { id: string; inhibitionType: string }[];
  productChanges: ProductChange[];
}

export class InhibitorResetMismatch extends Error {
  constructor(public hits: string[], public unexpected: string[], public missing: string[]) {
    super(
      'CYP2D6 inhibitor reset hits differ from the list in the spec — nothing was changed.' +
        (unexpected.length ? `\n  Hit but not in the spec: ${unexpected.join(', ')}` : '') +
        (missing.length ? `\n  In the spec but not hit: ${missing.join(', ')}` : ''),
    );
  }
}

/** Compounds whose inhibitor is "none" while the cyp2d6 note says inhibition was never assessed. */
export function inhibitorResetHits(compounds: Compound[]): string[] {
  return compounds
    .filter((c) => c.cyp2d6?.inhibitor === 'none' && INHIBITOR_NOT_ASSESSED_RE.test(c.sourceNotes?.cyp2d6 ?? ''))
    .map((c) => c.id)
    .sort();
}

/** active for parents and primary components of a product; unknown otherwise (spec v2.1 §5). */
export function assignRelevance(lib: Pick<Library, 'compounds' | 'products'>): void {
  const primaries = new Set(lib.products.map(primaryCompound));
  for (const c of lib.compounds) c.clinicalRelevance = !c.isMetabolite || primaries.has(c.id) ? 'active' : 'unknown';
}

export interface V21Options {
  /**
   * Stop (throw InhibitorResetMismatch, changing nothing) unless the reset hits exactly these ids.
   * null skips the check (fixtures, init-data).
   */
  expectedInhibitorResets: string[] | null;
}

/** Migrate a schema-2 library to 2.1. A 2.1 library is returned unchanged with `skipped: true` (idempotent). */
export function migrateLibraryV21(input: unknown, opts: V21Options): { lib: Library; report: V21Report; skipped: boolean } {
  const src = input as Library & { schemaVersion: number };
  const report: V21Report = {
    compounds: 0, products: 0,
    relevance: { parents: [], dosedMetabolites: [], unknown: [] },
    reviewedDatesAdded: { compounds: 0, products: 0 },
    inhibitorReset: [],
    productChanges: [],
  };
  const version = src?.schemaVersion as number | undefined;
  if (typeof version === 'number' && version >= 2.1) return { lib: src as Library, report, skipped: true };
  if (version !== 2) throw new Error(`expected a schemaVersion 2 library, found ${String(version)} (run npm run migrate-v2 first)`);

  // Check before changing anything.
  const hits = inhibitorResetHits(src.compounds);
  if (opts.expectedInhibitorResets) {
    const expected = [...opts.expectedInhibitorResets].sort();
    const unexpected = hits.filter((id) => !expected.includes(id));
    const missing = expected.filter((id) => !hits.includes(id));
    if (unexpected.length || missing.length) throw new InhibitorResetMismatch(hits, unexpected, missing);
  }

  const lib = clone(src) as Library;
  (lib as { schemaVersion: number }).schemaVersion = 2.1;

  report.productChanges = applyV21ProductRules(lib, { annotate: true });

  assignRelevance(lib);
  const primaries = new Set(lib.products.map(primaryCompound));
  for (const c of lib.compounds) {
    if (!c.isMetabolite) report.relevance.parents.push(c.id);
    else if (primaries.has(c.id)) report.relevance.dosedMetabolites.push(c.id);
    else report.relevance.unknown.push(c.id);
    c.provenance = { ...c.provenance, relevance: c.provenance?.relevance ?? null };
    c.sourceNotes = { ...c.sourceNotes, relevance: c.sourceNotes?.relevance ?? '' };
    if (!c.reviewedDates) {
      c.reviewedDates = {};
      report.reviewedDatesAdded.compounds++;
    }
  }
  for (const p of lib.products as Product[])
    if (!p.reviewedDates) {
      p.reviewedDates = {};
      report.reviewedDatesAdded.products++;
    }

  for (const c of lib.compounds) {
    if (!hits.includes(c.id)) continue;
    report.inhibitorReset.push({ id: c.id, inhibitionType: c.cyp2d6.inhibitionType });
    c.cyp2d6 = {
      ...c.cyp2d6,
      inhibitor: 'unassessed',
      inhibitionType: c.cyp2d6.inhibitionType === 'none' ? 'unassessed' : c.cyp2d6.inhibitionType,
    };
    const note = c.sourceNotes.cyp2d6 ?? '';
    c.sourceNotes.cyp2d6 = note ? `${note} ${INHIBITOR_RESET_NOTE}` : INHIBITOR_RESET_NOTE;
  }

  report.compounds = lib.compounds.length;
  report.products = lib.products.length;
  return { lib, report, skipped: false };
}

export function renderV21Report(r: V21Report, date: string, backupPath: string): string {
  const L: string[] = [];
  const list = (ids: string[]) => (ids.length ? ids.map((id) => `\`${id}\``).join(', ') : '—');
  L.push(
    '# Migration to schema 2.1',
    '',
    `Run on ${date} by \`npm run migrate-v2.1\` (docs/ClearDate_Spec_v2.1.md §5). The v2 file is kept as \`${backupPath}\`.`,
    '',
    '## Summary',
    '',
    '| Change | Count |',
    '|---|---|',
    `| \`schemaVersion\` 2 → 2.1 | 1 |`,
    `| \`clinicalRelevance\` added to compounds | ${r.compounds} |`,
    `| … \`active\` (parent compound) | ${r.relevance.parents.length} |`,
    `| … \`active\` (metabolite that is a product's primary component) | ${r.relevance.dosedMetabolites.length} |`,
    `| … \`unknown\` (metabolite, not assessed) | ${r.relevance.unknown.length} |`,
    `| \`relevance\` added to provenance (null) and sourceNotes ("") | ${r.compounds} |`,
    `| \`reviewedDates: {}\` added | ${r.reviewedDatesAdded.compounds} compounds, ${r.reviewedDatesAdded.products} products |`,
    `| CYP2D6 inhibitor reset to \`unassessed\` | ${r.inhibitorReset.length} |`,
    `| Products removed | ${r.productChanges.filter((c) => c.kind === 'removed').length} |`,
    '',
    `Library after migration: ${r.compounds} compounds, ${r.products} products.`,
    '',
    '## CYP2D6 inhibitor reset',
    '',
    'Compounds with `cyp2d6.inhibitor: "none"` whose CYP2D6 note says inhibition was not assessed ' +
      '(regex `inhibit[^.]*?(unassessed|not assessed|pending|not established|unconfirmed)`, case-insensitive). ' +
      `\`inhibitor\` → \`unassessed\`; \`inhibitionType\` \`none\` → \`unassessed\`. Note appended: "${INHIBITOR_RESET_NOTE}"`,
    '',
    '| Compound | inhibitor | inhibitionType |',
    '|---|---|---|',
    ...r.inhibitorReset.map((x) => `| \`${x.id}\` | none → unassessed | ${x.inhibitionType === 'none' ? 'none → unassessed' : `${x.inhibitionType} (unchanged)`} |`),
    '',
    '## Products removed',
    '',
    ...(r.productChanges.length
      ? r.productChanges.map((c) => `- \`${c.oldId}\` removed${c.newIds.length ? `; patient sessions are offered ${list(c.newIds)} as the replacement, and its \`sourceNotes.input\` notes that intrathecal dosing is not modelled` : ''}.`)
      : ['None.']),
    '',
    '## Clinical relevance',
    '',
    'Parents and compounds dosed directly are always treated as active. Every other metabolite starts as `unknown`: ' +
      'it still blocks clear dates when its kinetics are unknown, until a reviewer sets it to `inactive` (or `active`).',
    '',
    `**Metabolites set to \`active\` because a product doses them directly (${r.relevance.dosedMetabolites.length}):** ${list(r.relevance.dosedMetabolites)}`,
    '',
    `<details><summary>Metabolites set to <code>unknown</code> (${r.relevance.unknown.length})</summary>`,
    '',
    list(r.relevance.unknown),
    '',
    '</details>',
    '',
    `<details><summary>Parent compounds set to <code>active</code> (${r.relevance.parents.length})</summary>`,
    '',
    list(r.relevance.parents),
    '',
    '</details>',
    '',
  );
  return L.join('\n');
}
