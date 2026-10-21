// Shared validation for drugs.json (schema v2), custom drugs and editor entries.
// Used by tools/validate-drugs.ts (prebuild), migrate-v2, the app on load, the wizard and the editor.

import { compoundHasData, primaryCompound, SCHEMA_VERSION } from './schema';
import {
  COMPOUND_SECTIONS, DOSE_BASES, DOSE_UNITS, FORMULATIONS, INHIBITION_TYPES, INHIBITOR_STRENGTHS, INPUT_TYPES,
  KINETIC_MODES, PHENOTYPES, PROVENANCE_TAGS, PRODUCT_SECTIONS, QT_TIERS, RANGE_TYPES, RECEPTOR_ACTIONS, TRI_STATES,
  type Compound, type KineticMode, type Library, type Product, type Provenance,
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
  /** Unassessed safety fields among compounds used by this category's products. */
  unassessed: { qt: number; cyp2d6: number; receptors: number; nonlinear: number };
}

export interface Progress {
  compounds: number;
  compoundsVerified: number;
  compoundsStarted: number;
  products: number;
  productsVerified: number;
  categories: CategoryProgress[];
  /** Section provenance counts across compounds and products ("untagged" = null). */
  provenance: Record<Provenance | 'untagged', number>;
  modes: Record<KineticMode, number>;
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
const oneOf = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v);

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

/** Sum of the *known* formedFrom fractions leaving each source compound. */
export function fractionSums(compounds: Pick<Compound, 'formedFrom'>[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const c of compounds)
    for (const f of c.formedFrom ?? []) sums.set(f.compound, (sums.get(f.compound) ?? 0) + (f.fraction ?? 0));
  return sums;
}

class Checker {
  constructor(public id: string, public errors: Issue[], public warnings: Issue[]) {}
  err(message: string) {
    this.errors.push({ id: this.id, message });
  }
  warn(message: string) {
    this.warnings.push({ id: this.id, message });
  }
  /** number or null; 0 is rejected because unknown must be null. */
  num(v: unknown, where: string, o: { min?: number; max?: number; minExclusive?: boolean; required?: boolean } = {}) {
    if (v === null || v === undefined) {
      if (o.required) this.err(`${where} is required`);
      else if (v === undefined) this.err(`${where} missing (use null for unknown)`);
      return;
    }
    if (!isNum(v)) return this.err(`${where} must be a number or null`);
    if (v === 0) return this.err(`${where} is 0 — use null for unknown`);
    if (o.min !== undefined && (o.minExclusive ? v <= o.min : v < o.min)) this.err(`${where} (${v}) must be ${o.minExclusive ? '>' : '≥'} ${o.min}`);
    if (o.max !== undefined && v > o.max) this.err(`${where} (${v}) must be ≤ ${o.max}`);
  }
  range(r: unknown, where: string, required = false) {
    if (r === null || r === undefined) {
      if (required) this.err(`${where} is required`);
      return;
    }
    if (!isObj(r)) return this.err(`${where} must be a Range object or null`);
    for (const k of ['typical', 'min', 'max', 'cv']) this.num(r[k], `${where}.${k}`, { min: 0, minExclusive: true });
    if (r.rangeType !== null && !oneOf(RANGE_TYPES, r.rangeType))
      this.err(`${where}.rangeType "${String(r.rangeType)}" not one of ${RANGE_TYPES.join(', ')} or null`);
    const { typical, min, max } = r as Record<string, number | null>;
    if ((min != null || max != null) && typical == null) this.err(`${where}: a bound is set but typical is null`);
    if (required && typical == null) this.err(`${where}.typical is required`);
    if (isNum(min) && isNum(typical) && min > typical + EPS) this.err(`${where}: min (${min}) > typical (${typical})`);
    if (isNum(max) && isNum(typical) && typical > max + EPS) this.err(`${where}: typical (${typical}) > max (${max})`);
    if (r.rangeType === 'cv' && !isNum(r.cv)) this.err(`${where}: rangeType "cv" needs cv`);
    if (isNum(r.cv) && r.cv > 2) this.err(`${where}.cv (${r.cv}) must be ≤ 2`);
  }
  phenotypes(m: unknown, where: string) {
    if (m === null || m === undefined) return;
    if (!isObj(m) || !PHENOTYPES.every((k) => isNum(m[k]) && (m[k] as number) > 0))
      this.err(`${where} needs positive poor/intermediate/normal/ultrarapid (or null)`);
  }
  provenance(p: unknown, sections: readonly string[]) {
    if (p === undefined) return this.err('provenance missing');
    if (!isObj(p)) return this.err('provenance must be an object');
    for (const [k, v] of Object.entries(p)) {
      if (!sections.includes(k)) this.warn(`provenance.${k} is not a known section`);
      if (v !== null && !oneOf(PROVENANCE_TAGS, v)) this.err(`provenance.${k} "${String(v)}" not one of ${PROVENANCE_TAGS.join(', ')} or null`);
    }
  }
}

