// Shared validation for drugs.json, custom drugs and editor entries.
// Used by tools/validate-drugs.ts (prebuild), the app on load, the wizard and the editor.

import { compoundHasData } from './schema';
import {
  INHIBITION_TYPES,
  INHIBITOR_STRENGTHS,
  QT_TIERS,
  RECEPTOR_ACTIONS,
  type Compound,
  type Library,
  type Product,
} from './types';

export interface Issue {
  id: string;
  message: string;
}

export interface CategoryProgress {
  id: string;
  name: string;
  products: number;
  productsVerified: number;
  productsStarted: number;
}

export interface Progress {
  compounds: number;
  compoundsVerified: number;
  compoundsStarted: number;
  products: number;
  productsVerified: number;
  categories: CategoryProgress[];
}

export interface ValidationResult {
  errors: Issue[];
  warnings: Issue[];
  progress: Progress;
}

const ID_RE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EPS = 1e-9;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Returns one cycle (as a list of IDs) in the formedFrom graph, or null. */
export function findCycle(compounds: Pick<Compound, 'id' | 'formedFrom'>[]): string[] | null {
  const parents = new Map(compounds.map((c) => [c.id, (c.formedFrom ?? []).map((f) => f.compound)]));
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    const s = state.get(id);
    if (s === 2) return null;
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const p of parents.get(id) ?? []) {
      if (!parents.has(p)) continue;
      const cyc = visit(p);
      if (cyc) return cyc;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const id of parents.keys()) {
    const cyc = visit(id);
    if (cyc) return cyc;
  }
  return null;
}

/** Sum of formedFrom fractions leaving each source compound. */
export function fractionSums(compounds: Pick<Compound, 'formedFrom'>[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const c of compounds)
    for (const f of c.formedFrom ?? []) sums.set(f.compound, (sums.get(f.compound) ?? 0) + (f.fraction || 0));
  return sums;
}

function checkHalfLife(hl: unknown, where: string, id: string, errors: Issue[], warnings: Issue[], required: boolean) {
  if (!isObj(hl)) {
    if (required) errors.push({ id, message: `${where} missing or not an object` });
    return;
  }
  const { typical, min, max } = hl;
  if (!isNum(typical) || !isNum(min) || !isNum(max)) {
    errors.push({ id, message: `${where} must have numeric typical, min and max` });
    return;
  }
  if (typical < 0 || min < 0 || max < 0) errors.push({ id, message: `${where} values must not be negative` });
  if (typical === 0 && (min > 0 || max > 0)) errors.push({ id, message: `${where}.typical is 0 but min/max are set` });
  if (typical > 0) {
    if (min === 0 || max === 0) warnings.push({ id, message: `${where}: min or max is 0; the typical value will be used for the range` });
    if (min > 0 && min > typical) errors.push({ id, message: `${where}: min (${min}) > typical (${typical})` });
    if (max > 0 && typical > max) errors.push({ id, message: `${where}: typical (${typical}) > max (${max})` });
  }
}

