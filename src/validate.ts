// Shared validation for drugs.json (schema v2.4), custom drugs and editor entries.
// Used by tools/validate-drugs.ts (prebuild), the migrations, the app on load, the wizard and the editor.

import {
  aucrTier, compoundHasData, compoundSections, dosedCompoundIds, effectiveRelevance, hasIntrinsicKinetics, INHIBITOR_NOT_ASSESSED_RE,
  isConfirmedUnknown, isFlagged, isReviewed, primaryCompound, productSections, SCHEMA_VERSION, unreviewedSections,
} from './schema';
import { planProductTree } from './tree';
import {
  CLINICAL_RELEVANCE, COMPOUND_SECTIONS, DOSE_BASES, DOSE_UNITS, FORMULATIONS, IDENTITY_CONFIDENCE, INHIBITION_TYPES, INHIBITOR_STRENGTHS, INPUT_TYPES,
  KINETIC_MODES, LINGERING_ORIGINS, PHENOTYPES, PROVENANCE_TAGS, PRODUCT_SECTIONS, QT_TIERS, RANGE_TYPES, RECEPTOR_ACTIONS, STRENGTH_BASES, TRI_STATES,
  type ClinicalRelevance, type Compound, type KineticMode, type Library, type Product, type Provenance,
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
  /** Review sections of this category's products and of every compound they reach. */
  sections: number;
  sectionsReviewed: number;
  /** Candidates (drugs) with products in this category; verified = whole tree and all products verified. */
  drugs: number;
  drugsVerified: number;
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
  sections: number;
  sectionsReviewed: number;
  sectionsFlagged: number;
  sectionsConfirmedUnknown: number;
  /** clinicalRelevance field of metabolites. */
  metaboliteRelevance: Record<ClinicalRelevance, number>;
  /** Products whose clear date is "Incomplete" (formation-limited setting off), by what blocks them. */
  incomplete: { total: number; unknownRelevanceOnly: number; active: number };
  /** Products whose dosed compound can't be simulated at all. */
  noData: number;
  /** Products whose primary compound is deliberately not modelled (exposure markers + lingering band). */
  notModelled: number;
  /** Verified (fully reviewed) products that are still Incomplete or have no data: literature gaps. */
  verifiedIncomplete: string[];
  /** Partially specified kinetics handled by the conservative rule (spec v2.1 §3). */
  partial: { earlyPhaseIgnored: string[]; steadyStateOnsetUnknown: string[]; steadyStateIgnored: string[] };
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
    if (typical == null && (min != null || max != null)) {
      // Range-only evidence: both bounds, from a range type describing individual spread.
      if (min == null || max == null) this.err(`${where}: only one bound is set and typical is null (range-only evidence needs both min and max)`);
      else if (r.rangeType !== 'observed-range' && r.rangeType !== 'cohort-means')
        this.err(`${where}: typical is null — range-only evidence needs rangeType "observed-range" or "cohort-means"`);
      else if (isNum(min) && isNum(max) && min > max + EPS) this.err(`${where}: min (${min}) > max (${max})`);
    }
    if (required && typical == null && (min == null || max == null)) this.err(`${where} needs typical, or both min and max`);
    if (isNum(min) && isNum(typical) && min > typical + EPS) this.err(`${where}: min (${min}) > typical (${typical})`);
    if (isNum(max) && isNum(typical) && typical > max + EPS) this.err(`${where}: typical (${typical}) > max (${max})`);
    if (r.rangeType === 'cv' && !isNum(r.cv)) this.err(`${where}: rangeType "cv" needs cv`);
    if (isNum(r.cv) && r.cv > 2) this.err(`${where}.cv (${r.cv}) must be ≤ 2`);
  }
  /** Partial maps are allowed (missing phenotypes count as 1). Formation multipliers may be 0 (not formed). */
  phenotypes(m: unknown, where: string, allowZero = false) {
    if (m === null || m === undefined) return;
    if (!isObj(m)) return this.err(`${where} must be an object of phenotype multipliers or null`);
    const keys = Object.keys(m);
    if (!keys.length) this.err(`${where} is empty — use null when no phenotype is known`);
    for (const k of keys) {
      if (!(PHENOTYPES as readonly string[]).includes(k)) this.err(`${where}.${k} is not a phenotype (${PHENOTYPES.join(', ')})`);
      const v = m[k];
      if (!isNum(v) || v < 0 || (!allowZero && v === 0))
        this.err(`${where}.${k} must be ${allowZero ? '≥ 0 (0 = not formed)' : '> 0'}`);
    }
  }
  provenance(p: unknown, sections: readonly string[]) {
    if (p === undefined) return this.err('provenance missing');
    if (!isObj(p)) return this.err('provenance must be an object');
    for (const [k, v] of Object.entries(p)) {
      if (!sections.includes(k)) this.warn(`provenance.${k} is not a known section`);
      if (v !== null && !oneOf(PROVENANCE_TAGS, v)) this.err(`provenance.${k} "${String(v)}" not one of ${PROVENANCE_TAGS.join(', ')} or null`);
    }
  }
  reviewedDates(d: unknown, sections: readonly string[]) {
    if (d === undefined) return this.err('reviewedDates missing (use {} — run npm run migrate-v2.1)');
    if (!isObj(d)) return this.err('reviewedDates must be an object');
    for (const [k, v] of Object.entries(d)) {
      if (!sections.includes(k)) this.warn(`reviewedDates.${k} is not a known section`);
      if (typeof v !== 'string' || !DATE_RE.test(v)) this.err(`reviewedDates.${k} must be a date (YYYY-MM-DD)`);
    }
  }
}

