// Numerical compartment simulation of amount-in-body for one product's compound tree.
//
// Model (deliberately simple — see README "The model and its limitations"):
//   - Pools: an optional release pool per component (depots, ER forms, skin depot), then for each
//     compound a slow pool and, if it has an early phase, a fast pool. Every pool eliminates
//     first-order with k = ln2 / t½. A release pool empties into its compound; a compound's
//     elimination feeds its metabolites by `fraction` (the rest leaves the body untracked).
//   - Input to a compound is split between its fast pool (earlyPhase.fraction) and slow pool.
//   - Bolus doses are added instantly at their time. Zero-order input (patches, infusions) is a
//     constant rate between start and end.
//   - Each step, pools are updated upstream-first. Inflow during the step (zero-order input or an
//     upstream pool's elimination) is treated as uniform over the step, which gives the exact
//     solution for constant inflow:  A' = A·e^(−k·dt) + I·(1 − e^(−k·dt)) / (k·dt).
//   - dt = min(maxDt, shortest active half-life ÷ stepsPerHalfLife), and never crosses a dose
//     time or an input start/stop. A pool is "active" while it holds a non-negligible amount or
//     receives inflow. Compounds marked `quasiSteady` (formation-limited conjugates) are left out
//     of the step-size rule: with uniform inflow they settle to formation rate / k each step.

export interface SimCompound {
  id: string;
  /** Terminal (slow pool) half-life for this run, hours (> 0). */
  halfLifeHours: number;
  /** Share of input cleared by a faster early phase. */
  earlyPhase?: { fraction: number; halfLifeHours: number } | null;
  /** Metabolites formed from this compound, with the fraction of its elimination that forms each. */
  children: { id: string; fraction: number }[];
  /** Exclude from the step-size rule (eliminated much faster than formed). */
  quasiSteady?: boolean;
}

export interface SimRelease {
  id: string;
  halfLifeHours: number;
  /** Compound the release pool empties into. */
  target: string;
}

/** Instant input of `amount` into a compound or release pool. */
export interface SimDose {
  /** Hours on the simulation's time axis. */
  time: number;
  /** Compound id or release pool id. */
  compoundId: string;
  amount: number;
}

/** Constant-rate input (amount per hour) between start and end. */
export interface SimInfusion {
  start: number;
  end: number;
  target: string;
  rate: number;
}

export interface SimOptions {
  start: number;
  /** Always simulate at least until this time. */
  minEnd: number;
  /** Never simulate past this time. */
  maxEnd: number;
  /** Stop after minEnd once every pool is below this fraction of its own peak. Default 1e-4. */
  stopFraction?: number;
  /** Upper bound on the step, hours. Default 1. */
  maxDt?: number;
  /** Steps per shortest active half-life. Default 20. */
  stepsPerHalfLife?: number;
  releases?: SimRelease[];
  infusions?: SimInfusion[];
}

export interface SimResult {
  /** Sample times (hours). At a dose instant there are two samples: before and after the dose. */
  times: number[];
  /** Amount of each compound (fast + slow pools) at each sample time. */
  amounts: Record<string, number[]>;
  peaks: Record<string, number>;
  /** Everything that entered (bolus + infused) up to the end of the simulation. */
  totalDosed: number;
  /** Cumulative amount that has left the body (not into a tracked metabolite) by each sample. */
  eliminated: number[];
  /** Amount still held in release pools at each sample. */
  inRelease: number[];
}

export class CycleError extends Error {
  constructor(public cycle: string[]) {
    super(`Cycle in metabolite links: ${cycle.join(' → ')}`);
  }
}

/** Parents before children. Throws CycleError on a cycle. */
export function topoOrder(compounds: SimCompound[]): SimCompound[] {
  const byId = new Map(compounds.map((c) => [c.id, c]));
  const indeg = new Map(compounds.map((c) => [c.id, 0]));
  for (const c of compounds) for (const ch of c.children) if (byId.has(ch.id)) indeg.set(ch.id, (indeg.get(ch.id) ?? 0) + 1);
  const queue = compounds.filter((c) => indeg.get(c.id) === 0).map((c) => c.id);
  const out: SimCompound[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    const c = byId.get(id)!;
    out.push(c);
    for (const ch of c.children) {
      if (!byId.has(ch.id)) continue;
      const d = indeg.get(ch.id)! - 1;
      indeg.set(ch.id, d);
      if (d === 0) queue.push(ch.id);
    }
  }
  if (out.length !== compounds.length) {
    const left = compounds.filter((c) => !out.includes(c)).map((c) => c.id);
    throw new CycleError(left);
  }
  return out;
}

interface Pool {
  k: number;
  hl: number;
  /** Compound index this pool belongs to (−1 for release pools). */
  compound: number;
  /** Where eliminated amount goes: compound index + fraction. */
  out: { c: number; f: number }[];
  untracked: number;
  quasi: boolean;
}

