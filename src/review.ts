// Section review logic for the data editor (spec v2.1 §6). Pure functions that mutate one library
// entry in place; the editor wires them to buttons and keyboard shortcuts.

import {
  CONFIRMED_UNKNOWN_NOTE, FLAG_PREFIX, NA_NOTE, compoundSections, hasTypical, isConfirmedUnknown, isReviewed, productSections, unreviewedSections,
} from './schema';
import type { Compound, CompoundSection, Product, ProductSection } from './types';
import type { Issue } from './validate';

export type Entry = Compound | Product;
export type Section = CompoundSection | ProductSection;

export const isCompound = (e: Entry): e is Compound => 'kinetics' in e;
export const sectionsOf = (e: Entry): Section[] => (isCompound(e) ? compoundSections(e) : productSections(e));

export const SECTION_LABEL: Record<Section, string> = {
  halfLife: 'Kinetics', metabolism: 'Metabolite links & fractions', relevance: 'Clinical relevance', molecularWeight: 'Molecular weight',
  identity: 'Chemical identity (PubChem)', cyp2d6: 'CYP2D6', qt: 'QT', receptors: 'Receptors', lingeringEffects: 'Lingering effects', nonlinearKinetics: 'Nonlinear kinetics',
  class: 'Class', aliases: 'Aliases', components: 'Components', conversion: 'Prodrug conversion', input: 'Input model (release)', typicalDose: 'Typical dose',
};

