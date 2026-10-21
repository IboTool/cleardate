import { describe, expect, it } from 'vitest';
import { buildIndex, computeScenario, HOUR, toLocalInput, type Scenario } from './model';
import { valueAt } from './pk';
import { emptyCompound, emptyProduct, SCHEMA_VERSION } from './schema';
import { emptySession, normaliseSession } from './state';
import type { Compound, Library, Product, Session } from './types';

const T0 = new Date('2026-01-01T08:00').getTime();
const at = (h: number) => toLocalInput(T0 + h * HOUR);

function compound(id: string, hl: number | null, extra: Partial<Compound> = {}): Compound {
  return {
    ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)),
    kinetics: hl ? { mode: 'intrinsic', halfLifeHours: { typical: hl, min: hl, max: hl, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: null }
      : { mode: 'unknown', halfLifeHours: null, earlyPhase: null, steadyState: null },
    ...extra,
  };
}
const metabolite = (id: string, from: string, fraction: number | null, hl: number | null, extra: Partial<Compound> = {}) =>
  compound(id, hl, { isMetabolite: true, formedFrom: [{ compound: from, fraction, cyp2d6Multiplier: null }], ...extra });

function library(compounds: Compound[], products: Product[]): Library {
  return { schemaVersion: SCHEMA_VERSION, categories: [{ id: 'x', name: 'X', order: 1 }], compounds, products };
}

function run(lib: Library, doses: { productId: string; amount: number; h?: number }[], patch: (s: Session) => void = () => {}): Scenario {
  const s = emptySession();
  s.doses = doses.map((d, i) => ({ id: String(i), productId: d.productId, amount: d.amount, unit: 'mg', kind: 'single', time: at(d.h ?? 0) }));
  patch(s);
  return computeScenario(buildIndex(lib), s, T0);
}

const curve = (scn: Scenario, id: string, product?: string) =>
  scn.products.flatMap((p) => p.curves).find((c) => c.compound.id === id && (!product || c.productKey === product))!;

describe('combination products', () => {
  it('deliver amount × ratio × saltFactor × bioavailability to each component', () => {
    const p: Product = {
      ...emptyProduct('ab_sl', 'A/B (SL)', 'a', 'SL', 'x'),
      components: [
        { compound: 'a', ratio: 1, saltFactor: 0.9, bioavailability: 0.5 },
        { compound: 'b', ratio: 0.25, saltFactor: null, bioavailability: 0.1 },
      ],
    };
    const scn = run(library([compound('a', 30), compound('b', 2)], [p]), [{ productId: 'ab_sl', amount: 8 }]);
    expect(curve(scn, 'a').peak).toBeCloseTo(8 * 0.9 * 0.5, 6);
    expect(curve(scn, 'b').peak).toBeCloseTo(8 * 0.25 * 0.1, 6);
    expect(scn.products[0].administered).toBe(false);
  });
});

describe('CYP2D6 formation multiplier', () => {
  it('changes the metabolite amount but not the parent curve', () => {
    const lib = (mult: boolean) => library([
      compound('codeine', 3),
      { ...metabolite('morphine', 'codeine', 0.1, 3), formedFrom: [{ compound: 'codeine', fraction: 0.1, cyp2d6Multiplier: mult ? { poor: 0.1, intermediate: 0.5, normal: 1, ultrarapid: 1.5 } : null }] },
    ], [emptyProduct('codeine_oral', 'Codeine (Oral)', 'codeine', 'Oral', 'x')]);
    const pm = (s: Session) => { s.patient.phenotype = 'poor'; };
    const base = run(lib(false), [{ productId: 'codeine_oral', amount: 60 }], pm);
    const poor = run(lib(true), [{ productId: 'codeine_oral', amount: 60 }], pm);
    expect(curve(poor, 'codeine').peak).toBeCloseTo(curve(base, 'codeine').peak, 9);
    expect(curve(poor, 'morphine').peak / curve(base, 'morphine').peak).toBeCloseTo(0.1, 3);
  });
});

