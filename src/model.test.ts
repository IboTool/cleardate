import { describe, expect, it } from 'vitest';
import { buildIndex, computeScenario, HOUR, strongestAt, toLocalInput, type Scenario } from './model';
import { curveVisible } from './chart';
import { assumptionLines } from './export';
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

describe('v2.1: clinical relevance', () => {
  const lib = (relevance: Compound['clinicalRelevance'], reviewed = false) => library([
    compound('p', 4),
    metabolite('m', 'p', 0.5, null, {
      clinicalRelevance: relevance,
      reviewedDates: reviewed ? { relevance: '2026-10-01' } : {},
      provenance: reviewed ? { relevance: 'reviewer' } : { relevance: 'recall' },
    }),
  ], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);

  it('an inactive metabolite with unknown kinetics is ignored; an unknown-relevance one makes the product Incomplete', () => {
    const unknown = run(lib('unknown'), [{ productId: 'p_oral', amount: 100 }]);
    expect(unknown.products[0].status).toBe('incomplete');
    expect(unknown.products[0].missing).toEqual(['M']);

    const reviewed = run(lib('inactive', true), [{ productId: 'p_oral', amount: 100 }]);
    expect(reviewed.products[0].status).toBe('clear');
    expect(reviewed.products[0].missing).toEqual([]);
    expect(reviewed.products[0].excluded.join()).toMatch(/M: inactive metabolite, kinetics unknown — excluded from clear date/);

    const draft = run(lib('inactive'), [{ productId: 'p_oral', amount: 100 }]);
    expect(draft.products[0].status).toBe('assumptions');
    expect(draft.products[0].assumptions.join()).toMatch(/excluded as inactive \(unreviewed classification\)/);
  });

  it('an inactive metabolite that outlasts the parent is plotted but does not hold up the clear date', () => {
    const l = library([compound('p', 4), metabolite('m', 'p', 0.5, 100, { clinicalRelevance: 'inactive' })], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const scn = run(l, [{ productId: 'p_oral', amount: 100 }]);
    const m = curve(scn, 'm');
    expect(m.inactive).toBe(true);
    expect(m.clearAt!).toBeGreaterThan(curve(scn, 'p').clearAt!);
    expect(scn.products[0].clearAt).toBe(curve(scn, 'p').clearAt);
    expect(scn.products[0].status).toBe('assumptions');
  });

  it('a parent is always treated as active even if marked inactive', () => {
    const l = library([compound('p', 4, { clinicalRelevance: 'inactive' })], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const scn = run(l, [{ productId: 'p_oral', amount: 100 }]);
    expect(curve(scn, 'p').inactive).toBe(false);
    expect(scn.products[0].clearAt).toBe(curve(scn, 'p').clearAt);
  });
});

describe('v2.1: partial data', () => {
  const hl = (typical: number | null, min: number | null, max: number | null) => ({ typical, min, max, rangeType: 'observed-range' as const, cv: null });
  const one = (k: Compound['kinetics']) => library([compound('p', null, { kinetics: k })], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);

  it('a range-only range derives the geometric midpoint and labels it', () => {
    const ranged = run(one({ mode: 'intrinsic', halfLifeHours: hl(null, 4, 16), earlyPhase: null, steadyState: null }), [{ productId: 'p_oral', amount: 100 }]);
    const explicit = run(one({ mode: 'intrinsic', halfLifeHours: hl(8, 4, 16), earlyPhase: null, steadyState: null }), [{ productId: 'p_oral', amount: 100 }]);
    expect(curve(ranged, 'p').clearAt).toBeCloseTo(curve(explicit, 'p').clearAt!, -3);
    expect(curve(ranged, 'p').clearAtMax).toBeCloseTo(curve(explicit, 'p').clearAtMax!, -3);
    expect(ranged.products[0].assumptions.join()).toMatch(/assumed midpoint of reported range on P half-life/);
    expect(ranged.products[0].status).toBe('assumptions');
  });

  it('earlyPhase with fraction null gives the same curve as no early phase', () => {
    const none = run(one({ mode: 'intrinsic', halfLifeHours: hl(20, 20, 20), earlyPhase: null, steadyState: null }), [{ productId: 'p_oral', amount: 100 }]);
    const partial = run(one({ mode: 'intrinsic', halfLifeHours: hl(20, 20, 20), earlyPhase: { fraction: null, halfLifeHours: hl(2, 2, 2) }, steadyState: null }), [{ productId: 'p_oral', amount: 100 }]);
    expect(curve(partial, 'p').runs.typical.amounts).toEqual(curve(none, 'p').runs.typical.amounts);
    expect(curve(partial, 'p').clearAt).toBe(curve(none, 'p').clearAt);
    expect(partial.products[0].assumptions.join()).toMatch(/P: early phase ignored \(fraction unknown\) — conservative/);
  });

  it('steadyState.afterDays null with a regimen uses the later of the two clear dates', () => {
    const k = (ss: boolean): Compound['kinetics'] => ({ mode: 'intrinsic', halfLifeHours: hl(10, 10, 10), earlyPhase: null, steadyState: ss ? { afterDays: null, halfLifeHours: hl(30, 30, 30) } : null });
    const doses = [0, 24].map((h) => ({ productId: 'p_oral', amount: 10, h }));
    const single = run(one(k(false)), doses);
    const unknownOnset = run(one(k(true)), doses);
    const steadyOnly = run(one({ mode: 'intrinsic', halfLifeHours: hl(30, 30, 30), earlyPhase: null, steadyState: null }), doses);
    expect(unknownOnset.products[0].clearAt).toBe(steadyOnly.products[0].clearAt);
    expect(unknownOnset.products[0].clearAt!).toBeGreaterThan(single.products[0].clearAt!);
    expect(unknownOnset.products[0].assumptions.join()).toMatch(/steady-state onset unknown — later of single-dose and steady-state clearance used/);

    const oneDose = run(one(k(true)), [{ productId: 'p_oral', amount: 10 }]);
    expect(oneDose.products[0].clearAt).toBe(run(one(k(false)), [{ productId: 'p_oral', amount: 10 }]).products[0].clearAt);
    expect(oneDose.products[0].assumptions.join()).not.toMatch(/steady-state/);
  });
});

describe('v2.1: zero formation multipliers', () => {
  const lib = (morphineHl: number | null) => library([
    compound('codeine', 3),
    { ...metabolite('morphine', 'codeine', 0.1, morphineHl, { clinicalRelevance: 'active' }), formedFrom: [{ compound: 'codeine', fraction: 0.1, cyp2d6Multiplier: { poor: 0, normal: 1 } }] },
  ], [emptyProduct('codeine_oral', 'Codeine (Oral)', 'codeine', 'Oral', 'x')]);
  const as = (phen: Session['patient']['phenotype']) => (s: Session) => { s.patient.phenotype = phen; };

  it("removes the branch from the curve and from clear status for the patient's phenotype", () => {
    const pm = run(lib(100), [{ productId: 'codeine_oral', amount: 60 }], as('poor'));
    expect(curve(pm, 'morphine')).toBeUndefined();
    expect(pm.products[0].clearAt).toBe(curve(pm, 'codeine').clearAt);
    expect(pm.products[0].notes).toContain('Morphine: not formed in poor metabolisers');
    expect(pm.products[0].status).toBe('clear');

    const unknownKinetics = run(lib(null), [{ productId: 'codeine_oral', amount: 60 }], as('poor'));
    expect(unknownKinetics.products[0].status).toBe('clear');
    expect(unknownKinetics.products[0].missing).toEqual([]);

    const nm = run(lib(100), [{ productId: 'codeine_oral', amount: 60 }], as('normal'));
    expect(curve(nm, 'morphine')).toBeDefined();
    expect(nm.products[0].clearAt!).toBeGreaterThan(curve(nm, 'codeine').clearAt!);
  });

  it('labels a missing phenotype in a partial map as assumed ×1', () => {
    const um = run(lib(100), [{ productId: 'codeine_oral', amount: 60 }], as('ultrarapid'));
    expect(um.products[0].assumptions.join()).toMatch(/formation multiplier from Codeine for ultrarapid metabolisers unknown — assumed ×1/);
  });

  it('with unknown phenotype the poor-metaboliser edge of the band drops the branch only in that run', () => {
    const u = run(lib(100), [{ productId: 'codeine_oral', amount: 60 }], as('unknown'));
    const m = curve(u, 'morphine');
    expect(m.formed).toEqual({ min: true, typical: true, max: false });
    expect(u.products[0].notes).toContain('Morphine: not formed in poor metabolisers');
    expect(u.products[0].clearAt!).toBeGreaterThan(curve(u, 'codeine').clearAt!);
  });
});

describe('v2.1: labelling', () => {
  it('lists exclusions, partial-data assumptions and not-formed notes in the export', () => {
    const l = library([
      compound('p', null, { kinetics: { mode: 'intrinsic', halfLifeHours: { typical: null, min: 4, max: 16, rangeType: 'observed-range', cv: null }, earlyPhase: { fraction: null, halfLifeHours: null }, steadyState: null } }),
      metabolite('i', 'p', 0.5, null, { clinicalRelevance: 'inactive', provenance: { relevance: 'reviewer' } }),
      { ...metabolite('z', 'p', 0.2, 5), formedFrom: [{ compound: 'p', fraction: 0.2, cyp2d6Multiplier: { poor: 0 } }] },
    ], [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const scn = run(l, [{ productId: 'p_oral', amount: 100 }], (s) => { s.patient.phenotype = 'poor'; });
    const lines = assumptionLines(scn)[0].lines.join('\n');
    expect(lines).toMatch(/Assumed midpoint of reported range on P half-life\./);
    expect(lines).toMatch(/P: early phase ignored \(fraction unknown\) — conservative\./);
    expect(lines).toMatch(/I: inactive metabolite, kinetics unknown — excluded from clear date\./);
    expect(lines).toMatch(/Z: not formed in poor metabolisers\./);
  });

  it('hides inactive metabolites unless "Show inactive metabolites" is on', () => {
    const l = library([compound('p', 4), metabolite('i', 'p', 0.5, 10, { clinicalRelevance: 'inactive' }), metabolite('a', 'p', 0.5, 10)],
      [emptyProduct('p_oral', 'P (Oral)', 'p', 'Oral', 'x')]);
    const scn = run(l, [{ productId: 'p_oral', amount: 100 }]);
    const s = emptySession().settings;
    expect(s.showInactiveMetabolites).toBe(false);
    expect(curveVisible(curve(scn, 'i'), s)).toBe(false);
    expect(curveVisible(curve(scn, 'a'), s)).toBe(true);
    expect(curveVisible(curve(scn, 'i'), { ...s, showInactiveMetabolites: true })).toBe(true);
    expect(curveVisible(curve(scn, 'i'), { ...s, showMetabolites: false, showInactiveMetabolites: true })).toBe(false);
  });

  it('session normalise adds clinicalRelevance and reviewedDates to older custom drugs', () => {
    const c = { ...emptyCompound('x', 'X') } as Partial<Compound>;
    const m = { ...emptyCompound('m', 'M'), isMetabolite: true } as Partial<Compound>;
    const p = { ...emptyProduct('x_oral', 'X', 'x', 'Oral', 'x') } as Partial<Product>;
    delete c.clinicalRelevance; delete c.reviewedDates; delete m.clinicalRelevance; delete p.reviewedDates;
    const s = normaliseSession({ ...emptySession(), custom: { compounds: [c, m] as Compound[], products: [p] as Product[], links: [] } });
    expect(s.custom.compounds.map((x) => [x.clinicalRelevance, x.reviewedDates])).toEqual([['active', {}], ['unknown', {}]]);
    expect(s.custom.products[0].reviewedDates).toEqual({});
    expect(s.settings.showInactiveMetabolites).toBe(false);
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

describe('CYP2D6: poor-metaboliser projection without phenotype data', () => {
  const cyp = (over: Partial<Compound['cyp2d6']>): Compound['cyp2d6'] =>
    ({ substrate: 'no', halfLifeMultiplier: null, inhibitor: 'none', inhibitionType: 'none', ...over });
  const lib = (ibMult: Compound['cyp2d6']['halfLifeMultiplier'], inhibitor = true) => library([
    compound('ibogaine', 7, { cyp2d6: cyp({ substrate: 'yes', halfLifeMultiplier: ibMult }) }),
    compound('inh', 10, { cyp2d6: cyp({ inhibitor: inhibitor ? 'strong' : 'none', inhibitionType: inhibitor ? 'reversible' : 'none' }) }),
  ], [emptyProduct('ibogaine_oral', 'Ibogaine (Oral)', 'ibogaine', 'Oral', 'x'), emptyProduct('inh_oral', 'Inh (Oral)', 'inh', 'Oral', 'x')]);
  const scenario = (l: Library, patch: (s: Session) => void = () => {}) =>
    run(l, [{ productId: 'inh_oral', amount: 20 }], (s) => { s.ibogaine = { flood: { mg: 1000, time: at(12) }, boosters: [] }; patch(s); });
  const ib = (scn: Scenario) => scn.products.find((p) => p.isIbogaine)!;
  const danger = (scn: Scenario) => scn.warnings.filter((w) => w.level === 'danger').map((w) => w.text);

  it('does not present an unchanged curve as the poor-metaboliser projection', () => {
    const inhibited = scenario(lib(null));
    const baseline = scenario(lib(null, false));
    expect(inhibited.cypAtTreatment.inhibited).toBe(true);
    const r = ib(inhibited);
    expect(r.pmAdjusted).toBe(false);
    expect(r.pmUnquantified).toEqual(['Ibogaine']);
    expect(r.name).toBe('Ibogaine (projected, poor-metaboliser effect not quantified)');
    expect(r.clearAt).toBe(ib(baseline).clearAt);
    expect(danger(inhibited)).toEqual([expect.stringMatching(/may resemble a poor metaboliser's, but the increase is not quantified — no phenotype data for Ibogaine\. \(Inhibited by: Inh\.\)/)]);
  });

  it('caveats the projected curve and lists it under Assumptions and missing data', () => {
    const scn = scenario(lib({ normal: 1, intermediate: 1.5 }));
    const r = ib(scn);
    expect(r.pmUnquantified).toEqual(['Ibogaine']);
    expect(r.status).toBe('assumptions');
    expect(curve(scn, 'ibogaine').assumptions[0]).toMatch(/^poor-metaboliser exposure increase not quantified — no phenotype data for Ibogaine/);
    expect(r.assumptions.some((a) => /assumed ×1/.test(a))).toBe(false);
    const lines = assumptionLines(scn).find((x) => x.product === r.name)!.lines;
    expect(lines).toContain('Poor-metaboliser exposure increase not quantified — no phenotype data for Ibogaine — curve shows unadjusted kinetics.');
  });

  it('warns for a poor-metaboliser patient without an inhibitor', () => {
    const scn = scenario(lib(null, false), (s) => { s.patient.phenotype = 'poor'; });
    expect(scn.cypAtTreatment.inhibited).toBe(false);
    expect(ib(scn).pmUnquantified).toEqual(['Ibogaine']);
    expect(danger(scn)).toEqual(['Poor CYP2D6 metaboliser — ibogaine exposure may be increased, but the increase is not quantified — no phenotype data for Ibogaine.']);
  });

  it('is unchanged when a "poor" multiplier exists', () => {
    const scn = scenario(lib({ poor: 3, normal: 1 }));
    const r = ib(scn);
    expect(r.pmAdjusted).toBe(true);
    expect(r.pmUnquantified).toBeUndefined();
    expect(r.name).toBe('Ibogaine (projected, poor-metaboliser adjusted)');
    expect(r.clearAt!).toBeGreaterThan(ib(scenario(lib(null, false))).clearAt!);
    expect(danger(scn)).toEqual(["CYP2D6 likely inhibited at treatment — ibogaine exposure may resemble a poor metaboliser's. (Inhibited by: Inh.)"]);
    expect(scn.warnings.some((w) => /not quantified/.test(w.text))).toBe(false);
  });
});

describe('CYP2D6: inhibitors of unassessed strength', () => {
  const lib = (inhibitionType: Compound['cyp2d6']['inhibitionType']) => library([
    compound('meth', 10, { cyp2d6: { substrate: 'unassessed', halfLifeMultiplier: null, inhibitor: 'unassessed', inhibitionType } }),
  ], [emptyProduct('meth_oral', 'Meth (Oral)', 'meth', 'Oral', 'x')]);
  const scenario = (l: Library) =>
    run(l, [{ productId: 'meth_oral', amount: 60 }], (s) => { s.ibogaine = { flood: { mg: 1000, time: at(24) }, boosters: [] }; });

  it('appear on the track while above the clear threshold, counted as at least weak', () => {
    const scn = scenario(lib('reversible'));
    expect(scn.cyp).toHaveLength(1);
    const iv = scn.cyp[0];
    expect(iv).toMatchObject({ strength: 'weak', strengthUnassessed: true, tail: false, compound: 'Meth' });
    expect(iv.start).toBe(T0);
    expect(Math.abs(iv.end - curve(scn, 'meth').clearAt!)).toBeLessThanOrEqual(HOUR);
  });

  it('count towards inhibition at treatment, with their own wording', () => {
    const scn = scenario(lib('reversible'));
    expect(scn.cypAtTreatment).toMatchObject({ inhibited: true, by: [], byUnassessedStrength: ['Meth'], unassessed: [] });
    const w = scn.warnings.find((x) => x.level === 'danger')!.text;
    expect(w).toMatch(/^CYP2D6 likely inhibited at treatment/);
    expect(w).toMatch(/Inhibition documented, strength unassessed — treated as at least weak: Meth\./);
    expect(scn.warnings.some((x) => /CYP2D6 inhibition unassessed for compounds present/.test(x.text))).toBe(false);
  });

  it('keep the recovery tail when mechanism-based', () => {
    const scn = scenario(lib('mechanism-based'));
    expect(scn.cyp.map((iv) => [iv.tail, iv.strengthUnassessed])).toEqual([[false, true], [true, true]]);
  });

  it('stay off the track when the inhibition type is also unassessed', () => {
    const scn = scenario(lib('unassessed'));
    expect(scn.cyp).toEqual([]);
    expect(scn.cypAtTreatment).toMatchObject({ inhibited: false, unassessed: ['Meth'] });
    expect(scn.warnings.some((x) => x.text === 'CYP2D6 inhibition unassessed for compounds present at the ibogaine date: Meth.')).toBe(true);
  });

  it('rank below an assessed weak inhibitor in the tooltip', () => {
    const base = { start: 0, end: 10, tail: false, productKey: 'p' };
    const pick = strongestAt([
      { ...base, strength: 'weak', strengthUnassessed: true, compound: 'U' },
      { ...base, strength: 'weak', strengthUnassessed: false, compound: 'W' },
    ], 5);
    expect(pick?.compound).toBe('W');
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
