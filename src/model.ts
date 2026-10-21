// Turns the library + session into everything the chart, tracks, warnings and exports need.
// All PK maths lives in pk.ts; this module decides *what* to simulate (schema v2).
//
// Each dosed product is simulated on its own (linear kinetics → superposition holds): its
// components, their release pools and every compound reachable through metabolite links.
// A shared metabolite formed from two products appears once per product, in that product's colour.

import { clearFraction, clearTime, expandRegimen, intervalsAbove, simulate, valueAt, type SimCompound, type SimInfusion, type SimRelease } from './pk';
import { hasIntrinsicKinetics, primaryCompound, rangeBounds, type Bounds } from './schema';
import { findCycle } from './validate';
import type {
  Compound, CustomDrugs, DoseEntry, DoseUnit, InhibitorStrength, Library, Phenotype, PatientPhenotype, PhenotypeMap,
  Product, QtTier, Range, Session, Settings,
} from './types';

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const IBOGAINE_KEY = '__ibogaine__';

// ---------- library index ----------

export interface Edge {
  id: string;
  /** null = unknown (simulated as 1, downstream curves normalized). */
  fraction: number | null;
  multiplier: PhenotypeMap | null;
}

export interface LibraryIndex {
  lib: Library;
  compounds: Map<string, Compound>;
  products: Map<string, Product>;
  children: Map<string, Edge[]>;
  /** Load-time problems shown to the user (fractions > 1, cycles). */
  loadWarnings: string[];
}

export function mergeLibraries(base: Library, ...extra: Partial<Library>[]): Library {
  const out: Library = { ...base, categories: [...base.categories], compounds: [...base.compounds], products: [...base.products] };
  for (const e of extra) {
    for (const c of e.categories ?? []) if (!out.categories.some((x) => x.id === c.id)) out.categories.push(c);
    for (const c of e.compounds ?? []) {
      const i = out.compounds.findIndex((x) => x.id === c.id);
      if (i >= 0) out.compounds[i] = c;
      else out.compounds.push(c);
    }
    for (const p of e.products ?? []) {
      const i = out.products.findIndex((x) => x.id === p.id);
      if (i >= 0) out.products[i] = p;
      else out.products.push(p);
    }
  }
  return out;
}

/** Library + session custom drugs, with custom → library metabolite links applied to copies. */
export function withCustom(base: Library, custom: CustomDrugs): Library {
  const merged = mergeLibraries(base, { compounds: custom.compounds, products: custom.products });
  for (const l of custom.links ?? []) {
    const i = merged.compounds.findIndex((c) => c.id === l.compound);
    if (i < 0) continue;
    const c = merged.compounds[i];
    if (c.formedFrom.some((f) => f.compound === l.from)) continue;
    merged.compounds[i] = { ...c, isMetabolite: true, formedFrom: [...c.formedFrom, { compound: l.from, fraction: l.fraction, cyp2d6Multiplier: null }] };
  }
  return merged;
}

export function buildIndex(lib: Library): LibraryIndex {
  const compounds = new Map(lib.compounds.map((c) => [c.id, c]));
  const products = new Map(lib.products.map((p) => [p.id, p]));
  const loadWarnings: string[] = [];

  // Reject cycles: drop the links that close them so the app keeps working, and say so.
  const working = lib.compounds.map((c) => ({ id: c.id, formedFrom: [...c.formedFrom] }));
  for (let guard = 0; guard < 50; guard++) {
    const cyc = findCycle(working);
    if (!cyc) break;
    const [child, parent] = [cyc[0], cyc[1]];
    const w = working.find((c) => c.id === child)!;
    w.formedFrom = w.formedFrom.filter((f) => f.compound !== parent);
    loadWarnings.push(`Cycle in metabolite links (${cyc.join(' → ')}); the link ${parent} → ${child} is ignored.`);
  }

  const children = new Map<string, Edge[]>();
  for (const c of working)
    for (const f of c.formedFrom) {
      if (!compounds.has(f.compound)) continue;
      const list = children.get(f.compound) ?? [];
      list.push({ id: c.id, fraction: f.fraction, multiplier: f.cyp2d6Multiplier ?? null });
      children.set(f.compound, list);
    }
  for (const [src, edges] of children) {
    const sum = edges.reduce((s, e) => s + (e.fraction ?? 0), 0);
    if (sum > 1 + 1e-9) {
      for (const e of edges) if (e.fraction !== null) e.fraction /= sum;
      loadWarnings.push(`Metabolite fractions formed from ${compounds.get(src)?.name ?? src} sum to ${sum.toFixed(2)} (> 1); scaled down to 1 for the simulation.`);
    }
  }
  return { lib, compounds, products, children, loadWarnings };
}

/** Components and every downstream compound with depth (components = 0), in breadth-first order. */
export function productTree(idx: LibraryIndex, roots: string[]): { id: string; depth: number; root: string }[] {
  const out = roots.map((id) => ({ id, depth: 0, root: id }));
  const seen = new Set(roots);
  for (let i = 0; i < out.length; i++)
    for (const ch of idx.children.get(out[i].id) ?? [])
      if (!seen.has(ch.id)) {
        seen.add(ch.id);
        out.push({ id: ch.id, depth: out[i].depth + 1, root: out[i].root });
      }
  return out;
}

