import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyCompound, emptyProduct, serializeLibrary } from '../src/schema';
import type { Compound, Library, Product } from '../src/types';
import { validateLibrary } from '../src/validate';
import { buildInitialLibrary } from './init-lib';
import { EXPECTED_INHIBITOR_RESETS, INHIBITOR_RESET_NOTE, InhibitorResetMismatch, migrateLibraryV21, renderV21Report } from './migrate-v21-lib';
import { replacementsFor } from './product-rules';

/** A schema-2 entry as migrate-v2 left it: no clinicalRelevance, reviewedDates or relevance section. */
function v2Compound(id: string, extra: Partial<Compound> = {}): Compound {
  const { clinicalRelevance: _r, reviewedDates: _d, ...c } = { ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)), ...extra };
  return c as Compound;
}
function v2Product(id: string, compound: string, route: string, extra: Partial<Product> = {}): Product {
  const { reviewedDates: _d, ...p } = { ...emptyProduct(id, `${compound} (${route})`, compound, route, 'opioids'), ...extra };
  return p as Product;
}
const cyp = (inhibitor: 'none' | 'weak', inhibitionType: 'none' | 'reversible' = 'none') =>
  ({ substrate: 'yes' as const, halfLifeMultiplier: null, inhibitor, inhibitionType });

const fixture = () => ({
  schemaVersion: 2,
  categories: [{ id: 'opioids', name: 'Opioids', order: 1 }, { id: 'sedatives', name: 'Sedatives', order: 2 }],
  compounds: [
    v2Compound('codeine', { cyp2d6: cyp('none'), sourceNotes: { cyp2d6: '[checked] CPIC substrate. Inhibition not assessed.' }, provenance: { cyp2d6: 'checked' } }),
    v2Compound('tramadol', { cyp2d6: cyp('none'), sourceNotes: { cyp2d6: '[checked] Substrate; inhibitor status pending review.' } }),
    // "none" with a note that doesn't say "not assessed": left alone.
    v2Compound('morphine', { isMetabolite: true, formedFrom: [{ compound: 'codeine', fraction: 0.075, cyp2d6Multiplier: null }], cyp2d6: cyp('none'), sourceNotes: { cyp2d6: '[checked] Not a CYP2D6 inhibitor. Not assessed as substrate.' } }),
    // Note says not assessed, but the inhibitor isn't "none": left alone.
    v2Compound('paroxetine', { cyp2d6: cyp('weak', 'reversible'), sourceNotes: { cyp2d6: '[recall] Inhibition type not established.' } }),
    v2Compound('morphine_3_glucuronide', { isMetabolite: true, formedFrom: [{ compound: 'morphine', fraction: 0.5, cyp2d6Multiplier: null }] }),
    v2Compound('baclofen'),
  ],
  products: [
    v2Product('codeine_oral', 'codeine', 'Oral'),
    v2Product('tramadol_oral', 'tramadol', 'Oral'),
    v2Product('morphine_oral_ir', 'morphine', 'Oral', { formulation: 'IR' }),
    v2Product('paroxetine_oral', 'paroxetine', 'Oral'),
    v2Product('baclofen_oral', 'baclofen', 'Oral', { category: 'sedatives', sourceNotes: { input: '[gap] Generic route.' } }),
    v2Product('baclofen_intrathecal', 'baclofen', 'Intrathecal', { category: 'sedatives', doseUnit: 'µg' }),
  ],
});

