import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emptyCompound, emptyProduct, serializeLibrary } from '../src/schema';
import type { Compound, Library, Product } from '../src/types';
import { validateLibrary } from '../src/validate';
import { buildInitialLibrary } from './init-lib';
import { MigrationStop, migrateLibraryV22, NITROUS_REASON, renderV22Report } from './migrate-v22-lib';

const compound = (id: string, extra: Partial<Compound> = {}): Compound => ({
  ...emptyCompound(id, id), clinicalRelevance: extra.isMetabolite ? 'unknown' : 'active', ...extra,
});
const metabolite = (id: string, from: string, extra: Partial<Compound> = {}) =>
  compound(id, { isMetabolite: true, formedFrom: [{ compound: from, fraction: null, cyp2d6Multiplier: null }], ...extra });
const product = (id: string, c: string, route = 'Oral', extra: Partial<Product> = {}): Product => ({
  ...emptyProduct(id, `${c} (${route})`, c, route, 'x'), sourceNotes: { input: '[gap] Generic route.' }, provenance: { input: 'gap' }, ...extra,
});

/** A schema-2.1 library with every entry the migration touches. */
const fixture = () => ({
  schemaVersion: 2.1,
  categories: [{ id: 'x', name: 'X', order: 1 }],
  compounds: [
    compound('psilocybin'), metabolite('psilocin', 'psilocybin'),
    compound('1p_lsd'), metabolite('lsd', '1p_lsd'),
    compound('clorazepate'), metabolite('nordiazepam', 'clorazepate'),
    compound('gbl'), metabolite('ghb', 'gbl'),
    compound('ethanol', { sourceNotes: { halfLife: '[estimate] Elimination near 9 mg/dL/h.' }, provenance: { halfLife: 'estimate' } }),
    metabolite('acetaldehyde', 'ethanol'),
    compound('nitrous_oxide'), compound('5_htp'), compound('l_tryptophan'),
    compound('dmt'), metabolite('indole_3_acetic_acid', 'dmt', { provenance: { relevance: 'checked' } }),
    compound('cocaine'), metabolite('cocaethylene', 'cocaine'),
    compound('methylphenidate'), metabolite('ethylphenidate', 'methylphenidate'),
  ],
  products: [
    product('psilocybin_oral', 'psilocybin'), product('1p_lsd_oral', '1p_lsd'), product('clorazepate_oral', 'clorazepate'), product('gbl_oral', 'gbl'),
    product('ethanol_oral', 'ethanol'), product('nitrous_oxide_inhaled', 'nitrous_oxide', 'Inhaled'),
    product('5_htp_oral', '5_htp'), product('l_tryptophan_oral', 'l_tryptophan'), product('dmt_inhaled', 'dmt', 'Inhaled'),
    product('cocaine_intranasal', 'cocaine', 'Intranasal'), product('methylphenidate_oral_ir', 'methylphenidate'),
  ],
});

