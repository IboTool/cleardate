// Spec v2.2 §8: prodrugs, zero-order alcohol, not-modelled exposures, endogenous metabolites, conditional links.
import { describe, expect, it } from 'vitest';
import { buildIndex, clearStatusText, computeScenario, convertUnit, DAY, HOUR, productDataStatus, toLocalInput, toMg, type Scenario } from './model';
import { valueAt } from './pk';
import { emptyCompound, emptyProduct, SCHEMA_VERSION } from './schema';
import { emptySession } from './state';
import type { Compound, DoseUnit, Library, Product, Range, Session } from './types';

const T0 = new Date('2026-01-01T08:00').getTime();
const at = (h: number) => toLocalInput(T0 + h * HOUR);
const range = (typical: number, min = typical, max = typical): Range => ({ typical, min, max, rangeType: 'observed-range', cv: null });

function compound(id: string, hl: number | null, extra: Partial<Compound> = {}): Compound {
  return {
    ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)),
    clinicalRelevance: extra.isMetabolite ? 'unknown' : 'active',
    kinetics: hl ? { mode: 'intrinsic', halfLifeHours: range(hl), earlyPhase: null, steadyState: null } : { mode: 'unknown', halfLifeHours: null, earlyPhase: null, steadyState: null },
    ...extra,
  };
}
const metabolite = (id: string, from: string, fraction: number | null, hl: number | null, extra: Partial<Compound> = {}) =>
  compound(id, hl, { isMetabolite: true, formedFrom: [{ compound: from, fraction, cyp2d6Multiplier: null }], ...extra });
const library = (compounds: Compound[], products: Product[]): Library =>
  ({ schemaVersion: SCHEMA_VERSION, categories: [{ id: 'x', name: 'X', order: 1 }], compounds, products });

interface Dose { productId: string; amount: number; unit?: DoseUnit; h?: number; durationHours?: number }
function run(lib: Library, doses: Dose[], patch: (s: Session) => void = () => {}): Scenario {
  const s = emptySession();
  s.patient.weightKg = 70;
  s.doses = doses.map((d, i) => ({
    id: String(i), productId: d.productId, amount: d.amount, unit: d.unit ?? 'mg', kind: 'single', time: at(d.h ?? 0),
    ...(d.durationHours ? { durationHours: d.durationHours } : {}),
  }));
  patch(s);
  return computeScenario(buildIndex(lib), s, T0);
}
const product = (scn: Scenario, id: string) => scn.products.find((p) => p.key === id)!;
const curve = (scn: Scenario, id: string) => scn.products.flatMap((p) => p.curves).find((c) => c.compound.id === id);
const fmt = (t: number) => `+${((t - T0) / HOUR).toFixed(2)}h`;

// ---------- prodrugs ----------

describe('prodrugs (§1)', () => {
  const lib = library(
    [compound('psilocybin', null), metabolite('psilocin', 'psilocybin', null, 2.72)],
    [{ ...emptyProduct('psilocybin_oral', 'Psilocybin (Oral)', 'psilocin', 'Oral', 'x'), components: [{ compound: 'psilocin', ratio: 1, saltFactor: null, bioavailability: null, administeredAs: 'psilocybin', massFactor: 0.7186 }] }],
  );

  it('delivers D × ratio × massFactor to the modelled compound and never simulates the administered one', () => {
    const scn = run(lib, [{ productId: 'psilocybin_oral', amount: 25 }]);
    expect(curve(scn, 'psilocin')!.peak).toBeCloseTo(25 * 0.7186, 6);
    expect(curve(scn, 'psilocybin')).toBeUndefined();
  });

  it('labels the product "prodrug — modelled as …" and "administered as … modelled as …"', () => {
    const r = product(run(lib, [{ productId: 'psilocybin_oral', amount: 25 }]), 'psilocybin_oral');
    expect(r.assumptions).toContain('Psilocybin: prodrug — modelled as Psilocin');
    expect(r.prodrug).toEqual([{ administeredAs: 'Psilocybin', modelledAs: 'Psilocin' }]);
    expect(r.status).toBe('assumptions');
  });

  it('has data although the administered compound has no half-life', () => {
    expect(productDataStatus(buildIndex(lib), lib.products[0], false)).toBe('ok');
  });
});

