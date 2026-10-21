// Turns the library + session into everything the chart, tracks, warnings and exports need.
// All PK maths lives in pk.ts; this module decides *what* to simulate (schema v2).
//
// Each dosed product is simulated on its own (linear kinetics → superposition holds): its
// components, their release pools and every compound reachable through metabolite links.
// A shared metabolite formed from two products appears once per product, in that product's colour.

import { clearFraction, clearTime, expandRegimen, intervalsAbove, simulate, valueAt, type SimCompound, type SimInfusion, type SimRelease } from './pk';
import { dosedCompoundIds, effectiveRelevance, hasIntrinsicKinetics, isNotModelled, isReviewed, primaryCompound, rangeBounds, type Bounds } from './schema';
import { fmtDateTime, fmtEvery } from './format';
import { planProductTree } from './tree';
import { findCycle } from './validate';
import type {
  Compound, CustomDrugs, DoseEntry, DoseUnit, IbogaineDose, IbogaineDoseKind, IbogaineTreatment, InhibitorStrength, Library, Phenotype,
  PatientPhenotype, PhenotypeMap, Product, QtTier, Session, Settings,
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
  /** Formed only while this compound is also in the body (v2.2 §5); null = always. */
  condition: string | null;
}

export interface LibraryIndex {
  lib: Library;
  compounds: Map<string, Compound>;
  products: Map<string, Product>;
  children: Map<string, Edge[]>;
  /** Compounds some product doses directly (always clinically active). */
  dosed: Set<string>;
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
      list.push({ id: c.id, fraction: f.fraction, multiplier: f.cyp2d6Multiplier ?? null, condition: f.condition?.requiresCompound ?? null });
      children.set(f.compound, list);
    }
  for (const [src, edges] of children) {
    const sum = edges.reduce((s, e) => s + (e.fraction ?? 0), 0);
    if (sum > 1 + 1e-9) {
      for (const e of edges) if (e.fraction !== null) e.fraction /= sum;
      loadWarnings.push(`Metabolite fractions formed from ${compounds.get(src)?.name ?? src} sum to ${sum.toFixed(2)} (> 1); scaled down to 1 for the simulation.`);
    }
  }
  return { lib, compounds, products, children, dosed: dosedCompoundIds(lib.products), loadWarnings };
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

/** Metabolites formed outside any scenario: conditional links (formed only with e.g. alcohol) are left out. */
export const staticChildren = (idx: LibraryIndex, id: string) => (idx.children.get(id) ?? []).filter((e) => !e.condition).map((e) => e.id);

/** The primary component can be simulated (as v1's "has data"). */
export const productHasData = (idx: LibraryIndex, p: Product) => hasIntrinsicKinetics(idx.compounds.get(primaryCompound(p)));

/** The primary component is deliberately not modelled (exposure markers + lingering band; v2.2 §3). */
export const productNotModelled = (idx: LibraryIndex, p: Product) => isNotModelled(idx.compounds.get(primaryCompound(p)));

/**
 * Compounds reachable from the product that can't be simulated and hold up its clear date:
 * active or unknown-relevance compounds with `unknown` kinetics (unless the setting treats them as
 * formation-limited), or a component without a half-life. Inactive ones never count (spec v2.1 §1),
 * nor do reviewed endogenous ones or conditional metabolites (v2.2 §4–5).
 */
export function missingKinetics(idx: LibraryIndex, p: Product, unknownAsFL: boolean): string[] {
  return planProductTree(idx.compounds, (id) => staticChildren(idx, id), componentIds(p), idx.dosed, unknownAsFL).missing.map((m) => m.id);
}

export type DataStatus = 'no-data' | 'incomplete' | 'ok' | 'not-modelled';

