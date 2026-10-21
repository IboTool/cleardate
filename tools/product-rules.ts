// Product rules shared by `npm run migrate-v2`, `npm run migrate-v2.1` and `npm run init-data` (spec v2,
// "Shared product rules"; v2.1 §5): input-model inference from the route, release-form splits, depot
// splits, the buprenorphine/naloxone combination product, route clean-ups and the 2.1 removals. The
// tools run these on freshly built products, so a fresh init-data yields the same product set as the migrations.

import { clone, primaryCompound } from '../src/schema';
import type { Formulation, Library, Product, ProductInput } from '../src/types';

export interface ProductChange {
  kind: 'release-split' | 'depot-split' | 'rename' | 'combination' | 'removed';
  oldId: string;
  newIds: string[];
}

export interface RuleOptions {
  /** Append "… by migration." notes to split/renamed products. */
  annotate: boolean;
}

const DEPOT = /depot|\bLAI\b|decanoate|palmitate|pamoate/i;
const PATCH = /transdermal|patch/i;
const RELEASE_SPLIT = /^Oral IR\/((?:ER|CR|XR|SR|XL)(?:\/(?:ER|CR|XR|SR|XL))*)$/;

/** Input model, dose unit and formulation implied by a route string. */
export function inferInput(route: string): { input: ProductInput; doseUnit: Product['doseUnit']; formulation: Formulation | null } {
  if (PATCH.test(route))
    return { input: { type: 'zero-order', releaseHalfLifeHours: null, defaultDurationHours: 72 }, doseUnit: 'µg/h', formulation: 'patch' };
  if (DEPOT.test(route))
    return { input: { type: 'first-order-release', releaseHalfLifeHours: null, defaultDurationHours: null }, doseUnit: 'mg', formulation: 'depot' };
  if (route === 'Oral ER')
    return { input: { type: 'first-order-release', releaseHalfLifeHours: null, defaultDurationHours: null }, doseUnit: 'mg', formulation: 'ER' };
  return { input: { type: 'bolus', releaseHalfLifeHours: null, defaultDurationHours: null }, doseUnit: 'mg', formulation: null };
}

/** Set input/doseUnit/formulation from the route, keeping any release half-life already present. */
export function applyInputRule(p: Product): Product {
  const inf = inferInput(p.route);
  const release = p.input?.releaseHalfLifeHours ?? null;
  return { ...p, ...inf, input: { ...inf.input, releaseHalfLifeHours: release } };
}

const baseName = (p: Product) => {
  const suffix = ` (${p.route})`;
  return p.name.endsWith(suffix) ? p.name.slice(0, -suffix.length) : p.name.replace(/\s*\([^)]*\)\s*$/, '');
};

function note(p: Product, text: string, opts: RuleOptions): Product {
  if (!opts.annotate) return p;
  const prev = p.sourceNotes.input ?? '';
  return { ...p, sourceNotes: { ...p.sourceNotes, input: prev ? `${prev} ${text}` : text } };
}

function variant(p: Product, id: string, route: string, patch: Partial<Product> = {}): Product {
  const c = clone(p);
  return applyInputRule({ ...c, id, route, name: `${baseName(p)} (${route})`, ...patch });
}

interface DepotSplit {
  id: string;
  route: string;
  aliases?: string[];
}

const DEPOT_SPLITS: Record<string, DepotSplit[]> = {
  buprenorphine_sc_depot_sublocade_brixadi: [
    { id: 'buprenorphine_sc_depot_sublocade', route: 'SC depot (Sublocade)', aliases: ['Sublocade'] },
    { id: 'buprenorphine_sc_depot_brixadi_weekly', route: 'SC depot (Brixadi weekly)', aliases: ['Brixadi'] },
    { id: 'buprenorphine_sc_depot_brixadi_monthly', route: 'SC depot (Brixadi monthly)', aliases: ['Brixadi'] },
  ],
  paliperidone_lai_palmitate_1_3_6_monthly: [
    { id: 'paliperidone_lai_palmitate_1_monthly', route: 'LAI palmitate (1-monthly)' },
    { id: 'paliperidone_lai_palmitate_3_monthly', route: 'LAI palmitate (3-monthly)' },
    { id: 'paliperidone_lai_palmitate_6_monthly', route: 'LAI palmitate (6-monthly)' },
  ],
  aripiprazole_lai_monthly_2_monthly: [
    { id: 'aripiprazole_lai_monthly', route: 'LAI (monthly)' },
    { id: 'aripiprazole_lai_2_monthly', route: 'LAI (2-monthly)' },
    { id: 'aripiprazole_lauroxil_im_depot', route: 'IM depot (lauroxil)', aliases: ['Aristada'] },
  ],
};

