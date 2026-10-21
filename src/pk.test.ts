import { describe, expect, it } from 'vitest';
import { clearFraction, clearTime, CycleError, expandRegimen, simulate, topoOrder, valueAt, type SimCompound } from './pk';
import { emptyCompound, emptyProduct, SCHEMA_VERSION } from './schema';
import { findCycle, fractionSums, validateLibrary } from './validate';
import type { Library } from './types';

const ln2 = Math.LN2;

describe('single compound', () => {
  it('matches D · e^(−k·t)', () => {
    const D = 100;
    const t12 = 6;
    const k = ln2 / t12;
    const r = simulate([{ id: 'a', halfLifeHours: t12, children: [] }], [{ time: 0, compoundId: 'a', amount: D }], {
      start: 0, minEnd: 72, maxEnd: 72,
    });
    for (const t of [0.5, 3, 6, 12, 24, 48, 71]) {
      const sim = valueAt(r.times, r.amounts.a, t);
      expect(sim).toBeCloseTo(D * Math.exp(-k * t), 1);
    }
    // Exactly one half-life → half the dose.
    expect(valueAt(r.times, r.amounts.a, 6)).toBeCloseTo(50, 6);
  });
});

describe('parent → metabolite', () => {
  it('matches the Bateman equation', () => {
    const D = 100;
    const f = 0.6;
    const kp = ln2 / 4;
    const km = ln2 / 20;
    const comps: SimCompound[] = [
      { id: 'p', halfLifeHours: 4, children: [{ id: 'm', fraction: f }] },
      { id: 'm', halfLifeHours: 20, children: [] },
    ];
    const r = simulate(comps, [{ time: 0, compoundId: 'p', amount: D }], { start: 0, minEnd: 200, maxEnd: 200, maxDt: 0.05 });
    const bateman = (t: number) => ((f * D * kp) / (km - kp)) * (Math.exp(-kp * t) - Math.exp(-km * t));
    let maxErr = 0;
    for (let t = 1; t < 200; t += 3) maxErr = Math.max(maxErr, Math.abs(valueAt(r.times, r.amounts.m, t) - bateman(t)));
    const peak = Math.max(...r.amounts.m);
    expect(maxErr / peak).toBeLessThan(0.01);
  });
});

describe('two-pool compound (early phase)', () => {
  it('matches D[f·e^(−k₁t) + (1−f)·e^(−k₂t)]', () => {
    const D = 100, f = 0.8, h1 = 2, h2 = 15;
    const r = simulate([{ id: 'a', halfLifeHours: h2, earlyPhase: { fraction: f, halfLifeHours: h1 }, children: [] }],
      [{ time: 0, compoundId: 'a', amount: D }], { start: 0, minEnd: 120, maxEnd: 120 });
    for (const t of [0.5, 2, 5, 10, 24, 60, 110]) {
      const exact = D * (f * Math.exp((-ln2 / h1) * t) + (1 - f) * Math.exp((-ln2 / h2) * t));
      expect(valueAt(r.times, r.amounts.a, t) / exact).toBeCloseTo(1, 3);
    }
  });

  it('feeds metabolites from both pools', () => {
    const r = simulate([
      { id: 'a', halfLifeHours: 15, earlyPhase: { fraction: 0.5, halfLifeHours: 1 }, children: [{ id: 'm', fraction: 1 }] },
      { id: 'm', halfLifeHours: 1000, children: [] },
    ], [{ time: 0, compoundId: 'a', amount: 100 }], { start: 0, minEnd: 400, maxEnd: 400 });
    // After ~26 slow half-lives nearly everything has moved into the long-lived metabolite.
    expect(r.amounts.m[r.amounts.m.length - 1] + r.amounts.a[r.amounts.a.length - 1]).toBeGreaterThan(75);
  });
});

describe('formation-limited metabolite', () => {
  it('tracks its parent: same curve shape (within 5%) once past the peak', () => {
    const hp = 8;
    const r = simulate([
      { id: 'p', halfLifeHours: hp, children: [{ id: 'g', fraction: 0.5 }] },
      { id: 'g', halfLifeHours: hp / 10, children: [], quasiSteady: true },
    ], [{ time: 0, compoundId: 'p', amount: 100 }], { start: 0, minEnd: 80, maxEnd: 80 });
    // Normalise both curves at a reference time after the conjugate's short rise.
    const ref = 6;
    const p0 = valueAt(r.times, r.amounts.p, ref), g0 = valueAt(r.times, r.amounts.g, ref);
    for (const t of [10, 20, 40, 70]) {
      const a = valueAt(r.times, r.amounts.p, t) / p0;
      const b = valueAt(r.times, r.amounts.g, t) / g0;
      expect(Math.abs(a - b) / a).toBeLessThan(0.05);
    }
    // Analytic post-peak ratio: g = f·kp·p / (kg − kp).
    const t = 30, kp = Math.LN2 / hp, kg = Math.LN2 / (hp / 10);
    const expected = (0.5 * kp * valueAt(r.times, r.amounts.p, t)) / (kg - kp);
    expect(valueAt(r.times, r.amounts.g, t) / expected).toBeCloseTo(1, 2);
  });
});