const INCHIKEY_RE = /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/;

/** Schema 2.4 `cyp2d6.strengthEvidence`: what a weak / moderate / strong tier rests on. */
function checkStrengthEvidence(c: Obj, cyp: Obj, known: boolean, k: Checker) {
  const ev = cyp.strengthEvidence;
  if (ev === undefined) {
    if (!c.userEntered) k.err('cyp2d6.strengthEvidence missing (run npm run migrate-v2.4)');
    return;
  }
  if (!isObj(ev)) return k.err('cyp2d6.strengthEvidence must be an object');
  if (ev.basis !== null && !oneOf(STRENGTH_BASES, ev.basis)) k.err(`cyp2d6.strengthEvidence.basis "${String(ev.basis)}" not one of ${STRENGTH_BASES.join(', ')}`);
  for (const f of ['probe', 'regimen', 'citation'] as const)
    if (ev[f] !== null && typeof ev[f] !== 'string') k.err(`cyp2d6.strengthEvidence.${f} must be text or null`);
  k.num(ev.aucRatio, 'cyp2d6.strengthEvidence.aucRatio', { min: 0, minExclusive: true });
  if (known && !ev.basis) k.warn(`cyp2d6.inhibitor is ${String(cyp.inhibitor)} but no strength basis is recorded`);
  if (known && (ev.basis === 'clinical-aucr' || ev.basis === 'model-estimate') && typeof ev.aucRatio === 'number' && ev.aucRatio > 0) {
    const tier = aucrTier(ev.aucRatio);
    if (tier !== cyp.inhibitor) k.warn(`cyp2d6.inhibitor is ${String(cyp.inhibitor)} but its AUC ratio ${ev.aucRatio} maps to ${tier}`);
  }
}

