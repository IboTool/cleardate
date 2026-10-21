// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { emptyCompound } from '../schema';
import type { Compound } from '../types';
import { inhibitorText, strengthBasisNode } from './cyp';

const cyp = (patch: Partial<Compound['cyp2d6']>): Compound['cyp2d6'] => ({ ...emptyCompound('x', 'X').cyp2d6, ...patch });

describe('library CYP2D6 inhibitor rows', () => {
  it('shows the clinical basis with probe, ratio, regimen and a source link', () => {
    const x = cyp({
      inhibitor: 'moderate', inhibitionType: 'reversible',
      strengthEvidence: { basis: 'clinical-aucr', probe: 'desipramine', regimen: '20 mg/day for 21 days', aucRatio: 2, citation: 'https://dailymed.nlm.nih.gov/x' },
    });
    expect(inhibitorText(x)).toBe('moderate (reversible)');
    const node = strengthBasisNode(x)!;
    expect(node.textContent).toBe('clinical probe AUC ratio: desipramine AUC ×2.00, 20 mg/day for 21 days · source');
    expect(node.querySelector('a')!.getAttribute('href')).toBe('https://dailymed.nlm.nih.gov/x');
  });

  it('labels model-derived tiers "predicted"', () => {
    const x = cyp({ inhibitor: 'strong', inhibitionType: 'reversible', strengthEvidence: { basis: 'model-estimate', probe: null, regimen: null, aucRatio: 5.9, citation: 'Sager 2014' } });
    expect(inhibitorText(x)).toBe('predicted strong (reversible)');
    expect(strengthBasisNode(x)!.textContent).toBe('model prediction: AUC ×5.90 · Sager 2014');
  });

  it('omits the basis row when none is recorded', () => {
    expect(strengthBasisNode(cyp({ inhibitor: 'weak', inhibitionType: 'reversible' }))).toBeNull();
    expect(inhibitorText(cyp({ inhibitor: 'unassessed', inhibitionType: 'mechanism-based' }))).toMatch(/strength unassessed — treated as at least weak/);
  });
});