describe('migrate-v2.1', () => {
  const { lib, report, skipped } = migrateLibraryV21(fixture(), { expectedInhibitorResets: ['codeine', 'tramadol'] });
  const c = (id: string) => lib.compounds.find((x) => x.id === id)!;
  const p = (id: string) => lib.products.find((x) => x.id === id);

  it('produces a valid 2.1 library', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2.1);
    expect(validateLibrary(lib).errors).toEqual([]);
  });

  it('adds clinicalRelevance: active for parents and dosed metabolites, unknown otherwise', () => {
    expect(c('codeine').clinicalRelevance).toBe('active');
    expect(c('morphine').clinicalRelevance).toBe('active'); // metabolite, but morphine_oral_ir doses it
    expect(c('morphine_3_glucuronide').clinicalRelevance).toBe('unknown');
    expect(report.relevance).toEqual({
      parents: ['codeine', 'tramadol', 'paroxetine', 'baclofen'],
      dosedMetabolites: ['morphine'],
      unknown: ['morphine_3_glucuronide'],
    });
    for (const x of lib.compounds) {
      expect(x.provenance.relevance).toBeNull();
      expect(x.sourceNotes.relevance).toBe('');
      expect(x.reviewedDates).toEqual({});
    }
    for (const x of lib.products) expect(x.reviewedDates).toEqual({});
  });

  it('resets never-assessed CYP2D6 inhibitor status and notes it', () => {
    expect(c('codeine').cyp2d6).toMatchObject({ inhibitor: 'unassessed', inhibitionType: 'unassessed' });
    expect(c('codeine').sourceNotes.cyp2d6).toBe(`[checked] CPIC substrate. Inhibition not assessed. ${INHIBITOR_RESET_NOTE}`);
    expect(c('codeine').provenance.cyp2d6).toBe('checked');
    expect(c('tramadol').cyp2d6.inhibitor).toBe('unassessed');
    expect(c('morphine').cyp2d6.inhibitor).toBe('none');
    expect(c('paroxetine').cyp2d6).toMatchObject({ inhibitor: 'weak', inhibitionType: 'reversible' });
    expect(report.inhibitorReset.map((x) => x.id)).toEqual(['codeine', 'tramadol']);
  });

  it('stops without changing anything when the reset hits differ from the expected list', () => {
    const input = fixture();
    const before = JSON.stringify(input);
    let err: unknown;
    try {
      migrateLibraryV21(input, { expectedInhibitorResets: ['codeine', 'oxycodone'] });
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InhibitorResetMismatch);
    expect((err as InhibitorResetMismatch).unexpected).toEqual(['tramadol']);
    expect((err as InhibitorResetMismatch).missing).toEqual(['oxycodone']);
    expect((err as Error).message).toMatch(/nothing was changed/);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('removes intrathecal baclofen, notes it on oral baclofen and maps old sessions to it', () => {
    expect(p('baclofen_intrathecal')).toBeUndefined();
    expect(p('baclofen_oral')!.sourceNotes.input).toBe('[gap] Generic route. Intrathecal baclofen not modelled (pump/CSF kinetics). Abrupt intrathecal withdrawal is a separate clinical risk.');
    expect(report.productChanges).toEqual([{ kind: 'removed', oldId: 'baclofen_intrathecal', newIds: ['baclofen_oral'] }]);
    expect(replacementsFor('baclofen_intrathecal', lib)).toEqual(['baclofen_oral']);
  });

  it('is a no-op when run twice', () => {
    const again = migrateLibraryV21(JSON.parse(serializeLibrary(lib)), { expectedInhibitorResets: ['codeine', 'tramadol'] });
    expect(again.skipped).toBe(true);
    expect(serializeLibrary(again.lib)).toBe(serializeLibrary(lib));
  });

  it('refuses a v1 file', () => {
    const v1 = { ...fixture() } as Record<string, unknown>;
    delete v1.schemaVersion;
    expect(() => migrateLibraryV21(v1, { expectedInhibitorResets: null })).toThrow(/migrate-v2 first/);
  });

  it('writes a report listing every change', () => {
    const md = renderV21Report(report, '2026-10-20', 'backups/drugs.v2-backup.json');
    expect(md).toMatch(/backups\/drugs\.v2-backup\.json/);
    expect(md).toMatch(/\| `codeine` \| none → unassessed \| none → unassessed \|/);
    expect(md).toMatch(/`baclofen_intrathecal` removed/);
    expect(md).toMatch(/Metabolites set to <code>unknown<\/code> \(1\)/);
  });

  it('expects the nine compounds named in the spec', () => {
    expect(EXPECTED_INHIBITOR_RESETS).toEqual([
      'buprenorphine', 'codeine', 'dextromethorphan', 'hydrocodone', 'loperamide', 'norbuprenorphine', 'oxycodone', 'tapentadol', 'tramadol',
    ]);
  });
});

describe('init-data emits 2.1', () => {
  const lib: Library = buildInitialLibrary(JSON.parse(readFileSync(new URL('./candidates.json', import.meta.url), 'utf8')));

  it('is a valid 2.1 library with relevance assigned and the 2.1 removals applied', () => {
    expect(lib.schemaVersion).toBe(2.1);
    expect(validateLibrary(lib).errors).toEqual([]);
    expect(lib.products.some((p) => p.id === 'baclofen_intrathecal')).toBe(false);
    expect(lib.products.some((p) => p.id === 'baclofen_oral')).toBe(true);
    const parents = lib.compounds.filter((c) => !c.isMetabolite);
    expect(parents.every((c) => c.clinicalRelevance === 'active')).toBe(true);
    expect(lib.compounds.find((c) => c.id === 'morphine')!.clinicalRelevance).toBe('active');
    expect(lib.compounds.find((c) => c.id === 'morphine_3_glucuronide')!.clinicalRelevance).toBe('unknown');
  });
});