describe('zero-order input (patch)', () => {
  it('reaches rate / k at steady state and decays at the release half-life after removal', () => {
    const rate = 2, hl = 10, skin = 25;
    const k = ln2 / hl;
    // Without skin depot: steady state = rate / k.
    const a = simulate([{ id: 'a', halfLifeHours: hl, children: [] }], [], {
      start: 0, minEnd: 400, maxEnd: 400, infusions: [{ start: 0, end: 300, target: 'a', rate }],
    });
    expect(valueAt(a.times, a.amounts.a, 299) / (rate / k)).toBeCloseTo(1, 3);
    expect(a.totalDosed).toBeCloseTo(600, 6);

    // With a skin depot, the terminal decline after removal follows the slower (release) half-life.
    const b = simulate([{ id: 'a', halfLifeHours: hl, children: [] }], [], {
      start: 0, minEnd: 700, maxEnd: 700,
      releases: [{ id: 'rel:a', halfLifeHours: skin, target: 'a' }],
      infusions: [{ start: 0, end: 300, target: 'rel:a', rate }],
    });
    expect(valueAt(b.times, b.amounts.a, 299) / (rate / k)).toBeCloseTo(1, 2);
    const slope = (Math.log(valueAt(b.times, b.amounts.a, 500)) - Math.log(valueAt(b.times, b.amounts.a, 600))) / 100;
    expect(slope / (ln2 / skin)).toBeCloseTo(1, 2);
  });
});

describe('first-order release (depot)', () => {
  it('flip-flop: terminal slope equals the release rate when release is slower than elimination', () => {
    const r = simulate([{ id: 'a', halfLifeHours: 5, children: [] }], [{ time: 0, compoundId: 'rel:a', amount: 100 }], {
      start: 0, minEnd: 600, maxEnd: 600, releases: [{ id: 'rel:a', halfLifeHours: 50, target: 'a' }],
    });
    const slope = (Math.log(valueAt(r.times, r.amounts.a, 300)) - Math.log(valueAt(r.times, r.amounts.a, 400))) / 100;
    expect(slope / (ln2 / 50)).toBeCloseTo(1, 2);
    const last = r.times.length - 1;
    expect(r.amounts.a[last] + r.inRelease[last] + r.eliminated[last]).toBeCloseTo(100, 6);
  });
});

