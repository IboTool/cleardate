// v2.1 → v2.2 library migration (docs/ClearDate_Spec_v2.2.md §6). Pure: no file access, so it is
// unit-tested directly. tools/migrate-v2.2.ts is the CLI wrapper.
//
// Every value it sets is tagged `estimate` with a note citing Supplement B Part 4; the reviewer confirms.

import { clone, emptyRange, primaryCompound } from '../src/schema';
import type { Compound, CompoundSection, Library, Product, ProductSection } from '../src/types';
import { applyV22ProductRules, PRODRUG_RULES } from './product-rules';

const SRC = 'Supplement B Part 4';

export const NITROUS_REASON = 'Exhaled within minutes; clinically relevant effect is prolonged vitamin B12 inactivation — see lingering effects';
export const PRECURSOR_REASON = 'Endogenous serotonin precursor; relevance is serotonergic interaction, not washout';

/** Compounds set to `not-modelled`, with the reason shown to users. */
export const NOT_MODELLED: Record<string, string> = {
  nitrous_oxide: NITROUS_REASON,
  '5_htp': PRECURSOR_REASON,
  l_tryptophan: PRECURSOR_REASON,
};
export const ZERO_ORDER = ['ethanol'];
export const ENDOGENOUS = ['indole_3_acetic_acid'];
/** [metabolite, parent, required compound]. */
export const CONDITIONAL_EDGES: [string, string, string][] = [
  ['cocaethylene', 'cocaine', 'ethanol'],
  ['ethylphenidate', 'methylphenidate', 'ethanol'],
];

export interface StatusCounts {
  ok: number;
  incomplete: number;
  'no-data': number;
  'not-modelled': number;
}

export interface V22Report {
  compounds: number;
  products: number;
  prodrugs: { id: string; compound: string; administeredAs: string; massFactor: number; doseUnit?: string }[];
  zeroOrder: string[];
  /** Products whose dose unit became standard drinks. */
  drinkProducts: string[];
  notModelled: { id: string; reason: string }[];
  /** Products switched to exposure sessions. */
  sessionProducts: string[];
  endogenous: string[];
  conditional: { compound: string; from: string; requires: string }[];
  /** Filled in by the CLI with the app's status functions (before / after). */
  status?: { before: StatusCounts; after: StatusCounts; changed: { id: string; before: string; after: string }[] };
}