function checkCompound(c: Obj, errors: Issue[], warnings: Issue[]) {
  const id = typeof c.id === 'string' ? c.id : '(missing id)';
  const k = new Checker(id, errors, warnings);
  if (typeof c.id !== 'string' || !ID_RE.test(c.id)) k.err('id must be lowercase snake_case');
  if (typeof c.name !== 'string' || !c.name.trim()) k.err('name must be a non-empty string');
  if (!Array.isArray(c.aliases) || c.aliases.some((a) => typeof a !== 'string')) k.err('aliases must be an array of strings');
  if (typeof c.isMetabolite !== 'boolean') k.err('isMetabolite must be true/false');
  if (!Array.isArray(c.formedFrom)) k.err('formedFrom must be an array');
  else
    for (const f of c.formedFrom) {
      if (!isObj(f) || typeof f.compound !== 'string') {
        k.err('formedFrom entries need compound (string)');
        continue;
      }
      k.num(f.fraction, `formedFrom ${f.compound}: fraction`, { min: 0, max: 1, minExclusive: true });
      k.phenotypes(f.cyp2d6Multiplier, `formedFrom ${f.compound}: cyp2d6Multiplier`);
    }
  k.num(c.molecularWeight, 'molecularWeight', { min: 0, minExclusive: true });

  const kin = c.kinetics;
  if (!isObj(kin)) k.err('kinetics missing');
  else {
    if (!oneOf(KINETIC_MODES, kin.mode)) k.err(`kinetics.mode "${String(kin.mode)}" not one of ${KINETIC_MODES.join(', ')}`);
    k.range(kin.halfLifeHours, 'kinetics.halfLifeHours', kin.mode === 'intrinsic');
    if (kin.earlyPhase != null) {
      const ep = kin.earlyPhase;
      if (!isObj(ep)) k.err('kinetics.earlyPhase must be an object or null');
      else {
        k.num(ep.fraction, 'kinetics.earlyPhase.fraction', { min: 0, minExclusive: true });
        if (isNum(ep.fraction) && ep.fraction >= 1) k.err('kinetics.earlyPhase.fraction must be < 1');
        k.range(ep.halfLifeHours, 'kinetics.earlyPhase.halfLifeHours');
        const t = (ep.halfLifeHours as Obj | null)?.typical, term = (kin.halfLifeHours as Obj | null)?.typical;
        if (isNum(t) && isNum(term) && t >= term) k.warn('kinetics.earlyPhase half-life is not shorter than the terminal half-life');
      }
    }
    if (kin.steadyState != null) {
      const ss = kin.steadyState;
      if (!isObj(ss)) k.err('kinetics.steadyState must be an object or null');
      else {
        k.num(ss.afterDays, 'kinetics.steadyState.afterDays', { min: 0, minExclusive: true });
        k.range(ss.halfLifeHours, 'kinetics.steadyState.halfLifeHours');
      }
    }
    if (kin.mode !== 'intrinsic' && (kin.earlyPhase != null || kin.steadyState != null))
      k.warn(`earlyPhase/steadyState are ignored when mode is "${String(kin.mode)}"`);
  }

  const cyp = c.cyp2d6;
  if (!isObj(cyp)) k.err('cyp2d6 missing');
  else {
    if (!oneOf(TRI_STATES, cyp.substrate)) k.err(`cyp2d6.substrate "${String(cyp.substrate)}" not one of ${TRI_STATES.join(', ')}`);
    k.phenotypes(cyp.halfLifeMultiplier, 'cyp2d6.halfLifeMultiplier');
    if (!oneOf(INHIBITOR_STRENGTHS, cyp.inhibitor)) k.err(`cyp2d6.inhibitor "${String(cyp.inhibitor)}" not one of ${INHIBITOR_STRENGTHS.join(', ')}`);
    if (!oneOf(INHIBITION_TYPES, cyp.inhibitionType)) k.err(`cyp2d6.inhibitionType "${String(cyp.inhibitionType)}" not one of ${INHIBITION_TYPES.join(', ')}`);
    const strong = ['weak', 'moderate', 'strong'].includes(cyp.inhibitor as string);
    if (strong && (cyp.inhibitionType === 'none' || cyp.inhibitionType === 'unassessed'))
      k.warn(`cyp2d6.inhibitor is ${String(cyp.inhibitor)} but inhibitionType is "${String(cyp.inhibitionType)}" (treated as reversible)`);
    if (cyp.inhibitor === 'none' && (cyp.inhibitionType === 'reversible' || cyp.inhibitionType === 'mechanism-based'))
      k.warn('cyp2d6.inhibitionType is set but inhibitor strength is "none"');
    if (cyp.halfLifeMultiplier != null && cyp.substrate !== 'yes') k.warn('cyp2d6.halfLifeMultiplier is set but substrate is not "yes" (ignored)');
  }
  const qt = c.qt;
  if (!isObj(qt)) k.err('qt missing');
  else {
    if (!oneOf(QT_TIERS, qt.tier)) k.err(`qt.tier "${String(qt.tier)}" not one of ${QT_TIERS.join(', ')}`);
    k.num(qt.weight, 'qt.weight', { min: 0, minExclusive: true });
    k.num(qt.referenceAmountMg, 'qt.referenceAmountMg', { min: 0, minExclusive: true });
  }
  if (!Array.isArray(c.receptors)) k.err('receptors must be an array');
  else
    for (const r of c.receptors) {
      if (!isObj(r) || typeof r.target !== 'string' || !r.target.trim()) k.err('receptor entries need a non-empty target');
      else if (!oneOf(RECEPTOR_ACTIONS, r.action)) k.err(`receptor ${r.target}: action "${String(r.action)}" not one of ${RECEPTOR_ACTIONS.join(', ')}`);
    }
  if (typeof c.receptorsAssessed !== 'boolean') k.err('receptorsAssessed must be true/false');
  else if (!c.receptorsAssessed && Array.isArray(c.receptors) && c.receptors.length) k.warn('receptors are listed but receptorsAssessed is false');
  const le = c.lingeringEffects;
  if (!isObj(le) || typeof le.note !== 'string') k.err('lingeringEffects needs durationDays and note');
  else k.num(le.durationDays, 'lingeringEffects.durationDays', { min: 0, minExclusive: true });
  const nl = c.nonlinearKinetics;
  if (!isObj(nl) || !oneOf(TRI_STATES, nl.flag) || typeof nl.note !== 'string') k.err(`nonlinearKinetics needs flag (${TRI_STATES.join('/')}) and note`);
  k.provenance(c.provenance, COMPOUND_SECTIONS);
  if (typeof c.source !== 'string') k.err('source must be a string');
  if (!isObj(c.sourceNotes)) k.err('sourceNotes must be an object');
  if (typeof c.verified !== 'boolean') k.err('verified must be true/false');
  if (typeof c.verifiedDate !== 'string') k.err('verifiedDate must be a string');
  if (c.verified === true) {
    if (!(typeof c.source === 'string' && c.source.trim())) k.err('verified requires a non-empty source');
    if (!(typeof c.verifiedDate === 'string' && DATE_RE.test(c.verifiedDate))) k.err('verified requires verifiedDate (YYYY-MM-DD)');
    if (isObj(kin) && kin.mode === 'unknown') k.err('verified compound cannot have kinetics.mode "unknown"');
    const prov = isObj(c.provenance) ? c.provenance : {};
    for (const s of ['halfLife', 'metabolism']) if (prov[s] === 'gap') k.err(`verified requires ${s} provenance other than "gap"`);
    const draft = Object.entries(prov).filter(([, v]) => v === 'recall' || v === 'estimate').map(([s]) => s);
    if (draft.length) k.warn(`verified, but still tagged recall/estimate: ${draft.join(', ')}`);
  }
}

