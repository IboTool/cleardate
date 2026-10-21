// Defaults, slugs, Range maths and canonical (stable, diff-friendly) serialisation for drugs.json.
// Shared by the app, init-data, migrate-v2, the validator and the local editor.

import type { Compound, Library, PhenotypeMap, Product, Range } from './types';

export const SCHEMA_VERSION = 2 as const;

export function slug(s: string): string {
  // Mirrors slug() in tools/build_candidates.py so IDs line up with candidates.json.
  return s
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/Δ/g, 'delta')
    .replace(/′/g, '')
    .replace(/'/g, '')
    .replace(/→/g, ' ')
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export const emptyRange = (): Range => ({ typical: null, min: null, max: null, rangeType: null, cv: null });

export function singleRange(typical: number): Range {
  return { typical, min: null, max: null, rangeType: 'single-value', cv: null };
}

export function emptyCompound(id: string, name: string): Compound {
  return {
    id,
    name,
    aliases: [],
    isMetabolite: false,
    formedFrom: [],
    molecularWeight: null,
    kinetics: { mode: 'unknown', halfLifeHours: null, earlyPhase: null, steadyState: null },
    cyp2d6: { substrate: 'unassessed', halfLifeMultiplier: null, inhibitor: 'unassessed', inhibitionType: 'unassessed' },
    qt: { tier: 'unassessed', weight: null, referenceAmountMg: null },
    receptors: [],
    receptorsAssessed: false,
    lingeringEffects: { durationDays: null, note: '' },
    nonlinearKinetics: { flag: 'unassessed', note: '' },
    provenance: {},
    sourceNotes: {},
    source: '',
    verified: false,
    verifiedDate: '',
  };
}

export function emptyProduct(id: string, name: string, compound: string, route: string, category: string): Product {
  return {
    id,
    candidateId: compound,
    name,
    aliases: [],
    category,
    secondaryCategories: [],
    class: '',
    route,
    formulation: null,
    components: [{ compound, ratio: 1, saltFactor: null, bioavailability: null }],
    doseUnit: 'mg',
    input: { type: 'bolus', releaseHalfLifeHours: null, defaultDurationHours: null },
    typicalDose: { amount: null, unit: 'mg', basis: 'maintenance' },
    provenance: {},
    sourceNotes: {},
    source: '',
    verified: false,
    verifiedDate: '',
  };
}

export const primaryCompound = (p: Product): string => p.components[0]?.compound ?? '';

// ---------- Range maths ----------

export interface Bounds {
  min: number;
  typical: number;
  max: number;
  /** True when any bound came from the assumed spread rather than the data. */
  assumed: boolean;
}

function lognormal(typical: number, cv: number) {
  const s = Math.sqrt(Math.log(1 + cv * cv));
  return { min: typical * Math.exp(-1.96 * s), max: typical * Math.exp(1.96 * s) };
}

/**
 * min/typical/max for the three simulation runs. `cv` ranges give a lognormal 95% band;
 * single values (or missing bounds) use the assumed spread. null = no typical value.
 */
export function rangeBounds(r: Range | null | undefined, assumedCv: number): Bounds | null {
  if (!r || !(typeof r.typical === 'number' && r.typical > 0)) return null;
  const t = r.typical;
  if (r.rangeType === 'cv' && typeof r.cv === 'number' && r.cv > 0) return { typical: t, ...lognormal(t, r.cv), assumed: false };
  const hasMin = typeof r.min === 'number' && r.min > 0;
  const hasMax = typeof r.max === 'number' && r.max > 0;
  const a = lognormal(t, Math.max(0, assumedCv));
  if (r.rangeType === 'single-value' || (!hasMin && !hasMax)) return { typical: t, min: a.min, max: a.max, assumed: assumedCv > 0 };
  return {
    typical: t,
    min: hasMin ? Math.min(r.min!, t) : a.min,
    max: hasMax ? Math.max(r.max!, t) : a.max,
    assumed: !hasMin || !hasMax,
  };
}

export const hasTypical = (r: Range | null | undefined): boolean => !!r && typeof r.typical === 'number' && r.typical > 0;

export function formatRange(r: Range | null | undefined, unit = 'h'): string {
  if (!hasTypical(r)) return 'unknown';
  const { typical, min, max, rangeType, cv } = r!;
  if (rangeType === 'cv' && cv) return `${typical} ${unit} (CV ${Math.round(cv * 100)}%)`;
  if (min != null && max != null && (min !== typical || max !== typical)) return `${typical} ${unit} (${min}–${max})`;
  return `${typical} ${unit}`;
}

// ---------- status helpers ----------

/** Any section still tagged recall/estimate = AI draft values awaiting review. */
export function isDraft(e: { provenance?: Record<string, string | null | undefined> }): boolean {
  return Object.values(e.provenance ?? {}).some((v) => v === 'recall' || v === 'estimate');
}

/** Has any pharmacological value been entered? Used for "not started" vs "draft". */
export function compoundHasData(c: Compound): boolean {
  return (
    c.kinetics.mode !== 'unknown' || c.molecularWeight != null ||
    c.formedFrom.some((f) => f.fraction != null) || c.receptors.length > 0 || c.receptorsAssessed ||
    c.qt.tier !== 'unassessed' || c.cyp2d6.substrate !== 'unassessed' || c.cyp2d6.inhibitor !== 'unassessed'
  );
}

/** A compound the simulator can run on its own (formation-limited needs a parent, so not here). */
export const hasIntrinsicKinetics = (c: Compound | undefined): boolean =>
  !!c && c.kinetics.mode === 'intrinsic' && hasTypical(c.kinetics.halfLifeHours);

// ---------- canonical serialisation ----------

const RANGE_KEYS = ['typical', 'min', 'max', 'rangeType', 'cv'];
const PHEN_KEYS = ['poor', 'intermediate', 'normal', 'ultrarapid'];
const COMPOUND_KEYS = [
  'id', 'name', 'aliases', 'isMetabolite', 'formedFrom', 'molecularWeight', 'kinetics', 'cyp2d6', 'qt',
  'receptors', 'receptorsAssessed', 'lingeringEffects', 'nonlinearKinetics', 'provenance', 'sourceNotes',
  'source', 'verified', 'verifiedDate',
];
const COMPOUND_SECTION_KEYS = [
  'halfLife', 'metabolism', 'molecularWeight', 'cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics',
];
const PRODUCT_KEYS = [
  'id', 'candidateId', 'name', 'aliases', 'category', 'secondaryCategories', 'class', 'route', 'formulation',
  'components', 'doseUnit', 'input', 'typicalDose', 'provenance', 'sourceNotes', 'source', 'verified', 'verifiedDate',
];
const PRODUCT_SECTION_KEYS = ['class', 'aliases', 'components', 'input', 'typicalDose'];

function ordered(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  // Unknown keys are kept (after the known ones) so hand-added fields are never lost.
  for (const k of Object.keys(obj)) if (!(k in out) && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function sub<T>(obj: T, keys: string[]): T {
  return (obj && typeof obj === 'object' ? ordered(obj as Record<string, unknown>, keys) : obj) as T;
}

const range = (r: Range | null | undefined) => sub(r, RANGE_KEYS);
const phen = (m: PhenotypeMap | null | undefined) => sub(m, PHEN_KEYS);
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function canonicalCompound(c: Compound): Compound {
  const { userEntered: _u, sourceUrl: _s, ...rest } = c;
  const k = c.kinetics;
  const cyp = c.cyp2d6;
  return ordered(
    {
      ...rest,
      formedFrom: (c.formedFrom ?? []).map((f) => ordered({ ...f, cyp2d6Multiplier: phen(f.cyp2d6Multiplier) }, ['compound', 'fraction', 'cyp2d6Multiplier'])),
      kinetics: k && ordered(
        {
          ...k,
          halfLifeHours: range(k.halfLifeHours),
          earlyPhase: k.earlyPhase && ordered({ ...k.earlyPhase, halfLifeHours: range(k.earlyPhase.halfLifeHours) }, ['fraction', 'halfLifeHours']),
          steadyState: k.steadyState && ordered({ ...k.steadyState, halfLifeHours: range(k.steadyState.halfLifeHours) }, ['afterDays', 'halfLifeHours']),
        },
        ['mode', 'halfLifeHours', 'earlyPhase', 'steadyState'],
      ),
      cyp2d6: cyp && ordered({ ...cyp, halfLifeMultiplier: phen(cyp.halfLifeMultiplier) }, ['substrate', 'halfLifeMultiplier', 'inhibitor', 'inhibitionType']),
      qt: sub(c.qt, ['tier', 'weight', 'referenceAmountMg']),
      receptors: (c.receptors ?? []).map((r) => sub(r, ['target', 'action'])),
      lingeringEffects: sub(c.lingeringEffects, ['durationDays', 'note']),
      nonlinearKinetics: sub(c.nonlinearKinetics, ['flag', 'note']),
      provenance: ordered(c.provenance ?? {}, COMPOUND_SECTION_KEYS),
      sourceNotes: ordered(c.sourceNotes ?? {}, COMPOUND_SECTION_KEYS),
    } as Record<string, unknown>,
    COMPOUND_KEYS,
  ) as unknown as Compound;
}

function canonicalProduct(p: Product): Product {
  const { userEntered: _u, ...rest } = p;
  return ordered(
    {
      ...rest,
      components: (p.components ?? []).map((c) => sub(c, ['compound', 'ratio', 'saltFactor', 'bioavailability'])),
      input: p.input && ordered({ ...p.input, releaseHalfLifeHours: range(p.input.releaseHalfLifeHours) }, ['type', 'releaseHalfLifeHours', 'defaultDurationHours']),
      typicalDose: sub(p.typicalDose, ['amount', 'unit', 'basis']),
      provenance: ordered(p.provenance ?? {}, PRODUCT_SECTION_KEYS),
      sourceNotes: ordered(p.sourceNotes ?? {}, PRODUCT_SECTION_KEYS),
    } as Record<string, unknown>,
    PRODUCT_KEYS,
  ) as unknown as Product;
}

/** Normalise key order and sort order. Session-only fields are stripped. */
export function canonicalLibrary(lib: Library): Library {
  const categories = [...lib.categories]
    .sort((a, b) => a.order - b.order)
    .map((c) => ordered(c as unknown as Record<string, unknown>, ['id', 'name', 'order']) as unknown as typeof c);
  return ordered(
    {
      ...lib,
      categories,
      compounds: [...lib.compounds].sort(byId).map(canonicalCompound),
      products: [...lib.products].sort(byId).map(canonicalProduct),
    } as unknown as Record<string, unknown>,
    ['schemaVersion', 'categories', 'compounds', 'products'],
  ) as unknown as Library;
}

export function serializeLibrary(lib: Library): string {
  return JSON.stringify(canonicalLibrary(lib), null, 2) + '\n';
}

/** Deep copy via JSON (library objects are plain data). */
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