export function productDataStatus(idx: LibraryIndex, p: Product, unknownAsFL: boolean): DataStatus {
  if (productNotModelled(idx, p)) return 'not-modelled';
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
/** An exposure session: a start time and a duration, no mass (v2.2 §3). */
export const isSessionUnit = (u: DoseUnit) => u === 'session';
/** Entered with a duration: patch / infusion rates and exposure sessions. */
export const isIntervalUnit = (u: DoseUnit) => isRateUnit(u) || isSessionUnit(u);
export const isAlcoholUnit = (u: DoseUnit) => u === 'standard drinks' || u === 'g';
export const DEFAULT_DRINK_GRAMS = 14;

/** mg (or mg/h) from an amount in `unit`. A standard drink is `gPerDrink` grams of ethanol. */
export function toMg(v: number, unit: DoseUnit, gPerDrink = DEFAULT_DRINK_GRAMS): number {
  if (unit === 'µg' || unit === 'µg/h') return v / 1000;
  if (unit === 'g') return v * 1000;
  if (unit === 'standard drinks') return v * gPerDrink * 1000;
  return v;
}

/** Convert an amount between dose units of the same kind (mass ↔ mass, rate ↔ rate). null if incompatible. */
export function convertUnit(v: number, from: DoseUnit, to: DoseUnit, gPerDrink = DEFAULT_DRINK_GRAMS): number | null {
  if (from === to) return v;
  if (isSessionUnit(from) || isSessionUnit(to) || isRateUnit(from) !== isRateUnit(to)) return null;
  return toMg(v, from, gPerDrink) / toMg(1, to, gPerDrink);
}

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
  const interval = isIntervalUnit(d.unit);
  const dur = (d.durationHours ?? defaultDurationHours ?? (isSessionUnit(d.unit) ? 1 : 24)) * HOUR;
  const ev = (time: number): DoseEvent => (interval ? { time, amount: d.amount, unit: d.unit, end: time + dur } : { time, amount: d.amount, unit: d.unit });
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

export const IBOGAINE_KIND_LABEL: Record<IbogaineDoseKind, string> = {
  test: 'Test dose', flood: 'Flood', booster: 'Booster', microdose: 'Microdose', other: 'Other',
};

export interface IbogaineEvent {
  time: number;
  mg: number;
  kind: IbogaineDoseKind;
  doseId: string;
}

/** "Microdose 4 mg · every 2 days · 16/11/2026 08:00 → 14/12/2026 08:00 (14×)". */
export function describeIbogaineDose(d: IbogaineDose, s: Pick<Settings, 'dateOrder' | 'hour12'>): { what: string; when: string } {
  const what = `${IBOGAINE_KIND_LABEL[d.kind]} ${d.mg > 0 ? +d.mg.toFixed(2) : '—'} mg`;
  const t = parseLocal(d.time);
  const at = Number.isFinite(t) ? fmtDateTime(t, s) : '—';
  if (!d.repeat) return { what, when: at };
  const until = parseLocal(d.repeat.until);
  const n = expandIbogaine({ doses: [d] }).length;
  return { what, when: `${fmtEvery(d.repeat.every, d.repeat.unit)} · ${at} → ${Number.isFinite(until) ? fmtDateTime(until, s) : '—'} (${n}×)` };
}

/** Every ibogaine dose event (repeats expanded), sorted by time. Doses without an amount or a valid time are left out. */
export function expandIbogaine(ib: IbogaineTreatment | null): IbogaineEvent[] {
  if (!ib) return [];
  const out: IbogaineEvent[] = [];
  for (const d of ib.doses) {
    const start = parseLocal(d.time);
    if (!(d.mg > 0) || !Number.isFinite(start)) continue;
    const ev = (time: number) => ({ time, mg: d.mg, kind: d.kind, doseId: d.id });
    const r = d.repeat;
    if (!r) {
      out.push(ev(start));
      continue;
    }
    const until = parseLocal(r.until);
    if (!Number.isFinite(until)) continue;
    const everyHours = r.every * (r.unit === 'days' ? 24 : 1);
    for (const x of expandRegimen({ amount: d.mg, everyHours, start: 0, end: (until - start) / HOUR })) out.push(ev(start + x.time * HOUR));
  }
  return out.sort((a, b) => a.time - b.time);
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
  clearAt: number | null; // typical run; null = beyond simulated window (or not formed in that run)
  clearAtMax: number | null;
  clearAtMin: number | null;
  /** Formed at all in each run (a zero CYP2D6 formation multiplier removes the branch). */
  formed: Record<RunName, boolean>;
  /** clinicalRelevance "inactive": plotted (fainter, hidden by default) but never holds up the clear date. */
  inactive: boolean;
  /** Multiply amounts by this to get mg of this compound; null when molecular weights are missing. */
  mgFactor: number | null;
  /** Downstream of an unknown fraction: plotted as % of own peak ("amount unknown — timing only"). */
  normalized: boolean;
  /** Labels for every assumption behind this curve (tooltips, export). */
  assumptions: string[];
  /** Facts that aren't assumptions, e.g. "not formed in poor metabolisers". */
  notes: string[];
  formationLimited: boolean;
}

/** "not-modelled": exposure markers only, never a clear date; "needs-weight": zero-order (alcohol) without body weight. */
export type ClearStatus = 'clear' | 'assumptions' | 'incomplete' | 'not-modelled' | 'needs-weight';

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
  /** Fastest edge of the band (min run). */
  clearAtMin: number | null;
  status: ClearStatus;
  /** Compound names with missing kinetics (status "incomplete"). */
  missing: string[];
  /** Product-level assumption labels (union of the curves' plus input-level ones). */
  assumptions: string[];
  /** Reviewed inactive metabolites left out of the clear date (shown, but not an assumption). */
  excluded: string[];
  /** Curve notes, e.g. "not formed in poor metabolisers". */
  notes: string[];
  /** Amounts are on an administered basis (bioavailability not applied for some component). */
  administered: boolean;
  /** Compounds with qt / cyp2d6 / receptors still unassessed (export section). */
  unassessed: { qt: string[]; cyp2d6: string[]; receptors: string[] };
  /** Projected with the poor-metaboliser multiplier (it exists for every CYP2D6 substrate in the product). */
  pmAdjusted?: boolean;
  /** Projected as a poor metaboliser, but these CYP2D6 substrates have no "poor" half-life multiplier. */
  pmUnquantified?: string[];
  /** Status "not-modelled": the reason shown instead of a clear date. */
  notModelledReason?: string;
  /** Prodrug components: "administered as X, modelled as Y" (compound names). */
  prodrug?: { administeredAs: string; modelledAs: string }[];
}

