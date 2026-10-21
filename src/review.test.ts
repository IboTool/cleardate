import { describe, expect, it } from 'vitest';
import { confirmSection, flagSection, markNotApplicable, nextIncomplete, sectionIssues, unknownParts, verifyBlockers } from './review';
import { CONFIRMED_UNKNOWN_NOTE, emptyCompound, emptyProduct, isConfirmedUnknown, isFlagged, isReviewed, SCHEMA_VERSION } from './schema';
import type { Compound, Library } from './types';
import { validateLibrary } from './validate';

const D = '2026-10-20';
const intrinsic = (hl: number): Compound['kinetics'] => ({ mode: 'intrinsic', halfLifeHours: { typical: hl, min: null, max: null, rangeType: 'single-value', cv: null }, earlyPhase: null, steadyState: null });
const lib = (compounds: Compound[]): Library => ({ schemaVersion: SCHEMA_VERSION, categories: [{ id: 'x', name: 'X', order: 1 }], compounds, products: [] });

describe('review logic', () => {
  it('Confirm sets provenance reviewer and stamps the date without changing values', () => {
    const c = { ...emptyCompound('a', 'A'), kinetics: intrinsic(5), provenance: { halfLife: 'recall' as const } };
    const before = JSON.stringify(c.kinetics);
    expect(confirmSection(c, 'halfLife', D)).toBeNull();
    expect(c.provenance.halfLife).toBe('reviewer');
    expect(c.reviewedDates.halfLife).toBe(D);
    expect(JSON.stringify(c.kinetics)).toBe(before);
  });

  it('refuses plain Confirm on unknown values; "Confirm as unknown" keeps the nulls and notes it', () => {
    const c = emptyCompound('a', 'A');
    expect(unknownParts(c, 'halfLife')).toEqual(['kinetic mode']);
    expect(confirmSection(c, 'halfLife', D)).toMatch(/Confirm as unknown/);
    expect(isReviewed(c, 'halfLife')).toBe(false);
    expect(confirmSection(c, 'halfLife', D, true)).toBeNull();
    expect(c.kinetics.mode).toBe('unknown');
    expect(c.kinetics.halfLifeHours).toBeNull();
    expect(c.sourceNotes.halfLife).toContain(CONFIRMED_UNKNOWN_NOTE);
    expect(isConfirmedUnknown(c, 'halfLife')).toBe(true);
    // Once values are filled in, a plain Confirm drops the stale "confirmed unknown".
    c.kinetics = intrinsic(4);
    expect(confirmSection(c, 'halfLife', D)).toBeNull();
    expect(c.sourceNotes.halfLife).not.toContain(CONFIRMED_UNKNOWN_NOTE);
  });

  it('Flag keeps the section unreviewed and records the reason', () => {
    const c = { ...emptyCompound('a', 'A'), kinetics: intrinsic(5) };
    confirmSection(c, 'halfLife', D);
    flagSection(c, 'halfLife', 'label says 30 h, paper says 50 h');
    expect(isReviewed(c, 'halfLife')).toBe(false);
    expect(c.reviewedDates.halfLife).toBeUndefined();
    expect(isFlagged(c, 'halfLife')).toBe(true);
    expect(c.sourceNotes.halfLife).toBe('REVIEWER FLAG: label says 30 h, paper says 50 h');
  });

  it('N/A sets the empty value, reviewer provenance and the N/A note', () => {
    const c = emptyCompound('a', 'A');
    expect(markNotApplicable(c, 'lingeringEffects', D)).toBeNull();
    expect(c.lingeringEffects).toEqual({ durationDays: null, note: '' });
    expect(c.sourceNotes.lingeringEffects).toBe('N/A — reviewer');
    expect(isReviewed(c, 'lingeringEffects')).toBe(true);
    expect(markNotApplicable(c, 'halfLife', D)).toMatch(/can't be marked/);
  });

  it('Verify is blocked while any section is unreviewed; the validator errors on a verified entry with an unreviewed section', () => {
    const c = { ...emptyCompound('a', 'A'), kinetics: intrinsic(5), source: 'label' };
    for (const s of ['halfLife', 'metabolism', 'molecularWeight', 'identity', 'cyp2d6', 'qt', 'receptors', 'lingeringEffects'] as const)
      if (confirmSection(c, s, D)) confirmSection(c, s, D, true);
    expect(verifyBlockers(c, [])).toEqual(['review 1 section (Nonlinear kinetics)']);
    c.verified = true;
    c.verifiedDate = D;
    const errs = validateLibrary(lib([c])).errors;
    expect(errs.map((e) => e.message).join()).toMatch(/not reviewed: nonlinearKinetics/);
    expect(verifyBlockers(c, errs)).toEqual(['review 1 section (Nonlinear kinetics)']);
    confirmSection(c, 'nonlinearKinetics', D, true);
    expect(verifyBlockers(c, [])).toEqual([]);
    expect(validateLibrary(lib([c])).errors).toEqual([]);
  });

  it('maps validation issues to sections and finds the next incomplete one', () => {
    const c = { ...emptyCompound('a', 'A'), kinetics: intrinsic(5), molecularWeight: 0 };
    const errs = validateLibrary(lib([c])).errors;
    expect(sectionIssues(errs, c, 'molecularWeight').length).toBe(1);
    expect(sectionIssues(errs, c, 'halfLife')).toEqual([]);
    confirmSection(c, 'halfLife', D);
    expect(nextIncomplete(c, errs, null)).toBe('metabolism');
    confirmSection(c, 'metabolism', D);
    c.provenance.molecularWeight = 'reviewer';
    expect(nextIncomplete(c, errs, 'metabolism')).toBe('molecularWeight'); // reviewed but invalid
    expect(nextIncomplete(emptyProduct('p', 'P', 'a', 'Oral', 'x'), [], 'typicalDose')).toBeNull();
  });
});
