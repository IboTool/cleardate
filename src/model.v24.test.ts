// Schema 2.4: lingering-effects origin (label washouts count from the last dose) and CYP2D6 strength basis.
import { describe, expect, it } from 'vitest';
import { assumptionLines } from './export';
import { buildIndex, computeScenario, DAY, HOUR, toLocalInput, type Scenario } from './model';
import { aucrTier, emptyCompound, emptyProduct, SCHEMA_VERSION, strengthEvidenceText, strengthLabel } from './schema';
import { emptySession } from './state';
import type { Compound, Library, LingeringOrigin } from './types';

const T0 = new Date('2026-01-01T08:00').getTime();

function compound(id: string, hl: number, extra: Partial<Compound> = {}): Compound {
  return {
    ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)),
    clinicalRelevance: 'active',
    kinetics: { mode: 'intrinsic', halfLifeHours: { typical: hl, min: hl, max: hl, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: null },
    ...extra,
  };
}
const lib = (c: Compound): Library => ({
  schemaVersion: SCHEMA_VERSION, categories: [{ id: 'x', name: 'X', order: 1 }], compounds: [c],
  products: [emptyProduct(`${c.id}_oral`, `${c.name} (Oral)`, c.id, 'Oral', 'x')],
});
function run(c: Compound, hours: number[]): Scenario {
  const s = emptySession();
  s.doses = hours.map((h, i) => ({ id: String(i), productId: `${c.id}_oral`, amount: 10, unit: 'mg', kind: 'single', time: toLocalInput(T0 + h * HOUR) }));
  return computeScenario(buildIndex(lib(c)), s, T0);
}
const maoi = (hl: number, origin: LingeringOrigin, days = 14) =>
  compound('phenelzine', hl, { lingeringEffects: { durationDays: days, origin, note: 'Label: 14 days after discontinuation.' } });
const clearAt = (scn: Scenario) => scn.products[0].curves[0].clearAt!;

describe('lingering-effects origin', () => {
  it('"clearance" adds the duration after the clear date (unchanged behaviour)', () => {
    const scn = run(maoi(12, 'clearance'), [0]);
    expect(scn.lingering).toEqual([expect.objectContaining({ start: clearAt(scn), end: clearAt(scn) + 14 * DAY, origin: 'clearance', days: 14 })]);
  });

  it('"last-dose" runs from clearance to last dose + duration, never adding days after clearance', () => {
    const scn = run(maoi(12, 'last-dose'), [0]);
    expect(clearAt(scn)).toBeLessThan(T0 + 14 * DAY);
    expect(scn.lingering).toEqual([expect.objectContaining({ start: clearAt(scn), end: T0 + 14 * DAY, origin: 'last-dose', days: 14 })]);
  });

  it('"last-dose" draws nothing when the washout ends before the drug clears', () => {
    const scn = run(maoi(100, 'last-dose'), [0]);
    expect(clearAt(scn)).toBeGreaterThan(T0 + 14 * DAY);
    expect(scn.lingering).toEqual([]);
  });

  it('"last-dose" counts from the last of repeated doses', () => {
    const scn = run(maoi(12, 'last-dose'), [0, 48]);
    expect(scn.lingering[0].end).toBe(T0 + 48 * HOUR + 14 * DAY);
  });

  it('the export lists the washout with its end date', () => {
    const scn = run(maoi(12, 'last-dose'), [0]);
    const lines = assumptionLines(scn, emptySession().settings)[0].lines.join('\n');
    expect(lines).toMatch(/Lingering effect of Phenelzine: 14 days after the last dose \(label washout\), until .+; not part of the clear date\./);
  });
});

describe('CYP2D6 strength basis', () => {
  const ev = { basis: 'model-estimate' as const, probe: 'desipramine', regimen: 'bupropion 150 mg twice daily', aucRatio: 4.58, citation: 'https://www.mdpi.com/1999-4923/10/1/1/pdf' };

  it('shows model-derived tiers as "predicted"', () => {
    expect(strengthLabel({ inhibitor: 'moderate', strengthEvidence: ev })).toBe('predicted moderate');
    expect(strengthLabel({ inhibitor: 'moderate', strengthEvidence: { ...ev, basis: 'clinical-aucr' } })).toBe('moderate');
    expect(strengthLabel({ inhibitor: 'unassessed', strengthEvidence: ev })).toBe('unassessed');
    expect(strengthLabel({ inhibitor: 'strong', strengthEvidence: undefined })).toBe('strong');
  });

  it('maps AUC ratios to FDA tiers, with 2.00 exactly moderate', () => {
    expect([1.2, 1.25, 1.65, 1.99, 2, 4.58, 5, 13.64].map(aucrTier)).toEqual(['none', 'weak', 'weak', 'weak', 'moderate', 'moderate', 'strong', 'strong']);
  });

  it('describes the evidence in one line', () => {
    expect(strengthEvidenceText(ev)).toBe('model prediction: desipramine AUC ×4.58, bupropion 150 mg twice daily');
    expect(strengthEvidenceText({ ...ev, basis: 'fda-category', probe: null, aucRatio: null, regimen: null })).toBe('FDA category');
    expect(strengthEvidenceText(null)).toBe('');
  });

  it('carries the label onto the CYP2D6 track intervals', () => {
    const inh = compound('hydroxybupropion', 20, { cyp2d6: { substrate: 'unassessed', halfLifeMultiplier: null, inhibitor: 'moderate', inhibitionType: 'reversible', strengthEvidence: ev } });
    const scn = run(inh, [0]);
    expect(scn.cyp[0]).toMatchObject({ strength: 'moderate', label: 'predicted moderate', strengthUnassessed: false });
  });
});