describe('unknown fractions', () => {
  it('normalized metabolite clear time equals the clear time with fraction 1', () => {
    const mk = (f: number | null) => library([compound('p', 4), metabolite('m', 'p', f, 20)], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const unknown = run(mk(null), [{ productId: 'p_oral', amount: 100 }]);
    const one = run(mk(1), [{ productId: 'p_oral', amount: 100 }]);
    const m = curve(unknown, 'm');
    expect(m.normalized).toBe(true);
    expect(m.assumptions.join()).toMatch(/amount unknown — timing only/);
    expect(m.clearAt).toBeCloseTo(curve(one, 'm').clearAt!, -3);
    expect(unknown.products[0].status).toBe('assumptions');
  });
});

describe('clear status', () => {
  const lib = () => library([compound('p', 4), metabolite('m', 'p', 0.5, null)], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);

  it('is incomplete when a downstream compound has unknown kinetics', () => {
    const scn = run(lib(), [{ productId: 'p_oral', amount: 100 }]);
    expect(scn.products[0].status).toBe('incomplete');
    expect(scn.products[0].missing).toEqual(['M']);
    expect(scn.products[0].clearAt).not.toBeNull(); // lower bound from the computable part
  });

  it('is "with assumptions" when unknown metabolites are treated as formation-limited', () => {
    const scn = run(lib(), [{ productId: 'p_oral', amount: 100 }], (s) => { s.settings.unknownAsFormationLimited = true; });
    expect(scn.products[0].status).toBe('assumptions');
    expect(scn.products[0].assumptions.join()).toMatch(/assumed formation-limited/);
    expect(curve(scn, 'm').formationLimited).toBe(true);
  });

  it('labels assumed spread for single-value half-lives', () => {
    const l = library([compound('p', null, { kinetics: { mode: 'intrinsic', halfLifeHours: { typical: 4, min: null, max: null, rangeType: 'single-value', cv: null }, earlyPhase: null, steadyState: null } })],
      [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const scn = run(l, [{ productId: 'p_oral', amount: 100 }]);
    expect(scn.products[0].status).toBe('assumptions');
    expect(scn.products[0].assumptions.join()).toMatch(/assumed spread \(CV 30%\)/);
    const c = curve(scn, 'p');
    expect(c.clearAtMax!).toBeGreaterThan(c.clearAt!);
  });

  it('switches to the steady-state half-life after continuous dosing', () => {
    const p = compound('p', 10, { kinetics: { mode: 'intrinsic', halfLifeHours: { typical: 10, min: 10, max: 10, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: { afterDays: 5, halfLifeHours: { typical: 30, min: 30, max: 30, rangeType: 'observed-range', cv: null } } } });
    const l = library([p], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const doses = Array.from({ length: 8 }, (_, i) => ({ productId: 'p_oral', amount: 10, h: i * 24 }));
    const scn = run(l, doses);
    expect(scn.products[0].assumptions.join()).toMatch(/steady-state half-life used/);
    const c = curve(scn, 'p');
    const r = c.runs.typical;
    const last = T0 + 7 * 24 * HOUR;
    const ratio = valueAt(r.times, r.amounts, last + 60 * HOUR) / valueAt(r.times, r.amounts, last + 30 * HOUR);
    expect(ratio).toBeCloseTo(0.5, 2);
  });
});

describe('QT display', () => {
  it('disables the summed load when any lane lacks calibration', () => {
    const l = library([
      compound('a', 10, { qt: { tier: 'known', weight: 1, referenceAmountMg: 50 } }),
      compound('b', 10, { qt: { tier: 'unassessed', weight: null, referenceAmountMg: null } }),
    ], [emptyProduct('a_oral', 'A (Oral)', 'a', 'Oral', 'x'), emptyProduct('b_oral', 'B (Oral)', 'b', 'Oral', 'x')]);
    const both = run(l, [{ productId: 'a_oral', amount: 50 }, { productId: 'b_oral', amount: 10 }]);
    expect(both.qt.lanes.map((x) => x.tier).sort()).toEqual(['known', 'unassessed']);
    expect(both.qt.loadAvailable).toBe(false);
    expect(both.qt.loadUnavailableReason).toMatch(/B/);

    const onlyA = run(l, [{ productId: 'a_oral', amount: 50 }]);
    expect(onlyA.qt.loadAvailable).toBe(true);
    expect(Math.max(...onlyA.qt.load.map((x) => x.load))).toBeCloseTo(1, 2);
  });
});

describe('sessions', () => {
  it('migrates a v1 session file to v2', () => {
    const v1 = {
      version: 1,
      patient: { name: 'Test' },
      doses: [{ id: '1', productId: 'x_oral', amountMg: 20, kind: 'single', time: '2026-01-01T08:00' }],
      ibogaine: null,
      custom: {
        compounds: [{
          id: 'zolpax', name: 'Zolpax', aliases: [], isMetabolite: false, formedFrom: [], molecularWeight: 0, halfLifeHours: { typical: 6, min: 4, max: 8 },
          cyp2d6: { substrate: false, halfLifeMultiplier: { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 }, inhibitor: 'none', inhibitionType: 'none' },
          qt: { tier: 'none', weight: 0 }, receptors: [], lingeringEffects: { durationDays: 0, note: '' }, nonlinearKinetics: { flag: false, note: '' },
          source: '', sourceNotes: {}, verified: false, verifiedDate: '',
        }],
        products: [{ id: 'zolpax_oral', name: 'Zolpax (Oral)', aliases: [], category: 'x', class: '', parentCompound: 'zolpax', route: 'Oral', typicalDoseMg: 5, source: '', verified: false, verifiedDate: '' }],
        links: [{ compound: 'zolpax', from: 'a', fraction: 0 }],
      },
      settings: { clearHalfLives: 4 },
      recents: [],
    };
    const s = normaliseSession(v1 as never);
    expect(s.version).toBe(2);
    expect(s.doses[0]).toMatchObject({ amount: 20, unit: 'mg' });
    expect(s.doses[0]).not.toHaveProperty('amountMg');
    expect(s.custom.compounds[0].kinetics.halfLifeHours).toMatchObject({ typical: 6, min: 4, max: 8 });
    expect(s.custom.compounds[0].userEntered).toBe(true);
    expect(s.custom.products[0].components[0].compound).toBe('zolpax');
    expect(s.custom.products[0].typicalDose.amount).toBe(5);
    expect(s.custom.links![0].fraction).toBeNull();
    expect(s.settings.clearHalfLives).toBe(4);
    expect(s.settings.assumedCv).toBe(0.3);
  });
});