export class MigrationStop extends Error {
  constructor(public problems: string[]) {
    super(`Migration v2.2 stopped — nothing was changed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
}

const isNitrous = (p: Product) => primaryCompound(p) === 'nitrous_oxide';
const isEthanol = (p: Product) => primaryCompound(p) === 'ethanol';

/** Everything the migration needs, and anything that says it already ran (partly) or was reviewed. */
export function preflightV22(lib: Library): string[] {
  const problems: string[] = [];
  const compounds = new Map(lib.compounds.map((c) => [c.id, c]));
  const products = new Map(lib.products.map((p) => [p.id, p]));
  const needCompound = (id: string) => {
    const c = compounds.get(id);
    if (!c) problems.push(`compound "${id}" does not exist`);
    return c;
  };
  const reviewed = (e: Compound | Product, s: CompoundSection | ProductSection) => {
    if ((e.provenance as Record<string, string | null | undefined>)[s] === 'reviewer')
      problems.push(`${e.id}: section "${s}" is reviewer-confirmed — the migration won't overwrite it`);
  };

  for (const [pid, r] of Object.entries(PRODRUG_RULES)) {
    needCompound(r.compound);
    needCompound(r.administeredAs);
    const p = products.get(pid);
    if (!p) {
      problems.push(`product "${pid}" does not exist`);
      continue;
    }
    if (p.components.length !== 1 || p.components[0].compound !== r.administeredAs || p.components[0].administeredAs)
      problems.push(`${pid}: expected a single component "${r.administeredAs}", found ${p.components.map((c) => c.compound).join(', ')} — already changed?`);
    for (const s of ['components', 'conversion', ...(r.doseUnit ? ['input'] : [])] as ProductSection[]) reviewed(p, s);
  }
  for (const id of [...ZERO_ORDER, ...Object.keys(NOT_MODELLED)]) {
    const c = needCompound(id);
    if (!c) continue;
    if (c.kinetics.mode !== 'unknown') problems.push(`${id}: expected kinetics.mode "unknown", found "${c.kinetics.mode}" — already changed?`);
    reviewed(c, 'halfLife');
  }
  if (!lib.products.some(isEthanol)) problems.push('no product doses ethanol');
  if (!lib.products.some(isNitrous)) problems.push('no product doses nitrous_oxide');
  for (const p of lib.products.filter((x) => isEthanol(x) || isNitrous(x))) {
    if (p.doseUnit !== 'mg') problems.push(`${p.id}: expected dose unit mg, found ${p.doseUnit} — already changed?`);
    reviewed(p, 'input');
  }
  for (const id of ENDOGENOUS) {
    const c = needCompound(id);
    if (!c) continue;
    if (c.endogenous !== undefined) problems.push(`${id}: endogenous is already set`);
    reviewed(c, 'halfLife');
  }
  for (const [id, from, req] of CONDITIONAL_EDGES) {
    needCompound(from);
    needCompound(req);
    const c = needCompound(id);
    if (!c) continue;
    const edge = c.formedFrom.find((f) => f.compound === from);
    if (!edge) problems.push(`${id}: no formedFrom link from "${from}"`);
    else if (edge.condition) problems.push(`${id}: the link from "${from}" already has a condition`);
    reviewed(c, 'metabolism');
  }
  return problems;
}

/** Migrate a schema-2.1 library to 2.2. A 2.2 library is returned unchanged with `skipped: true` (idempotent). */
export function migrateLibraryV22(input: unknown): { lib: Library; report: V22Report; skipped: boolean } {
  const src = input as Library;
  const report: V22Report = {
    compounds: 0, products: 0, prodrugs: [], zeroOrder: [], drinkProducts: [], notModelled: [], sessionProducts: [], endogenous: [], conditional: [],
  };
  const version = (src as { schemaVersion?: number })?.schemaVersion;
  if (typeof version === 'number' && version >= 2.2) return { lib: src, report, skipped: true };
  if (version !== 2.1) throw new Error(`expected a schemaVersion 2.1 library, found ${String(version)} (run npm run migrate-v2.1 first)`);

  const problems = preflightV22(src);
  if (problems.length) throw new MigrationStop(problems);

  const lib = clone(src);
  lib.schemaVersion = 2.2;
  const note = (e: Compound | Product, s: string, text: string) => {
    const notes = e.sourceNotes as Record<string, string>;
    const prev = notes[s] ?? '';
    notes[s] = prev ? `${prev} ${text}` : text;
    (e.provenance as Record<string, string | null>)[s] = 'estimate';
  };
  const compound = (id: string) => lib.compounds.find((c) => c.id === id)!;

  // §1 prodrugs.
  applyV22ProductRules(lib, { annotate: true });
  for (const [pid, r] of Object.entries(PRODRUG_RULES))
    report.prodrugs.push({ id: pid, compound: r.compound, administeredAs: r.administeredAs, massFactor: r.massFactor, ...(r.doseUnit ? { doseUnit: r.doseUnit } : {}) });

  // §2 alcohol.
  for (const id of ZERO_ORDER) {
    const c = compound(id);
    c.kinetics = { mode: 'zero-order', halfLifeHours: null, zeroOrderRateMgPerKgPerHour: emptyRange(), earlyPhase: null, steadyState: null };
    note(c, 'halfLife', `[estimate] ${SRC}: kinetics mode set to zero-order (constant elimination rate, mg/kg/h) by migration v2.2; rate left unknown for the reviewer to fill from the rate context above.`);
    report.zeroOrder.push(id);
  }
  for (const p of lib.products.filter(isEthanol)) {
    p.doseUnit = 'standard drinks';
    p.typicalDose = { ...p.typicalDose, unit: 'standard drinks', amount: null };
    note(p, 'input', `[estimate] ${SRC}: dose unit set to standard drinks (size set in Settings) by migration v2.2.`);
    report.drinkProducts.push(p.id);
  }

  // §3 not modelled.
  for (const [id, reason] of Object.entries(NOT_MODELLED)) {
    const c = compound(id);
    c.kinetics = { mode: 'not-modelled', halfLifeHours: null, notModelledReason: reason, earlyPhase: null, steadyState: null };
    note(c, 'halfLife', `[estimate] ${SRC}: kinetics mode set to not-modelled by migration v2.2 — ${reason}.`);
    report.notModelled.push({ id, reason });
  }
  for (const p of lib.products.filter(isNitrous)) {
    p.doseUnit = 'session';
    p.input = { type: 'zero-order', releaseHalfLifeHours: null, defaultDurationHours: null };
    p.typicalDose = { ...p.typicalDose, unit: 'session', amount: null };
    note(p, 'input', `[estimate] ${SRC}: entered as exposure sessions with a duration (no mass dose) by migration v2.2.`);
    report.sessionProducts.push(p.id);
  }

  // §4 endogenous.
  for (const id of ENDOGENOUS) {
    const c = compound(id);
    c.endogenous = true;
    note(c, 'halfLife', `[estimate] ${SRC}: marked endogenous by migration v2.2 — also produced by the body; excess over baseline not modelled. Unknown kinetics stop blocking clear dates once relevance is reviewed.`);
    report.endogenous.push(id);
  }

  // §5 conditional edges.
  for (const [id, from, req] of CONDITIONAL_EDGES) {
    const c = compound(id);
    c.formedFrom = c.formedFrom.map((f) => (f.compound === from ? { ...f, condition: { requiresCompound: req } } : f));
    note(c, 'metabolism', `[estimate] ${SRC}: formed from ${from} only while ${req} is also present (conditional link added by migration v2.2).`);
    report.conditional.push({ compound: id, from, requires: req });
  }

  report.compounds = lib.compounds.length;
  report.products = lib.products.length;
  return { lib, report, skipped: false };
}

const STATUS_LABEL: Record<keyof StatusCounts, string> = {
  ok: 'Clear date computable',
  incomplete: 'Incomplete (missing kinetics)',
  'no-data': 'No data yet',
  'not-modelled': 'Not modelled',
};

export function renderV22Report(r: V22Report, date: string, backupPath: string): string {
  const L: string[] = [];
  const code = (s: string) => `\`${s}\``;
  L.push(
    '# Migration to schema 2.2',
    '',
    `Run on ${date} by \`npm run migrate-v2.2\` (docs/ClearDate_Spec_v2.2.md §6). The v2.1 file is kept as \`${backupPath}\`. ` +
      `Every value set here is tagged \`estimate\` with a note citing ${SRC}; the reviewer confirms.`,
    '',
    `Library after migration: ${r.compounds} compounds, ${r.products} products.`,
    '',
  );
  if (r.status) {
    const keys = Object.keys(STATUS_LABEL) as (keyof StatusCounts)[];
    L.push(
      '## Product status before and after',
      '',
      'Computed with the app\'s status function (`productDataStatus`, "treat unknown as formation-limited" off, no alcohol in the scenario).',
      '',
      '| Status | Before | After |',
      '|---|---|---|',
      ...keys.map((k) => `| ${STATUS_LABEL[k]} | ${r.status!.before[k]} | ${r.status!.after[k]} |`),
      '',
      ...(r.status.changed.length
        ? ['| Product | Before | After |', '|---|---|---|', ...r.status.changed.map((c) => `| ${code(c.id)} | ${c.before} | ${c.after} |`)]
        : ['No product changed status.']),
      '',
    );
  }
  L.push(
    '## Prodrugs (§1)',
    '',
    '| Product | Modelled as | Administered as | massFactor | Dose unit |',
    '|---|---|---|---|---|',
    ...r.prodrugs.map((p) => `| ${code(p.id)} | ${code(p.compound)} | ${code(p.administeredAs)} | ${p.massFactor} | ${p.doseUnit ?? 'unchanged'} |`),
    '',
    'The `components` and new `conversion` sections are tagged `estimate`. Clorazepate assumes label strengths as the dipotassium salt (confirm); GBL assumes complete conversion and GHB\'s own nonlinear kinetics are not represented.',
    '',
    '## Alcohol (§2)',
    '',
    `${r.zeroOrder.map(code).join(', ')}: \`kinetics.mode\` → \`zero-order\`, \`zeroOrderRateMgPerKgPerHour\` all null (reviewer fills it from the rate context in the half-life note). ` +
      `Until then its products show "No data yet". Dose unit → standard drinks: ${r.drinkProducts.map(code).join(', ')}.`,
    '',
    '## Not modelled (§3)',
    '',
    '| Compound | Reason shown to users |',
    '|---|---|',
    ...r.notModelled.map((x) => `| ${code(x.id)} | ${x.reason} |`),
    '',
    `Entered as exposure sessions with a duration (dose unit \`session\`, zero-order input): ${r.sessionProducts.map(code).join(', ') || '—'}.`,
    '',
    '## Endogenous (§4)',
    '',
    `${r.endogenous.map(code).join(', ')}: \`endogenous: true\`. Its unknown kinetics stop blocking clear dates once its clinical relevance is reviewer-confirmed.`,
    '',
    '## Conditional metabolites (§5)',
    '',
    ...r.conditional.map((c) => `- ${code(c.compound)} ← ${code(c.from)}: formed only while ${code(c.requires)} is also present.`),
    '',
  );
  return L.join('\n');
}