const RENAMES: Record<string, { id: string; route: string }> = {
  loperamide_oral_incl_high_dose_misuse: { id: 'loperamide_oral', route: 'Oral' },
  etizolam_oral_often_illicit: { id: 'etizolam_oral', route: 'Oral' },
};

const COMBINATION_ID = 'buprenorphine_naloxone_sublingual';
const COMBINATION_REPLACES = 'naloxone_sl_with_buprenorphine';

const SECONDARY: [RegExp, string[]][] = [
  [/^dextromethorphan_/, ['psychedelics_dissociatives']],
  [/^tianeptine_/, ['antidepressants']],
];

/** Split / rename / annotate one product. Products without a matching rule pass through. */
export function expandProduct(p: Product, opts: RuleOptions): { products: Product[]; change?: ProductChange } {
  const split = RELEASE_SPLIT.exec(p.route);
  if (split) {
    const forms = ['IR', ...split[1].split('/')] as Formulation[];
    const prefix = p.id.slice(0, p.id.length - (p.id.match(/_oral_[a-z_]+$/)?.[0].length ?? 0));
    const out = forms.map((form, i) => {
      let v = variant(p, `${prefix}_oral_${form.toLowerCase()}`, 'Oral', { name: `${baseName(p)} (Oral ${form})` });
      v = {
        ...v,
        formulation: form,
        input: i === 0
          ? { type: 'bolus', releaseHalfLifeHours: null, defaultDurationHours: null }
          : { type: 'first-order-release', releaseHalfLifeHours: null, defaultDurationHours: null },
      };
      return note(v, `Split from ${p.id} by migration.`, opts);
    });
    return { products: out, change: { kind: 'release-split', oldId: p.id, newIds: out.map((x) => x.id) } };
  }

  const depot = DEPOT_SPLITS[p.id];
  if (depot) {
    const out = depot.map((d) =>
      note(variant(p, d.id, d.route, d.aliases ? { aliases: [...d.aliases] } : {}), `Split from ${p.id} by migration; release half-life is product-specific.`, opts),
    );
    return { products: out, change: { kind: 'depot-split', oldId: p.id, newIds: out.map((x) => x.id) } };
  }

  if (p.id === 'risperidone_lai_several') {
    const msg = 'Several brands with different release profiles — split by brand before populating.';
    const prev = p.sourceNotes.input ?? '';
    return { products: [applyInputRule({ ...p, sourceNotes: { ...p.sourceNotes, input: prev.includes(msg) ? prev : `${prev ? prev + ' ' : ''}${msg}` } })] };
  }

  const ren = RENAMES[p.id];
  if (ren) {
    const v = note(variant(p, ren.id, ren.route), `Renamed from ${p.id} by migration.`, opts);
    return { products: [v], change: { kind: 'rename', oldId: p.id, newIds: [v.id] } };
  }

  if (p.id === 'fluoxetine_oral_incl_weekly') {
    const daily = note(variant(p, 'fluoxetine_oral', 'Oral'), `Split from ${p.id} by migration.`, opts);
    let weekly = variant(p, 'fluoxetine_oral_weekly_dr', 'Oral (weekly DR)');
    weekly = note(
      { ...weekly, formulation: 'ER', input: { type: 'first-order-release', releaseHalfLifeHours: null, defaultDurationHours: null } },
      `Split from ${p.id} by migration.`,
      opts,
    );
    return { products: [daily, weekly], change: { kind: 'release-split', oldId: p.id, newIds: [daily.id, weekly.id] } };
  }

  return { products: [applyInputRule(p)] };
}

function combinationProduct(lib: Library): Product {
  const bup = lib.products.find((p) => primaryCompound(p) === 'buprenorphine' && /sublingual|\bSL\b/i.test(p.route));
  return {
    id: COMBINATION_ID,
    candidateId: 'buprenorphine',
    name: 'Buprenorphine/naloxone (Sublingual)',
    aliases: ['Suboxone', 'Zubsolv'],
    category: bup?.category ?? 'opioids',
    secondaryCategories: [],
    class: 'opioid partial agonist + opioid antagonist',
    route: 'Sublingual',
    formulation: 'IR',
    components: [
      { compound: 'buprenorphine', ratio: 1, saltFactor: null, bioavailability: null },
      { compound: 'naloxone', ratio: 0.25, saltFactor: null, bioavailability: null },
    ],
    doseUnit: 'mg',
    input: { type: 'bolus', releaseHalfLifeHours: null, defaultDurationHours: null },
    typicalDose: { amount: null, unit: 'mg', basis: 'maintenance' },
    provenance: { components: 'recall' },
    sourceNotes: { components: '[recall] Fixed-ratio 4:1 buprenorphine:naloxone (Suboxone, Zubsolv). Bioavailability of sublingual naloxone is very low; reviewer to set.' },
    reviewedDates: {},
    source: '',
    verified: false,
    verifiedDate: '',
  };
}