// ---------- alcohol ----------

describe('zero-order alcohol (§2)', () => {
  // 100 mg/kg/h typical, 80–130 range; 70 kg → 7000 mg/h typical, 5600 slowest, 9100 fastest.
  const ethanol = compound('ethanol', null, { kinetics: { mode: 'zero-order', halfLifeHours: null, earlyPhase: null, steadyState: null, zeroOrderRateMgPerKgPerHour: range(100, 80, 130) } });
  const drinks: Product = { ...emptyProduct('ethanol_oral', 'Ethanol (Oral)', 'ethanol', 'Oral', 'x'), doseUnit: 'standard drinks', typicalDose: { amount: null, unit: 'standard drinks', basis: 'single-use' } };
  const lib = library([ethanol], [drinks]);

  it('declines linearly at rate × weight', () => {
    const c = curve(run(lib, [{ productId: 'ethanol_oral', amount: 2, unit: 'standard drinks' }]), 'ethanol')!;
    const v = (h: number) => valueAt(c.runs.typical.times, c.runs.typical.amounts, T0 + h * HOUR);
    expect(c.peak).toBeCloseTo(28000, 6);
    expect(v(1)).toBeCloseTo(21000, 3);
    expect(v(2)).toBeCloseTo(14000, 3);
    expect(v(4.5)).toBe(0);
  });

  it('is clear when none is left, and the clear date uses the slowest rate', () => {
    const r = product(run(lib, [{ productId: 'ethanol_oral', amount: 2, unit: 'standard drinks' }]), 'ethanol_oral');
    expect((r.clearAt! - T0) / HOUR).toBeCloseTo(28000 / 5600, 3);
    expect((r.clearAtMax! - T0) / HOUR).toBeCloseTo(28000 / 5600, 3);
    expect((r.clearAtMin! - T0) / HOUR).toBeCloseTo(28000 / 9100, 3);
    expect(r.notes.join()).toMatch(/clear when none is left; the clear date uses the slowest rate/);
    expect(clearStatusText(r, fmt)).toBe('Clear by +5.00h');
  });

  it('shows "Needs body weight" without a weight', () => {
    const scn = run(lib, [{ productId: 'ethanol_oral', amount: 2, unit: 'standard drinks' }], (s) => { s.patient.weightKg = 0; });
    const r = product(scn, 'ethanol_oral');
    expect(r.status).toBe('needs-weight');
    expect(r.curves).toEqual([]);
    expect(r.clearAt).toBeNull();
    expect(clearStatusText(r, fmt)).toBe('Needs body weight');
    expect(scn.warnings.some((w) => /needs body weight/.test(w.text))).toBe(true);
  });

  it('converts standard drinks with the configured size, and grams', () => {
    expect(toMg(1, 'standard drinks')).toBe(14000);
    expect(toMg(1, 'standard drinks', 10)).toBe(10000);
    expect(convertUnit(28, 'g', 'standard drinks')).toBeCloseTo(2, 9);
    expect(convertUnit(1, 'standard drinks', 'g', 8)).toBeCloseTo(8, 9);
    const uk = run(lib, [{ productId: 'ethanol_oral', amount: 2, unit: 'standard drinks' }], (s) => { s.settings.standardDrinkGrams = 10; });
    expect(curve(uk, 'ethanol')!.peak).toBeCloseTo(20000, 6);
    const grams = run(lib, [{ productId: 'ethanol_oral', amount: 28, unit: 'g' }]);
    expect(curve(grams, 'ethanol')!.peak).toBeCloseTo(28000, 6);
  });

  it('is "No data yet" without a rate', () => {
    const noRate = library([{ ...ethanol, kinetics: { ...ethanol.kinetics, zeroOrderRateMgPerKgPerHour: { typical: null, min: null, max: null, rangeType: null, cv: null } } }], [drinks]);
    expect(productDataStatus(buildIndex(noRate), drinks, false)).toBe('no-data');
  });
});

