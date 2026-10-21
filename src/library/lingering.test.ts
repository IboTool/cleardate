// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { buildIndex } from '../model';
import { emptyCompound, SCHEMA_VERSION } from '../schema';
import type { Compound, Library } from '../types';
import { LINGERING_CAVEAT, lingeringItems, lingeringPanel } from './lingering';

const compound = (id: string, extra: Partial<Compound> = {}): Compound => ({ ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)), ...extra });

function index() {
  const lib: Library = {
    schemaVersion: SCHEMA_VERSION,
    categories: [],
    compounds: [
      compound('selegiline', { lingeringEffects: { durationDays: 14, note: 'MAO-B resynthesis governs recovery.' } }),
      compound('desmethylselegiline', {
        isMetabolite: true, clinicalRelevance: 'active',
        formedFrom: [{ compound: 'selegiline', fraction: 0.5, cyp2d6Multiplier: null }],
        lingeringEffects: { durationDays: null, note: 'Irreversible MAO inhibition can outlast plasma drug.' },
      }),
      compound('paracetamol'),
    ],
    products: [],
  };
  return buildIndex(lib);
}

describe('lingering-effects panel', () => {
  it('renders for compounds with a note or duration, naming the parent of a metabolite', () => {
    const idx = index();
    const items = lingeringItems(idx, ['selegiline', 'desmethylselegiline'].map((id) => idx.compounds.get(id)!));
    expect(items.map((i) => i.id)).toEqual(['selegiline', 'desmethylselegiline']);
    const panel = lingeringPanel(items, 'selegiline')!;
    expect(panel).not.toBeNull();
    const text = panel.textContent!;
    expect(text).toContain('Lingering effects');
    expect(text).toContain('~14 days');
    expect(text).toContain('MAO-B resynthesis governs recovery.');
    expect(text).toContain('duration not quantified');
    expect(text).toContain('metabolite of Selegiline');
    expect(text).toContain(LINGERING_CAVEAT);
    expect(panel.querySelectorAll('.lib-linger-item')).toHaveLength(2);
  });

  it('is omitted when no compound has lingering effects', () => {
    const idx = index();
    const items = lingeringItems(idx, [idx.compounds.get('paracetamol')!]);
    expect(items).toEqual([]);
    expect(lingeringPanel(items)).toBeNull();
  });
});