export const componentIds = (p: Product) => p.components.map((c) => c.compound);

/** The primary component can be simulated (as v1's "has data"). */
export const productHasData = (idx: LibraryIndex, p: Product) => hasIntrinsicKinetics(idx.compounds.get(primaryCompound(p)));

/**
 * Compounds reachable from the product that can't be simulated: `unknown` kinetics (unless the
 * setting treats them as formation-limited) or a component without a half-life.
 */
export function missingKinetics(idx: LibraryIndex, p: Product, unknownAsFL: boolean): string[] {
  const roots = componentIds(p);
  const out: string[] = [];
  for (const n of productTree(idx, roots)) {
    const c = idx.compounds.get(n.id);
    if (!c) continue;
    if (n.depth === 0 ? !hasIntrinsicKinetics(c) : c.kinetics.mode === 'unknown' && !unknownAsFL) out.push(c.id);
    else if (n.depth > 0 && c.kinetics.mode === 'intrinsic' && !hasIntrinsicKinetics(c)) out.push(c.id);
  }
  return out;
}

export type DataStatus = 'no-data' | 'incomplete' | 'ok';

export function productDataStatus(idx: LibraryIndex, p: Product, unknownAsFL: boolean): DataStatus {
  if (!productHasData(idx, p)) return 'no-data';
  return missingKinetics(idx, p, unknownAsFL).length ? 'incomplete' : 'ok';
}

// ---------- dates and doses ----------

export const parseLocal = (s: string | undefined): number => (s ? new Date(s).getTime() : NaN);

export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const isRateUnit = (u: DoseUnit) => u === 'µg/h' || u === 'mg/h';

/** Convert an amount between dose units of the same kind (mass ↔ mass, rate ↔ rate). null if incompatible. */
export function convertUnit(v: number, from: DoseUnit, to: DoseUnit): number | null {
  if (from === to) return v;
  if (isRateUnit(from) !== isRateUnit(to)) return null;
  const mg = from.startsWith('µg') ? v / 1000 : v;
  return to.startsWith('µg') ? mg * 1000 : mg;
}

/** mg (or mg/h) from an amount in `unit`. */
export const toMg = (v: number, unit: DoseUnit) => (unit.startsWith('µg') ? v / 1000 : v);

export interface DoseEvent {
  /** Epoch ms. */
  time: number;
  /** In the entry's unit (a rate for patches). */
  amount: number;
  unit: DoseUnit;
  /** Zero-order: removal time, epoch ms. */
  end?: number;
}