/** Schema 2.3 `identity`: null until looked up; a drawn structure needs CID, SMILES, InChIKey and formula. */
function checkIdentity(c: Obj, k: Checker) {
  const idn = c.identity;
  if (idn === undefined) {
    if (!c.userEntered) k.err('identity missing (use null — run npm run migrate-v2.3)');
    return;
  }
  if (idn === null) return;
  if (!isObj(idn)) return k.err('identity must be an object or null');
  if (!oneOf(IDENTITY_CONFIDENCE, idn.confidence)) k.err(`identity.confidence "${String(idn.confidence)}" not one of ${IDENTITY_CONFIDENCE.join(', ')}`);
  if (idn.pubchemCid !== null && !(Number.isInteger(idn.pubchemCid) && (idn.pubchemCid as number) > 0)) k.err('identity.pubchemCid must be a positive integer or null');
  for (const f of ['smiles', 'inchiKey', 'formula'] as const)
    if (idn[f] !== null && (typeof idn[f] !== 'string' || !(idn[f] as string).trim())) k.err(`identity.${f} must be a non-empty string or null`);
  if (typeof idn.inchiKey === 'string' && !INCHIKEY_RE.test(idn.inchiKey)) k.err(`identity.inchiKey "${idn.inchiKey}" is not a standard InChIKey`);
  if (typeof idn.note !== 'string') k.err('identity.note must be a string');
  if (!Array.isArray(idn.candidates)) k.err('identity.candidates must be an array');
  else if (idn.candidates.some((x) => !isObj(x) || !Number.isInteger(x.cid) || typeof x.name !== 'string' || typeof x.reason !== 'string'))
    k.err('identity.candidates entries need cid (integer), name and reason');
  const drawn = idn.confidence === 'confirmed' || idn.confidence === 'probable';
  if (drawn && (idn.pubchemCid === null || idn.smiles === null || idn.inchiKey === null || idn.formula === null))
    k.err(`identity: a ${String(idn.confidence)} identity needs pubchemCid, smiles, inchiKey and formula`);
  if (idn.confidence === 'not-applicable') {
    if (idn.smiles !== null) k.err('identity: a not-applicable identity has no smiles');
    if (typeof idn.note === 'string' && !idn.note.trim()) k.err('identity: not-applicable needs the reason in note');
  }
  if (idn.confidence === 'unconfirmed' && idn.smiles !== null) k.warn('identity: unconfirmed identity has a SMILES — it is not drawn until confirmed');
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
      k.phenotypes(f.cyp2d6Multiplier, `formedFrom ${f.compound}: cyp2d6Multiplier`, true);
      if (f.condition != null && (!isObj(f.condition) || typeof f.condition.requiresCompound !== 'string' || !f.condition.requiresCompound))
        k.err(`formedFrom ${f.compound}: condition must be { requiresCompound: "<compound id>" } or null`);
    }
  if (!oneOf(CLINICAL_RELEVANCE, c.clinicalRelevance))
    k.err(`clinicalRelevance "${String(c.clinicalRelevance)}" not one of ${CLINICAL_RELEVANCE.join(', ')}`);
  if (c.endogenous !== undefined && typeof c.endogenous !== 'boolean') k.err('endogenous must be true/false (or absent)');
  k.num(c.molecularWeight, 'molecularWeight', { min: 0, minExclusive: true });
  checkIdentity(c, k);

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
        if (kin.mode === 'intrinsic' && (ep.fraction == null || !hasRangeValue(ep.halfLifeHours)))
          k.warn(`kinetics.earlyPhase ${ep.fraction == null ? 'fraction' : 'half-life'} is unknown — early phase ignored (conservative)`);
      }
    }
    if (kin.steadyState != null) {
      const ss = kin.steadyState;
      if (!isObj(ss)) k.err('kinetics.steadyState must be an object or null');
      else {
        k.num(ss.afterDays, 'kinetics.steadyState.afterDays', { min: 0, minExclusive: true });
        k.range(ss.halfLifeHours, 'kinetics.steadyState.halfLifeHours');
        if (kin.mode === 'intrinsic' && !hasRangeValue(ss.halfLifeHours)) k.warn('kinetics.steadyState half-life is unknown — steady state ignored');
        else if (kin.mode === 'intrinsic' && ss.afterDays == null)
          k.warn('kinetics.steadyState.afterDays is unknown — with repeated dosing the later of single-dose and steady-state clearance is used (conservative)');
      }
    }
    if (kin.mode !== 'intrinsic' && (kin.earlyPhase != null || kin.steadyState != null))
      k.warn(`earlyPhase/steadyState are ignored when mode is "${String(kin.mode)}"`);
    if (kin.mode === 'zero-order') {
      if (kin.zeroOrderRateMgPerKgPerHour == null)
        k.err('zero-order kinetics need kinetics.zeroOrderRateMgPerKgPerHour (a Range; all null = no data yet)');
      else k.range(kin.zeroOrderRateMgPerKgPerHour, 'kinetics.zeroOrderRateMgPerKgPerHour');
    } else if (hasRangeValue(kin.zeroOrderRateMgPerKgPerHour)) k.warn(`zeroOrderRateMgPerKgPerHour is ignored when mode is "${String(kin.mode)}"`);
    if (kin.mode === 'not-modelled') {
      if (typeof kin.notModelledReason !== 'string' || !kin.notModelledReason.trim()) k.err('not-modelled kinetics need kinetics.notModelledReason (shown to users)');
    } else if (kin.notModelledReason !== undefined && kin.notModelledReason !== '') k.warn(`notModelledReason is ignored when mode is "${String(kin.mode)}"`);
    if ((kin.mode === 'zero-order' || kin.mode === 'not-modelled') && hasRangeValue(kin.halfLifeHours))
      k.warn(`kinetics.halfLifeHours is ignored when mode is "${String(kin.mode)}"`);
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
    const note = isObj(c.sourceNotes) && typeof c.sourceNotes.cyp2d6 === 'string' ? c.sourceNotes.cyp2d6 : '';
    if (cyp.inhibitor === 'none' && INHIBITOR_NOT_ASSESSED_RE.test(note))
      k.warn('cyp2d6.inhibitor is "none" but the cyp2d6 note says inhibition was not assessed — should it be "unassessed"?');
    checkStrengthEvidence(c, cyp, strong, k);
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
  if (!isObj(le) || typeof le.note !== 'string') k.err('lingeringEffects needs durationDays, origin and note');
  else {
    k.num(le.durationDays, 'lingeringEffects.durationDays', { min: 0, minExclusive: true });
    if (le.origin === undefined) {
      if (!c.userEntered) k.err('lingeringEffects.origin missing (run npm run migrate-v2.4)');
    } else if (!oneOf(LINGERING_ORIGINS, le.origin)) k.err(`lingeringEffects.origin "${String(le.origin)}" not one of ${LINGERING_ORIGINS.join(', ')}`);
    else if (le.origin === 'last-dose' && le.durationDays == null)
      k.warn('lingeringEffects.origin is "last-dose" but no duration is set');
  }
  const nl = c.nonlinearKinetics;
  if (!isObj(nl) || !oneOf(TRI_STATES, nl.flag) || typeof nl.note !== 'string') k.err(`nonlinearKinetics needs flag (${TRI_STATES.join('/')}) and note`);
  k.provenance(c.provenance, COMPOUND_SECTIONS);
  k.reviewedDates(c.reviewedDates, COMPOUND_SECTIONS);
  if (typeof c.source !== 'string') k.err('source must be a string');
  if (!isObj(c.sourceNotes)) k.err('sourceNotes must be an object');
  if (typeof c.verified !== 'boolean') k.err('verified must be true/false');
  if (typeof c.verifiedDate !== 'string') k.err('verifiedDate must be a string');
  if (c.verified === true && isObj(c.provenance)) {
    // Verified = fully reviewed (not "complete data").
    if (!(typeof c.source === 'string' && c.source.trim())) k.err('verified requires a non-empty source');
    if (!(typeof c.verifiedDate === 'string' && DATE_RE.test(c.verifiedDate))) k.err('verified requires verifiedDate (YYYY-MM-DD)');
    const e = c as unknown as Compound;
    const open = unreviewedSections(e, compoundSections(e));
    if (open.length) k.err(`verified, but these sections are not reviewed: ${open.join(', ')}`);
    if (c.isMetabolite && c.clinicalRelevance === 'unknown') k.err('a metabolite cannot be verified with clinicalRelevance "unknown"');
    if (isObj(kin) && kin.mode === 'unknown' && !isConfirmedUnknown(e, 'halfLife'))
      k.err('verified with kinetics.mode "unknown" requires the halfLife section to be "Confirmed unknown" by the reviewer');
    if (isObj(kin) && kin.mode === 'zero-order' && !hasRangeValue(kin.zeroOrderRateMgPerKgPerHour) && !isConfirmedUnknown(e, 'halfLife'))
      k.err('verified zero-order kinetics without a rate require the halfLife section to be "Confirmed unknown" by the reviewer');
  }
}