// ---------- not modelled ----------

describe('not-modelled exposures (§3)', () => {
  const reason = 'Exhaled within minutes; clinically relevant effect is prolonged vitamin B12 inactivation — see lingering effects';
  const n2o = compound('nitrous_oxide', null, {
    kinetics: { mode: 'not-modelled', halfLifeHours: null, earlyPhase: null, steadyState: null, notModelledReason: reason },
    lingeringEffects: { durationDays: 7, note: 'B12 inactivation' },
  });
  const p: Product = { ...emptyProduct('nitrous_oxide_inhaled', 'Nitrous oxide (Inhaled)', 'nitrous_oxide', 'Inhaled', 'x'), doseUnit: 'session', input: { type: 'zero-order', releaseHalfLifeHours: null, defaultDurationHours: null } };
  const lib = library([n2o], [p]);
  const scn = run(lib, [{ productId: 'nitrous_oxide_inhaled', amount: 1, unit: 'session', durationHours: 2 }]);
  const r = product(scn, 'nitrous_oxide_inhaled');

  it('draws no curve and gives no clear date', () => {
    expect(r.status).toBe('not-modelled');
    expect(r.curves).toEqual([]);
    expect(r.clearAt).toBeNull();
    expect(clearStatusText(r, fmt)).toBe(`Not modelled — ${reason}`);
    expect(productDataStatus(buildIndex(lib), p, false)).toBe('not-modelled');
  });

  it('keeps the exposure interval and draws the lingering band after it', () => {
    expect(r.doses).toEqual([{ time: T0, amount: 1, unit: 'session', end: T0 + 2 * HOUR }]);
    expect(scn.lingering).toEqual([{ start: T0 + 2 * HOUR, end: T0 + 2 * HOUR + 7 * DAY, compound: 'Nitrous_oxide', productKey: 'nitrous_oxide_inhaled', note: 'B12 inactivation', origin: 'last-dose', days: 7 }]);
    expect(scn.warnings.some((w) => w.text.startsWith('Nitrous oxide: not modelled'))).toBe(true);
  });

  it('draws an exposure bar across the session on the chart, labelled "not modelled"', async () => {
    const { buildChartOption, exposureLabel } = await import('./chart');
    const opt = buildChartOption(scn, emptySession(), { theme: 'dark', height: 600, focusKey: null, animate: false });
    const series = (opt.series as { id?: string; data?: unknown[] }[]).find((x) => x.id === 'exposures');
    expect(series?.data).toEqual([[T0, T0 + 2 * HOUR]]);
    expect(exposureLabel(r)).toBe('Nitrous oxide — not modelled');
  });
});

// ---------- endogenous ----------

describe('endogenous metabolites (§4)', () => {
  const lib = (reviewed: boolean) => library(
    [compound('dmt', 0.25), metabolite('iaa', 'dmt', null, null, { endogenous: true, clinicalRelevance: 'active', provenance: reviewed ? { relevance: 'reviewer' } : { relevance: 'checked' } })],
    [emptyProduct('dmt_inhaled', 'DMT (Inhaled)', 'dmt', 'Inhaled', 'x')],
  );

  it("unknown kinetics don't block once relevance is reviewed", () => {
    const r = product(run(lib(true), [{ productId: 'dmt_inhaled', amount: 30 }]), 'dmt_inhaled');
    expect(r.status).toBe('clear');
    expect(r.excluded.join()).toMatch(/Iaa: endogenous — excess over baseline not modelled/);
    expect(productDataStatus(buildIndex(lib(true)), lib(true).products[0], false)).toBe('ok');
  });

  it('still block while relevance is unreviewed', () => {
    const r = product(run(lib(false), [{ productId: 'dmt_inhaled', amount: 30 }]), 'dmt_inhaled');
    expect(r.status).toBe('incomplete');
    expect(r.missing).toEqual(['Iaa']);
  });
});