/** Expand a dose entry (single or regimen) into individual doses / applications, epoch ms. */
export function expandDose(d: DoseEntry, defaultDurationHours?: number | null): DoseEvent[] {
  const rate = isRateUnit(d.unit);
  const dur = (d.durationHours ?? defaultDurationHours ?? 24) * HOUR;
  const ev = (time: number): DoseEvent => (rate ? { time, amount: d.amount, unit: d.unit, end: time + dur } : { time, amount: d.amount, unit: d.unit });
  if (!(d.amount > 0)) return [];
  if (d.kind === 'single') {
    const t = parseLocal(d.time);
    return Number.isFinite(t) ? [ev(t)] : [];
  }
  const r = d.regimen;
  if (!r) return [];
  const start = parseLocal(r.start);
  const end = parseLocal(r.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const everyHours = r.every * (r.unit === 'days' ? 24 : 1);
  return expandRegimen({ amount: d.amount, everyHours, start: 0, end: (end - start) / HOUR }).map((x) => ev(start + x.time * HOUR));
}

/** Longest continuous dosing span (days): consecutive doses / applications ≤ 48 h apart. */
export function continuousDays(events: DoseEvent[]): number {
  const iv = events.map((e) => [e.time, e.end ?? e.time] as [number, number]).sort((a, b) => a[0] - b[0]);
  let best = 0, s = NaN, e = NaN;
  for (const [a, b] of iv) {
    if (!Number.isFinite(s) || a > e + 48 * HOUR) {
      s = a;
      e = b;
    } else e = Math.max(e, b);
    best = Math.max(best, e - s);
  }
  return best / DAY;
}

// ---------- results ----------

export type RunName = 'min' | 'typical' | 'max';
const RUNS: RunName[] = ['min', 'typical', 'max'];

export interface Run {
  /** Epoch ms. */
  times: number[];
  /** Amount in the body, mg of the dosed component (see mgFactor for metabolites). */
  amounts: number[];
}

export interface CompoundCurve {
  key: string; // `${productKey}:${compoundId}`
  productKey: string;
  compound: Compound;
  depth: number;
  runs: Record<RunName, Run>;
  peak: number;
  threshold: number;
  clearAt: number | null; // typical run; null = beyond simulated window
  clearAtMax: number | null;
  /** Multiply amounts by this to get mg of this compound; null when molecular weights are missing. */
  mgFactor: number | null;
  /** Downstream of an unknown fraction: plotted as % of own peak ("amount unknown — timing only"). */
  normalized: boolean;
  /** Labels for every assumption behind this curve (tooltips, export). */
  assumptions: string[];
  formationLimited: boolean;
}

export type ClearStatus = 'clear' | 'assumptions' | 'incomplete';

export interface ProductResult {
  key: string;
  product: Product;
  name: string;
  isIbogaine: boolean;
  color: string;
  doses: DoseEvent[];
  /** Latest dose, for the legend. */
  latest: DoseEvent | null;
  curves: CompoundCurve[];
  clearAt: number | null;
  clearAtMax: number | null;
  status: ClearStatus;
  /** Compound names with missing kinetics (status "incomplete"). */
  missing: string[];
  /** Product-level assumption labels (union of the curves' plus input-level ones). */
  assumptions: string[];
  /** Amounts are on an administered basis (bioavailability not applied for some component). */
  administered: boolean;
  /** Compounds with qt / cyp2d6 / receptors still unassessed (export section). */
  unassessed: { qt: string[]; cyp2d6: string[]; receptors: string[] };
  pmAdjusted?: boolean;
}

export interface CypInterval {
  start: number;
  end: number;
  strength: Exclude<InhibitorStrength, 'none' | 'unassessed'>;
  tail: boolean;
  compound: string;
  productKey: string;
}

export interface QtLane {
  key: string;
  curveKey: string;
  productKey: string;
  compound: string;
  tier: QtTier;
  depth: number;
  /** Visible segments: [start, end, opacity (fraction of own peak)]. */
  segments: [number, number, number][];
}

export interface QtResult {
  lanes: QtLane[];
  /** Summed relative load is only defined when every lane is calibrated. */
  loadAvailable: boolean;
  loadUnavailableReason: string;
  load: { t: number; load: number }[];
}

export interface LingeringBand {
  start: number;
  end: number;
  compound: string;
  productKey: string;
  note: string;
}

export interface ReceptorOverlap {
  target: string;
  hits: { compound: string; action: string; productKey: string; productName: string }[];
}

export interface Warning {
  level: 'danger' | 'warn' | 'info';
  text: string;
}

export interface Scenario {
  products: ProductResult[];
  axisStart: number;
  axisEnd: number;
  now: number;
  ibogaineAt: number | null;
  ibogaineDoseTimes: number[];
  cyp: CypInterval[];
  cypAtTreatment: { inhibited: boolean; by: string[]; unassessed: string[] };
  qt: QtResult;
  lingering: LingeringBand[];
  overlaps: ReceptorOverlap[];
  /** Compounds present at the flood dose whose receptor list hasn't been researched. */
  receptorsUnassessedAtTreatment: string[];
  warnings: Warning[];
}

export const PRODUCT_COLORS = [
  '#7c9cff', '#ff8a65', '#4dd0a7', '#f06292', '#ffd54f', '#9575cd', '#4fc3f7', '#aed581',
  '#ff7043', '#ba68c8', '#4db6ac', '#e57373', '#90a4ae', '#dce775', '#64b5f6', '#ffb74d',
];
export const IBOGAINE_COLOR = '#e8c36a';

const STRENGTH_RANK = { weak: 1, moderate: 2, strong: 3 } as const;

/** Phenotype used for each run. Unknown runs ultrarapid and poor as the band edges. */
function phenotypeFor(phen: PatientPhenotype, run: RunName): Phenotype {
  if (phen !== 'unknown') return phen;
  return run === 'min' ? 'ultrarapid' : run === 'max' ? 'poor' : 'normal';
}

/** Half-life multiplier for a CYP2D6 substrate in a given run. */
function hlMultiplier(c: Compound, phen: PatientPhenotype, run: RunName): number {
  const m = c.cyp2d6.substrate === 'yes' ? c.cyp2d6.halfLifeMultiplier : null;
  if (!m) return 1;
  if (phen !== 'unknown') return m[phen] || 1;
  const edges = [m.poor || 1, m.ultrarapid || 1];
  return run === 'min' ? Math.min(...edges) : run === 'max' ? Math.max(...edges) : m.normal || 1;
}

interface SimRequest {
  key: string;
  product: Product;
  name: string;
  isIbogaine: boolean;
  color: string;
  doses: DoseEvent[];
  phenotype: PatientPhenotype;
}

interface Ctx {
  t0: number;
  minEndMs: number;
  maxEndMs: number;
  settings: Settings;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function simulateProduct(idx: LibraryIndex, req: SimRequest, ctx: Ctx, warnings: Warning[]): ProductResult {
  const { product } = req;
  const s = ctx.settings;
  const roots = componentIds(product);
  const tree = productTree(idx, roots);
  const rootOf = new Map(tree.map((n) => [n.id, n]));
  const productAssumptions = new Set<string>();
  const curveAssumptions = new Map<string, Set<string>>();
  const assume = (id: string | null, text: string) => {
    if (id) {
      const set = curveAssumptions.get(id) ?? new Set<string>();
      set.add(text);
      curveAssumptions.set(id, set);
    }
    productAssumptions.add(text);
  };

  // Steady state applies when this product has been dosed continuously for afterDays.
  const runDays = continuousDays(req.doses);

  // Decide what can be simulated, parents first (Kahn's algorithm over the reachable subgraph).
  const inTree = new Set(tree.map((n) => n.id));
  const parents = new Map<string, string[]>();
  for (const id of inTree) for (const e of idx.children.get(id) ?? []) if (inTree.has(e.id)) parents.set(e.id, [...(parents.get(e.id) ?? []), id]);
  const indeg = new Map([...inTree].map((id) => [id, (parents.get(id) ?? []).length]));
  const queue = [...inTree].filter((id) => indeg.get(id) === 0);
  const topo: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    topo.push(id);
    for (const e of idx.children.get(id) ?? []) if (inTree.has(e.id)) {
      indeg.set(e.id, indeg.get(e.id)! - 1);
      if (indeg.get(e.id) === 0) queue.push(e.id);
    }
  }

  type Kind = 'intrinsic' | 'formation-limited';
  const included = new Map<string, Kind>();
  const normalized = new Set<string>();
  const missing: string[] = [];
  const steadyUsed = new Set<string>();
  for (const id of topo) {
    const c = idx.compounds.get(id);
    if (!c) continue;
    const isRoot = roots.includes(id);
    const fedBy = (parents.get(id) ?? []).filter((p) => included.has(p));
    if (isRoot) {
      if (hasIntrinsicKinetics(c)) included.set(id, 'intrinsic');
      else missing.push(c.name);
      continue;
    }
    if (!fedBy.length) continue; // downstream of something missing
    const mode = c.kinetics.mode;
    if (mode === 'intrinsic' && hasIntrinsicKinetics(c)) included.set(id, 'intrinsic');
    else if (mode === 'formation-limited') {
      included.set(id, 'formation-limited');
      assume(id, `${c.name}: tracks parent (formation-limited)`);
    } else if (mode === 'unknown' && s.unknownAsFormationLimited) {
      included.set(id, 'formation-limited');
      assume(id, `${c.name}: kinetics unknown — assumed formation-limited`);
    } else {
      missing.push(c.name);
      continue;
    }
    const nullEdge = fedBy.some((p) => (idx.children.get(p) ?? []).some((e) => e.id === id && e.fraction === null));
    if (nullEdge || fedBy.some((p) => normalized.has(p))) {
      normalized.add(id);
      assume(id, `${c.name}: amount unknown — timing only`);
    }
  }
  const order = topo.filter((id) => included.has(id));

  // Per-run parameters.
  const bound = (r: Range | null | undefined, what: string, id: string | null): Bounds | null => {
    const b = rangeBounds(r, s.assumedCv);
    if (b?.assumed) assume(id, `assumed spread (CV ${pct(s.assumedCv)}) on ${what}`);
    return b;
  };
  const anyRelease = product.input.type !== 'bolus';
  const releaseB = anyRelease ? bound(product.input.releaseHalfLifeHours, `${product.name} release half-life`, null) : null;
  if (product.input.type === 'first-order-release' && !releaseB)
    assume(null, 'release half-life unknown — simulated as immediate release');

  const params = new Map<string, { terminal: Bounds; early: { fraction: number; hl: Bounds } | null }>();
  for (const id of order) {
    if (included.get(id) !== 'intrinsic') continue;
    const c = idx.compounds.get(id)!;
    const k = c.kinetics;
    const ss = k.steadyState;
    if (ss && ss.afterDays && runDays >= ss.afterDays) {
      const b = bound(ss.halfLifeHours, `${c.name} steady-state half-life`, id);
      if (b) {
        steadyUsed.add(id);
        assume(id, `${c.name}: steady-state half-life used (dosed ≥ ${ss.afterDays} days)`);
        params.set(id, { terminal: b, early: null });
        continue;
      }
    }
    const terminal = bound(k.halfLifeHours, `${c.name} half-life`, id)!;
    const ep = k.earlyPhase;
    const epB = ep && ep.fraction && ep.fraction > 0 && ep.fraction < 1 ? bound(ep.halfLifeHours, `${c.name} early-phase half-life`, id) : null;
    params.set(id, { terminal, early: epB ? { fraction: ep!.fraction!, hl: epB } : null });
  }

  const sims = {} as Record<RunName, ReturnType<typeof simulate>>;
  const h = (ms: number) => (ms - ctx.t0) / HOUR;
  for (const run of RUNS) {
    const phen = phenotypeFor(req.phenotype, run);
    const hl = new Map<string, number>();
    const list: SimCompound[] = [];
    for (const id of order) {
      const c = idx.compounds.get(id)!;
      let terminal: number;
      let early: SimCompound['earlyPhase'] = null;
      if (included.get(id) === 'intrinsic') {
        const pr = params.get(id)!;
        const m = hlMultiplier(c, req.phenotype, run);
        terminal = pr.terminal[run] * m;
        if (pr.early) early = { fraction: pr.early.fraction, halfLifeHours: pr.early.hl[run] * m };
      } else {
        // Formation-limited: one-tenth of the fastest feeding parent's effective half-life.
        const ps = (parents.get(id) ?? []).filter((p) => hl.has(p)).map((p) => hl.get(p)!);
        terminal = Math.min(...ps) / 10;
      }
      hl.set(id, terminal);
      // Effective formation fractions (unknown → 1) with the CYP2D6 formation multiplier.
      const edges = (idx.children.get(id) ?? []).filter((e) => included.has(e.id));
      const eff = edges.map((e) => ({ id: e.id, known: e.fraction !== null, fraction: (e.fraction ?? 1) * (e.multiplier ? e.multiplier[phen] ?? 1 : 1) }));
      const knownSum = eff.filter((e) => e.known).reduce((a, e) => a + e.fraction, 0);
      if (knownSum > 1 + 1e-9) {
        for (const e of eff) if (e.known) e.fraction /= knownSum;
        if (run === 'typical')
          warnings.push({ level: 'warn', text: `${req.name}: CYP2D6-adjusted fractions formed from ${c.name} exceed 1; scaled down proportionally.` });
      }
      list.push({ id, halfLifeHours: terminal, earlyPhase: early, children: eff.map((e) => ({ id: e.id, fraction: e.fraction })), quasiSteady: included.get(id) === 'formation-limited' });
    }

    // Inputs: each component gets dose × ratio × saltFactor × bioavailability, via a release pool if any.
    const releases: SimRelease[] = [];
    const bolus: { time: number; compoundId: string; amount: number }[] = [];
    const infusions: SimInfusion[] = [];
    const relHl = releaseB ? releaseB[run] : null;
    for (const comp of product.components) {
      if (!included.has(comp.compound)) continue;
      const factor = comp.ratio * (comp.saltFactor ?? 1) * (comp.bioavailability ?? 1);
      const target = relHl ? `rel:${comp.compound}` : comp.compound;
      if (relHl) releases.push({ id: target, halfLifeHours: relHl, target: comp.compound });
      for (const d of req.doses) {
        const mg = toMg(d.amount, d.unit) * factor;
        if (d.end !== undefined) infusions.push({ start: h(d.time), end: h(d.end), target, rate: mg });
        else bolus.push({ time: h(d.time), compoundId: target, amount: mg });
      }
    }
    sims[run] = simulate(list, bolus, {
      start: Math.min(...req.doses.map((d) => h(d.time))),
      minEnd: h(ctx.minEndMs),
      maxEnd: h(ctx.maxEndMs),
      releases,
      infusions,
    });
  }

  const frac = clearFraction(s.clearHalfLives);
  const curves: CompoundCurve[] = [];
  for (const node of tree) {
    if (!included.has(node.id)) continue;
    const c = idx.compounds.get(node.id)!;
    const mk = (run: RunName): Run => ({ times: sims[run].times.map((x) => ctx.t0 + x * HOUR), amounts: sims[run].amounts[node.id] });
    const runsOut = { min: mk('min'), typical: mk('typical'), max: mk('max') };
    const peak = sims.typical.peaks[node.id];
    const threshold = peak * frac;
    const ct = (r: Run, pk: number) => {
      if (!(pk > 0)) return null;
      const v = clearTime(r.times, r.amounts, pk * frac);
      return v === -Infinity ? r.times[0] : v;
    };
    const root = idx.compounds.get(rootOf.get(node.id)!.root);
    const mwR = root?.molecularWeight ?? null;
    const mwC = c.molecularWeight;
    curves.push({
      key: `${req.key}:${node.id}`,
      productKey: req.key,
      compound: c,
      depth: node.depth,
      runs: runsOut,
      peak,
      threshold,
      clearAt: ct(runsOut.typical, peak),
      clearAtMax: ct(runsOut.max, sims.max.peaks[node.id]),
      mgFactor: node.depth === 0 ? 1 : mwR && mwC ? mwC / mwR : null,
      normalized: normalized.has(node.id),
      assumptions: [...(curveAssumptions.get(node.id) ?? [])],
      formationLimited: included.get(node.id) === 'formation-limited',
    });
  }
  const maxOf = (vals: (number | null)[]) => (vals.some((v) => v === null) ? null : Math.max(...(vals as number[])));
  const latest = [...req.doses].sort((a, b) => b.time - a.time)[0] ?? null;
  const usedCompounds = curves.map((c) => c.compound);
  return {
    key: req.key,
    product,
    name: req.name,
    isIbogaine: req.isIbogaine,
    color: req.color,
    doses: req.doses,
    latest,
    curves,
    clearAt: curves.length ? maxOf(curves.map((c) => c.clearAt)) : null,
    clearAtMax: curves.length ? maxOf(curves.map((c) => c.clearAtMax)) : null,
    status: missing.length ? 'incomplete' : productAssumptions.size ? 'assumptions' : 'clear',
    missing,
    assumptions: [...productAssumptions],
    administered: product.components.some((c) => c.bioavailability === null),
    unassessed: {
      qt: usedCompounds.filter((c) => c.qt.tier === 'unassessed').map((c) => c.name),
      cyp2d6: usedCompounds.filter((c) => c.cyp2d6.substrate === 'unassessed' || c.cyp2d6.inhibitor === 'unassessed').map((c) => c.name),
      receptors: usedCompounds.filter((c) => !c.receptorsAssessed).map((c) => c.name),
    },
  };
}

export function displayName(p: Product): string {
  const suffix = ` (${p.route})`;
  return p.name.endsWith(suffix) ? p.name.slice(0, -suffix.length) : p.name;
}

/** Stable colour per product: order of first entry in the dose list. */
export function productColors(session: Session): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of session.doses) if (!m.has(d.productId)) m.set(d.productId, PRODUCT_COLORS[m.size % PRODUCT_COLORS.length]);
  return m;
}