/** Range with a usable value: typical, or both bounds (range-only). */
function hasRangeValue(r: unknown): boolean {
  return isObj(r) && (isNum(r.typical) || (isNum(r.min) && isNum(r.max)));
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
      if (c.administeredAs !== undefined && c.administeredAs !== null && (typeof c.administeredAs !== 'string' || !c.administeredAs))
        k.err(`component ${c.compound}: administeredAs must be a compound id or null`);
      if (c.administeredAs === c.compound) k.warn(`component ${c.compound}: administeredAs is the modelled compound itself`);
      if (c.massFactor !== undefined) k.num(c.massFactor, `component ${c.compound}: massFactor`, { min: 0, max: 2, minExclusive: true });
    }
  const inp = p.input;
  if (!isObj(inp)) k.err('input missing');
  else {
    if (!oneOf(INPUT_TYPES, inp.type)) k.err(`input.type "${String(inp.type)}" not one of ${INPUT_TYPES.join(', ')}`);
    k.range(inp.releaseHalfLifeHours, 'input.releaseHalfLifeHours');
    k.num(inp.defaultDurationHours, 'input.defaultDurationHours', { min: 0, minExclusive: true });
    const rate = p.doseUnit === 'µg/h' || p.doseUnit === 'mg/h';
    if (inp.type === 'zero-order' && !rate && p.doseUnit !== 'session') k.err('zero-order input needs a rate doseUnit (µg/h or mg/h) or exposure sessions');
    if (inp.type !== 'zero-order' && rate) k.err(`doseUnit ${String(p.doseUnit)} is a rate but input is not zero-order`);
    if (inp.type !== 'zero-order' && p.doseUnit === 'session') k.err('exposure sessions (doseUnit "session") need zero-order input (the session duration)');
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
  k.reviewedDates(p.reviewedDates, PRODUCT_SECTIONS);
  if (!isObj(p.sourceNotes)) k.err('sourceNotes must be an object');
  if (typeof p.verified !== 'boolean') k.err('verified must be true/false');
  if (p.verified === true && isObj(p.provenance)) {
    if (!(typeof p.source === 'string' && p.source.trim())) k.err('verified requires a non-empty source');
    if (!(typeof p.verifiedDate === 'string' && DATE_RE.test(p.verifiedDate))) k.err('verified requires verifiedDate (YYYY-MM-DD)');
    const open = unreviewedSections(p as unknown as Product, productSections(p as unknown as Product));
    if (open.length) k.err(`verified, but these sections are not reviewed: ${open.join(', ')}`);
  }
  for (const old of ['parentCompound', 'typicalDoseMg', 'apparentHalfLifeHours'])
    if (old in p) k.err(`${old} is a v1 field — run npm run migrate-v2`);
}