function checkCompound(c: Obj, errors: Issue[], warnings: Issue[]) {
  const id = typeof c.id === 'string' ? c.id : '(missing id)';
  const str = (k: string) => {
    if (typeof c[k] !== 'string') errors.push({ id, message: `${k} must be a string` });
  };
  const bool = (k: string) => {
    if (typeof c[k] !== 'boolean') errors.push({ id, message: `${k} must be true/false` });
  };
  if (typeof c.id !== 'string' || !ID_RE.test(c.id)) errors.push({ id, message: 'id must be lowercase snake_case' });
  str('name');
  if (typeof c.name === 'string' && !c.name.trim()) errors.push({ id, message: 'name is empty' });
  if (!Array.isArray(c.aliases) || c.aliases.some((a) => typeof a !== 'string'))
    errors.push({ id, message: 'aliases must be an array of strings' });
  bool('isMetabolite');
  if (!Array.isArray(c.formedFrom)) errors.push({ id, message: 'formedFrom must be an array' });
  else
    for (const f of c.formedFrom) {
      if (!isObj(f) || typeof f.compound !== 'string' || !isNum(f.fraction))
        errors.push({ id, message: 'formedFrom entries need compound (string) and fraction (number)' });
      else if (f.fraction < 0 || f.fraction > 1)
        errors.push({ id, message: `formedFrom ${f.compound}: fraction ${f.fraction} must be between 0 and 1` });
    }
  if (!isNum(c.molecularWeight) || c.molecularWeight < 0) errors.push({ id, message: 'molecularWeight must be a number ≥ 0' });
  checkHalfLife(c.halfLifeHours, 'halfLifeHours', id, errors, warnings, true);

  const cyp = c.cyp2d6;
  if (!isObj(cyp)) errors.push({ id, message: 'cyp2d6 missing' });
  else {
    if (typeof cyp.substrate !== 'boolean') errors.push({ id, message: 'cyp2d6.substrate must be true/false' });
    const m = cyp.halfLifeMultiplier;
    if (!isObj(m) || !['poor', 'intermediate', 'normal', 'ultrarapid'].every((k) => isNum(m[k]) && (m[k] as number) > 0))
      errors.push({ id, message: 'cyp2d6.halfLifeMultiplier needs positive poor/intermediate/normal/ultrarapid' });
    if (!INHIBITOR_STRENGTHS.includes(cyp.inhibitor as never))
      errors.push({ id, message: `cyp2d6.inhibitor "${String(cyp.inhibitor)}" not one of ${INHIBITOR_STRENGTHS.join(', ')}` });
    if (!INHIBITION_TYPES.includes(cyp.inhibitionType as never))
      errors.push({ id, message: `cyp2d6.inhibitionType "${String(cyp.inhibitionType)}" not one of ${INHIBITION_TYPES.join(', ')}` });
    if (cyp.inhibitor !== 'none' && cyp.inhibitionType === 'none')
      warnings.push({ id, message: 'cyp2d6.inhibitor is set but inhibitionType is "none" (treated as reversible)' });
    if (cyp.inhibitor === 'none' && cyp.inhibitionType !== 'none')
      warnings.push({ id, message: 'cyp2d6.inhibitionType is set but inhibitor strength is "none"' });
  }
  const qt = c.qt;
  if (!isObj(qt)) errors.push({ id, message: 'qt missing' });
  else {
    if (!QT_TIERS.includes(qt.tier as never)) errors.push({ id, message: `qt.tier "${String(qt.tier)}" not one of ${QT_TIERS.join(', ')}` });
    if (!isNum(qt.weight) || qt.weight < 0) errors.push({ id, message: 'qt.weight must be a number ≥ 0' });
  }
  if (!Array.isArray(c.receptors)) errors.push({ id, message: 'receptors must be an array' });
  else
    for (const r of c.receptors) {
      if (!isObj(r) || typeof r.target !== 'string' || !r.target.trim())
        errors.push({ id, message: 'receptor entries need a non-empty target' });
      else if (!RECEPTOR_ACTIONS.includes(r.action as never))
        errors.push({ id, message: `receptor ${r.target}: action "${String(r.action)}" not one of ${RECEPTOR_ACTIONS.join(', ')}` });
    }
  const le = c.lingeringEffects;
  if (!isObj(le) || !isNum(le.durationDays) || le.durationDays < 0 || typeof le.note !== 'string')
    errors.push({ id, message: 'lingeringEffects needs durationDays (≥ 0) and note' });
  const nl = c.nonlinearKinetics;
  if (!isObj(nl) || typeof nl.flag !== 'boolean' || typeof nl.note !== 'string')
    errors.push({ id, message: 'nonlinearKinetics needs flag and note' });
  str('source');
  if (!isObj(c.sourceNotes)) errors.push({ id, message: 'sourceNotes must be an object' });
  bool('verified');
  str('verifiedDate');
  if (c.verified === true) {
    if (!(typeof c.source === 'string' && c.source.trim())) errors.push({ id, message: 'verified requires a non-empty source' });
    if (!(typeof c.verifiedDate === 'string' && DATE_RE.test(c.verifiedDate)))
      errors.push({ id, message: 'verified requires verifiedDate (YYYY-MM-DD)' });
    if (!(isObj(c.halfLifeHours) && isNum(c.halfLifeHours.typical) && c.halfLifeHours.typical > 0))
      errors.push({ id, message: 'verified compound must have a half-life > 0' });
  }
}

