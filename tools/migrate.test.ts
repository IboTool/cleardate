import { describe, expect, it } from 'vitest';
import { serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';
import { migrateLibrary, parseProductSource, parseTag } from './migrate-lib';
import { migrateLibraryV21 } from './migrate-v21-lib';
import { replacementsFor } from './product-rules';

const hl = (typical: number, min = typical, max = typical) => ({ typical, min, max });
const v1Compound = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, aliases: [], isMetabolite: false, formedFrom: [], molecularWeight: 0, halfLifeHours: hl(0),
  cyp2d6: { substrate: false, halfLifeMultiplier: { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 }, inhibitor: 'none', inhibitionType: 'none' },
  qt: { tier: 'none', weight: 0 }, receptors: [], lingeringEffects: { durationDays: 0, note: '' },
  nonlinearKinetics: { flag: false, note: '' }, source: '', sourceNotes: {}, verified: false, verifiedDate: '',
  ...extra,
});
const v1Product = (id: string, parent: string, route: string, extra: Record<string, unknown> = {}) => ({
  id, name: `${parent[0].toUpperCase()}${parent.slice(1)} (${route})`, aliases: [], category: 'opioids', class: '',
  parentCompound: parent, route, typicalDoseMg: 0, source: '', verified: false, verifiedDate: '', ...extra,
});

const fixture = () => ({
  categories: [{ id: 'opioids', name: 'Opioids', order: 1 }, { id: 'antidepressants', name: 'Antidepressants', order: 2 }, { id: 'psychedelics_dissociatives', name: 'Psychedelics', order: 3 }],
  compounds: [
    v1Compound('morphine', 'Morphine', {
      halfLifeHours: hl(2, 2, 15), molecularWeight: 285.34, receptors: [{ target: 'mu-opioid receptor', action: 'agonist' }],
      sourceNotes: {
        halfLife: '[checked] DailyMed 12.3.',
        qt: '[recall — check CredibleMeds] none listed.',
        cyp2d6: '[gap] not established.',
        receptors: '[recall] IUPHAR.',
      },
    }),
    v1Compound('codeine', 'Codeine', { halfLifeHours: hl(3), cyp2d6: { substrate: true, halfLifeMultiplier: { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 }, inhibitor: 'none', inhibitionType: 'none' }, sourceNotes: { cyp2d6: '[checked] CPIC.' } }),
    v1Compound('morphine_3_glucuronide', 'Morphine-3-glucuronide', { isMetabolite: true, formedFrom: [{ compound: 'morphine', fraction: 0.5 }], sourceNotes: { halfLife: '[gap] none.' } }),
    v1Compound('normorphine', 'Normorphine', { isMetabolite: true, formedFrom: [{ compound: 'morphine', fraction: 0 }] }),
    v1Compound('buprenorphine', 'Buprenorphine', { aliases: ['Subutex', 'Suboxone'], halfLifeHours: hl(37, 24, 69) }),
    v1Compound('naloxone', 'Naloxone', { halfLifeHours: hl(1.5) }),
    v1Compound('fentanyl', 'Fentanyl', { halfLifeHours: hl(7) }),
    v1Compound('dextromethorphan', 'Dextromethorphan', { halfLifeHours: hl(3) }),
  ],
  products: [
    v1Product('morphine_oral_ir_er', 'morphine', 'Oral IR/ER', {
      source: 'DRAFT — AI-prepopulated, unverified. https://example.org/label [recall] class: opioid agonist. [gap] typicalDose: Reviewer to set. [checked] aliases: copied. [gap] apparentHalfLife: combined route.',
      class: 'opioid agonist',
    }),
    v1Product('buprenorphine_sc_depot_sublocade_brixadi', 'buprenorphine', 'SC depot (Sublocade, Brixadi)', {
      aliases: ['Sublocade', 'Brixadi', 'Suboxone'], source: 'DRAFT — x [gap] apparentHalfLife: Sublocade 43-60 days; Brixadi weekly 3-5 days.',
    }),
    v1Product('buprenorphine_sublingual', 'buprenorphine', 'Sublingual', { aliases: ['Subutex', 'Suboxone'], typicalDoseMg: 16 }),
    v1Product('naloxone_sl_with_buprenorphine', 'naloxone', 'SL (with buprenorphine)'),
    v1Product('fentanyl_transdermal', 'fentanyl', 'Transdermal', { apparentHalfLifeHours: hl(23.5) }),
    v1Product('buprenorphine_transdermal', 'buprenorphine', 'Transdermal', { apparentHalfLifeHours: hl(26) }),
    v1Product('dextromethorphan_oral', 'dextromethorphan', 'Oral'),
  ],
});