function checkProduct(p: Obj, errors: Issue[], warnings: Issue[]) {
  const id = typeof p.id === 'string' ? p.id : '(missing id)';
  const k = new Checker(id, errors, warnings);
  if (typeof p.id !== 'string' || !ID_RE.test(p.id)) k.err('id must be lowercase snake_case');
  for (const key of ['candidateId', 'name', 'category', 'class', 'route', 'source', 'verifiedDate'])
    if (typeof p[key] !== 'string') k.err(`${key} must be a string`);
  if (!Array.isArray(p.aliases) || p.aliases.some((a) => typeof a !== 'string')) k.err('aliases must be an array of strings');
  if (!Array.isArray(p.secondaryCategories) || p.secondaryCategories.some((a) => typeof a !== 'string'))
    k.err('secondaryCategories must be an array of category ids');
  if (p.formulation !== null && !oneOf(FORMULATIONS, p.formulation)) k.err(`formulation "${String(p.formulation)}" not one of ${FORMULATIONS.join(', ')} or null`);
  if (!oneOf(DOSE_UNITS, p.doseUnit)) k.err(`doseUnit "${String(p.doseUnit)}" not one of ${DOSE_UNITS.join(', ')}`);
  if (!Array.isArray(p.components) || !p.components.length) k.err('components must list at least one compound');
  else
    for (const c of p.components) {
      if (!isObj(c) || typeof c.compound !== 'string') {
        k.err('component entries need compound (string)');
        continue;
      }
      if (!isNum(c.ratio) || c.ratio <= 0) k.err(`component ${c.compound}: ratio must be > 0`);
      k.num(c.saltFactor, `component ${c.compound}: saltFactor`, { min: 0, max: 1.5, minExclusive: true });
      k.num(c.bioavailability, `component ${c.compound}: bioavailability`, { min: 0, max: 1, minExclusive: true });
    }
  const inp = p.input;
  if (!isObj(inp)) k.err('input missing');
  else {
    if (!oneOf(INPUT_TYPES, inp.type)) k.err(`input.type "${String(inp.type)}" not one of ${INPUT_TYPES.join(', ')}`);
    k.range(inp.releaseHalfLifeHours, 'input.releaseHalfLifeHours');
    k.num(inp.defaultDurationHours, 'input.defaultDurationHours', { min: 0, minExclusive: true });
    const rate = p.doseUnit === 'µg/h' || p.doseUnit === 'mg/h';
    if (inp.type === 'zero-order' && !rate) k.err('zero-order input needs a rate doseUnit (µg/h or mg/h)');
    if (inp.type !== 'zero-order' && rate) k.err(`doseUnit ${String(p.doseUnit)} is a rate but input is not zero-order`);
    if (inp.type === 'bolus' && inp.releaseHalfLifeHours != null) k.warn('releaseHalfLifeHours is ignored for bolus input');
  }
  const td = p.typicalDose;
  if (!isObj(td)) k.err('typicalDose missing');
  else {
    k.num(td.amount, 'typicalDose.amount', { min: 0, minExclusive: true });
    if (!oneOf(DOSE_UNITS, td.unit)) k.err(`typicalDose.unit "${String(td.unit)}" not one of ${DOSE_UNITS.join(', ')}`);
    if (!oneOf(DOSE_BASES, td.basis)) k.err(`typicalDose.basis "${String(td.basis)}" not one of ${DOSE_BASES.join(', ')}`);
  }
  k.provenance(p.provenance, PRODUCT_SECTIONS);
  if (!isObj(p.sourceNotes)) k.err('sourceNotes must be an object');
  if (typeof p.verified !== 'boolean') k.err('verified must be true/false');
  if (p.verified === true) {
    if (!(typeof p.source === 'string' && p.source.trim())) k.err('verified requires a non-empty source');
    if (!(typeof p.verifiedDate === 'string' && DATE_RE.test(p.verifiedDate))) k.err('verified requires verifiedDate (YYYY-MM-DD)');
    const draft = Object.entries(isObj(p.provenance) ? p.provenance : {}).filter(([, v]) => v === 'recall' || v === 'estimate').map(([s]) => s);
    if (draft.length) k.warn(`verified, but still tagged recall/estimate: ${draft.join(', ')}`);
  }
  for (const old of ['parentCompound', 'typicalDoseMg', 'apparentHalfLifeHours'])
    if (old in p) k.err(`${old} is a v1 field — run npm run migrate-v2`);
}