export function findIbogaineProduct(idx: LibraryIndex): Product {
  const all = idx.lib.products.filter((x) => primaryCompound(x) === 'ibogaine');
  const p = all.find((x) => /oral/i.test(x.route)) ?? all[0];
  if (p) return p;
  return {
    id: 'ibogaine_oral', candidateId: 'ibogaine', name: 'Ibogaine (Oral)', aliases: [], category: 'psychedelics_dissociatives',
    secondaryCategories: [], class: '', route: 'Oral', formulation: null,
    components: [{ compound: 'ibogaine', ratio: 1, saltFactor: null, bioavailability: null }], doseUnit: 'mg',
    input: { type: 'bolus', releaseHalfLifeHours: null, defaultDurationHours: null },
    typicalDose: { amount: null, unit: 'mg', basis: 'single-use' }, provenance: {}, sourceNotes: {}, source: '', verified: false, verifiedDate: '',
  };
}

/** A dose entry's events in the product's unit; null if the stored unit can't be converted. */
function eventsFor(d: DoseEntry, p: Product): DoseEvent[] | null {
  const amount = convertUnit(d.amount, d.unit, p.doseUnit);
  if (amount === null) return null;
  return expandDose({ ...d, amount, unit: p.doseUnit }, p.input.defaultDurationHours);
}

