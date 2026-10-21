import { describe, expect, it } from 'vitest';
import { emptyCompound, emptyProduct } from '../src/schema';
import type { Compound } from '../src/types';
import { validateLibrary } from '../src/validate';
import { migrateLibraryV23 } from './migrate-v23-lib';

const v22Compound = (id: string): Compound => {
  const { identity: _i, ...c } = { ...emptyCompound(id, id), clinicalRelevance: 'active' as const };
  return c as Compound;
};
const fixture = () => ({
  schemaVersion: 2.2,
  categories: [{ id: 'x', name: 'X', order: 1 }],
  compounds: [v22Compound('methadone'), v22Compound('kavalactones')],
  products: [emptyProduct('methadone_oral', 'Methadone (Oral)', 'methadone', 'Oral', 'x')],
});

describe('migrate-v2.3', () => {
  const { lib, report, skipped } = migrateLibraryV23(fixture());

  it('adds identity: null to every compound and produces a valid 2.3 library', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2.3);
    expect(lib.compounds.map((c) => c.identity)).toEqual([null, null]);
    expect(report).toEqual({ compounds: 2, identityAdded: 2 });
    expect(validateLibrary(lib).errors).toEqual([]);
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