export function simulate(compounds: SimCompound[], doses: SimDose[], opts: SimOptions): SimResult {
  const order = topoOrder(compounds);
  const n = order.length;
  const cIdx = new Map(order.map((c, i) => [c.id, i]));
  const releases = (opts.releases ?? []).filter((r) => cIdx.has(r.target) && r.halfLifeHours > 0);

  // Pools: releases first, then each compound's fast (optional) and slow pools, in topological order.
  const pools: Pool[] = [];
  const entry = new Map<string, { fast: number; slow: number; f: number }>();
  for (const r of releases) {
    entry.set(r.id, { fast: -1, slow: pools.length, f: 0 });
    pools.push({ k: Math.LN2 / r.halfLifeHours, hl: r.halfLifeHours, compound: -1, out: [{ c: cIdx.get(r.target)!, f: 1 }], untracked: 0, quasi: false });
  }
  const compoundPools: number[][] = [];
  order.forEach((c, i) => {
    const kids = c.children.filter((ch) => cIdx.has(ch.id)).map((ch) => ({ c: cIdx.get(ch.id)!, f: ch.fraction }));
    const known = kids.reduce((s, ch) => s + ch.f, 0);
    const untracked = Math.max(0, 1 - known);
    const ep = c.earlyPhase && c.earlyPhase.fraction > 0 && c.earlyPhase.fraction < 1 && c.earlyPhase.halfLifeHours > 0 ? c.earlyPhase : null;
    const ids: number[] = [];
    let fast = -1;
    if (ep) {
      fast = pools.length;
      ids.push(fast);
      pools.push({ k: Math.LN2 / ep.halfLifeHours, hl: ep.halfLifeHours, compound: i, out: kids, untracked, quasi: !!c.quasiSteady });
    }
    const slow = pools.length;
    ids.push(slow);
    pools.push({ k: Math.LN2 / c.halfLifeHours, hl: c.halfLifeHours, compound: i, out: kids, untracked, quasi: !!c.quasiSteady });
    entry.set(c.id, { fast, slow, f: ep ? ep.fraction : 0 });
    compoundPools.push(ids);
  });
  const P = pools.length;
  const A = new Float64Array(P);
  const inflow = new Float64Array(P);

  const deliver = (target: string, amount: number, into: Float64Array) => {
    const e = entry.get(target);
    if (!e) return;
    if (e.fast >= 0) {
      into[e.fast] += amount * e.f;
      into[e.slow] += amount * (1 - e.f);
    } else into[e.slow] += amount;
  };

  const sorted = doses.filter((d) => entry.has(d.compoundId) && d.amount > 0).sort((a, b) => a.time - b.time);
  const infusions = (opts.infusions ?? []).filter((x) => entry.has(x.target) && x.rate > 0 && x.end > x.start);
  const boundaries = [...new Set(infusions.flatMap((x) => [x.start, x.end]))].sort((a, b) => a - b);
  const totalDosed =
    sorted.reduce((s, d) => s + d.amount, 0) +
    infusions.reduce((s, x) => s + x.rate * Math.max(0, Math.min(x.end, opts.maxEnd) - Math.max(x.start, opts.start)), 0);
  const maxDt = opts.maxDt ?? 1;
  const perHl = opts.stepsPerHalfLife ?? 20;
  const stopFraction = opts.stopFraction ?? 1e-4;
  const activeEps = Math.max(totalDosed, 1e-12) * 1e-9;
  const lastInput = Math.max(sorted.length ? sorted[sorted.length - 1].time : opts.start, ...infusions.map((x) => x.end));

  const peak = new Float64Array(n);
  const poolPeak = new Float64Array(P);
  const times: number[] = [];
  const series: number[][] = order.map(() => []);
  const elimSeries: number[] = [];
  const relSeries: number[] = [];
  let eliminated = 0;

  const record = (t: number) => {
    times.push(t);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const p of compoundPools[i]) s += A[p];
      series[i].push(s);
      if (s > peak[i]) peak[i] = s;
    }
    let r = 0;
    for (let p = 0; p < P; p++) {
      if (A[p] > poolPeak[p]) poolPeak[p] = A[p];
      if (pools[p].compound < 0) r += A[p];
    }
    relSeries.push(r);
    elimSeries.push(eliminated);
  };

  let t = opts.start;
  let di = 0;
  record(t);
  const EPS_T = 1e-9;
  const nextBoundary = (t: number) => {
    for (const b of boundaries) if (b > t + EPS_T) return b;
    return Infinity;
  };

  while (t < opts.maxEnd - EPS_T) {
    // Apply any doses due now (record the pre-dose sample first, then the post-dose one).
    if (di < sorted.length && sorted[di].time <= t + EPS_T) {
      while (di < sorted.length && sorted[di].time <= t + EPS_T) {
        deliver(sorted[di].compoundId, sorted[di].amount, A);
        di++;
      }
      record(t);
    }
    const infusing = infusions.filter((x) => x.start <= t + EPS_T && x.end > t + EPS_T);
    // Stop once everything is cleared, past the requested window and after the last input.
    if (t >= opts.minEnd && t >= lastInput && di >= sorted.length && !infusing.length) {
      let done = true;
      for (let p = 0; p < P; p++) if (A[p] > stopFraction * poolPeak[p] && A[p] > activeEps) { done = false; break; }
      if (done) break;
    }

    // Step size from the shortest half-life among pools that hold drug or receive inflow.
    const fed = new Uint8Array(P);
    for (const x of infusing) {
      const e = entry.get(x.target)!;
      fed[e.slow] = 1;
      if (e.fast >= 0) fed[e.fast] = 1;
    }
    let dt = maxDt;
    for (let p = 0; p < P; p++) {
      const pool = pools[p];
      const active = A[p] > activeEps || fed[p];
      if (active) {
        for (const o of pool.out) for (const q of compoundPools[o.c]) fed[q] = 1;
        if (!pool.quasi && pool.hl / perHl < dt) dt = pool.hl / perHl;
      }
    }
    if (di < sorted.length) dt = Math.min(dt, sorted[di].time - t);
    dt = Math.min(dt, nextBoundary(t) - t, opts.maxEnd - t);
    if (dt <= EPS_T) {
      t = di < sorted.length ? Math.max(t, sorted[di].time) : opts.maxEnd;
      continue;
    }

    inflow.fill(0);
    for (const x of infusing) deliver(x.target, x.rate * dt, inflow);
    for (let p = 0; p < P; p++) {
      const pool = pools[p];
      const a0 = A[p];
      const I = inflow[p];
      if (a0 <= 0 && I <= 0) continue;
      const kdt = pool.k * dt;
      const decay = Math.exp(-kdt);
      const a1 = a0 * decay + (kdt > 1e-12 ? (I * (1 - decay)) / kdt : I);
      const e = a0 + I - a1;
      A[p] = a1;
      for (const o of pool.out) deliver(order[o.c].id, e * o.f, inflow);
      eliminated += e * pool.untracked;
    }
    t += dt;
    record(t);
  }

  const amounts: Record<string, number[]> = {};
  const peaks: Record<string, number> = {};
  order.forEach((c, i) => {
    amounts[c.id] = series[i];
    peaks[c.id] = peak[i];
  });
  return { times, amounts, peaks, totalDosed, eliminated: elimSeries, inRelease: relSeries };
}