export function computeScenario(idx: LibraryIndex, session: Session, now: number): Scenario {
  const s = session.settings;
  const warnings: Warning[] = idx.loadWarnings.map((text) => ({ level: 'warn' as const, text }));
  const colors = productColors(session);

  // Group doses by product.
  const byProduct = new Map<string, DoseEvent[]>();
  for (const d of session.doses) {
    const p = idx.products.get(d.productId);
    if (!p) {
      warnings.push({ level: 'warn', text: `A dose refers to an unknown product (${d.productId}); it is ignored.` });
      continue;
    }
    const ev = eventsFor(d, p);
    if (!ev) {
      warnings.push({ level: 'warn', text: `${p.name}: a dose entered in ${d.unit} can't be converted to ${p.doseUnit}; it is ignored. Edit the dose.` });
      continue;
    }
    byProduct.set(d.productId, [...(byProduct.get(d.productId) ?? []), ...ev]);
  }

  const ib = session.ibogaine;
  const ibTimes = ib ? [ib.flood, ...ib.boosters].map((x) => parseLocal(x.time)).filter(Number.isFinite) : [];
  const ibogaineAt = ib && Number.isFinite(parseLocal(ib.flood.time)) ? parseLocal(ib.flood.time) : null;
  const allDoseTimes = [...byProduct.values()].flat().flatMap((d) => (d.end ? [d.time, d.end] : [d.time]));
  const earliest = Math.min(...allDoseTimes, ...ibTimes, now);
  const lastDose = Math.max(...allDoseTimes, now);
  const axisStart = allDoseTimes.length ? Math.min(...allDoseTimes) : Math.min(now, ibogaineAt ?? now) - DAY;
  const axisEnd = (ibTimes.length ? Math.max(...ibTimes) : lastDose) + 14 * DAY;
  const ctx: Ctx = { t0: earliest, minEndMs: axisEnd, maxEndMs: Math.max(axisEnd, lastDose + 730 * DAY), settings: s };

  const products: ProductResult[] = [];
  for (const [pid, doses] of byProduct) {
    const p = idx.products.get(pid)!;
    if (!doses.length) continue;
    if (!productHasData(idx, p)) {
      warnings.push({ level: 'warn', text: `${p.name}: no half-life data yet for ${idx.compounds.get(primaryCompound(p))?.name ?? primaryCompound(p)} — not plotted.` });
      continue;
    }
    products.push(simulateProduct(
      idx,
      { key: pid, product: p, name: displayName(p), isIbogaine: false, color: colors.get(pid)!, doses, phenotype: session.patient.phenotype },
      ctx, warnings,
    ));
  }

  // CYP2D6 inhibition windows from patient drugs.
  const recoveryTail = s.clearHalfLives * s.cypRecoveryHalfLifeHours * HOUR;
  const cyp: CypInterval[] = [];
  const collectCyp = (r: ProductResult) => {
    for (const c of r.curves) {
      const inh = c.compound.cyp2d6.inhibitor;
      if (inh === 'none' || inh === 'unassessed') continue;
      for (const [a, b] of intervalsAbove(c.runs.typical.times, c.runs.typical.amounts, c.threshold)) {
        cyp.push({ start: a, end: b, strength: inh, tail: false, compound: c.compound.name, productKey: r.key });
        if (c.compound.cyp2d6.inhibitionType === 'mechanism-based')
          cyp.push({ start: b, end: b + recoveryTail, strength: inh, tail: true, compound: c.compound.name, productKey: r.key });
      }
    }
  };
  products.forEach(collectCyp);

  const presentAt = (t: number) =>
    products.filter((r) => !r.isIbogaine).flatMap((r) => r.curves.filter((c) => {
      const a = valueAt(c.runs.typical.times, c.runs.typical.amounts, t);
      return a > 0 && a >= c.threshold;
    }));
  const inhibitedAt = (t: number) => cyp.filter((iv) => t >= iv.start && t <= iv.end);
  const atTreatment = ibTimes.flatMap(inhibitedAt);
  const cypUnassessed = ibogaineAt === null ? [] : [...new Set(presentAt(ibogaineAt).filter((c) => c.compound.cyp2d6.inhibitor === 'unassessed').map((c) => c.compound.name))];
  const cypAtTreatment = { inhibited: atTreatment.length > 0, by: [...new Set(atTreatment.map((i) => i.compound))], unassessed: cypUnassessed };
  if (cypAtTreatment.inhibited)
    warnings.unshift({
      level: 'danger',
      text: `CYP2D6 likely inhibited at treatment — ibogaine exposure may resemble a poor metaboliser's. (Inhibited by: ${cypAtTreatment.by.join(', ')}.)`,
    });
  if (cypUnassessed.length)
    warnings.push({ level: 'warn', text: `CYP2D6 inhibition unassessed for compounds present at the ibogaine date: ${cypUnassessed.join(', ')}.` });

  // Projected ibogaine + noribogaine.
  if (ib) {
    const p = findIbogaineProduct(idx);
    const doses = [ib.flood, ...ib.boosters]
      .map((x) => ({ time: parseLocal(x.time), amount: x.mg, unit: 'mg' as DoseUnit }))
      .filter((d) => Number.isFinite(d.time) && d.amount > 0);
    if (doses.length && productHasData(idx, p)) {
      const r = simulateProduct(
        idx,
        {
          key: IBOGAINE_KEY, product: p, name: 'Ibogaine (projected)', isIbogaine: true, color: IBOGAINE_COLOR, doses,
          phenotype: cypAtTreatment.inhibited ? 'poor' : session.patient.phenotype,
        },
        ctx, warnings,
      );
      r.pmAdjusted = cypAtTreatment.inhibited;
      if (r.pmAdjusted) r.name = 'Ibogaine (projected, poor-metaboliser adjusted)';
      if (r.missing.length) warnings.push({ level: 'warn', text: `Ibogaine projection incomplete — missing kinetics for: ${r.missing.join(', ')}.` });
      products.push(r);
      collectCyp(r);
    } else if (doses.length) {
      warnings.push({ level: 'info', text: 'Ibogaine has no half-life data in the library yet — only the treatment date is shown.' });
    }
  }

  const qt = computeQt(products, axisStart, Math.max(axisEnd, ...products.map((p) => p.clearAtMax ?? axisEnd)));

  // Lingering effects after clearance.
  const lingering: LingeringBand[] = [];
  for (const r of products)
    for (const c of r.curves) {
      const le = c.compound.lingeringEffects;
      if (le.durationDays && le.durationDays > 0 && c.clearAt !== null)
        lingering.push({ start: c.clearAt, end: c.clearAt + le.durationDays * DAY, compound: c.compound.name, productKey: r.key, note: le.note });
    }

  // Receptor overlap at the ibogaine date: targets hit by compounds from ≥ 2 different products.
  const overlaps: ReceptorOverlap[] = [];
  let receptorsUnassessedAtTreatment: string[] = [];
  if (ibogaineAt !== null) {
    const byTarget = new Map<string, ReceptorOverlap>();
    const unassessed = new Set<string>();
    for (const r of products)
      for (const c of r.curves) {
        const a = valueAt(c.runs.typical.times, c.runs.typical.amounts, ibogaineAt);
        if (!(a > 0 && a >= c.threshold)) continue;
        if (!c.compound.receptorsAssessed) unassessed.add(c.compound.name);
        for (const rec of c.compound.receptors) {
          const k = rec.target.trim().toLowerCase();
          const o = byTarget.get(k) ?? { target: rec.target.trim(), hits: [] };
          o.hits.push({ compound: c.compound.name, action: rec.action, productKey: r.key, productName: r.name });
          byTarget.set(k, o);
        }
      }
    for (const o of byTarget.values()) if (new Set(o.hits.map((x) => x.productKey)).size >= 2) overlaps.push(o);
    overlaps.sort((a, b) => b.hits.length - a.hits.length);
    receptorsUnassessedAtTreatment = [...unassessed];
  }

  // Data-quality warnings.
  const used = products.flatMap((r) => [r.product, ...r.curves.map((c) => c.compound)]);
  const nonlinear = products.flatMap((r) => r.curves.filter((c) => c.compound.nonlinearKinetics.flag === 'yes').map((c) => c.compound));
  for (const c of new Map(nonlinear.map((c) => [c.id, c])).values())
    warnings.push({ level: 'warn', text: `${c.name}: nonlinear kinetics — not modelled. ${c.nonlinearKinetics.note}`.trim() });
  const unverified = used.filter((e) => !e.verified && !e.userEntered).length;
  const userEntered = used.filter((e) => e.userEntered).length;
  if (unverified) warnings.push({ level: 'info', text: `${unverified} plotted entr${unverified === 1 ? 'y uses' : 'ies use'} unverified library data.` });
  if (userEntered) warnings.push({ level: 'info', text: `${userEntered} plotted entr${userEntered === 1 ? 'y is' : 'ies are'} user-entered (not from the shared library).` });
  for (const r of products) {
    if (r.isIbogaine) continue;
    if (r.status === 'incomplete') {
      const overlapping = ibogaineAt !== null && (r.clearAt === null || r.clearAt > ibogaineAt - 0);
      warnings.push({
        level: 'warn',
        text: ibogaineAt !== null
          ? `${r.name}: clear date incomplete — missing kinetics for ${r.missing.join(', ')}. Can't confirm it is clear by the ibogaine date${overlapping ? ' (the computable parts are not clear yet)' : ''}.`
          : `${r.name}: clear date incomplete — missing kinetics for ${r.missing.join(', ')}.`,
      });
    } else if (ibogaineAt !== null && (r.clearAt === null || r.clearAt > ibogaineAt))
      warnings.push({ level: 'warn', text: `${r.name} is not clear by the planned ibogaine date (typical estimate).` });
  }
  if (products.some((r) => r.curves.some((c) => c.formationLimited)))
    warnings.push({ level: 'info', text: 'Some conjugates are plotted as tracking their parent (formation-limited). They can accumulate in renal impairment.' });

  return {
    products, axisStart, axisEnd, now, ibogaineAt, ibogaineDoseTimes: ibTimes, cyp, cypAtTreatment, qt, lingering, overlaps,
    receptorsUnassessedAtTreatment, warnings,
  };
}

