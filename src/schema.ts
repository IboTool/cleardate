// Defaults, slugs and canonical (stable, diff-friendly) serialisation for drugs.json.
// Shared by the app, init-data, the validator and the local editor.

import type { Compound, HalfLife, Library, Product } from './types';

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

export const zeroHalfLife = (): HalfLife => ({ typical: 0, min: 0, max: 0 });

export function emptyCompound(id: string, name: string): Compound {
  return {
    id,
    name,
    aliases: [],
    isMetabolite: false,
    formedFrom: [],
    molecularWeight: 0,
    halfLifeHours: zeroHalfLife(),
    cyp2d6: {
      substrate: false,
      halfLifeMultiplier: { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 },
      inhibitor: 'none',
      inhibitionType: 'none',
    },
    qt: { tier: 'none', weight: 0 },
    receptors: [],
    lingeringEffects: { durationDays: 0, note: '' },
    nonlinearKinetics: { flag: false, note: '' },
    source: '',
    sourceNotes: { halfLife: '', metabolism: '', cyp2d6: '', qt: '', receptors: '' },
    verified: false,
    verifiedDate: '',
  };
}

export function emptyProduct(id: string, name: string, parentCompound: string, route: string, category: string): Product {
  return {
    id,
    name,
    aliases: [],
    category,
    class: '',
    parentCompound,
    route,
    typicalDoseMg: 0,
    source: '',
    verified: false,
    verifiedDate: '',
  };
}

const COMPOUND_KEYS = [
  'id', 'name', 'aliases', 'isMetabolite', 'formedFrom', 'molecularWeight', 'halfLifeHours',
  'cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics', 'source', 'sourceNotes',
  'verified', 'verifiedDate',
];
const PRODUCT_KEYS = [
  'id', 'name', 'aliases', 'category', 'class', 'parentCompound', 'route', 'apparentHalfLifeHours',
  'typicalDoseMg', 'source', 'verified', 'verifiedDate',
];
const SOURCE_NOTE_KEYS = ['halfLife', 'metabolism', 'cyp2d6', 'qt', 'receptors'];

function ordered(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  // Unknown keys are kept (after the known ones) so hand-added fields are never lost.
  for (const k of Object.keys(obj)) if (!(k in out) && obj[k] !== undefined) out[k] = obj[k];
  return out;
}

const HL_KEYS = ['typical', 'min', 'max'];

function sub<T>(obj: T, keys: string[]): T {
  return (obj && typeof obj === 'object' ? ordered(obj as Record<string, unknown>, keys) : obj) as T;
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Normalise key order and sort order. Session-only fields are stripped. */
export function canonicalLibrary(lib: Library): Library {
  const compounds = [...lib.compounds].sort(byId).map((c) => {
    const { userEntered: _u, sourceUrl: _s, ...rest } = c;
    const cyp = c.cyp2d6;
    return ordered(
      {
        ...rest,
        halfLifeHours: sub(c.halfLifeHours, HL_KEYS),
        formedFrom: (c.formedFrom ?? []).map((f) => sub(f, ['compound', 'fraction'])),
        cyp2d6: cyp && ordered(
          { ...cyp, halfLifeMultiplier: sub(cyp.halfLifeMultiplier, ['poor', 'intermediate', 'normal', 'ultrarapid']) },
          ['substrate', 'halfLifeMultiplier', 'inhibitor', 'inhibitionType'],
        ),
        qt: sub(c.qt, ['tier', 'weight']),
        receptors: (c.receptors ?? []).map((r) => sub(r, ['target', 'action'])),
        lingeringEffects: sub(c.lingeringEffects, ['durationDays', 'note']),
        nonlinearKinetics: sub(c.nonlinearKinetics, ['flag', 'note']),
        sourceNotes: ordered(c.sourceNotes ?? {}, SOURCE_NOTE_KEYS),
      } as Record<string, unknown>,
      COMPOUND_KEYS,
    ) as unknown as Compound;
  });
  const products = [...lib.products].sort(byId).map((p) => {
    const { userEntered: _u, ...rest } = p;
    return ordered(
      { ...rest, apparentHalfLifeHours: sub(p.apparentHalfLifeHours, HL_KEYS) } as Record<string, unknown>,
      PRODUCT_KEYS,
    ) as unknown as Product;
  });
  const categories = [...lib.categories]
    .sort((a, b) => a.order - b.order)
    .map((c) => ordered(c as unknown as Record<string, unknown>, ['id', 'name', 'order']) as unknown as typeof c);
  return ordered(
    { ...lib, categories, compounds, products } as unknown as Record<string, unknown>,
    ['categories', 'compounds', 'products'],
  ) as unknown as Library;
}

export function serializeLibrary(lib: Library): string {
  return JSON.stringify(canonicalLibrary(lib), null, 2) + '\n';
}

/** Has any pharmacological value been entered? Used for "not started" vs "draft". */
export function compoundHasData(c: Compound): boolean {
  const hl = c.halfLifeHours;
  return (
    hl.typical > 0 || hl.min > 0 || hl.max > 0 || c.molecularWeight > 0 ||
    c.formedFrom.some((f) => f.fraction > 0) || c.receptors.length > 0 ||
    c.qt.tier !== 'none' || c.cyp2d6.substrate || c.cyp2d6.inhibitor !== 'none'
  );
}

/** Effective half-life with missing min/max falling back to typical. */
export function effectiveHalfLife(hl: HalfLife | undefined): HalfLife | null {
  if (!hl || !(hl.typical > 0)) return null;
  const min = hl.min > 0 ? hl.min : hl.typical;
  const max = hl.max > 0 ? hl.max : hl.typical;
  return { typical: hl.typical, min: Math.min(min, hl.typical), max: Math.max(max, hl.typical) };
}