export interface ValidateOptions {
  /** Compounds that may be referenced but are not themselves checked (e.g. library, when validating custom drugs). */
  externalCompounds?: Compound[];
  /** Skip the schemaVersion check (custom-drug fragments). */
  fragment?: boolean;
  /** Products outside the checked set that may dose these compounds (library, when validating custom drugs). */
  externalProducts?: Product[];
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
  const version = (lib as Obj).schemaVersion;
  if (!opts.fragment && version !== SCHEMA_VERSION)
    errors.push({
      id: '(file)',
      message: `schemaVersion must be ${SCHEMA_VERSION}` + (
        version === undefined ? ' — this looks like a v1 file; run npm run migrate-v2, then migrate-v2.1, migrate-v2.2, migrate-v2.3 and migrate-v2.4'
          : version === 2 ? ' — this is a v2 file; run npm run migrate-v2.1, then migrate-v2.2, migrate-v2.3 and migrate-v2.4'
            : version === 2.1 ? ' — this is a v2.1 file; run npm run migrate-v2.2, then migrate-v2.3 and migrate-v2.4'
              : version === 2.2 ? ' — this is a v2.2 file; run npm run migrate-v2.3, then migrate-v2.4'
                : version === 2.3 ? ' — this is a v2.3 file; run npm run migrate-v2.4' : ''),
    });
  if ((lib as Obj).qtCalibrationNote !== undefined && typeof (lib as Obj).qtCalibrationNote !== 'string')
    errors.push({ id: '(file)', message: 'qtCalibrationNote must be a string' });
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
      for (const f of c.formedFrom) {
        if (!known.has(f.compound)) errors.push({ id: c.id, message: `formedFrom references unknown compound "${f.compound}"` });
        const req = f.condition?.requiresCompound;
        if (typeof req === 'string' && req && !known.has(req)) errors.push({ id: c.id, message: `formedFrom ${f.compound}: condition requires unknown compound "${req}"` });
      }
    for (const c of compounds) {
      if (c.isMetabolite && c.formedFrom.length === 0) warnings.push({ id: c.id, message: 'isMetabolite is true but formedFrom is empty' });
      if (!c.isMetabolite && c.formedFrom.length > 0) warnings.push({ id: c.id, message: 'has formedFrom links but isMetabolite is false' });
      if (c.kinetics?.mode === 'formation-limited' && c.formedFrom.length === 0)
        errors.push({ id: c.id, message: 'formation-limited compound needs at least one formedFrom parent' });
    }
    const dosed = dosedCompoundIds([...products, ...((opts.externalProducts ?? []) as Product[])]);
    for (const c of compounds)
      if (oneOf(CLINICAL_RELEVANCE, c.clinicalRelevance) && c.clinicalRelevance !== 'active' && effectiveRelevance(c, dosed) === 'active')
        warnings.push({
          id: c.id,
          message: `clinicalRelevance is "${c.clinicalRelevance}" but ${c.isMetabolite ? 'it is dosed directly by a product' : 'it is a parent compound'} — always treated as active`,
        });
    const allById = new Map([...(opts.externalCompounds ?? []), ...compounds].map((c) => [c.id, c]));
    for (const p of products) {
      for (const c of p.components) {
        if (!known.has(c.compound)) errors.push({ id: p.id, message: `component "${c.compound}" does not exist` });
        if (typeof c.administeredAs === 'string' && c.administeredAs && !known.has(c.administeredAs))
          errors.push({ id: p.id, message: `component ${c.compound}: administeredAs "${c.administeredAs}" does not exist` });
      }
      const mode = allById.get(primaryCompound(p))?.kinetics?.mode;
      if (p.doseUnit === 'session' && mode !== 'not-modelled')
        errors.push({ id: p.id, message: 'exposure sessions (doseUnit "session") are only for products whose primary compound is not-modelled' });
      if ((p.doseUnit === 'standard drinks' || p.doseUnit === 'g') && mode !== 'zero-order')
        warnings.push({ id: p.id, message: `doseUnit "${p.doseUnit}" is meant for alcohol (zero-order) products` });
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
    modes: { intrinsic: 0, 'formation-limited': 0, 'zero-order': 0, 'not-modelled': 0, unknown: 0 },
    sections: 0, sectionsReviewed: 0, sectionsFlagged: 0, sectionsConfirmedUnknown: 0,
    metaboliteRelevance: { active: 0, inactive: 0, unknown: 0 },
    incomplete: { total: 0, unknownRelevanceOnly: 0, active: 0 },
    noData: 0,
    notModelled: 0,
    verifiedIncomplete: [],
    partial: { earlyPhaseIgnored: [], steadyStateOnsetUnknown: [], steadyStateIgnored: [] },
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
  for (const x of products) tally(x.provenance, productSections(x));

  // Review sections.
  const secs = (e: Compound | Product, list: string[]) => ({ total: list.length, reviewed: list.filter((s) => isReviewed(e, s)).length });
  const compoundSecs = (c: Compound) => secs(c, compoundSections(c));
  const productSecs = (x: Product) => secs(x, productSections(x));
  for (const e of [...compounds.map((c) => [c, compoundSections(c)] as const), ...products.map((x) => [x, productSections(x)] as const)]) {
    const [entry, list] = e;
    p.sections += list.length;
    for (const s of list) {
      if (isReviewed(entry, s)) p.sectionsReviewed++;
      if (isFlagged(entry, s)) p.sectionsFlagged++;
      if (isConfirmedUnknown(entry, s)) p.sectionsConfirmedUnknown++;
    }
  }

  // Relevance and clear-date completeness (setting "treat unknown as formation-limited" off).
  for (const c of compounds)
    if (c.isMetabolite && c.clinicalRelevance in p.metaboliteRelevance) p.metaboliteRelevance[c.clinicalRelevance]++;
  const dosed = dosedCompoundIds(products);
  // Without a scenario, conditional metabolites (formed only with e.g. alcohol) are not formed (v2.2 §5).
  const unconditional = new Map<string, string[]>();
  for (const c of compounds)
    for (const f of c.formedFrom) if (!f.condition) unconditional.set(f.compound, [...(unconditional.get(f.compound) ?? []), c.id]);
  const childrenOf = (id: string) => unconditional.get(id) ?? [];
  for (const x of products) {
    const plan = safe(() => planProductTree(byId, childrenOf, x.components.map((c) => c.compound), dosed, false), null);
    if (!plan) continue;
    if (plan.notModelled.includes(primaryCompound(x))) {
      p.notModelled++;
      continue;
    }
    const primaryMissing = plan.missing.some((m) => m.id === primaryCompound(x));
    if (primaryMissing) p.noData++;
    else if (plan.missing.length) {
      p.incomplete.total++;
      if (plan.missing.some((m) => m.relevance === 'active')) p.incomplete.active++;
      else p.incomplete.unknownRelevanceOnly++;
    }
    if (x.verified && plan.missing.length) p.verifiedIncomplete.push(x.id);
  }
  for (const c of compounds) {
    const k = c.kinetics;
    if (k?.mode !== 'intrinsic') continue;
    if (k.earlyPhase && (k.earlyPhase.fraction == null || !hasRangeValue(k.earlyPhase.halfLifeHours))) p.partial.earlyPhaseIgnored.push(c.id);
    if (k.steadyState && !hasRangeValue(k.steadyState.halfLifeHours)) p.partial.steadyStateIgnored.push(c.id);
    else if (k.steadyState && k.steadyState.afterDays == null) p.partial.steadyStateOnsetUnknown.push(c.id);
  }

  const drugVerified = verifiedDrugs(compounds, products);
  const candidateVerified = (key: string) => drugVerified.get(key) ?? false;

  p.categories = [...categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => {
      const ps = products.filter((x) => x.category === cat.id);
      const used = [...reachable(ps.flatMap((x) => x.components.map((c) => c.compound)), children)].map((id) => byId.get(id)).filter(Boolean) as Compound[];
      const s = [...used.map(compoundSecs), ...ps.map(productSecs)];
      const drugs = [...new Set(ps.map((x) => x.candidateId || primaryCompound(x)))];
      return {
        id: cat.id,
        name: cat.name,
        products: ps.length,
        productsVerified: ps.filter((x) => x.verified).length,
        productsStarted: ps.filter((x) => started(byId.get(primaryCompound(x))) || x.typicalDose?.amount != null).length,
        sections: s.reduce((a, b) => a + b.total, 0),
        sectionsReviewed: s.reduce((a, b) => a + b.reviewed, 0),
        drugs: drugs.length,
        drugsVerified: drugs.filter(candidateVerified).length,
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

/** The drug (candidate) a product belongs to. */
export const drugIdOf = (p: Product) => p.candidateId || primaryCompound(p);

/** Drug id → verified: all its products and every compound they reach are verified. */
export function verifiedDrugs(compounds: Compound[], products: Product[]): Map<string, boolean> {
  const byId = new Map(compounds.map((c) => [c.id, c]));
  const children = new Map<string, string[]>();
  for (const c of compounds) for (const f of c.formedFrom ?? []) children.set(f.compound, [...(children.get(f.compound) ?? []), c.id]);
  const byDrug = new Map<string, Product[]>();
  for (const x of products) byDrug.set(drugIdOf(x), [...(byDrug.get(drugIdOf(x)) ?? []), x]);
  const out = new Map<string, boolean>();
  for (const [key, ps] of byDrug) {
    const tree = reachable(ps.flatMap((x) => (x.components ?? []).map((c) => c.compound)), children);
    out.set(key, ps.every((x) => x.verified) && [...tree].every((id) => byId.get(id)?.verified));
  }
  return out;
}

/** Validate session-only custom drugs against the library they extend. */
export function validateCustom(custom: { compounds: Compound[]; products: Product[] }, library: Library): ValidationResult {
  const r = validateLibrary(
    { categories: library.categories, compounds: custom.compounds, products: custom.products },
    { externalCompounds: library.compounds, externalProducts: library.products, fragment: true },
  );
  // Whatever a custom product is dosed as must be simulable on its own.
  const all = new Map([...library.compounds, ...custom.compounds].map((c) => [c.id, c]));
  for (const p of custom.products) {
    const c = all.get(primaryCompound(p));
    if (c && !hasIntrinsicKinetics(c))
      r.errors.push({ id: c.id, message: `${c.name || c.id}: the dosed compound needs a half-life` });
  }
  return r;
}
