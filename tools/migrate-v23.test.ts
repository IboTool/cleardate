import { describe, expect, it } from 'vitest';
import { emptyCompound, emptyProduct } from '../src/schema';
import type { Compound } from '../src/types';
import { validateLibrary } from '../src/validate';
import { migrateLibraryV23 } from './migrate-v23-lib';
import { migrateLibraryV24 } from './migrate-v24-lib';

const v22Compound = (id: string): Compound => {
  const { identity: _i, ...c } = { ...emptyCompound(id, id), clinicalRelevance: 'active' as const };
  const { strengthEvidence: _s, ...cyp } = c.cyp2d6;
  return { ...c, cyp2d6: cyp, lingeringEffects: { durationDays: null, note: '' } } as Compound;
};
const fixture = () => ({
  schemaVersion: 2.2,
  categories: [{ id: 'x', name: 'X', order: 1 }],
  compounds: [v22Compound('methadone'), v22Compound('kavalactones')],
  products: [emptyProduct('methadone_oral', 'Methadone (Oral)', 'methadone', 'Oral', 'x')],
});

describe('migrate-v2.3', () => {
  const { lib, report, skipped } = migrateLibraryV23(fixture());

  it('adds identity: null to every compound and produces a 2.3 library that is valid once migrate-v2.4 has run', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2.3);
    expect(lib.compounds.map((c) => c.identity)).toEqual([null, null]);
    expect(report).toEqual({ compounds: 2, identityAdded: 2 });
    expect(validateLibrary(migrateLibraryV24(lib).lib).errors).toEqual([]);
  });

  it('is idempotent and leaves existing identities alone', () => {
    const again = migrateLibraryV23(lib);
    expect(again.skipped).toBe(true);
    expect(again.lib).toBe(lib);
  });

  it('refuses anything that is not 2.2', () => {
    expect(() => migrateLibraryV23({ ...fixture(), schemaVersion: 2.1 })).toThrow(/expected a schemaVersion 2\.2 library/);
  });
});
