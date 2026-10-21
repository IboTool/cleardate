import { describe, expect, it } from 'vitest';
import { canonicalLibrary, emptyCompound, emptyProduct, serializeLibrary } from './schema';
import type { Library } from './types';

describe('canonical serialisation', () => {
  it('sorts by id, orders keys and keeps unknown fields at every level', () => {
    const b = { ...emptyCompound('b_drug', 'B'), provenance: { halfLife: 'recall' } } as Record<string, unknown>;
    b.qt = { weight: 0.5, tier: 'possible', referenceAmountMg: 40 };
    b.formedFrom = [{ fraction: 0.3, compound: 'a_drug', cyp2d6Multiplier: null }];
    const lib = {
      schemaVersion: 2,
      products: [{ ...emptyProduct('b_drug_oral', 'B', 'b_drug', 'Oral', 'x'), input: { releaseHalfLifeHours: null } }],
      compounds: [b, emptyCompound('a_drug', 'A')],
      categories: [{ order: 1, name: 'X', id: 'x' }],
    } as unknown as Library;

    const out = canonicalLibrary(lib) as unknown as Record<string, any>;
    expect(Object.keys(out)).toEqual(['schemaVersion', 'categories', 'compounds', 'products']);
    expect(out.compounds.map((c: { id: string }) => c.id)).toEqual(['a_drug', 'b_drug']);
    expect(out.compounds[1].provenance).toEqual({ halfLife: 'recall' });
    expect(Object.keys(out.compounds[1].qt)).toEqual(['tier', 'weight', 'referenceAmountMg']);
    expect(Object.keys(out.compounds[1].formedFrom[0])).toEqual(['compound', 'fraction', 'cyp2d6Multiplier']);
    expect(out.products[0].input).toEqual({ releaseHalfLifeHours: null });
    expect(Object.keys(out.categories[0])).toEqual(['id', 'name', 'order']);

    const text = serializeLibrary(lib);
    expect(serializeLibrary(JSON.parse(text))).toBe(text);
  });
});
