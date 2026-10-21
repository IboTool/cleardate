import { describe, expect, it } from 'vitest';
import { clearFraction, clearTime, CycleError, expandRegimen, simulate, topoOrder, valueAt, type SimCompound } from './pk';
import { emptyCompound } from './schema';
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
    // Explicit stepping is first-order accurate; at dt = 0.05 h the error is well under 1% of peak.
    expect(maxErr / peak).toBeLessThan(0.01);
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
  const lib = (): Library => {
    const a = emptyCompound('a', 'A');
    const b = { ...emptyCompound('b', 'B'), isMetabolite: true, formedFrom: [{ compound: 'a', fraction: 0.6 }] };
    const c = { ...emptyCompound('c', 'C'), isMetabolite: true, formedFrom: [{ compound: 'b', fraction: 0.5 }] };
    return { categories: [{ id: 'opioids', name: 'Opioids', order: 1 }], compounds: [a, b, c], products: [] };
  };

  it('detects cycles', () => {
    const l = lib();
    l.compounds[0] = { ...l.compounds[0], isMetabolite: true, formedFrom: [{ compound: 'c', fraction: 0.1 }] };
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

  it('rejects fractions out of one compound summing to more than 1', () => {
    const l = lib();
    l.compounds.push({ ...emptyCompound('d', 'D'), isMetabolite: true, formedFrom: [{ compound: 'a', fraction: 0.5 }] });
    expect(fractionSums(l.compounds).get('a')).toBeCloseTo(1.1);
    const errs = validateLibrary(l).errors;
    expect(errs.some((e) => e.id === 'a' && /sum to/.test(e.message))).toBe(true);
  });

  it('treats all-zero unverified entries as not started, not errors', () => {
    const l = lib();
    for (const c of l.compounds) c.formedFrom = c.formedFrom.map((f) => ({ ...f, fraction: 0 }));
    const r = validateLibrary(l);
    expect(r.errors).toEqual([]);
    expect(r.progress.compoundsStarted).toBe(0);
  });

  it('requires source and date for verified entries', () => {
    const l = lib();
    l.compounds[0] = { ...l.compounds[0], verified: true, halfLifeHours: { typical: 5, min: 4, max: 6 } };
    const msgs = validateLibrary(l).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/source/);
    expect(msgs).toMatch(/verifiedDate/);
  });
});