/** Run every product rule over a library (mutates and returns it) and report what changed. */
export function applyProductRules(lib: Library, opts: RuleOptions): ProductChange[] {
  const changes: ProductChange[] = [];
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const p of lib.products) {
    const r = expandProduct(p, opts);
    if (r.change) changes.push(r.change);
    for (const x of r.products) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(x);
    }
  }
  lib.products = out;

  // Buprenorphine/naloxone replaces the "naloxone SL (with buprenorphine)" route.
  const hasBup = lib.compounds.some((c) => c.id === 'buprenorphine');
  const hasNal = lib.compounds.some((c) => c.id === 'naloxone');
  if (hasBup && hasNal && !lib.products.some((p) => p.id === COMBINATION_ID)) {
    const removed = lib.products.some((p) => p.id === COMBINATION_REPLACES);
    lib.products = lib.products.filter((p) => p.id !== COMBINATION_REPLACES);
    lib.products.push(combinationProduct(lib));
    changes.push({ kind: 'combination', oldId: removed ? COMBINATION_REPLACES : '', newIds: [COMBINATION_ID] });
    const strip = (a: string[]) => a.filter((x) => x.toLowerCase() !== 'suboxone');
    for (const c of lib.compounds) if (c.id === 'buprenorphine') c.aliases = strip(c.aliases);
    for (const p of lib.products) if (p.id !== COMBINATION_ID && primaryCompound(p) === 'buprenorphine') p.aliases = strip(p.aliases);
  }

  for (const p of lib.products)
    for (const [re, cats] of SECONDARY)
      if (re.test(p.id)) p.secondaryCategories = [...new Set([...(p.secondaryCategories ?? []), ...cats])];

  return changes;
}

/** Products removed in schema 2.1 because the model can't represent them (spec v2.1 §5). */
export const REMOVED_V21: Record<string, { replacement: string; note: string }> = {
  baclofen_intrathecal: {
    replacement: 'baclofen_oral',
    note: 'Intrathecal baclofen not modelled (pump/CSF kinetics). Abrupt intrathecal withdrawal is a separate clinical risk.',
  },
};

/** Schema 2.1 product rules (removals). Mutates the library; with `annotate`, notes go on the replacement. */
export function applyV21ProductRules(lib: Library, opts: RuleOptions): ProductChange[] {
  const changes: ProductChange[] = [];
  for (const [id, r] of Object.entries(REMOVED_V21)) {
    if (!lib.products.some((p) => p.id === id)) continue;
    lib.products = lib.products.filter((p) => p.id !== id);
    const repl = lib.products.find((p) => p.id === r.replacement);
    if (repl && opts.annotate && !(repl.sourceNotes.input ?? '').includes(r.note))
      repl.sourceNotes = { ...repl.sourceNotes, input: repl.sourceNotes.input ? `${repl.sourceNotes.input} ${r.note}` : r.note };
    changes.push({ kind: 'removed', oldId: id, newIds: repl ? [repl.id] : [] });
  }
  return changes;
}

/** Old (v1 / v2) product id → its replacements, for migrating saved patient sessions. */
export function replacementsFor(oldId: string, lib: Library): string[] {
  const ids = new Set(lib.products.map((p) => p.id));
  const known = [
    ...(REMOVED_V21[oldId] ? [REMOVED_V21[oldId].replacement] : []),
    ...(DEPOT_SPLITS[oldId]?.map((d) => d.id) ?? []),
    ...(RENAMES[oldId] ? [RENAMES[oldId].id] : []),
    ...(oldId === COMBINATION_REPLACES ? [COMBINATION_ID] : []),
    ...(oldId === 'fluoxetine_oral_incl_weekly' ? ['fluoxetine_oral', 'fluoxetine_oral_weekly_dr'] : []),
  ];
  const m = /^(.*)_oral_ir_((?:er|cr|xr|sr|xl)(?:_(?:er|cr|xr|sr|xl))*)$/.exec(oldId);
  if (m) known.push(`${m[1]}_oral_ir`, ...m[2].split('_').map((f) => `${m[1]}_oral_${f}`));
  const found = known.filter((id) => ids.has(id));
  if (found.length) return found;
  // Fall back to every product of the same candidate (longest matching id prefix).
  const cand = [...new Set(lib.products.map((p) => p.candidateId))]
    .filter((c) => oldId.startsWith(c + '_'))
    .sort((a, b) => b.length - a.length)[0];
  return cand ? lib.products.filter((p) => p.candidateId === cand).map((p) => p.id) : [];
}