function checkProduct(p: Obj, errors: Issue[], warnings: Issue[]) {
  const id = typeof p.id === 'string' ? p.id : '(missing id)';
  if (typeof p.id !== 'string' || !ID_RE.test(p.id)) errors.push({ id, message: 'id must be lowercase snake_case' });
  for (const k of ['name', 'category', 'class', 'parentCompound', 'route', 'source', 'verifiedDate'])
    if (typeof p[k] !== 'string') errors.push({ id, message: `${k} must be a string` });
  if (!Array.isArray(p.aliases) || p.aliases.some((a) => typeof a !== 'string'))
    errors.push({ id, message: 'aliases must be an array of strings' });
  if (!isNum(p.typicalDoseMg) || p.typicalDoseMg < 0) errors.push({ id, message: 'typicalDoseMg must be a number ≥ 0' });
  if (p.apparentHalfLifeHours !== undefined)
    checkHalfLife(p.apparentHalfLifeHours, 'apparentHalfLifeHours', id, errors, warnings, false);
  if (typeof p.verified !== 'boolean') errors.push({ id, message: 'verified must be true/false' });
  if (p.verified === true) {
    if (!(typeof p.source === 'string' && p.source.trim())) errors.push({ id, message: 'verified requires a non-empty source' });
    if (!(typeof p.verifiedDate === 'string' && DATE_RE.test(p.verifiedDate)))
      errors.push({ id, message: 'verified requires verifiedDate (YYYY-MM-DD)' });
  }
}

export interface ValidateOptions {
  /** Compounds that may be referenced but are not themselves checked (e.g. library, when validating custom drugs). */
  externalCompounds?: Compound[];
}

