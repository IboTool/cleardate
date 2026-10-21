// Numerical compartment simulation of amount-in-body for a parent compound and its metabolites.
//
// Model (deliberately simple — see README "Model and limitations"):
//   - State: amount of each compound in the body (in parent-mg-equivalents).
//   - Each step of length dt, in topological order (parents before metabolites):
//       eliminated = A · (1 − e^(−k·dt)),  k = ln2 / t½
//       A -= eliminated;  each child metabolite += fraction × eliminated
//     The remainder (1 − Σ fractions) leaves the body without forming a tracked metabolite.
//   - Doses are added to the parent instantaneously at their exact time (absorption is ignored).
//   - dt = min(maxDt, shortest active half-life ÷ 20). A compound is "active" while it holds a
//     non-negligible amount or one of its parents does, so a short-lived parent (e.g. heroin)
//     only forces small steps while it is actually present.

export interface SimCompound {
  id: string;
  /** Effective half-life for this run, hours (> 0). */
  halfLifeHours: number;
  /** Metabolites formed from this compound, with the fraction of its elimination that forms each. */
  children: { id: string; fraction: number }[];
}

export interface SimDose {
  /** Hours on the simulation's time axis. */
  time: number;
  compoundId: string;
  amount: number;
}

export interface SimOptions {
  start: number;
  /** Always simulate at least until this time. */
  minEnd: number;
  /** Never simulate past this time. */
  maxEnd: number;
  /** Stop after minEnd once every compound is below this fraction of its own peak. Default 1e-4. */
  stopFraction?: number;
  /** Upper bound on the step, hours. Default 1. */
  maxDt?: number;
  /** Steps per shortest active half-life. Default 20. */
  stepsPerHalfLife?: number;
}

export interface SimResult {
  /** Sample times (hours). At a dose instant there are two samples: before and after the dose. */
  times: number[];
  /** Amount of each compound at each sample time, parent-mg-equivalents. */
  amounts: Record<string, number[]>;
  peaks: Record<string, number>;
  totalDosed: number;
  /** Cumulative amount that has left the body (not into a tracked metabolite) by each sample. */
  eliminated: number[];
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

export function simulate(compounds: SimCompound[], doses: SimDose[], opts: SimOptions): SimResult {
  const order = topoOrder(compounds);
  const n = order.length;
  const idx = new Map(order.map((c, i) => [c.id, i]));
  const k = order.map((c) => Math.LN2 / c.halfLifeHours);
  const hl = order.map((c) => c.halfLifeHours);
  const kids = order.map((c) => c.children.filter((ch) => idx.has(ch.id)).map((ch) => ({ i: idx.get(ch.id)!, f: ch.fraction })));
  const untrackedFrac = order.map((c, i) => Math.max(0, 1 - kids[i].reduce((s, ch) => s + ch.f, 0)) + c.children.filter((ch) => !idx.has(ch.id)).reduce((s, ch) => s + ch.fraction, 0));
  const parentsOf: number[][] = order.map(() => []);
  kids.forEach((ks, p) => ks.forEach((ch) => parentsOf[ch.i].push(p)));

  const sorted = doses.filter((d) => idx.has(d.compoundId) && d.amount > 0).sort((a, b) => a.time - b.time);
  const totalDosed = sorted.reduce((s, d) => s + d.amount, 0);
  const maxDt = opts.maxDt ?? 1;
  const perHl = opts.stepsPerHalfLife ?? 20;
  const stopFraction = opts.stopFraction ?? 1e-4;
  const activeEps = Math.max(totalDosed, 1e-12) * 1e-9;

  const A = new Float64Array(n);
  const peak = new Float64Array(n);
  const times: number[] = [];
  const series: number[][] = order.map(() => []);
  const elimSeries: number[] = [];
  let eliminated = 0;
  const lastDose = sorted.length ? sorted[sorted.length - 1].time : opts.start;

  const record = (t: number) => {
    times.push(t);
    for (let i = 0; i < n; i++) {
      series[i].push(A[i]);
      if (A[i] > peak[i]) peak[i] = A[i];
    }
    elimSeries.push(eliminated);
  };

  let t = opts.start;
  let di = 0;
  record(t);
  const EPS_T = 1e-9;
  while (t < opts.maxEnd - EPS_T) {
    // Apply any doses due now (record the pre-dose sample first, then the post-dose one).
    if (di < sorted.length && sorted[di].time <= t + EPS_T) {
      while (di < sorted.length && sorted[di].time <= t + EPS_T) {
        A[idx.get(sorted[di].compoundId)!] += sorted[di].amount;
        di++;
      }
      record(t);
    }
    // Stop once everything is cleared, past the requested window and after the last dose.
    if (t >= opts.minEnd && t >= lastDose && di >= sorted.length) {
      let done = true;
      for (let i = 0; i < n; i++) if (A[i] > stopFraction * peak[i] && A[i] > activeEps) { done = false; break; }
      if (done) break;
    }
    // Step size from the shortest half-life among compounds that are present or being fed.
    let dt = maxDt;
    for (let i = 0; i < n; i++) {
      let active = A[i] > activeEps;
      if (!active) for (const p of parentsOf[i]) if (A[p] > activeEps) { active = true; break; }
      if (active && hl[i] / perHl < dt) dt = hl[i] / perHl;
    }
    if (di < sorted.length) dt = Math.min(dt, sorted[di].time - t);
    dt = Math.min(dt, opts.maxEnd - t);
    if (dt <= EPS_T) {
      t = di < sorted.length ? Math.max(t, sorted[di].time) : opts.maxEnd;
      continue;
    }
    for (let i = 0; i < n; i++) {
      if (A[i] <= 0) continue;
      const e = A[i] * (1 - Math.exp(-k[i] * dt));
      A[i] -= e;
      for (const ch of kids[i]) A[ch.i] += ch.f * e;
      eliminated += e * untrackedFrac[i];
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
  return { times, amounts, peaks, totalDosed, eliminated: elimSeries };
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