export interface ValidateOptions {
  /** Compounds that may be referenced but are not themselves checked (e.g. library, when validating custom drugs). */
  externalCompounds?: Compound[];
  /** Skip the schemaVersion check (custom-drug fragments). */
  fragment?: boolean;
}

/** Compound ids reachable from a set of roots through metabolite links. */
export function reachable(roots: string[], children: Map<string, string[]>): Set<string> {
  const out = new Set(roots);
  const queue = [...roots];
  while (queue.length) for (const ch of children.get(queue.shift()!) ?? []) if (!out.has(ch)) { out.add(ch); queue.push(ch); }
  return out;
}

export function validateLibrary(lib: Partial<Library>, opts: ValidateOptions = {}): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if (!opts.fragment && (lib as Obj).schemaVersion !== SCHEMA_VERSION)
    errors.push({ id: '(file)', message: `schemaVersion must be ${SCHEMA_VERSION}${(lib as Obj).schemaVersion === undefined ? ' — this looks like a v1 file; run npm run migrate-v2' : ''}` });
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
  const structural = errors.some((e) => e.id === '(file)' && !e.message.startsWith('schemaVersion')) ||
    compounds.some((c) => !isObj(c) || !Array.isArray(c.formedFrom)) ||
    products.some((p) => !isObj(p) || !Array.isArray(p.components) || !Array.isArray(p.secondaryCategories));

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
      if (c.isMetabolite && c.formedFrom.length === 0) warnings.push({ id: c.id, message: 'isMetabolite is true but formedFrom is empty' });
      if (!c.isMetabolite && c.formedFrom.length > 0) warnings.push({ id: c.id, message: 'has formedFrom links but isMetabolite is false' });
      if (c.kinetics?.mode === 'formation-limited' && c.formedFrom.length === 0)
        errors.push({ id: c.id, message: 'formation-limited compound needs at least one formedFrom parent' });
    }
    for (const p of products) {
      for (const c of p.components) if (!known.has(c.compound)) errors.push({ id: p.id, message: `component "${c.compound}" does not exist` });
      if (catIds.size && !catIds.has(p.category)) errors.push({ id: p.id, message: `category "${p.category}" does not exist` });
      for (const s of p.secondaryCategories)
        if (catIds.size && !catIds.has(s)) errors.push({ id: p.id, message: `secondary category "${s}" does not exist` });
    }
    const all = [...(opts.externalCompounds ?? []).filter((c) => !compounds.some((x) => x.id === c.id)), ...compounds];
    const cycle = findCycle(all);
    if (cycle) errors.push({ id: cycle[0], message: `cycle in formedFrom: ${cycle.join(' → ')}` });
    for (const [src, sum] of fractionSums(all))
      if (sum > 1 + EPS) errors.push({ id: src, message: `known metabolite fractions formed from this compound sum to ${sum.toFixed(3)} (> 1)` });

    // Duplicate aliases across different drugs (search ambiguity, not fatal). A product's aliases
    // belong to its candidate's group, so routes of the same drug never clash with each other.
    const aliasOwner = new Map<string, string>();
    const flagged = new Set<string>();
    const flag = (alias: string, entryId: string, group: string) => {
      const key = alias.trim().toLowerCase();
      if (!key) return;
      const prev = aliasOwner.get(key);
      if (prev === undefined) aliasOwner.set(key, group);
      else if (prev !== group && !flagged.has(`${key}|${group}`)) {
        flagged.add(`${key}|${group}`);
        warnings.push({ id: entryId, message: `alias "${alias}" is also used by ${prev}` });
      }
    };
    for (const c of compounds) {
      flag(c.name, c.id, c.id);
      for (const a of c.aliases) flag(a, c.id, c.id);
    }
    for (const p of products) for (const a of p.aliases) flag(a, p.id, p.candidateId || primaryCompound(p));
  }

  return { errors, warnings, progress: structural ? emptyProgress(compounds.length, products.length) : computeProgress(categories, compounds, products) };
}