export function validateLibrary(lib: Partial<Library>, opts: ValidateOptions = {}): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const categories = Array.isArray(lib.categories) ? lib.categories : [];
  const compounds = Array.isArray(lib.compounds) ? lib.compounds : [];
  const products = Array.isArray(lib.products) ? lib.products : [];
  if (!Array.isArray(lib.categories)) errors.push({ id: '(file)', message: 'categories must be an array' });
  if (!Array.isArray(lib.compounds)) errors.push({ id: '(file)', message: 'compounds must be an array' });
  if (!Array.isArray(lib.products)) errors.push({ id: '(file)', message: 'products must be an array' });

  for (const c of categories)
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || !isNum(c.order))
      errors.push({ id: String((c as unknown as Obj)?.id ?? '(category)'), message: 'category needs id, name and order' });

  for (const c of compounds) {
    if (!isObj(c)) errors.push({ id: '(compound)', message: 'compound is not an object' });
    else checkCompound(c as unknown as Obj, errors, warnings);
  }
  for (const p of products) {
    if (!isObj(p)) errors.push({ id: '(product)', message: 'product is not an object' });
    else checkProduct(p as unknown as Obj, errors, warnings);
  }
  // If basic structure is broken, link checks would only add noise.
  const structural = errors.length > 0;

  // Duplicate IDs (compounds and products are separate namespaces).
  const dupes = (ids: string[], kind: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push({ id, message: `duplicate ${kind} id` });
      seen.add(id);
    }
  };
  dupes(categories.map((c) => c.id), 'category');
  dupes(compounds.map((c) => c.id), 'compound');
  dupes(products.map((p) => p.id), 'product');

  if (!structural) {
    const known = new Set([...compounds, ...(opts.externalCompounds ?? [])].map((c) => c.id));
    const catIds = new Set(categories.map((c) => c.id));
    for (const c of compounds)
      for (const f of c.formedFrom)
        if (!known.has(f.compound)) errors.push({ id: c.id, message: `formedFrom references unknown compound "${f.compound}"` });
    for (const c of compounds) {
      if (c.isMetabolite && c.formedFrom.length === 0)
        warnings.push({ id: c.id, message: 'isMetabolite is true but formedFrom is empty' });
      if (!c.isMetabolite && c.formedFrom.length > 0)
        warnings.push({ id: c.id, message: 'has formedFrom links but isMetabolite is false' });
    }
    for (const p of products) {
      if (!known.has(p.parentCompound)) errors.push({ id: p.id, message: `parentCompound "${p.parentCompound}" does not exist` });
      if (catIds.size && !catIds.has(p.category)) errors.push({ id: p.id, message: `category "${p.category}" does not exist` });
    }
    const all = [...(opts.externalCompounds ?? []).filter((c) => !compounds.some((x) => x.id === c.id)), ...compounds];
    const cycle = findCycle(all);
    if (cycle) errors.push({ id: cycle[0], message: `cycle in formedFrom: ${cycle.join(' → ')}` });
    for (const [src, sum] of fractionSums(all))
      if (sum > 1 + EPS) errors.push({ id: src, message: `metabolite fractions formed from this compound sum to ${sum.toFixed(3)} (> 1)` });

    // Duplicate aliases across different drugs (search ambiguity, not fatal). A product's aliases
    // belong to its parent compound's group, so routes of the same drug never clash with each other.
    const aliasOwner = new Map<string, string>();
    const flagged = new Set<string>();
    const flag = (alias: string, entryId: string, group: string) => {
      const k = alias.trim().toLowerCase();
      if (!k) return;
      const prev = aliasOwner.get(k);
      if (prev === undefined) aliasOwner.set(k, group);
      else if (prev !== group && !flagged.has(`${k}|${group}`)) {
        flagged.add(`${k}|${group}`);
        warnings.push({ id: entryId, message: `alias "${alias}" is also used by ${prev}` });
      }
    };
    for (const c of compounds) {
      flag(c.name, c.id, c.id);
      for (const a of c.aliases) flag(a, c.id, c.id);
    }
    for (const p of products) for (const a of p.aliases) flag(a, p.id, p.parentCompound);
  }

  // Progress
  const compoundById = new Map(compounds.map((c) => [c.id, c]));
  const progress: Progress = {
    compounds: compounds.length,
    compoundsVerified: compounds.filter((c) => c.verified).length,
    compoundsStarted: compounds.filter((c) => isObj(c) && isObj(c.halfLifeHours) && compoundHasDataSafe(c)).length,
    products: products.length,
    productsVerified: products.filter((p) => p.verified).length,
    categories: [...categories]
      .sort((a, b) => a.order - b.order)
      .map((cat) => {
        const ps = products.filter((p) => p.category === cat.id);
        return {
          id: cat.id,
          name: cat.name,
          products: ps.length,
          productsVerified: ps.filter((p) => p.verified).length,
          productsStarted: ps.filter((p) => {
            const parent = compoundById.get(p.parentCompound);
            return (parent && compoundHasDataSafe(parent)) || p.typicalDoseMg > 0;
          }).length,
        };
      }),
  };
  return { errors, warnings, progress };
}

function compoundHasDataSafe(c: Compound): boolean {
  try {
    return compoundHasData(c);
  } catch {
    return false;
  }
}

/** Validate session-only custom drugs against the library they extend. */
export function validateCustom(custom: { compounds: Compound[]; products: Product[] }, library: Library): ValidationResult {
  const r = validateLibrary(
    { categories: library.categories, compounds: custom.compounds, products: custom.products },
    { externalCompounds: library.compounds },
  );
  // Positive half-lives are required for anything the wizard creates.
  for (const c of custom.compounds)
    if (!(c.halfLifeHours.typical > 0)) r.errors.push({ id: c.id, message: `${c.name || c.id}: half-life must be > 0` });
  return r;
}