// ---------- conditional links ----------

describe('conditional metabolite formation (§5)', () => {
  const ethanol = compound('ethanol', null, { kinetics: { mode: 'zero-order', halfLifeHours: null, earlyPhase: null, steadyState: null, zeroOrderRateMgPerKgPerHour: range(100) } });
  const lib = (cocaethyleneHl: number | null) => library(
    [
      compound('cocaine', 1), ethanol,
      { ...metabolite('cocaethylene', 'cocaine', 0.1, cocaethyleneHl), clinicalRelevance: 'active', formedFrom: [{ compound: 'cocaine', fraction: 0.1, cyp2d6Multiplier: null, condition: { requiresCompound: 'ethanol' } }] },
    ],
    [
      emptyProduct('cocaine_intranasal', 'Cocaine (Intranasal)', 'cocaine', 'Intranasal', 'x'),
      { ...emptyProduct('ethanol_oral', 'Ethanol (Oral)', 'ethanol', 'Oral', 'x'), doseUnit: 'standard drinks' },
    ],
  );
  const cocaine = { productId: 'cocaine_intranasal', amount: 100 };
  const drinks = (h: number) => ({ productId: 'ethanol_oral', amount: 4, unit: 'standard drinks' as const, h });

  it('forms no metabolite without alcohol', () => {
    const scn = run(lib(1.68), [cocaine]);
    expect(curve(scn, 'cocaethylene')).toBeUndefined();
    expect(product(scn, 'cocaine_intranasal').status).toBe('clear');
  });

  it('forms it while alcohol overlaps the parent, and says why', () => {
    const scn = run(lib(1.68), [cocaine, drinks(0)]);
    const c = curve(scn, 'cocaethylene')!;
    expect(c.peak).toBeGreaterThan(0);
    expect(c.notes).toContain('Cocaethylene: formed because alcohol was also taken');
    // Alcohol (56 g at 7 g/h) lasts 8 h, longer than cocaine: the whole 10% fraction forms.
    expect(c.peak).toBeLessThan(10);
  });

  it('forms nothing when the alcohol was taken days later', () => {
    const scn = run(lib(1.68), [cocaine, drinks(72)]);
    expect(curve(scn, 'cocaethylene')).toBeUndefined();
  });

  it('only forms inside the overlap', () => {
    // Alcohol from 0.5 h, 1 drink → gone after 2 h: formation only in that window.
    const partial = run(lib(1.68), [cocaine, { productId: 'ethanol_oral', amount: 1, unit: 'standard drinks', h: 0.5 }]);
    const full = run(lib(1.68), [cocaine, drinks(0)]);
    expect(curve(partial, 'cocaethylene')!.peak).toBeLessThan(curve(full, 'cocaethylene')!.peak);
  });

  it('changes clear status accordingly when the metabolite has no kinetics', () => {
    expect(product(run(lib(null), [cocaine]), 'cocaine_intranasal').status).toBe('clear');
    const withAlcohol = product(run(lib(null), [cocaine, drinks(0)]), 'cocaine_intranasal');
    expect(withAlcohol.status).toBe('incomplete');
    expect(withAlcohol.missing).toEqual(['Cocaethylene']);
    expect(productDataStatus(buildIndex(lib(null)), lib(null).products[0], false)).toBe('ok');
  });

  it('assumes alcohol is present from the first drink when it can’t be simulated', () => {
    const scn = run(lib(1.68), [cocaine, drinks(0)], (s) => { s.patient.weightKg = 0; });
    const c = curve(scn, 'cocaethylene')!;
    expect(c.assumptions.join()).toMatch(/alcohol amount couldn't be simulated \(no body weight\) — assumed present from the first dose/);
  });
});