function emptyProgress(nc: number, np: number): Progress {
  return {
    compounds: nc, compoundsVerified: 0, compoundsStarted: 0, products: np, productsVerified: 0, categories: [],
    provenance: { checked: 0, recall: 0, estimate: 0, gap: 0, reviewer: 0, untagged: 0 },
    modes: { intrinsic: 0, 'formation-limited': 0, unknown: 0 },
  };
}

function safe<T>(f: () => T, fallback: T): T {
  try {
    return f();
  } catch {
    return fallback;
  }
}

function computeProgress(categories: Library['categories'], compounds: Compound[], products: Product[]): Progress {
  const byId = new Map(compounds.map((c) => [c.id, c]));
  const children = new Map<string, string[]>();
  for (const c of compounds) for (const f of c.formedFrom) children.set(f.compound, [...(children.get(f.compound) ?? []), c.id]);
  const started = (c: Compound | undefined) => !!c && safe(() => compoundHasData(c), false);

  const p = emptyProgress(compounds.length, products.length);
  p.compoundsVerified = compounds.filter((c) => c.verified).length;
  p.compoundsStarted = compounds.filter((c) => started(c)).length;
  p.productsVerified = products.filter((x) => x.verified).length;
  const tally = (prov: Record<string, string | null | undefined> | undefined, sections: readonly string[]) => {
    for (const s of sections) {
      const v = prov?.[s];
      const key = (v && v in p.provenance ? v : 'untagged') as keyof Progress['provenance'];
      p.provenance[key]++;
    }
  };
  for (const c of compounds) {
    tally(c.provenance, COMPOUND_SECTIONS);
    if (c.kinetics && c.kinetics.mode in p.modes) p.modes[c.kinetics.mode]++;
  }
  for (const x of products) tally(x.provenance, PRODUCT_SECTIONS);

  p.categories = [...categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => {
      const ps = products.filter((x) => x.category === cat.id);
      const used = [...reachable(ps.flatMap((x) => x.components.map((c) => c.compound)), children)].map((id) => byId.get(id)).filter(Boolean) as Compound[];
      return {
        id: cat.id,
        name: cat.name,
        products: ps.length,
        productsVerified: ps.filter((x) => x.verified).length,
        productsStarted: ps.filter((x) => started(byId.get(primaryCompound(x))) || x.typicalDose?.amount != null).length,
        unassessed: {
          qt: used.filter((c) => c.qt?.tier === 'unassessed').length,
          cyp2d6: used.filter((c) => c.cyp2d6?.substrate === 'unassessed' || c.cyp2d6?.inhibitor === 'unassessed').length,
          receptors: used.filter((c) => !c.receptorsAssessed).length,
          nonlinear: used.filter((c) => c.nonlinearKinetics?.flag === 'unassessed').length,
        },
      };
    });
  return p;
}

/** Validate session-only custom drugs against the library they extend. */
export function validateCustom(custom: { compounds: Compound[]; products: Product[] }, library: Library): ValidationResult {
  const r = validateLibrary(
    { categories: library.categories, compounds: custom.compounds, products: custom.products },
    { externalCompounds: library.compounds, fragment: true },
  );
  // Whatever a custom product is dosed as must be simulable on its own.
  const all = new Map([...library.compounds, ...custom.compounds].map((c) => [c.id, c]));
  for (const p of custom.products) {
    const c = all.get(primaryCompound(p));
    if (c && !(c.kinetics.mode === 'intrinsic' && (c.kinetics.halfLifeHours?.typical ?? 0) > 0))
      r.errors.push({ id: c.id, message: `${c.name || c.id}: the dosed compound needs a half-life` });
  }
  return r;
}