describe('three-level chain', () => {
  it('conserves mass: tracked + eliminated = dosed', () => {
    const comps: SimCompound[] = [
      { id: 'a', halfLifeHours: 2, children: [{ id: 'b', fraction: 0.7 }, { id: 'c', fraction: 0.2 }] },
      { id: 'b', halfLifeHours: 10, children: [{ id: 'c', fraction: 0.5 }] },
      { id: 'c', halfLifeHours: 30, children: [] },
    ];
    const doses = [
      { time: 0, compoundId: 'a', amount: 50 },
      { time: 13.3, compoundId: 'a', amount: 25 },
    ];
    const r = simulate(comps, doses, { start: 0, minEnd: 300, maxEnd: 300 });
    for (let i = 0; i < r.times.length; i += 37) {
      const t = r.times[i];
      const dosedSoFar = doses.filter((d) => d.time <= t).reduce((s, d) => s + d.amount, 0);
      const tracked = r.amounts.a[i] + r.amounts.b[i] + r.amounts.c[i];
      // A dose instant has a pre- and a post-dose sample; skip that ambiguity.
      if (doses.some((d) => Math.abs(t - d.time) < 1e-9)) continue;
      expect(tracked + r.eliminated[i]).toBeCloseTo(dosedSoFar, 9);
    }
    const last = r.times.length - 1;
    expect(r.amounts.a[last] + r.amounts.b[last] + r.amounts.c[last] + r.eliminated[last]).toBeCloseTo(75, 9);
  });

  it('processes parents before metabolites regardless of input order', () => {
    const order = topoOrder([
      { id: 'c', halfLifeHours: 1, children: [] },
      { id: 'b', halfLifeHours: 1, children: [{ id: 'c', fraction: 1 }] },
      { id: 'a', halfLifeHours: 1, children: [{ id: 'b', fraction: 1 }] },
    ]).map((c) => c.id);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});

describe('repeated doses', () => {
  it('superpose: two doses = sum of each single-dose curve', () => {
    const comps: SimCompound[] = [
      { id: 'p', halfLifeHours: 8, children: [{ id: 'm', fraction: 0.5 }] },
      { id: 'm', halfLifeHours: 24, children: [] },
    ];
    const opts = { start: 0, minEnd: 150, maxEnd: 150, maxDt: 0.25 };
    const a = simulate(comps, [{ time: 0, compoundId: 'p', amount: 40 }], opts);
    const b = simulate(comps, [{ time: 24, compoundId: 'p', amount: 40 }], opts);
    const ab = simulate(comps, [{ time: 0, compoundId: 'p', amount: 40 }, { time: 24, compoundId: 'p', amount: 40 }], opts);
    for (const t of [5, 23.9, 24.1, 30, 60, 100, 149]) {
      for (const id of ['p', 'm']) {
        const sum = valueAt(a.times, a.amounts[id], t) + valueAt(b.times, b.amounts[id], t);
        expect(valueAt(ab.times, ab.amounts[id], t)).toBeCloseTo(sum, 6);
      }
    }
  });

  it('expands a regimen into individual doses', () => {
    const doses = expandRegimen({ amount: 10, everyHours: 12, start: 0, end: 48 });
    expect(doses.map((d) => d.time)).toEqual([0, 12, 24, 36, 48]);
  });
});

describe('clearance threshold', () => {
  it('5.5 half-lives ≈ 2.2% of peak', () => {
    expect(clearFraction(5.5)).toBeCloseTo(0.0221, 4);
    const r = simulate([{ id: 'a', halfLifeHours: 10, children: [] }], [{ time: 0, compoundId: 'a', amount: 100 }], {
      start: 0, minEnd: 200, maxEnd: 200,
    });
    expect(clearTime(r.times, r.amounts.a, 100 * clearFraction(5.5))).toBeCloseTo(55, 3);
  });
});

describe('validation', () => {
  const intrinsic = (h: number) => ({ mode: 'intrinsic' as const, halfLifeHours: { typical: h, min: null, max: null, rangeType: 'single-value' as const, cv: null }, earlyPhase: null, steadyState: null });
  const lib = (): Library => {
    const a = emptyCompound('a', 'A');
    const b = { ...emptyCompound('b', 'B'), isMetabolite: true, formedFrom: [{ compound: 'a', fraction: 0.6, cyp2d6Multiplier: null }] };
    const c = { ...emptyCompound('c', 'C'), isMetabolite: true, formedFrom: [{ compound: 'b', fraction: 0.5, cyp2d6Multiplier: null }] };
    return { schemaVersion: SCHEMA_VERSION, categories: [{ id: 'opioids', name: 'Opioids', order: 1 }], compounds: [a, b, c], products: [] };
  };

  it('detects cycles', () => {
    const l = lib();
    l.compounds[0] = { ...l.compounds[0], isMetabolite: true, formedFrom: [{ compound: 'c', fraction: 0.1, cyp2d6Multiplier: null }] };
    expect(findCycle(l.compounds)).not.toBeNull();
    expect(validateLibrary(l).errors.some((e) => /cycle/.test(e.message))).toBe(true);
    expect(() =>
      topoOrder([
        { id: 'x', halfLifeHours: 1, children: [{ id: 'y', fraction: 0.5 }] },
        { id: 'y', halfLifeHours: 1, children: [{ id: 'x', fraction: 0.5 }] },
      ]),
    ).toThrow(CycleError);
  });

  it('accepts an acyclic chain', () => {
    expect(findCycle(lib().compounds)).toBeNull();
    expect(validateLibrary(lib()).errors).toEqual([]);
  });

  it('rejects known fractions out of one compound summing to more than 1', () => {
    const l = lib();
    l.compounds.push({ ...emptyCompound('d', 'D'), isMetabolite: true, formedFrom: [{ compound: 'a', fraction: 0.5, cyp2d6Multiplier: null }] });
    expect(fractionSums(l.compounds).get('a')).toBeCloseTo(1.1);
    const errs = validateLibrary(l).errors;
    expect(errs.some((e) => e.id === 'a' && /sum to/.test(e.message))).toBe(true);
  });

  it('treats all-unknown unverified entries as not started, not errors', () => {
    const l = lib();
    for (const c of l.compounds) c.formedFrom = c.formedFrom.map((f) => ({ ...f, fraction: null }));
    const r = validateLibrary(l);
    expect(r.errors).toEqual([]);
    expect(r.progress.compoundsStarted).toBe(0);
    expect(r.progress.modes.unknown).toBe(3);
  });

  it('rejects 0 where null means unknown', () => {
    const l = lib();
    (l.compounds[0] as { molecularWeight: number | null }).molecularWeight = 0;
    l.compounds[1].formedFrom[0].fraction = 0;
    const msgs = validateLibrary(l).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/molecularWeight is 0/);
    expect(msgs).toMatch(/fraction is 0/);
  });

  it('checks ranges and requires a half-life for intrinsic mode', () => {
    const l = lib();
    l.compounds[0].kinetics = { mode: 'intrinsic', halfLifeHours: null, earlyPhase: null, steadyState: null };
    l.compounds[1].kinetics = { mode: 'intrinsic', halfLifeHours: { typical: 5, min: 6, max: null, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: null };
    l.compounds[2].kinetics = { mode: 'intrinsic', halfLifeHours: { typical: 5, min: null, max: null, rangeType: 'cv', cv: null }, earlyPhase: null, steadyState: null };
    const msgs = validateLibrary(l).errors.map((e) => `${e.id}: ${e.message}`).join('\n');
    expect(msgs).toMatch(/a: kinetics.halfLifeHours is required/);
    expect(msgs).toMatch(/b: .*min \(6\) > typical/);
    expect(msgs).toMatch(/c: .*needs cv/);
  });

  const reviewedAll = (sections: string[]) => Object.fromEntries(sections.map((s) => [s, 'reviewer' as const]));
  const PARENT_SECTIONS = ['halfLife', 'metabolism', 'molecularWeight', 'cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics'];

  it('requires source, date and every section reviewed for verified entries', () => {
    const l = lib();
    l.compounds[0] = { ...l.compounds[0], kinetics: intrinsic(5), verified: true, provenance: { halfLife: 'reviewer', qt: 'recall' } };
    const msgs = validateLibrary(l).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/source/);
    expect(msgs).toMatch(/verifiedDate/);
    expect(msgs).toMatch(/not reviewed: metabolism, molecularWeight, cyp2d6, qt, receptors, lingeringEffects, nonlinearKinetics/);
    l.compounds[0] = { ...l.compounds[0], provenance: reviewedAll(PARENT_SECTIONS), source: 'x', verifiedDate: '2026-01-01' };
    expect(validateLibrary(l).errors).toEqual([]);
  });

  it('allows verified with unknown kinetics only when the half-life is confirmed unknown', () => {
    const l = lib();
    const b = l.compounds[1];
    l.compounds[1] = { ...b, verified: true, source: 'x', verifiedDate: '2026-01-01', clinicalRelevance: 'unknown', provenance: reviewedAll([...PARENT_SECTIONS, 'relevance']) };
    let msgs = validateLibrary(l).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/cannot be verified with clinicalRelevance "unknown"/);
    expect(msgs).toMatch(/Confirmed unknown/);
    l.compounds[1] = { ...l.compounds[1], clinicalRelevance: 'inactive', sourceNotes: { halfLife: 'None published. Confirmed unknown — reviewer' } };
    expect(validateLibrary(l).errors).toEqual([]);
    // A metabolite also needs its relevance section reviewed.
    l.compounds[1] = { ...l.compounds[1], provenance: { ...l.compounds[1].provenance, relevance: 'recall' } };
    msgs = validateLibrary(l).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/not reviewed: relevance/);
  });

  it('accepts range-only evidence and rejects incomplete ranges', () => {
    const l = lib();
    const r = (min: number | null, max: number | null, rangeType: 'observed-range' | 'single-value' | 'cohort-means') =>
      ({ mode: 'intrinsic' as const, halfLifeHours: { typical: null, min, max, rangeType, cv: null }, earlyPhase: null, steadyState: null });
    l.compounds[0].kinetics = r(43 * 24, 60 * 24, 'observed-range');
    l.compounds[1].kinetics = r(3, 5, 'cohort-means');
    expect(validateLibrary(l).errors).toEqual([]);
    l.compounds[0].kinetics = r(3, null, 'observed-range');
    l.compounds[1].kinetics = r(3, 5, 'single-value');
    const msgs = validateLibrary(l).errors.map((e) => `${e.id}: ${e.message}`).join('\n');
    expect(msgs).toMatch(/a: .*only one bound/);
    expect(msgs).toMatch(/a: .*needs typical, or both min and max/);
    expect(msgs).toMatch(/b: .*observed-range" or "cohort-means/);
  });

  it('allows zero and partial formation multipliers, but not zero half-life multipliers', () => {
    const l = lib();
    l.compounds[1].formedFrom[0].cyp2d6Multiplier = { poor: 0, ultrarapid: 1.5 };
    l.compounds[0].cyp2d6 = { ...l.compounds[0].cyp2d6, substrate: 'yes', halfLifeMultiplier: { poor: 2 } };
    expect(validateLibrary(l).errors).toEqual([]);
    l.compounds[0].cyp2d6.halfLifeMultiplier = { poor: 0 };
    l.compounds[2].formedFrom[0].cyp2d6Multiplier = { slow: 1 } as never;
    const msgs = validateLibrary(l).errors.map((e) => `${e.id}: ${e.message}`).join('\n');
    expect(msgs).toMatch(/a: cyp2d6.halfLifeMultiplier.poor must be > 0/);
    expect(msgs).toMatch(/c: .*slow is not a phenotype/);
  });

  it('warns about partial kinetics, relevance overrides and unassessed inhibitor notes', () => {
    const l = lib();
    l.compounds[0] = {
      ...l.compounds[0],
      clinicalRelevance: 'inactive',
      kinetics: { ...intrinsic(15), earlyPhase: { fraction: null, halfLifeHours: { typical: 2, min: null, max: null, rangeType: 'single-value', cv: null } }, steadyState: { afterDays: null, halfLifeHours: { typical: 22, min: null, max: null, rangeType: 'single-value', cv: null } } },
      cyp2d6: { substrate: 'yes', halfLifeMultiplier: null, inhibitor: 'none', inhibitionType: 'none' },
      sourceNotes: { cyp2d6: '[checked] CPIC substrate. Inhibition not assessed.' },
    };
    const r = validateLibrary(l);
    expect(r.errors).toEqual([]);
    const w = r.warnings.map((x) => x.message).join('\n');
    expect(w).toMatch(/earlyPhase fraction is unknown — early phase ignored/);
    expect(w).toMatch(/afterDays is unknown/);
    expect(w).toMatch(/inhibition was not assessed/);
    expect(w).toMatch(/parent compound — always treated as active/);
    expect(r.progress.partial).toEqual({ earlyPhaseIgnored: ['a'], steadyStateOnsetUnknown: ['a'], steadyStateIgnored: [] });
  });

  it('reports sections reviewed, relevance and what blocks incomplete products', () => {
    const l = lib();
    l.compounds[0].kinetics = intrinsic(5);
    l.compounds[1] = { ...l.compounds[1], clinicalRelevance: 'inactive' };
    l.products.push({ ...emptyProduct('a_oral', 'A (Oral)', 'a', 'Oral', 'opioids'), provenance: { class: 'reviewer' } });
    let p = validateLibrary(l).progress;
    // b is inactive with unknown kinetics (excluded), and c is only formed through it.
    expect(p.incomplete).toEqual({ total: 1, unknownRelevanceOnly: 1, active: 0 });
    expect(p.metaboliteRelevance).toEqual({ active: 0, inactive: 1, unknown: 1 });
    expect(p.sections).toBe(8 + 9 + 9 + 5);
    expect(p.sectionsReviewed).toBe(1);
    expect(p.categories[0]).toMatchObject({ sections: 31, sectionsReviewed: 1, drugs: 1, drugsVerified: 0 });
    l.compounds[2] = { ...l.compounds[2], clinicalRelevance: 'inactive' };
    p = validateLibrary(l).progress;
    expect(p.incomplete.total).toBe(0);
  });

  it('requires schemaVersion 2.1 and points older files at the right migration', () => {
    const l = lib() as unknown as Record<string, unknown>;
    delete l.schemaVersion;
    expect(validateLibrary(l as never).errors.some((e) => /migrate-v2, then npm run migrate-v2\.1/.test(e.message))).toBe(true);
    l.schemaVersion = 2;
    expect(validateLibrary(l as never).errors.some((e) => /v2 file; run npm run migrate-v2\.1/.test(e.message))).toBe(true);
  });
});