export interface CypInterval {
  start: number;
  end: number;
  /** For an inhibitor of unassessed strength, the minimum assumed ("weak"). */
  strength: Exclude<InhibitorStrength, 'none' | 'unassessed'>;
  /** Inhibition documented (inhibitionType set) but strength unassessed. */
  strengthUnassessed: boolean;
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
  /** The first ibogaine dose of any kind: the treatment date everything is measured against. */
  ibogaineAt: number | null;
  ibogaineEvents: IbogaineEvent[];
  cyp: CypInterval[];
  /** `by`: inhibitors of known strength; `byUnassessedStrength`: documented inhibitors of unassessed strength (counted as weak). */
  cypAtTreatment: { inhibited: boolean; by: string[]; byUnassessedStrength: string[]; unassessed: string[] };
  qt: QtResult;
  lingering: LingeringBand[];
  overlaps: ReceptorOverlap[];
  /** Compounds present at the first ibogaine dose whose receptor list hasn't been researched. */
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

/** A phenotype's multiplier from a (possibly partial) map. Missing phenotypes count as 1, flagged as assumed. */
function phenValue(m: PhenotypeMap, phen: Phenotype): { value: number; assumed: boolean } {
  const v = m[phen];
  if (typeof v === 'number' && v >= 0) return { value: v, assumed: false };
  return { value: 1, assumed: phen !== 'normal' };
}

/** A CYP2D6 substrate whose poor-metaboliser half-life multiplier is missing. */
const lacksPoorMultiplier = (c: Compound) => c.cyp2d6.substrate === 'yes' && typeof c.cyp2d6.halfLifeMultiplier?.poor !== 'number';

export const pmNotQuantified = (names: string[]) => `not quantified — no phenotype data for ${names.join(', ')}`;

/**
 * For a product projected as a poor metaboliser: caveat every substrate curve that has no "poor" multiplier
 * (its curve is unchanged, not a poor-metaboliser projection). Returns the compound names.
 */
function markPmUnquantified(r: ProductResult): string[] {
  const curves = r.curves.filter((c) => lacksPoorMultiplier(c.compound));
  if (!curves.length) return [];
  const names = curves.map((c) => c.compound.name);
  const caveat = `poor-metaboliser exposure increase ${pmNotQuantified(names)} — curve shows unadjusted kinetics`;
  const assumedX1 = (a: string) => curves.some((c) => a === `${c.compound.name}: CYP2D6 half-life multiplier for poor metabolisers unknown — assumed ×1`);
  for (const c of curves) c.assumptions = [caveat, ...c.assumptions.filter((a) => !assumedX1(a))];
  r.assumptions = [caveat, ...r.assumptions.filter((a) => !assumedX1(a))];
  r.pmUnquantified = names;
  if (r.status === 'clear') r.status = 'assumptions';
  return names;
}

/** Half-life multiplier for a CYP2D6 substrate in a given run. */
function hlMultiplier(c: Compound, phen: PatientPhenotype, run: RunName): { value: number; assumedFor: Phenotype[] } {
  const m = c.cyp2d6.substrate === 'yes' ? c.cyp2d6.halfLifeMultiplier : null;
  if (!m) return { value: 1, assumedFor: [] };
  const get = (p: Phenotype) => {
    const r = phenValue(m, p);
    return { value: r.value > 0 ? r.value : 1, assumed: r.assumed };
  };
  if (phen !== 'unknown') {
    const r = get(phen);
    return { value: r.value, assumedFor: r.assumed ? [phen] : [] };
  }
  if (run === 'typical') {
    const r = get('normal');
    return { value: r.value, assumedFor: [] };
  }
  const edges = (['poor', 'ultrarapid'] as const).map((p) => ({ p, ...get(p) }));
  const pick = run === 'min' ? edges.reduce((a, b) => (b.value < a.value ? b : a)) : edges.reduce((a, b) => (b.value > a.value ? b : a));
  return { value: pick.value, assumedFor: pick.assumed ? [pick.p] : [] };
}

interface SimRequest {
  key: string;
  product: Product;
  name: string;
  isIbogaine: boolean;
  color: string;
  doses: DoseEvent[];
  phenotype: PatientPhenotype;
  /** Repeated dosing: a regimen entry, two or more doses, a patch/infusion or a depot (spec v2.1 §3). */
  repeated: boolean;
}

interface Ctx {
  t0: number;
  minEndMs: number;
  maxEndMs: number;
  settings: Settings;
  /** Patient weight (kg); 0 = missing. Only zero-order elimination uses it. */
  weightKg: number;
  /** Compound id → intervals (epoch ms) it is in the body, for conditional metabolite links. */
  presence: Map<string, [number, number][]>;
  /** Required compounds whose presence is assumed (dosed but not simulable), with the reason. */
  presenceAssumed: Map<string, string>;
}

const condKey = (from: string, to: string) => `${from}>${to}`;
/** "alcohol" for ethanol, else the compound name. */
export const requiredLabel = (idx: LibraryIndex, id: string) => (id === 'ethanol' ? 'alcohol' : idx.compounds.get(id)?.name ?? id);
export const ENDOGENOUS_LABEL = 'endogenous — excess over baseline not modelled';

/** Prodrug components of a product, by compound name. */
export function prodrugParts(idx: LibraryIndex, p: Product): { administeredAs: string; modelledAs: string; massFactor: number | null }[] {
  const name = (id: string) => idx.compounds.get(id)?.name ?? id;
  return p.components
    .filter((c) => c.administeredAs || c.massFactor != null)
    .map((c) => ({ administeredAs: name(c.administeredAs ?? c.compound), modelledAs: name(c.compound), massFactor: c.massFactor ?? null }));
}

/** A product that isn't simulated: not modelled, or alcohol without body weight. Doses still show as markers. */
function unsimulatedResult(idx: LibraryIndex, req: SimRequest, status: 'not-modelled' | 'needs-weight', notes: string[]): ProductResult {
  const c = idx.compounds.get(primaryCompound(req.product));
  const used = c ? [c] : [];
  const parts = prodrugParts(idx, req.product);
  return {
    key: req.key, product: req.product, name: req.name, isIbogaine: req.isIbogaine, color: req.color, doses: req.doses,
    latest: [...req.doses].sort((a, b) => b.time - a.time)[0] ?? null,
    curves: [], clearAt: null, clearAtMax: null, clearAtMin: null, status, missing: [], assumptions: [], excluded: [], notes,
    administered: false,
    unassessed: {
      qt: used.filter((x) => x.qt.tier === 'unassessed').map((x) => x.name),
      cyp2d6: used.filter((x) => x.cyp2d6.substrate === 'unassessed' || x.cyp2d6.inhibitor === 'unassessed').map((x) => x.name),
      receptors: used.filter((x) => !x.receptorsAssessed).map((x) => x.name),
    },
    ...(status === 'not-modelled' ? { notModelledReason: c?.kinetics.notModelledReason ?? '' } : {}),
    ...(parts.length ? { prodrug: parts.map(({ administeredAs, modelledAs }) => ({ administeredAs, modelledAs })) } : {}),
  };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

type Variant = 'single' | 'steady';
interface Params {
  terminal: Bounds;
  early: { fraction: number; hl: Bounds } | null;
}

/**
 * `conditional`: active conditional links (parent>child → windows, epoch ms). null on the first pass,
 * which leaves conditional links out, then re-runs with those whose parent overlaps the required compound.
 */
function simulateProduct(idx: LibraryIndex, req: SimRequest, ctx: Ctx, warnings: Warning[], conditional: Map<string, [number, number][]> | null = null): ProductResult {
  const { product } = req;
  const s = ctx.settings;
  const warnStart = warnings.length;
  const roots = componentIds(product);
  // A branch with a zero formation multiplier in every run is not formed at all: it leaves the tree (and the clear status).
  const runPhens = [...new Set(RUNS.map((r) => phenotypeFor(req.phenotype, r)))];
  const notFormed = (e: Edge) => !!e.multiplier && runPhens.every((p) => e.multiplier![p] === 0);
  const edgeOn = (from: string, e: Edge) => !e.condition || !!conditional?.has(condKey(from, e.id));
  const childrenOf = (id: string) => (idx.children.get(id) ?? []).filter((e) => !notFormed(e) && edgeOn(id, e)).map((e) => e.id);
  const plan = planProductTree(idx.compounds, childrenOf, roots, idx.dosed, s.unknownAsFormationLimited);
  const { tree, topo, parents, included } = plan;
  const rootOf = new Map(tree.map((n) => [n.id, n]));
  const name = (id: string) => idx.compounds.get(id)?.name ?? id;
  const zeroOrder = new Set([...included].filter(([, k]) => k === 'zero-order').map(([id]) => id));
  if (zeroOrder.size && !(ctx.weightKg > 0))
    return unsimulatedResult(idx, req, 'needs-weight', [...zeroOrder].map((id) => `${name(id)}: zero-order elimination scales with body weight — enter the patient's weight`));
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
  const productNotes = new Set<string>();
  const curveNotes = new Map<string, Set<string>>();
  const note = (id: string, text: string) => {
    curveNotes.set(id, (curveNotes.get(id) ?? new Set<string>()).add(text));
    productNotes.add(text);
  };
  const excludedNotes: string[] = [];
  /** Inactive compounds don't hold up the clear date; how that is labelled depends on whether the classification was reviewed. */
  const excludeInactive = (id: string, kineticsUnknown: boolean) => {
    const c = idx.compounds.get(id)!;
    if (isReviewed(c, 'relevance'))
      excludedNotes.push(`${c.name}: inactive metabolite${kineticsUnknown ? ', kinetics unknown' : ''} — excluded from clear date`);
    else assume(kineticsUnknown ? null : id, `${c.name}: excluded as inactive (unreviewed classification)${kineticsUnknown ? ' — kinetics unknown' : ''}`);
  };

  const missing = plan.missing.map((m) => (m.via ? `${name(m.id)} (formed only via ${name(m.via)}, whose kinetics are unknown)` : name(m.id)));
  for (const id of plan.excluded) excludeInactive(id, true);
  for (const id of plan.endogenous) excludedNotes.push(`${name(id)}: ${ENDOGENOUS_LABEL} (kinetics unknown) — excluded from clear date`);
  for (const id of plan.notModelled) excludedNotes.push(`${name(id)}: not modelled — ${idx.compounds.get(id)?.kinetics.notModelledReason ?? ''}`);
  for (const id of included.keys()) if (idx.compounds.get(id)?.endogenous) note(id, `${name(id)}: ${ENDOGENOUS_LABEL}`);
  const parts = prodrugParts(idx, product);
  for (const pt of parts) {
    assume(null, `${pt.administeredAs}: prodrug — modelled as ${pt.modelledAs}`);
    if (pt.massFactor === null) assume(null, `${pt.administeredAs} → ${pt.modelledAs}: mass factor unknown — assumed 1`);
  }
  // Conditional metabolites formed in this scenario.
  for (const [key] of conditional ?? []) {
    const [from, to] = key.split('>');
    const reqId = (idx.children.get(from) ?? []).find((e) => e.id === to)?.condition;
    if (!reqId || !included.has(from)) continue;
    note(to, `${name(to)}: formed because ${requiredLabel(idx, reqId)} was also taken`);
    const why = ctx.presenceAssumed.get(reqId);
    if (why) assume(to, `${requiredLabel(idx, reqId)} amount couldn't be simulated (${why}) — assumed present from the first dose`);
  }
  const inactive = new Set([...included.keys()].filter((id) => effectiveRelevance(idx.compounds.get(id)!, idx.dosed) === 'inactive'));

  // Formation-limited tracking and normalized (timing-only) curves.
  const normalized = new Set<string>();
  for (const id of topo) {
    if (!included.has(id) || roots.includes(id)) continue;
    const c = idx.compounds.get(id)!;
    if (plan.assumedFormationLimited.has(id)) assume(id, `${c.name}: kinetics unknown — assumed formation-limited`);
    else if (included.get(id) === 'formation-limited') assume(id, `${c.name}: tracks parent (formation-limited)`);
    const fedBy = (parents.get(id) ?? []).filter((p) => included.has(p));
    const nullEdge = fedBy.some((p) => (idx.children.get(p) ?? []).some((e) => e.id === id && e.fraction === null));
    if (nullEdge || fedBy.some((p) => normalized.has(p))) {
      normalized.add(id);
      assume(id, `${c.name}: amount unknown — timing only`);
    }
  }
  const order = topo.filter((id) => included.has(id));

  // Per-run parameters. Bounds are labelled (assumed spread, range midpoint) only where they are used.
  const runDays = continuousDays(req.doses);
  const labelBounds = (b: Bounds, what: string, id: string | null) => {
    if (b.assumed) assume(id, `assumed spread (CV ${pct(s.assumedCv)}) on ${what}`);
    if (b.midpoint) assume(id, `assumed midpoint of reported range on ${what}`);
  };
  const anyRelease = product.input.type !== 'bolus';
  const releaseB = anyRelease ? rangeBounds(product.input.releaseHalfLifeHours, s.assumedCv) : null;
  if (releaseB) labelBounds(releaseB, `${product.name} release half-life`, null);
  if (product.input.type === 'first-order-release' && !releaseB)
    assume(null, 'release half-life unknown — simulated as immediate release');

  const params = new Map<string, Record<Variant, Params>>();
  let dual = false;
  for (const id of order) {
    if (included.get(id) !== 'intrinsic') continue;
    const c = idx.compounds.get(id)!;
    const k = c.kinetics;
    const terminal = rangeBounds(k.halfLifeHours, s.assumedCv)!;
    let early: Params['early'] = null;
    const ep = k.earlyPhase;
    if (ep) {
      const epB = rangeBounds(ep.halfLifeHours, s.assumedCv);
      if (ep.fraction != null && ep.fraction > 0 && ep.fraction < 1 && epB) {
        early = { fraction: ep.fraction, hl: epB };
        labelBounds(epB, `${c.name} early-phase half-life`, id);
      } else assume(id, `${c.name}: early phase ignored (${ep.fraction == null ? 'fraction' : 'half-life'} unknown) — conservative`);
    }
    const single: Params = { terminal, early };
    const ss = k.steadyState;
    const ssB = ss ? rangeBounds(ss.halfLifeHours, s.assumedCv) : null;
    let steady: Params | null = null;
    if (ss && ssB) {
      if (ss.afterDays != null && ss.afterDays > 0) {
        if (runDays >= ss.afterDays) {
          assume(id, `${c.name}: steady-state half-life used (dosed ≥ ${ss.afterDays} days)`);
          labelBounds(ssB, `${c.name} steady-state half-life`, id);
          params.set(id, { single: { terminal: ssB, early: null }, steady: { terminal: ssB, early: null } });
          continue;
        }
      } else if (req.repeated) {
        steady = { terminal: ssB, early: null };
        dual = true;
        assume(id, `${c.name}: steady-state onset unknown — later of single-dose and steady-state clearance used`);
        labelBounds(ssB, `${c.name} steady-state half-life`, id);
      }
    }
    labelBounds(terminal, `${c.name} half-life`, id);
    params.set(id, { single, steady: steady ?? single });
  }
  // Zero-order (alcohol): mg/kg/h × weight. The fastest rate gives the band's early edge, the slowest its late edge.
  const zeroRate = new Map<string, Bounds>();
  for (const id of zeroOrder) {
    const c = idx.compounds.get(id)!;
    const b = rangeBounds(c.kinetics.zeroOrderRateMgPerKgPerHour, s.assumedCv)!;
    zeroRate.set(id, b);
    labelBounds(b, `${c.name} elimination rate`, id);
    note(id, `${c.name}: zero-order elimination at ${+b.typical.toPrecision(3)} mg/kg/h × ${+ctx.weightKg.toFixed(1)} kg — clear when none is left; the clear date uses the slowest rate`);
  }

  const h = (ms: number) => (ms - ctx.t0) / HOUR;
  const notFormedIn = new Map<string, Set<Phenotype>>();
  const simulateRun = (run: RunName, variant: Variant) => {
    const phen = phenotypeFor(req.phenotype, run);
    const hl = new Map<string, number>();
    const list: SimCompound[] = [];
    for (const id of order) {
      const c = idx.compounds.get(id)!;
      let terminal: number;
      let early: SimCompound['earlyPhase'] = null;
      let zeroOrderRate: number | undefined;
      if (included.get(id) === 'zero-order') {
        const b = zeroRate.get(id)!;
        zeroOrderRate = (run === 'min' ? b.max : run === 'max' ? b.min : b.typical) * ctx.weightKg;
        terminal = Infinity;
      } else if (included.get(id) === 'intrinsic') {
        const pr = params.get(id)![variant];
        const m = hlMultiplier(c, req.phenotype, run);
        for (const p of m.assumedFor) assume(id, `${c.name}: CYP2D6 half-life multiplier for ${p} metabolisers unknown — assumed ×1`);
        terminal = pr.terminal[run] * m.value;
        if (pr.early) early = { fraction: pr.early.fraction, halfLifeHours: pr.early.hl[run] * m.value };
      } else {
        // Formation-limited: one-tenth of the fastest feeding parent's effective half-life (6 min under a zero-order parent).
        const ps = (parents.get(id) ?? []).filter((p) => hl.has(p) && Number.isFinite(hl.get(p))).map((p) => hl.get(p)!);
        terminal = ps.length ? Math.min(...ps) / 10 : 0.1;
      }
      hl.set(id, terminal);
      // Effective formation fractions (unknown → 1) with the CYP2D6 formation multiplier (0 = not formed).
      const edges = (idx.children.get(id) ?? []).filter((e) => included.has(e.id) && edgeOn(id, e));
      const eff = edges.map((e) => {
        let mult = 1;
        if (e.multiplier) {
          const r = phenValue(e.multiplier, phen);
          mult = r.value;
          if (r.assumed) assume(e.id, `${name(e.id)}: CYP2D6 formation multiplier from ${c.name} for ${phen} metabolisers unknown — assumed ×1`);
          if (mult === 0) notFormedIn.set(e.id, (notFormedIn.get(e.id) ?? new Set<Phenotype>()).add(phen));
        }
        const windows = e.condition ? conditional?.get(condKey(id, e.id))?.map(([a, b]) => [h(a), h(b)] as [number, number]) : undefined;
        return { id: e.id, known: e.fraction !== null, fraction: (e.fraction ?? 1) * mult, ...(windows ? { windows } : {}) };
      });
      const knownSum = eff.filter((e) => e.known).reduce((a, e) => a + e.fraction, 0);
      if (knownSum > 1 + 1e-9) {
        for (const e of eff) if (e.known) e.fraction /= knownSum;
        if (run === 'typical' && variant === 'single')
          warnings.push({ level: 'warn', text: `${req.name}: CYP2D6-adjusted fractions formed from ${c.name} exceed 1; scaled down proportionally.` });
      }
      list.push({
        id, halfLifeHours: Number.isFinite(terminal) ? terminal : 1, earlyPhase: early, zeroOrderRate,
        children: eff.map((e) => ({ id: e.id, fraction: e.fraction, ...(e.windows ? { windows: e.windows } : {}) })),
        quasiSteady: included.get(id) === 'formation-limited',
      });
    }

    // Inputs: each component gets dose × ratio × saltFactor × massFactor × bioavailability, via a release pool if any.
    const releases: SimRelease[] = [];
    const bolus: { time: number; compoundId: string; amount: number }[] = [];
    const infusions: SimInfusion[] = [];
    const relHl = releaseB ? releaseB[run] : null;
    for (const comp of product.components) {
      if (!included.has(comp.compound)) continue;
      const factor = comp.ratio * (comp.saltFactor ?? 1) * (comp.massFactor ?? 1) * (comp.bioavailability ?? 1);
      const target = relHl ? `rel:${comp.compound}` : comp.compound;
      if (relHl) releases.push({ id: target, halfLifeHours: relHl, target: comp.compound });
      for (const d of req.doses) {
        const mg = toMg(d.amount, d.unit, s.standardDrinkGrams) * factor;
        if (d.end !== undefined) infusions.push({ start: h(d.time), end: h(d.end), target, rate: mg });
        else bolus.push({ time: h(d.time), compoundId: target, amount: mg });
      }
    }
    return simulate(list, bolus, {
      start: Math.min(...req.doses.map((d) => h(d.time))),
      minEnd: h(ctx.minEndMs),
      maxEnd: h(ctx.maxEndMs),
      releases,
      infusions,
    });
  };

  const frac = clearFraction(s.clearHalfLives);
  type Sim = ReturnType<typeof simulate>;
  const toRun = (sim: Sim, id: string): Run => ({ times: sim.times.map((x) => ctx.t0 + x * HOUR), amounts: sim.amounts[id] });
  /** Zero-order compounds are clear when none is left; the rest at a fraction of their peak. */
  const thresholdOf = (id: string, peak: number) => (zeroOrder.has(id) ? peak * 1e-9 : peak * frac);
  const clearOf = (sim: Sim, id: string): number | null => {
    const pk = sim.peaks[id];
    if (!(pk > 0)) return null;
    const r = toRun(sim, id);
    const v = clearTime(r.times, r.amounts, thresholdOf(id, pk));
    return v === -Infinity ? r.times[0] : v;
  };
  /** Latest clear time over the compounds that count (active / unknown relevance, formed in this run). null = beyond the window. */
  const productClear = (sim: Sim): number | null => {
    let latest = -Infinity;
    for (const id of order) {
      if (inactive.has(id) || !(sim.peaks[id] > 0)) continue;
      const t = clearOf(sim, id);
      if (t === null) return null;
      latest = Math.max(latest, t);
    }
    return latest === -Infinity ? null : latest;
  };
  /** x clears later than y (null = beyond the simulated window, i.e. latest). */
  const isLater = (x: number | null, y: number | null) => (x === null ? y !== null : y !== null && x > y);

  // With an unknown steady-state onset, both kinetics run; the band spans both (earlier min, later typical/max).
  const sims = {} as Record<RunName, Sim>;
  for (const run of RUNS) {
    const single = simulateRun(run, 'single');
    if (!dual) {
      sims[run] = single;
      continue;
    }
    const steady = simulateRun(run, 'steady');
    const steadyLater = isLater(productClear(steady), productClear(single));
    sims[run] = run === 'min' ? (steadyLater ? single : steady) : steadyLater ? steady : single;
  }

  for (const n of tree)
    for (const e of idx.children.get(n.id) ?? []) if (notFormed(e)) for (const p of runPhens) notFormedIn.set(e.id, (notFormedIn.get(e.id) ?? new Set<Phenotype>()).add(p));
  for (const [id, phens] of notFormedIn) for (const p of phens) note(id, `${name(id)}: not formed in ${p} metabolisers`);

  const curves: CompoundCurve[] = [];
  for (const node of tree) {
    if (!included.has(node.id)) continue;
    const id = node.id;
    const formed = { min: sims.min.peaks[id] > 0, typical: sims.typical.peaks[id] > 0, max: sims.max.peaks[id] > 0 };
    if (!formed.min && !formed.typical && !formed.max) continue; // branch not formed for this phenotype
    const c = idx.compounds.get(id)!;
    const peak = formed.typical ? sims.typical.peaks[id] : Math.max(sims.min.peaks[id] || 0, sims.max.peaks[id] || 0);
    const root = idx.compounds.get(rootOf.get(id)!.root);
    const mwR = root?.molecularWeight ?? null;
    const mwC = c.molecularWeight;
    curves.push({
      key: `${req.key}:${id}`,
      productKey: req.key,
      compound: c,
      depth: node.depth,
      runs: { min: toRun(sims.min, id), typical: toRun(sims.typical, id), max: toRun(sims.max, id) },
      peak,
      threshold: thresholdOf(id, peak),
      // Zero-order: the clear date uses the slowest rate (the max run).
      clearAt: zeroOrder.has(id) ? (formed.max ? clearOf(sims.max, id) : null) : formed.typical ? clearOf(sims.typical, id) : null,
      clearAtMax: formed.max ? clearOf(sims.max, id) : null,
      clearAtMin: formed.min ? clearOf(sims.min, id) : null,
      formed,
      mgFactor: node.depth === 0 ? 1 : mwR && mwC ? mwC / mwR : null,
      normalized: normalized.has(id),
      inactive: inactive.has(id),
      assumptions: [...(curveAssumptions.get(id) ?? [])],
      notes: [...(curveNotes.get(id) ?? [])],
      formationLimited: included.get(id) === 'formation-limited',
    });
  }
  const counting = curves.filter((c) => !c.inactive);
  const maxOf = (vals: (number | null)[]) => (vals.some((v) => v === null) ? null : vals.length ? Math.max(...(vals as number[])) : null);
  const clearAt = maxOf(counting.filter((c) => c.formed.typical).map((c) => c.clearAt));
  const clearAtMax = maxOf(counting.filter((c) => c.formed.max).map((c) => c.clearAtMax));
  const clearAtMin = maxOf(counting.filter((c) => c.formed.min).map((c) => c.clearAtMin));
  // An inactive compound that would have cleared later than the product is an exclusion that changed the date.
  for (const c of curves)
    if (c.inactive && c.formed.max && (clearAtMax === null || c.clearAtMax === null || c.clearAtMax > clearAtMax)) {
      excludeInactive(c.compound.id, false);
      c.assumptions = [...(curveAssumptions.get(c.compound.id) ?? [])];
    }

  // Conditional links: re-run with those whose parent is in the body while the required compound is.
  if (conditional === null) {
    const active = new Map<string, [number, number][]>();
    for (const id of order)
      for (const e of idx.children.get(id) ?? []) {
        const windows = e.condition ? ctx.presence.get(e.condition) : undefined;
        if (!windows?.length || notFormed(e)) continue;
        const parent = curves.find((c) => c.compound.id === id);
        if (!parent) continue;
        const run = parent.formed.max ? parent.runs.max : parent.runs.typical;
        const present = intervalsAbove(run.times, run.amounts, parent.threshold);
        if (present.some(([a, b]) => windows.some(([c, d]) => a < d && c < b))) active.set(condKey(id, e.id), windows);
      }
    if (active.size) {
      warnings.length = warnStart;
      return simulateProduct(idx, req, ctx, warnings, active);
    }
  }

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
    clearAt,
    clearAtMax,
    clearAtMin,
    status: missing.length ? 'incomplete' : productAssumptions.size ? 'assumptions' : 'clear',
    missing,
    assumptions: [...productAssumptions],
    excluded: excludedNotes,
    notes: [...productNotes],
    administered: product.components.some((c) => c.bioavailability === null),
    unassessed: {
      qt: usedCompounds.filter((c) => c.qt.tier === 'unassessed').map((c) => c.name),
      cyp2d6: usedCompounds.filter((c) => c.cyp2d6.substrate === 'unassessed' || c.cyp2d6.inhibitor === 'unassessed').map((c) => c.name),
      receptors: usedCompounds.filter((c) => !c.receptorsAssessed).map((c) => c.name),
    },
    ...(parts.length ? { prodrug: parts.map(({ administeredAs, modelledAs }) => ({ administeredAs, modelledAs })) } : {}),
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
    typicalDose: { amount: null, unit: 'mg', basis: 'single-use' }, provenance: {}, sourceNotes: {}, reviewedDates: {}, source: '', verified: false, verifiedDate: '',
  };
}

/** A dose entry's events in the product's unit; null if the stored unit can't be converted. */
function eventsFor(d: DoseEntry, p: Product, gPerDrink: number): DoseEvent[] | null {
  const amount = convertUnit(d.amount, d.unit, p.doseUnit, gPerDrink);
  if (amount === null) return null;
  return expandDose({ ...d, amount, unit: p.doseUnit }, p.input.defaultDurationHours);
}

/** Compounds a product reaches without conditional links. */
function staticReach(idx: LibraryIndex, roots: string[]): Set<string> {
  const out = new Set(roots);
  const queue = [...roots];
  while (queue.length) for (const ch of staticChildren(idx, queue.shift()!)) if (!out.has(ch)) { out.add(ch); queue.push(ch); }
  return out;
}

/** Merge overlapping [start, end] intervals. */
function mergeIntervals(iv: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of [...iv].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

export function computeScenario(idx: LibraryIndex, session: Session, now: number): Scenario {
  const s = session.settings;
  const warnings: Warning[] = idx.loadWarnings.map((text) => ({ level: 'warn' as const, text }));
  const colors = productColors(session);

  // Group doses by product.
  const byProduct = new Map<string, DoseEvent[]>();
  const hasRegimen = new Set(session.doses.filter((d) => d.kind === 'regimen').map((d) => d.productId));
  const repeated = (p: Product, doses: DoseEvent[]) =>
    hasRegimen.has(p.id) || doses.length >= 2 || doses.some((d) => d.end !== undefined) || p.input.type !== 'bolus';
  for (const d of session.doses) {
    const p = idx.products.get(d.productId);
    if (!p) {
      warnings.push({ level: 'warn', text: `A dose refers to an unknown product (${d.productId}); it is ignored.` });
      continue;
    }
    const ev = eventsFor(d, p, s.standardDrinkGrams);
    if (!ev) {
      warnings.push({ level: 'warn', text: `${p.name}: a dose entered in ${d.unit} can't be converted to ${p.doseUnit}; it is ignored. Edit the dose.` });
      continue;
    }
    byProduct.set(d.productId, [...(byProduct.get(d.productId) ?? []), ...ev]);
  }

  const ibEvents = expandIbogaine(session.ibogaine);
  const ibTimes = ibEvents.map((e) => e.time);
  const ibogaineAt = ibTimes.length ? ibTimes[0] : null;
  const allDoseTimes = [...byProduct.values()].flat().flatMap((d) => (d.end ? [d.time, d.end] : [d.time]));
  const earliest = Math.min(...allDoseTimes, ...ibTimes, now);
  const lastDose = Math.max(...allDoseTimes, now);
  const axisStart = allDoseTimes.length ? Math.min(...allDoseTimes) : Math.min(now, ibogaineAt ?? now) - DAY;
  const axisEnd = (ibTimes.length ? Math.max(...ibTimes) : lastDose) + 14 * DAY;
  const ctx: Ctx = {
    t0: earliest, minEndMs: axisEnd, maxEndMs: Math.max(axisEnd, lastDose + 730 * DAY), settings: s,
    weightKg: session.patient.weightKg > 0 ? session.patient.weightKg : 0, presence: new Map(), presenceAssumed: new Map(),
  };

  // Products that dose a compound some conditional link requires (alcohol) run first, so their presence is known.
  const required = new Set([...idx.children.values()].flat().map((e) => e.condition).filter((x): x is string => !!x));
  const reach = (p: Product) => staticReach(idx, componentIds(p));
  const provides = (p: Product) => [...reach(p)].filter((id) => required.has(id));
  const entries = [...byProduct].filter(([, doses]) => doses.length);
  entries.sort(([a], [b]) => Number(provides(idx.products.get(b)!).length > 0) - Number(provides(idx.products.get(a)!).length > 0));
  const addPresence = (r: ProductResult) => {
    for (const c of r.curves) {
      if (!required.has(c.compound.id)) continue;
      const run = c.formed.max ? c.runs.max : c.runs.typical;
      ctx.presence.set(c.compound.id, mergeIntervals([...(ctx.presence.get(c.compound.id) ?? []), ...intervalsAbove(run.times, run.amounts, c.threshold)]));
    }
  };
  const assumePresence = (p: Product, doses: DoseEvent[], why: string) => {
    const first = Math.min(...doses.map((d) => d.time));
    for (const id of provides(p)) {
      ctx.presence.set(id, mergeIntervals([...(ctx.presence.get(id) ?? []), [first, ctx.maxEndMs]]));
      ctx.presenceAssumed.set(id, why);
    }
  };

  const products: ProductResult[] = [];
  for (const [pid, doses] of entries) {
    const p = idx.products.get(pid)!;
    const req: SimRequest = { key: pid, product: p, name: displayName(p), isIbogaine: false, color: colors.get(pid)!, doses, phenotype: session.patient.phenotype, repeated: repeated(p, doses) };
    if (productNotModelled(idx, p)) {
      products.push(unsimulatedResult(idx, req, 'not-modelled', []));
      continue;
    }
    if (!productHasData(idx, p)) {
      const c = idx.compounds.get(primaryCompound(p));
      const what = c?.kinetics.mode === 'zero-order' ? 'elimination-rate' : 'half-life';
      warnings.push({ level: 'warn', text: `${p.name}: no ${what} data yet for ${c?.name ?? primaryCompound(p)} — not plotted.` });
      assumePresence(p, doses, `no ${what} data`);
      continue;
    }
    const r = simulateProduct(idx, req, ctx, warnings);
    if (r.status === 'needs-weight') assumePresence(p, doses, 'no body weight');
    addPresence(r);
    products.push(r);
  }
  const entryOrder = [...byProduct.keys()];
  products.sort((a, b) => entryOrder.indexOf(a.key) - entryOrder.indexOf(b.key));

  // CYP2D6 inhibition windows from patient drugs.
  const recoveryTail = s.clearHalfLives * s.cypRecoveryHalfLifeHours * HOUR;
  const cyp: CypInterval[] = [];
  const collectCyp = (r: ProductResult) => {
    for (const c of r.curves) {
      const { inhibitor, inhibitionType } = c.compound.cyp2d6;
      if (inhibitor === 'none') continue;
      const strengthUnassessed = inhibitor === 'unassessed';
      // Unassessed strength counts only when the inhibition itself is documented; then it is at least weak.
      if (strengthUnassessed && inhibitionType !== 'reversible' && inhibitionType !== 'mechanism-based') continue;
      const strength = strengthUnassessed ? 'weak' : inhibitor;
      const base = { strength, strengthUnassessed, compound: c.compound.name, productKey: r.key } as const;
      for (const [a, b] of intervalsAbove(c.runs.typical.times, c.runs.typical.amounts, c.threshold)) {
        cyp.push({ ...base, start: a, end: b, tail: false });
        if (inhibitionType === 'mechanism-based') cyp.push({ ...base, start: b, end: b + recoveryTail, tail: true });
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
  const documented = (c: Compound) => c.cyp2d6.inhibitionType === 'reversible' || c.cyp2d6.inhibitionType === 'mechanism-based';
  const cypUnassessed = ibogaineAt === null ? [] : [...new Set(presentAt(ibogaineAt)
    .filter((c) => c.compound.cyp2d6.inhibitor === 'unassessed' && !documented(c.compound)).map((c) => c.compound.name))];
  const by = [...new Set(atTreatment.filter((i) => !i.strengthUnassessed).map((i) => i.compound))];
  const byUnassessedStrength = [...new Set(atTreatment.filter((i) => i.strengthUnassessed).map((i) => i.compound))].filter((n) => !by.includes(n));
  const cypAtTreatment = { inhibited: atTreatment.length > 0, by, byUnassessedStrength, unassessed: cypUnassessed };

  // Projected ibogaine + noribogaine.
  const projectAsPoor = cypAtTreatment.inhibited || session.patient.phenotype === 'poor';
  let pmUnquantified: string[] = [];
  if (ibEvents.length) {
    const p = findIbogaineProduct(idx);
    const doses = ibEvents.map((e) => ({ time: e.time, amount: e.mg, unit: 'mg' as DoseUnit }));
    if (productHasData(idx, p)) {
      const r = simulateProduct(
        idx,
        {
          key: IBOGAINE_KEY, product: p, name: 'Ibogaine (projected)', isIbogaine: true, color: IBOGAINE_COLOR, doses,
          phenotype: cypAtTreatment.inhibited ? 'poor' : session.patient.phenotype, repeated: repeated(p, doses),
        },
        ctx, warnings,
      );
      if (projectAsPoor) {
        pmUnquantified = markPmUnquantified(r);
        r.pmAdjusted = cypAtTreatment.inhibited && !pmUnquantified.length;
        if (r.pmAdjusted) r.name = 'Ibogaine (projected, poor-metaboliser adjusted)';
        else if (pmUnquantified.length) r.name = 'Ibogaine (projected, poor-metaboliser effect not quantified)';
      }
      if (r.missing.length) warnings.push({ level: 'warn', text: `Ibogaine projection incomplete — missing kinetics for: ${r.missing.join(', ')}.` });
      products.push(r);
      collectCyp(r);
    } else {
      warnings.push({ level: 'info', text: 'Ibogaine has no half-life data in the library yet — only the dose markers are shown.' });
    }
  }

  const notQuantified = pmUnquantified.length ? `the increase is ${pmNotQuantified(pmUnquantified)}` : '';
  if (cypAtTreatment.inhibited) {
    const who = [
      by.length ? `Inhibited by: ${by.join(', ')}.` : '',
      byUnassessedStrength.length ? `Inhibition documented, strength unassessed — treated as at least weak: ${byUnassessedStrength.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    warnings.unshift({
      level: 'danger',
      text: `CYP2D6 likely inhibited at treatment — ibogaine exposure may resemble a poor metaboliser's${notQuantified ? `, but ${notQuantified}` : ''}. (${who})`,
    });
  } else if (notQuantified) {
    warnings.unshift({ level: 'danger', text: `Poor CYP2D6 metaboliser — ibogaine exposure may be increased, but ${notQuantified}.` });
  }
  if (cypUnassessed.length)
    warnings.push({ level: 'warn', text: `CYP2D6 inhibition unassessed for compounds present at the first ibogaine dose: ${cypUnassessed.join(', ')}.` });

  const qt = computeQt(products, axisStart, Math.max(axisEnd, ...products.map((p) => p.clearAtMax ?? axisEnd)));

  // Lingering effects after clearance.
  const lingering: LingeringBand[] = [];
  for (const r of products) {
    for (const c of r.curves) {
      const le = c.compound.lingeringEffects;
      if (le.durationDays && le.durationDays > 0 && c.clearAt !== null)
        lingering.push({ start: c.clearAt, end: c.clearAt + le.durationDays * DAY, compound: c.compound.name, productKey: r.key, note: le.note });
    }
    // Not modelled: the lingering band starts at the end of each exposure (v2.2 §3).
    const c = r.status === 'not-modelled' ? idx.compounds.get(primaryCompound(r.product)) : undefined;
    const days = c?.lingeringEffects.durationDays;
    if (c && days && days > 0)
      for (const [start, end] of mergeIntervals(r.doses.map((d) => [d.end ?? d.time, (d.end ?? d.time) + days * DAY])))
        lingering.push({ start, end, compound: c.name, productKey: r.key, note: c.lingeringEffects.note });
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
  if (unverified) warnings.push({ level: 'info', text: `${unverified} plotted entr${unverified === 1 ? 'y uses' : 'ies use'} draft library data (AI-assisted, not yet verified by hand).` });
  if (userEntered) warnings.push({ level: 'info', text: `${userEntered} plotted entr${userEntered === 1 ? 'y is' : 'ies are'} user-entered (not from the shared library).` });
  const firstDose = ibEvents.length ? `the first ibogaine dose (${IBOGAINE_KIND_LABEL[ibEvents[0].kind].toLowerCase()})` : '';
  for (const r of products) {
    if (r.isIbogaine) continue;
    if (r.status === 'not-modelled') {
      const le = idx.compounds.get(primaryCompound(r.product))?.lingeringEffects;
      warnings.push({
        level: 'info',
        text: `${r.name}: not modelled — ${r.notModelledReason}. ${le?.durationDays ? 'See the lingering-effects band.' : 'Lingering-effect duration unknown — clinical assessment needed.'}`,
      });
    } else if (r.status === 'needs-weight') {
      warnings.push({ level: 'warn', text: `${r.name}: needs body weight — alcohol elimination scales with weight. Enter the patient's weight to get a clear date.` });
    } else if (r.status === 'incomplete') {
      const overlapping = ibogaineAt !== null && (r.clearAt === null || r.clearAt > ibogaineAt);
      warnings.push({
        level: 'warn',
        text: ibogaineAt !== null
          ? `${r.name}: clear date incomplete — missing kinetics for ${r.missing.join(', ')}. Can't confirm it is clear by ${firstDose}${overlapping ? ' (the computable parts are not clear yet)' : ''}.`
          : `${r.name}: clear date incomplete — missing kinetics for ${r.missing.join(', ')}.`,
      });
    } else if (ibogaineAt !== null && (r.clearAt === null || r.clearAt > ibogaineAt))
      warnings.push({ level: 'warn', text: `${r.name} is not clear by ${firstDose} (typical estimate).` });
  }
  if (products.some((r) => r.curves.some((c) => c.formationLimited)))
    warnings.push({ level: 'info', text: 'Some conjugates are plotted as tracking their parent (formation-limited). They can accumulate in renal impairment.' });

  return {
    products, axisStart, axisEnd, now, ibogaineAt, ibogaineEvents: ibEvents, cyp, cypAtTreatment, qt, lingering, overlaps,
    receptorsUnassessedAtTreatment, warnings,
  };
}

/** "8 mg buprenorphine → 2 mg naloxone" for combination products, null for single-component ones. */
export function combinationText(idx: LibraryIndex, p: Product, amount: number, unit: DoseUnit): string | null {
  if (p.components.length < 2 || !(amount > 0)) return null;
  const part = (c: Product['components'][number]) => `${+(amount * c.ratio).toPrecision(3)} ${unit} ${(idx.compounds.get(c.compound)?.name ?? c.compound).toLowerCase()}`;
  const [first, ...rest] = p.components;
  return `${part(first)} → ${rest.map(part).join(', ')}`;
}

/** "Clear by …", "Clear by … — with assumptions", or "Incomplete — missing kinetics for: X · not before …". */
export function clearStatusText(r: ProductResult, fmt: (t: number) => string, which: 'typical' | 'max' = 'typical'): string {
  if (r.status === 'not-modelled') return `Not modelled — ${r.notModelledReason}`;
  if (r.status === 'needs-weight') return 'Needs body weight';
  const at = which === 'max' ? r.clearAtMax : r.clearAt;
  if (r.status === 'incomplete')
    return `Incomplete — missing kinetics for: ${r.missing.join(', ')}${at !== null ? ` · not before ${fmt(at)}` : ''}`;
  const base = at === null ? 'Not clear within the simulated window' : `Clear by ${fmt(at)}`;
  return r.status === 'assumptions' ? `${base} — with assumptions` : base;
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
  cyp.filter((iv) => t >= iv.start && t <= iv.end)
    .sort((a, b) => STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength] || Number(a.strengthUnassessed) - Number(b.strengthUnassessed))[0] ?? null;