// ---------- doses and regimens ----------

export interface RegimenSpec {
  amount: number;
  /** Interval, hours. */
  everyHours: number;
  start: number;
  end: number;
}

/** Expand a regimen into individual doses from start to end inclusive. */
export function expandRegimen(r: RegimenSpec, maxDoses = 5000): { time: number; amount: number }[] {
  const out: { time: number; amount: number }[] = [];
  if (!(r.everyHours > 0) || r.end < r.start) return out;
  for (let i = 0; i < maxDoses; i++) {
    const t = r.start + i * r.everyHours;
    if (t > r.end + 1e-9) break;
    out.push({ time: t, amount: r.amount });
  }
  return out;
}

// ---------- clearance ----------

/** Fraction of peak left after X half-lives. 5.5 → ≈2.2%. */
export const clearFraction = (halfLives: number) => Math.pow(2, -halfLives);

/**
 * First time after which the series stays below threshold for good. Returns null if it is still
 * above at the end of the simulated window, or -Infinity if it never exceeded the threshold.
 */
export function clearTime(times: number[], values: number[], threshold: number): number | null {
  let last = -1;
  for (let i = values.length - 1; i >= 0; i--)
    if (values[i] >= threshold) { last = i; break; }
  if (last < 0) return -Infinity;
  if (last === values.length - 1) return null;
  // Linear interpolation between the last sample above and the first one below.
  const t0 = times[last], t1 = times[last + 1], v0 = values[last], v1 = values[last + 1];
  if (v0 === v1) return t1;
  return t0 + ((v0 - threshold) / (v0 - v1)) * (t1 - t0);
}

/** Intervals during which the series is at or above threshold. */
export function intervalsAbove(times: number[], values: number[], threshold: number): [number, number][] {
  const out: [number, number][] = [];
  let startT: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const above = values[i] >= threshold && values[i] > 0;
    if (above && startT === null) startT = times[i];
    if (!above && startT !== null) {
      out.push([startT, times[i]]);
      startT = null;
    }
  }
  if (startT !== null) out.push([startT, times[times.length - 1]]);
  return out;
}

/** Value at time t (linear interpolation; at a duplicated dose instant the post-dose value wins). */
export function valueAt(times: number[], values: number[], t: number): number {
  if (!times.length || t < times[0]) return 0;
  if (t >= times[times.length - 1]) return values[values.length - 1];
  let lo = 0, hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  const t0 = times[lo], t1 = times[hi];
  if (t1 === t0) return values[hi];
  return values[lo] + ((values[hi] - values[lo]) * (t - t0)) / (t1 - t0);
}