/** Body amount in mg of the compound itself, or null if not absolute (normalized / no MW). */
export function absoluteMg(c: CompoundCurve, amount: number): number | null {
  if (c.normalized || c.mgFactor === null) return null;
  return amount * c.mgFactor;
}

/** Per-compound QT lanes, and the summed relative load when every lane is calibrated. */
export function computeQt(products: ProductResult[], start: number, end: number): QtResult {
  const lanes: QtLane[] = [];
  const N = 600;
  const grid: number[] = [];
  for (let i = 0; i <= N; i++) grid.push(start + ((end - start) * i) / N);
  const qtCurves: CompoundCurve[] = [];
  for (const r of products)
    for (const c of r.curves) {
      if (c.compound.qt.tier === 'none') continue;
      qtCurves.push(c);
      const segs: [number, number, number][] = [];
      const run = c.runs.typical;
      for (let i = 0; i < N; i++) {
        const a = valueAt(run.times, run.amounts, (grid[i] + grid[i + 1]) / 2);
        if (!(a >= c.threshold && a > 0)) continue;
        const op = Math.min(1, a / c.peak);
        const last = segs[segs.length - 1];
        if (last && last[1] === grid[i] && Math.abs(last[2] - op) < 0.04) last[1] = grid[i + 1];
        else segs.push([grid[i], grid[i + 1], op]);
      }
      if (segs.length) lanes.push({ key: c.key, curveKey: c.key, productKey: r.key, compound: c.compound.name, tier: c.compound.qt.tier, depth: c.depth, segments: segs });
    }

  const lacking = qtCurves.filter((c) => {
    const q = c.compound.qt;
    return !(q.weight && q.referenceAmountMg) || c.normalized || c.mgFactor === null;
  });
  const loadAvailable = qtCurves.length > 0 && lacking.length === 0;
  const loadUnavailableReason = !qtCurves.length
    ? 'No compounds with a QT lane.'
    : lacking.length
      ? `Not calibrated (needs qt.weight, qt.referenceAmountMg and an absolute amount): ${[...new Set(lacking.map((c) => c.compound.name))].join(', ')}.`
      : '';
  const load: { t: number; load: number }[] = [];
  if (loadAvailable) {
    const times = new Set(grid);
    for (const r of products) for (const d of r.doses) { times.add(d.time - 1); times.add(d.time); }
    for (const t of [...times].sort((a, b) => a - b)) {
      let sum = 0;
      for (const c of qtCurves) sum += (c.compound.qt.weight! * absoluteMg(c, valueAt(c.runs.typical.times, c.runs.typical.amounts, t))!) / c.compound.qt.referenceAmountMg!;
      load.push({ t, load: sum });
    }
  }
  return { lanes, loadAvailable, loadUnavailableReason, load };
}

export const strongestAt = (cyp: CypInterval[], t: number): CypInterval | null =>
  cyp.filter((iv) => t >= iv.start && t <= iv.end).sort((a, b) => STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength])[0] ?? null;