describe('migration helpers', () => {
  it('reads leading provenance tags, including annotated ones', () => {
    expect(parseTag('[checked] x')).toBe('checked');
    expect(parseTag('[recall — check CredibleMeds] x')).toBe('recall');
    expect(parseTag('no tag [gap] later')).toBeNull();
    expect(parseTag('')).toBeNull();
  });

  it('splits tagged product source segments into notes', () => {
    const r = parseProductSource('DRAFT — lead https://a.b [recall] class: c1. [gap] apparentHalfLife: none.');
    expect(r.lead).toBe('DRAFT — lead https://a.b');
    expect(r.notes).toEqual({ class: '[recall] c1.', input: '[gap] none.' });
    expect(r.provenance).toEqual({ class: 'recall', input: 'gap' });
  });
});

describe('migrate-v2', () => {
  const { lib, report, skipped } = migrateLibrary(fixture());
  const c = (id: string) => lib.compounds.find((x) => x.id === id)!;
  const p = (id: string) => lib.products.find((x) => x.id === id);

  it('produces a v2 library that is valid once migrate-v2.1 has run', () => {
    expect(skipped).toBe(false);
    expect(lib.schemaVersion).toBe(2);
    const next = migrateLibraryV21(JSON.parse(serializeLibrary(lib)), { expectedInhibitorResets: null });
    expect(next.lib.schemaVersion).toBe(2.1);
    expect(validateLibrary(next.lib).errors.filter((e) => !/^(schemaVersion must be|identity missing|cyp2d6\.strengthEvidence missing|lingeringEffects\.origin missing)/.test(e.message))).toEqual([]);
  });

  it('migrates compound kinetics, nulls and provenance', () => {
    const m = c('morphine');
    expect(m.kinetics).toEqual({ mode: 'intrinsic', halfLifeHours: { typical: 2, min: 2, max: 15, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: null });
    expect(c('naloxone').kinetics.halfLifeHours?.rangeType).toBe('single-value');
    expect(m.provenance).toMatchObject({ halfLife: 'checked', qt: 'recall', cyp2d6: 'gap', receptors: 'recall', metabolism: null });
    expect(m.sourceNotes.halfLife).toBe('[checked] DailyMed 12.3.');
    expect(m.molecularWeight).toBe(285.34);
    expect(c('normorphine').molecularWeight).toBeNull();
    expect(c('normorphine').formedFrom).toEqual([{ compound: 'morphine', fraction: null, cyp2d6Multiplier: null }]);
    expect(c('normorphine').kinetics.mode).toBe('unknown');
    expect(m.lingeringEffects.durationDays).toBeNull();
    expect(m.qt).toEqual({ tier: 'none', weight: null, referenceAmountMg: null }); // recall section keeps "none"
    expect(m.cyp2d6).toEqual({ substrate: 'unassessed', halfLifeMultiplier: null, inhibitor: 'unassessed', inhibitionType: 'unassessed' }); // gap
    expect(c('codeine').cyp2d6.substrate).toBe('yes');
    expect(c('codeine').cyp2d6.inhibitor).toBe('none'); // checked section keeps "none"
    expect(c('naloxone').qt.tier).toBe('unassessed'); // untagged → unassessed
    expect(c('naloxone').nonlinearKinetics.flag).toBe('unassessed');
    expect(m.receptorsAssessed).toBe(true);
    expect(c('naloxone').receptorsAssessed).toBe(false);
  });

  it('marks conjugates formation-limited and reports them', () => {
    const g = c('morphine_3_glucuronide');
    expect(g.kinetics.mode).toBe('formation-limited');
    expect(g.provenance.halfLife).toBe('estimate');
    expect(g.sourceNotes.halfLife).toMatch(/^\[gap\] none\. Auto-assigned by migration/);
    expect(report.formationLimited).toEqual(['morphine_3_glucuronide']);
  });

  it('splits release forms and depots, and builds the combination product', () => {
    expect(p('morphine_oral_ir_er')).toBeUndefined();
    expect(p('morphine_oral_ir')).toMatchObject({ route: 'Oral', formulation: 'IR', input: { type: 'bolus' }, candidateId: 'morphine', class: 'opioid agonist' });
    expect(p('morphine_oral_er')).toMatchObject({ formulation: 'ER', input: { type: 'first-order-release', releaseHalfLifeHours: null } });
    expect(p('morphine_oral_er')!.sourceNotes.input).toMatch(/Split from morphine_oral_ir_er by migration\./);
    expect(p('morphine_oral_ir')!.provenance).toMatchObject({ class: 'recall', typicalDose: 'gap', aliases: 'checked', input: 'gap' });
    expect(p('morphine_oral_ir')!.source).toBe('DRAFT — AI-prepopulated, unverified. https://example.org/label');

    expect(p('buprenorphine_sc_depot_sublocade')).toMatchObject({ aliases: ['Sublocade'], formulation: 'depot', input: { type: 'first-order-release' } });
    expect(p('buprenorphine_sc_depot_brixadi_weekly')!.sourceNotes.input).toMatch(/Sublocade 43-60 days/);
    expect(p('buprenorphine_sc_depot_brixadi_monthly')).toBeDefined();

    expect(p('naloxone_sl_with_buprenorphine')).toBeUndefined();
    expect(p('buprenorphine_naloxone_sublingual')!.components).toEqual([
      { compound: 'buprenorphine', ratio: 1, saltFactor: null, bioavailability: null },
      { compound: 'naloxone', ratio: 0.25, saltFactor: null, bioavailability: null },
    ]);
    expect(c('buprenorphine').aliases).toEqual(['Subutex']);
    expect(p('buprenorphine_sublingual')!.aliases).toEqual(['Subutex']);
    expect(p('buprenorphine_sublingual')!.typicalDose).toEqual({ amount: 16, unit: 'mg', basis: 'maintenance' });
    expect(p('dextromethorphan_oral')!.secondaryCategories).toEqual(['psychedelics_dissociatives']);
  });

  it('converts a patch apparent half-life only when it is well above the intrinsic one', () => {
    const f = p('fentanyl_transdermal')!;
    expect(f).toMatchObject({ doseUnit: 'µg/h', formulation: 'patch', input: { type: 'zero-order', defaultDurationHours: 72 } });
    expect(f.input.releaseHalfLifeHours).toEqual({ typical: 23.5, min: 23.5, max: 23.5, rangeType: 'single-value', cv: null });
    expect(f.provenance.input).toBe('estimate');
    const b = p('buprenorphine_transdermal')!;
    expect(b.input.releaseHalfLifeHours).toBeNull();
    expect(b.provenance.input).toBe('gap');
    expect(b.sourceNotes.input).toMatch(/v1 apparent half-life 26 h/);
    for (const x of lib.products) {
      expect(x).not.toHaveProperty('parentCompound');
      expect(x).not.toHaveProperty('typicalDoseMg');
      expect(x).not.toHaveProperty('apparentHalfLifeHours');
    }
  });

  it('matches the expected v2 snapshot', () => {
    expect(serializeLibrary(lib)).toMatchSnapshot();
  });

  it('is a no-op when run twice', () => {
    const again = migrateLibrary(JSON.parse(serializeLibrary(lib)));
    expect(again.skipped).toBe(true);
    expect(serializeLibrary(again.lib)).toBe(serializeLibrary(lib));
  });

  it('maps removed v1 product ids to their replacements', () => {
    expect(replacementsFor('morphine_oral_ir_er', lib)).toEqual(['morphine_oral_ir', 'morphine_oral_er']);
    expect(replacementsFor('naloxone_sl_with_buprenorphine', lib)).toEqual(['buprenorphine_naloxone_sublingual']);
    expect(replacementsFor('buprenorphine_sc_depot_sublocade_brixadi', lib)).toHaveLength(3);
  });
});