/** Which validator messages belong to which section (messages start with the field path). */
const ISSUE_RE: Record<Section, RegExp> = {
  halfLife: /^(kinetics|earlyPhase\/steadyState|formation-limited compound|zero-order kinetics|not-modelled kinetics|zeroOrderRate|notModelledReason|endogenous|verified zero-order)/,
  metabolism: /^(formedFrom|known metabolite fractions|cycle in formedFrom|isMetabolite|has formedFrom)/,
  relevance: /^clinicalRelevance/,
  molecularWeight: /^molecularWeight/,
  identity: /^identity/,
  cyp2d6: /^cyp2d6/,
  qt: /^qt[. ]/,
  receptors: /^(receptor|receptorsAssessed)/,
  lingeringEffects: /^lingeringEffects/,
  nonlinearKinetics: /^nonlinearKinetics/,
  class: /^class/,
  aliases: /^(aliases|alias ")/,
  components: /^component (?!.*(administeredAs|massFactor))/,
  conversion: /^component .*(administeredAs|massFactor)/,
  input: /^(input|zero-order input|doseUnit|exposure sessions)/,
  typicalDose: /^typicalDose/,
};

export const sectionIssues = (issues: Issue[], e: Entry, s: Section): Issue[] =>
  issues.filter((i) => i.id === e.id && ISSUE_RE[s].test(i.message));

/** Values in a section that are still null / unassessed. Confirming them needs "Confirm as unknown". */
export function unknownParts(e: Entry, s: Section): string[] {
  const out: string[] = [];
  if (isCompound(e)) {
    const k = e.kinetics;
    switch (s) {
      case 'halfLife':
        if (k.mode === 'unknown') out.push('kinetic mode');
        if (k.mode === 'zero-order' && !hasTypical(k.zeroOrderRateMgPerKgPerHour)) out.push('zero-order elimination rate');
        if (k.mode === 'not-modelled' && !k.notModelledReason?.trim()) out.push('reason it is not modelled');
        if (k.mode !== 'intrinsic') break;
        if (!hasTypical(k.halfLifeHours)) out.push('half-life');
        if (k.earlyPhase && k.earlyPhase.fraction === null) out.push('early-phase fraction');
        if (k.earlyPhase && !hasTypical(k.earlyPhase.halfLifeHours)) out.push('early-phase half-life');
        if (k.steadyState && k.steadyState.afterDays === null) out.push('steady-state onset');
        if (k.steadyState && !hasTypical(k.steadyState.halfLifeHours)) out.push('steady-state half-life');
        break;
      case 'metabolism':
        for (const f of e.formedFrom) if (f.fraction === null) out.push(`fraction from ${f.compound}`);
        break;
      case 'relevance':
        if (e.isMetabolite && e.clinicalRelevance === 'unknown') out.push('clinical relevance');
        break;
      case 'molecularWeight':
        if (e.molecularWeight === null) out.push('molecular weight');
        break;
      case 'identity':
        if (!e.identity) out.push('PubChem identity (not looked up)');
        else if (e.identity.confidence === 'unconfirmed') out.push('PubChem identity (no CID chosen)');
        break;
      case 'cyp2d6':
        if (e.cyp2d6.substrate === 'unassessed') out.push('substrate');
        if (e.cyp2d6.substrate === 'yes' && !e.cyp2d6.halfLifeMultiplier) out.push('half-life multiplier');
        if (e.cyp2d6.inhibitor === 'unassessed') out.push('inhibitor');
        else if (e.cyp2d6.inhibitor !== 'none' && e.cyp2d6.inhibitionType === 'unassessed') out.push('inhibition type');
        break;
      case 'qt':
        if (e.qt.tier === 'unassessed') out.push('QT tier');
        else if (e.qt.tier !== 'none') {
          if (e.qt.weight === null) out.push('QT weight');
          if (e.qt.referenceAmountMg === null) out.push('reference amount');
        }
        break;
      case 'receptors':
        if (!e.receptorsAssessed) out.push('receptor targets');
        break;
      case 'lingeringEffects':
        if (e.lingeringEffects.durationDays === null) out.push('duration');
        break;
      case 'nonlinearKinetics':
        if (e.nonlinearKinetics.flag === 'unassessed') out.push('nonlinear flag');
        break;
    }
  } else {
    switch (s) {
      case 'class':
        if (!e.class.trim()) out.push('class');
        break;
      case 'components':
        for (const c of e.components) if (c.bioavailability === null) out.push(`bioavailability of ${c.compound}`);
        break;
      case 'conversion':
        for (const c of e.components) if (c.administeredAs && c.massFactor == null) out.push(`mass factor ${c.administeredAs} → ${c.compound}`);
        break;
      case 'input':
        if (e.input.type === 'first-order-release' && !hasTypical(e.input.releaseHalfLifeHours)) out.push('release half-life');
        if (e.input.type === 'zero-order' && e.input.defaultDurationHours === null) out.push('wear / infusion time');
        break;
      case 'typicalDose':
        if (e.typicalDose.amount === null) out.push('typical dose');
        break;
    }
  }
  return out;
}

const prov = (e: Entry) => e.provenance as Record<string, string | null>;
const notes = (e: Entry) => e.sourceNotes as Record<string, string>;
const dates = (e: Entry) => e.reviewedDates as Record<string, string>;

function appendNote(e: Entry, s: Section, text: string) {
  const cur = (notes(e)[s] ?? '').trim();
  if (!cur.includes(text)) notes(e)[s] = cur ? `${cur} ${text}` : text;
}

/** Any human edit or confirmation: provenance `reviewer` and today's date. */
export function markReviewed(e: Entry, s: Section, date: string) {
  prov(e)[s] = 'reviewer';
  dates(e)[s] = date;
}

/**
 * Confirm keeps the values, sets provenance `reviewer` and stamps the date. Sections with unknown
 * values need `asUnknown`, which keeps the nulls and adds "Confirmed unknown — reviewer" to the note.
 * Returns why it was refused, or null.
 */
export function confirmSection(e: Entry, s: Section, date: string, asUnknown = false): string | null {
  const unknown = unknownParts(e, s);
  if (unknown.length && !asUnknown) return `Unknown: ${unknown.join(', ')} — use “Confirm as unknown”, or fill them in.`;
  if (!unknown.length && asUnknown) return 'Nothing in this section is unknown — use Confirm.';
  markReviewed(e, s, date);
  if (s === 'identity' && isCompound(e) && e.identity?.confidence === 'probable') e.identity.confidence = 'confirmed';
  if (asUnknown) appendNote(e, s, CONFIRMED_UNKNOWN_NOTE);
  else if (notes(e)[s]?.includes(CONFIRMED_UNKNOWN_NOTE)) notes(e)[s] = notes(e)[s].replace(CONFIRMED_UNKNOWN_NOTE, '').replace(/\s{2,}/g, ' ').trim();
  return null;
}

/** Flag keeps (or puts) the section unreviewed and records the reason in its note. */
export function flagSection(e: Entry, s: Section, reason: string) {
  if (isReviewed(e, s)) {
    prov(e)[s] = null;
    delete dates(e)[s];
  }
  appendNote(e, s, `${FLAG_PREFIX} ${reason.trim() || 'needs follow-up'}`);
}

/** Sections that can be marked "not applicable" (set to their empty / none value). */
export const NA_SECTIONS: readonly Section[] = ['cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics', 'aliases', 'typicalDose'];

export function markNotApplicable(e: Entry, s: Section, date: string): string | null {
  if (!NA_SECTIONS.includes(s)) return `${SECTION_LABEL[s]} can't be marked not applicable.`;
  if (isCompound(e)) {
    if (s === 'cyp2d6') e.cyp2d6 = { substrate: 'no', halfLifeMultiplier: null, inhibitor: 'none', inhibitionType: 'none' };
    else if (s === 'qt') e.qt = { tier: 'none', weight: null, referenceAmountMg: null };
    else if (s === 'receptors') { e.receptors = []; e.receptorsAssessed = true; }
    else if (s === 'lingeringEffects') e.lingeringEffects = { durationDays: null, note: '' };
    else if (s === 'nonlinearKinetics') e.nonlinearKinetics = { flag: 'no', note: '' };
    else return `${SECTION_LABEL[s]} is not a compound section.`;
  } else {
    if (s === 'aliases') e.aliases = [];
    else if (s === 'typicalDose') e.typicalDose = { ...e.typicalDose, amount: null };
    else return `${SECTION_LABEL[s]} is not a product section.`;
  }
  markReviewed(e, s, date);
  appendNote(e, s, NA_NOTE);
  return null;
}

/** What still stands between an entry and "Verify entry". Empty = ready. */
export function verifyBlockers(e: Entry, errors: Issue[]): string[] {
  const out: string[] = [];
  const open = unreviewedSections(e, sectionsOf(e));
  if (open.length) out.push(`review ${open.length} section${open.length > 1 ? 's' : ''} (${open.map((s) => SECTION_LABEL[s as Section]).join(', ')})`);
  if (errors.some((i) => i.id === e.id && !/\bverified\b/.test(i.message))) out.push('fix validation errors');
  if (!e.source.trim()) out.push('add a source');
  if (isCompound(e)) {
    if (e.isMetabolite && e.clinicalRelevance === 'unknown') out.push('classify clinical relevance (active or inactive)');
    if (e.kinetics.mode === 'unknown' && !isConfirmedUnknown(e, 'halfLife')) out.push('enter the kinetics, or “Confirm as unknown”');
    if (e.kinetics.mode === 'zero-order' && !hasTypical(e.kinetics.zeroOrderRateMgPerKgPerHour) && !isConfirmedUnknown(e, 'halfLife'))
      out.push('enter the zero-order rate, or “Confirm as unknown”');
  }
  return out;
}

/** Next section after `from` (in order) that is unreviewed or has errors; null if none. */
export function nextIncomplete(e: Entry, errors: Issue[], from: Section | null): Section | null {
  const ss = sectionsOf(e);
  const start = from ? ss.indexOf(from) + 1 : 0;
  return ss.slice(start).find((s) => !isReviewed(e, s) || sectionIssues(errors, e, s).length > 0) ?? null;
}
