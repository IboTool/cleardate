import { describe, expect, it } from 'vitest';
import { emptyCompound, emptyProduct } from '../src/schema';
import type { Compound } from '../src/types';
import { validateLibrary } from '../src/validate';
import { migrateLibraryV24 } from './migrate-v24-lib';

const v23Compound = (id: string, patch: Partial<Compound['cyp2d6']> = {}): Compound => {
  const c = { ...emptyCompound(id, id), clinicalRelevance: 'active' as const };
  const { strengthEvidence: _s, ...cyp } = { ...c.cyp2d6, ...patch };
  return { ...c, cyp2d6: cyp, lingeringEffects: { durationDays: 14, note: 'MAO resynthesis' } } as Compound;
};
const fixture = () => ({
  schemaVersion: 2.3,
  categories: [{ id: 'x', name: 'X', order: 1 }],
  compounds: [v23Compound('phenelzine'), v23Compound('paroxetine', { inhibitor: 'strong', inhibitionType: 'mechanism-based' })],
  products: [emptyProduct('phenelzine_oral', 'Phenelzine (Oral)', 'phenelzine', 'Oral', 'x')],
});

describe('migrate-v2.4', () => {
  const { lib, report, skipped } = migrateLibraryV24(fixture());

  it('adds origin "clearance" and empty strength evidence, keeping values, and produces a valid 2.4 library', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2.4);
    expect(lib.compounds[0].lingeringEffects).toEqual({ durationDays: 14, origin: 'clearance', note: 'MAO resynthesis' });
    expect(lib.compounds[1].cyp2d6.strengthEvidence).toEqual({ basis: null, probe: null, regimen: null, aucRatio: null, citation: null });
    expect(report).toEqual({ compounds: 2, originAdded: 2, strengthEvidenceAdded: 2, tieredWithoutBasis: ['paroxetine'] });
    const v = validateLibrary(lib);
    expect(v.errors).toEqual([]);
    expect(v.warnings.map((w) => `${w.id}: ${w.message}`)).toContain('paroxetine: cyp2d6.inhibitor is strong but no strength basis is recorded');
  });

  it('is idempotent', () => {
    const again = migrateLibraryV24(lib);
    expect(again.skipped).toBe(true);
    expect(again.lib).toBe(lib);
  });

  it('refuses anything that is not 2.3', () => {
    expect(() => migrateLibraryV24({ ...fixture(), schemaVersion: 2.2 })).toThrow(/expected a schemaVersion 2\.3 library/);
  });
});