describe('migrate-v2.2', () => {
  const { lib, report, skipped } = migrateLibraryV22(fixture());
  const c = (id: string) => lib.compounds.find((x) => x.id === id)!;
  const p = (id: string) => lib.products.find((x) => x.id === id)!;

  it('produces a valid 2.2 library', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2.2);
    expect(validateLibrary(lib).errors).toEqual([]);
  });

  it('matches the expected snapshot', () => {
    expect(serializeLibrary(lib)).toMatchSnapshot();
  });

  it('models prodrugs as their active compound with a mass factor', () => {
    expect(p('psilocybin_oral').components).toEqual([{ compound: 'psilocin', ratio: 1, saltFactor: null, bioavailability: null, administeredAs: 'psilocybin', massFactor: 0.7186 }]);
    expect(p('1p_lsd_oral')).toMatchObject({ doseUnit: 'µg', typicalDose: { unit: 'µg' } });
    expect(p('gbl_oral').components[0]).toMatchObject({ compound: 'ghb', massFactor: 1.2092 });
    expect(p('clorazepate_oral').sourceNotes.conversion).toMatch(/dipotassium — reviewer to confirm/);
    expect(p('psilocybin_oral').provenance).toMatchObject({ components: 'estimate', conversion: 'estimate' });
    expect(p('psilocybin_oral').sourceNotes.conversion).toMatch(/^\[estimate\] Supplement B Part 4:/);
  });

  it('makes ethanol zero-order (rate unknown) and its products standard drinks', () => {
    expect(c('ethanol').kinetics).toMatchObject({ mode: 'zero-order', zeroOrderRateMgPerKgPerHour: { typical: null, min: null, max: null } });
    expect(c('ethanol').sourceNotes.halfLife).toMatch(/^\[estimate\] Elimination near 9 mg\/dL\/h\. \[estimate\] Supplement B Part 4: kinetics mode set to zero-order/);
    expect(p('ethanol_oral')).toMatchObject({ doseUnit: 'standard drinks', provenance: { input: 'estimate' } });
  });

  it('marks nitrous oxide, 5-HTP and L-tryptophan not modelled, and nitrous products as exposure sessions', () => {
    expect(c('nitrous_oxide').kinetics).toMatchObject({ mode: 'not-modelled', notModelledReason: NITROUS_REASON });
    expect(c('5_htp').kinetics.notModelledReason).toMatch(/Endogenous serotonin precursor/);
    expect(p('nitrous_oxide_inhaled')).toMatchObject({ doseUnit: 'session', input: { type: 'zero-order' } });
    expect(p('5_htp_oral').doseUnit).toBe('mg');
  });

  it('marks indole-3-acetic acid endogenous and adds the alcohol conditions', () => {
    expect(c('indole_3_acetic_acid').endogenous).toBe(true);
    expect(c('indole_3_acetic_acid').provenance.relevance).toBe('checked');
    expect(c('cocaethylene').formedFrom[0].condition).toEqual({ requiresCompound: 'ethanol' });
    expect(c('ethylphenidate').formedFrom[0].condition).toEqual({ requiresCompound: 'ethanol' });
    expect(c('acetaldehyde').formedFrom[0].condition).toBeUndefined();
  });

  it('is a no-op when run twice', () => {
    const again = migrateLibraryV22(JSON.parse(serializeLibrary(lib)));
    expect(again.skipped).toBe(true);
    expect(serializeLibrary(again.lib)).toBe(serializeLibrary(lib));
  });

  it('stops without changing anything when an id is missing, already changed or reviewed', () => {
    const input = fixture();
    input.compounds = input.compounds.filter((x) => x.id !== 'ethylphenidate');
    input.products.find((x) => x.id === 'gbl_oral')!.components[0].compound = 'ghb';
    input.compounds.find((x) => x.id === 'nitrous_oxide')!.provenance = { halfLife: 'reviewer' };
    const before = JSON.stringify(input);
    let err: unknown;
    try {
      migrateLibraryV22(input);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(MigrationStop);
    const msg = (err as Error).message;
    expect(msg).toMatch(/nothing was changed/);
    expect(msg).toMatch(/compound "ethylphenidate" does not exist/);
    expect(msg).toMatch(/gbl_oral: expected a single component "gbl", found ghb — already changed\?/);
    expect(msg).toMatch(/nitrous_oxide: section "halfLife" is reviewer-confirmed/);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refuses a 2.0 file', () => {
    expect(() => migrateLibraryV22({ ...fixture(), schemaVersion: 2 })).toThrow(/migrate-v2\.1 first/);
  });

  it('writes a report with the status counts', () => {
    const md = renderV22Report(
      { ...report, status: { before: { ok: 1, incomplete: 2, 'no-data': 8, 'not-modelled': 0 }, after: { ok: 3, incomplete: 1, 'no-data': 4, 'not-modelled': 3 }, changed: [{ id: 'psilocybin_oral', before: 'no-data', after: 'ok' }] } },
      '2026-10-20', 'backups/drugs.v2.1-backup.json',
    );
    expect(md).toMatch(/backups\/drugs\.v2\.1-backup\.json/);
    expect(md).toMatch(/\| No data yet \| 8 \| 4 \|/);
    expect(md).toMatch(/\| `psilocybin_oral` \| no-data \| ok \|/);
    expect(md).toMatch(/\| `gbl_oral` \| `ghb` \| `gbl` \| 1\.2092 \| unchanged \|/);
  });
});

describe('init-data applies the 2.2 prodrug rules', () => {
  const lib: Library = buildInitialLibrary(JSON.parse(readFileSync(new URL('./candidates.json', import.meta.url), 'utf8')));
  it('models the four prodrug products as their active compound', () => {
    const comp = (id: string) => lib.products.find((p) => p.id === id)?.components[0];
    expect(comp('psilocybin_oral')).toMatchObject({ compound: 'psilocin', administeredAs: 'psilocybin', massFactor: 0.7186 });
    expect(comp('1p_lsd_oral')).toMatchObject({ compound: 'lsd', administeredAs: '1p_lsd', massFactor: 0.8522 });
    expect(comp('clorazepate_oral')).toMatchObject({ compound: 'nordiazepam', massFactor: 0.662 });
    expect(comp('gbl_oral')).toMatchObject({ compound: 'ghb', massFactor: 1.2092 });
    expect(lib.products.find((p) => p.id === '1p_lsd_oral')!.doseUnit).toBe('µg');
  });
});
