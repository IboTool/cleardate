// Turns the library + session into everything the chart, tracks, warnings and exports need.
// All PK maths lives in pk.ts; this module decides *what* to simulate.
//
// Each product is simulated on its own (linear kinetics → superposition holds), so a shared
// metabolite such as oxazepam formed from two products appears once per product, in that
// product's colour, and per-product clear times and QT references are well defined.

import { clearFraction, clearTime, expandRegimen, intervalsAbove, simulate, valueAt, type SimCompound } from './pk';
import { effectiveHalfLife } from './schema';
import { findCycle, fractionSums } from './validate';
import type {
  Compound, CustomDrugs, DoseEntry, InhibitorStrength, Library, Phenotype, PatientPhenotype, Product, QtTier, Session,
} from './types';

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const IBOGAINE_KEY = '__ibogaine__';

// ---------- library index ----------

export interface LibraryIndex {
  lib: Library;
  compounds: Map<string, Compound>;
  products: Map<string, Product>;
  children: Map<string, { id: string; fraction: number }[]>;
  /** Load-time problems shown to the user (fractions > 1, cycles). */
  loadWarnings: string[];
}

export function mergeLibraries(base: Library, ...extra: Partial<Library>[]): Library {
  const out: Library = { categories: [...base.categories], compounds: [...base.compounds], products: [...base.products] };
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
    merged.compounds[i] = { ...c, isMetabolite: true, formedFrom: [...c.formedFrom, { compound: l.from, fraction: l.fraction }] };
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

  // Fractions out of one compound must sum to ≤ 1; if not, scale them down for simulation.
  const sums = fractionSums(working);
  const scale = new Map<string, number>();
  for (const [src, sum] of sums)
    if (sum > 1 + 1e-9) {
      scale.set(src, 1 / sum);
      loadWarnings.push(`Metabolite fractions formed from ${compounds.get(src)?.name ?? src} sum to ${sum.toFixed(2)} (> 1); scaled down to 1 for the simulation.`);
    }

  const children = new Map<string, { id: string; fraction: number }[]>();
  for (const c of working)
    for (const f of c.formedFrom) {
      if (!compounds.has(f.compound)) continue;
      const list = children.get(f.compound) ?? [];
      list.push({ id: c.id, fraction: (f.fraction || 0) * (scale.get(f.compound) ?? 1) });
      children.set(f.compound, list);
    }
  return { lib, compounds, products, children, loadWarnings };
}

/** The parent's half-life source for a product: the product override (depot/ER) or the compound. */
export function productHalfLife(idx: LibraryIndex, p: Product) {
  return effectiveHalfLife(p.apparentHalfLifeHours) ?? effectiveHalfLife(idx.compounds.get(p.parentCompound)?.halfLifeHours);
}

export const productHasData = (idx: LibraryIndex, p: Product) => productHalfLife(idx, p) !== null;

/** Parent and every downstream metabolite with depth (parent = 0), in breadth-first order. */
export function productTree(idx: LibraryIndex, parentId: string): { id: string; depth: number }[] {
  const out: { id: string; depth: number }[] = [{ id: parentId, depth: 0 }];
  const seen = new Set([parentId]);
  for (let i = 0; i < out.length; i++)
    for (const ch of idx.children.get(out[i].id) ?? [])
      if (!seen.has(ch.id)) {
        seen.add(ch.id);
        out.push({ id: ch.id, depth: out[i].depth + 1 });
      }
  return out;
}

// ---------- dates ----------

export const parseLocal = (s: string | undefined): number => (s ? new Date(s).getTime() : NaN);

export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Expand a dose entry (single or regimen) into individual doses, epoch ms. */
export function expandDose(d: DoseEntry): { time: number; amount: number }[] {
  if (d.kind === 'single') {
    const t = parseLocal(d.time);
    return Number.isFinite(t) && d.amountMg > 0 ? [{ time: t, amount: d.amountMg }] : [];
  }
  const r = d.regimen;
  if (!r) return [];
  const start = parseLocal(r.start);
  const end = parseLocal(r.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(d.amountMg > 0)) return [];
  const everyHours = r.every * (r.unit === 'days' ? 24 : 1);
  return expandRegimen({ amount: d.amountMg, everyHours, start: 0, end: (end - start) / HOUR }).map((x) => ({
    time: start + x.time * HOUR,
    amount: x.amount,
  }));
}

// ---------- results ----------

export type RunName = 'min' | 'typical' | 'max';

export interface Run {
  /** Epoch ms. */
  times: number[];
  /** Parent-mg-equivalents. */
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
  /** Multiply parent-mg-eq by this to get mg of this compound; null when molecular weights are missing. */
  mgFactor: number | null;
}

export interface ProductResult {
  key: string;
  product: Product;
  name: string;
  isIbogaine: boolean;
  color: string;
  doses: { time: number; amount: number }[];
  latestDoseMg: number;
  refDoseMg: number;
  curves: CompoundCurve[];
  clearAt: number | null;
  clearAtMax: number | null;
  skipped: string[];
  pmAdjusted?: boolean;
}

export interface CypInterval {
  start: number;
  end: number;
  strength: Exclude<InhibitorStrength, 'none'>;
  tail: boolean;
  compound: string;
  productKey: string;
}

export interface QtPoint {
  t: number;
  load: number;
  tier: QtTier;
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
  cypAtTreatment: { inhibited: boolean; by: string[] };
  qt: QtPoint[];
  lingering: LingeringBand[];
  overlaps: ReceptorOverlap[];
  warnings: Warning[];
}

export const PRODUCT_COLORS = [
  '#7c9cff', '#ff8a65', '#4dd0a7', '#f06292', '#ffd54f', '#9575cd', '#4fc3f7', '#aed581',
  '#ff7043', '#ba68c8', '#4db6ac', '#e57373', '#90a4ae', '#dce775', '#64b5f6', '#ffb74d',
];
export const IBOGAINE_COLOR = '#e8c36a';

const TIER_RANK: Record<QtTier, number> = { none: 0, conditional: 1, possible: 2, known: 3 };
const STRENGTH_RANK = { none: 0, weak: 1, moderate: 2, strong: 3 } as const;

function multiplierRange(c: Compound, phen: PatientPhenotype): Record<RunName, number> {
  if (!c.cyp2d6.substrate) return { min: 1, typical: 1, max: 1 };
  const m = c.cyp2d6.halfLifeMultiplier;
  if (phen === 'unknown') {
    const vals = (['poor', 'intermediate', 'normal', 'ultrarapid'] as Phenotype[]).map((k) => m[k] || 1);
    return { min: Math.min(...vals), typical: m.normal || 1, max: Math.max(...vals) };
  }
  const v = m[phen] || 1;
  return { min: v, typical: v, max: v };
}

interface SimRequest {
  key: string;
  product: Product;
  name: string;
  isIbogaine: boolean;
  color: string;
  doses: { time: number; amount: number }[];
  phenotype: PatientPhenotype;
}

function simulateProduct(
  idx: LibraryIndex, req: SimRequest, t0: number, minEndMs: number, maxEndMs: number, clearHalfLives: number,
): ProductResult {
  const { product } = req;
  const tree = productTree(idx, product.parentCompound);
  const skipped: string[] = [];
  const included = new Set<string>();
  const parentHl = productHalfLife(idx, product);
  // A metabolite without half-life data is skipped together with everything downstream of it.
  for (const node of tree) {
    const c = idx.compounds.get(node.id);
    if (!c) continue;
    if (node.depth === 0) {
      if (parentHl) included.add(node.id);
      continue;
    }
    const reachable = [...included].some((p) => (idx.children.get(p) ?? []).some((ch) => ch.id === node.id));
    if (!reachable) continue;
    if (effectiveHalfLife(c.halfLifeHours)) included.add(node.id);
    else skipped.push(c.name);
  }

  const parentCompound = idx.compounds.get(product.parentCompound)!;
  const runs = {} as Record<RunName, ReturnType<typeof simulate> | null>;
  for (const run of ['min', 'typical', 'max'] as RunName[]) {
    if (!parentHl) {
      runs[run] = null;
      continue;
    }
    const sims: SimCompound[] = [...included].map((id) => {
      const c = idx.compounds.get(id)!;
      let hl: number;
      if (id === product.parentCompound && effectiveHalfLife(product.apparentHalfLifeHours)) {
        hl = parentHl[run]; // release-limited: no phenotype adjustment
      } else {
        hl = effectiveHalfLife(c.halfLifeHours)![run] * multiplierRange(c, req.phenotype)[run];
      }
      return {
        id,
        halfLifeHours: hl,
        children: (idx.children.get(id) ?? []).filter((ch) => included.has(ch.id)),
      };
    });
    runs[run] = simulate(
      sims,
      req.doses.map((d) => ({ time: (d.time - t0) / HOUR, compoundId: product.parentCompound, amount: d.amount })),
      { start: Math.min(...req.doses.map((d) => (d.time - t0) / HOUR)), minEnd: (minEndMs - t0) / HOUR, maxEnd: (maxEndMs - t0) / HOUR },
    );
  }

  const frac = clearFraction(clearHalfLives);
  const curves: CompoundCurve[] = [];
  const typ = runs.typical;
  if (typ) {
    for (const node of tree) {
      if (!included.has(node.id)) continue;
      const c = idx.compounds.get(node.id)!;
      const mk = (r: ReturnType<typeof simulate>): Run => ({ times: r.times.map((h) => t0 + h * HOUR), amounts: r.amounts[node.id] });
      const runsOut = { min: mk(runs.min!), typical: mk(typ), max: mk(runs.max!) };
      const peak = typ.peaks[node.id];
      const threshold = peak * frac;
      const ct = (r: Run) => {
        const v = clearTime(r.times, r.amounts, threshold);
        return v === -Infinity ? r.times[0] : v;
      };
      const mwP = parentCompound.molecularWeight;
      const mwC = c.molecularWeight;
      curves.push({
        key: `${req.key}:${node.id}`,
        productKey: req.key,
        compound: c,
        depth: node.depth,
        runs: runsOut,
        peak,
        threshold,
        clearAt: peak > 0 ? ct(runsOut.typical) : null,
        clearAtMax: peak > 0 ? ct(runsOut.max) : null,
        mgFactor: node.depth === 0 ? 1 : mwP > 0 && mwC > 0 ? mwC / mwP : null,
      });
    }
  }
  const maxOf = (vals: (number | null)[]) => (vals.some((v) => v === null) ? null : Math.max(...(vals as number[])));
  const latest = [...req.doses].sort((a, b) => b.time - a.time)[0];
  return {
    key: req.key,
    product,
    name: req.name,
    isIbogaine: req.isIbogaine,
    color: req.color,
    doses: req.doses,
    latestDoseMg: latest?.amount ?? 0,
    refDoseMg: product.typicalDoseMg > 0 ? product.typicalDoseMg : Math.max(0, ...req.doses.map((d) => d.amount)),
    curves,
    clearAt: curves.length ? maxOf(curves.map((c) => c.clearAt)) : null,
    clearAtMax: curves.length ? maxOf(curves.map((c) => c.clearAtMax)) : null,
    skipped,
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
  const p = idx.lib.products.find((x) => x.parentCompound === 'ibogaine');
  if (p) return p;
  return {
    id: 'ibogaine_oral', name: 'Ibogaine (Oral)', aliases: [], category: 'psychedelics_dissociatives', class: '',
    parentCompound: 'ibogaine', route: 'Oral', typicalDoseMg: 0, source: '', verified: false, verifiedDate: '',
  };
}

export function computeScenario(idx: LibraryIndex, session: Session, now: number): Scenario {
  const s = session.settings;
  const warnings: Warning[] = idx.loadWarnings.map((text) => ({ level: 'warn' as const, text }));
  const colors = productColors(session);

  // Group doses by product.
  const byProduct = new Map<string, { time: number; amount: number }[]>();
  for (const d of session.doses) {
    const p = idx.products.get(d.productId);
    if (!p) {
      warnings.push({ level: 'warn', text: `A dose refers to an unknown product (${d.productId}); it is ignored.` });
      continue;
    }
    const list = byProduct.get(d.productId) ?? [];
    list.push(...expandDose(d));
    byProduct.set(d.productId, list);
  }

  const ib = session.ibogaine;
  const ibTimes = ib ? [ib.flood, ...ib.boosters].map((x) => parseLocal(x.time)).filter(Number.isFinite) : [];
  const ibogaineAt = ib && Number.isFinite(parseLocal(ib.flood.time)) ? parseLocal(ib.flood.time) : null;
  const allDoseTimes = [...byProduct.values()].flat().map((d) => d.time);
  const earliest = Math.min(...allDoseTimes, ...ibTimes, now);
  const lastDose = Math.max(...allDoseTimes, now);
  const axisStart = allDoseTimes.length ? Math.min(...allDoseTimes) : Math.min(now, ibogaineAt ?? now) - DAY;
  const axisEnd = (ibTimes.length ? Math.max(...ibTimes) : lastDose) + 14 * DAY;
  const t0 = earliest;
  const maxEnd = Math.max(axisEnd, lastDose + 730 * DAY);

  const products: ProductResult[] = [];
  for (const [pid, doses] of byProduct) {
    const p = idx.products.get(pid)!;
    if (!doses.length) continue;
    if (!productHasData(idx, p)) {
      warnings.push({ level: 'warn', text: `${p.name}: no half-life data yet — not plotted.` });
      continue;
    }
    const r = simulateProduct(
      idx,
      { key: pid, product: p, name: displayName(p), isIbogaine: false, color: colors.get(pid)!, doses, phenotype: session.patient.phenotype },
      t0, axisEnd, maxEnd, s.clearHalfLives,
    );
    if (r.skipped.length)
      warnings.push({ level: 'warn', text: `${r.name}: ${r.skipped.join(', ')} skipped — no half-life data (downstream metabolites not shown).` });
    products.push(r);
  }

  // CYP2D6 inhibition windows from patient drugs.
  const recoveryTail = s.clearHalfLives * s.cypRecoveryHalfLifeHours * HOUR;
  const cyp: CypInterval[] = [];
  const collectCyp = (r: ProductResult) => {
    for (const c of r.curves) {
      const inh = c.compound.cyp2d6.inhibitor;
      if (inh === 'none') continue;
      for (const [a, b] of intervalsAbove(c.runs.typical.times, c.runs.typical.amounts, c.threshold)) {
        cyp.push({ start: a, end: b, strength: inh, tail: false, compound: c.compound.name, productKey: r.key });
        if (c.compound.cyp2d6.inhibitionType === 'mechanism-based')
          cyp.push({ start: b, end: b + recoveryTail, strength: inh, tail: true, compound: c.compound.name, productKey: r.key });
      }
    }
  };
  products.forEach(collectCyp);

  const inhibitedAt = (t: number) => cyp.filter((iv) => t >= iv.start && t <= iv.end);
  const atTreatment = ibTimes.flatMap(inhibitedAt);
  const cypAtTreatment = { inhibited: atTreatment.length > 0, by: [...new Set(atTreatment.map((i) => i.compound))] };
  if (cypAtTreatment.inhibited)
    warnings.unshift({
      level: 'danger',
      text: `CYP2D6 likely inhibited at treatment — ibogaine exposure may resemble a poor metaboliser's. (Inhibited by: ${cypAtTreatment.by.join(', ')}.)`,
    });

  // Projected ibogaine + noribogaine.
  if (ib) {
    const p = findIbogaineProduct(idx);
    const doses = [ib.flood, ...ib.boosters]
      .map((x) => ({ time: parseLocal(x.time), amount: x.mg }))
      .filter((d) => Number.isFinite(d.time) && d.amount > 0);
    if (doses.length && productHasData(idx, p)) {
      const r = simulateProduct(
        idx,
        {
          key: IBOGAINE_KEY, product: p, name: 'Ibogaine (projected)', isIbogaine: true, color: IBOGAINE_COLOR, doses,
          phenotype: cypAtTreatment.inhibited ? 'poor' : session.patient.phenotype,
        },
        t0, axisEnd, maxEnd, s.clearHalfLives,
      );
      r.pmAdjusted = cypAtTreatment.inhibited;
      if (r.pmAdjusted) r.name = 'Ibogaine (projected, poor-metaboliser adjusted)';
      if (r.skipped.length) warnings.push({ level: 'warn', text: `Ibogaine projection: ${r.skipped.join(', ')} skipped — no half-life data.` });
      products.push(r);
      collectCyp(r);
    } else if (doses.length) {
      warnings.push({ level: 'info', text: 'Ibogaine has no half-life data in the library yet — only the treatment date is shown.' });
    }
  }

  // QT load on a shared grid: Σ weight × amount / reference dose of the originating product.
  const qt: QtPoint[] = [];
  const qtCurves = products.flatMap((r) =>
    r.curves.filter((c) => c.compound.qt.weight > 0 || c.compound.qt.tier !== 'none').map((c) => ({ c, ref: r.refDoseMg })),
  );
  if (qtCurves.length) {
    const end = Math.max(axisEnd, ...products.map((p) => p.clearAtMax ?? axisEnd));
    const N = 1500;
    const grid = new Set<number>();
    for (let i = 0; i <= N; i++) grid.add(axisStart + ((end - axisStart) * i) / N);
    for (const r of products) for (const d of r.doses) { grid.add(d.time - 1); grid.add(d.time); }
    for (const t of [...grid].sort((a, b) => a - b)) {
      let load = 0;
      let tier: QtTier = 'none';
      for (const { c, ref } of qtCurves) {
        const a = valueAt(c.runs.typical.times, c.runs.typical.amounts, t);
        if (ref > 0) load += (c.compound.qt.weight * a) / ref;
        if (a >= c.threshold && a > 0 && TIER_RANK[c.compound.qt.tier] > TIER_RANK[tier]) tier = c.compound.qt.tier;
      }
      qt.push({ t, load, tier });
    }
    for (const r of products)
      if (r.refDoseMg <= 0 && r.curves.some((c) => c.compound.qt.weight > 0))
        warnings.push({ level: 'info', text: `${r.name}: no reference dose for the QT load.` });
  }

  // Lingering effects after clearance.
  const lingering: LingeringBand[] = [];
  for (const r of products)
    for (const c of r.curves) {
      const le = c.compound.lingeringEffects;
      if (le.durationDays > 0 && c.clearAt !== null)
        lingering.push({ start: c.clearAt, end: c.clearAt + le.durationDays * DAY, compound: c.compound.name, productKey: r.key, note: le.note });
    }

  // Receptor overlap at the ibogaine date: targets hit by compounds from ≥ 2 different sources.
  const overlaps: ReceptorOverlap[] = [];
  if (ibogaineAt !== null) {
    const byTarget = new Map<string, ReceptorOverlap>();
    for (const r of products)
      for (const c of r.curves) {
        const a = valueAt(c.runs.typical.times, c.runs.typical.amounts, ibogaineAt);
        if (!(a > 0 && a >= c.threshold)) continue;
        for (const rec of c.compound.receptors) {
          const k = rec.target.trim().toLowerCase();
          const o = byTarget.get(k) ?? { target: rec.target.trim(), hits: [] };
          o.hits.push({ compound: c.compound.name, action: rec.action, productKey: r.key, productName: r.name });
          byTarget.set(k, o);
        }
      }
    for (const o of byTarget.values()) if (new Set(o.hits.map((h) => h.productKey)).size >= 2) overlaps.push(o);
    overlaps.sort((a, b) => b.hits.length - a.hits.length);
  }

  // Data-quality warnings.
  const used = products.flatMap((r) => [r.product, ...r.curves.map((c) => c.compound)]);
  const nonlinear = products.flatMap((r) => r.curves.filter((c) => c.compound.nonlinearKinetics.flag).map((c) => c.compound));
  for (const c of new Map(nonlinear.map((c) => [c.id, c])).values())
    warnings.push({ level: 'warn', text: `${c.name}: nonlinear kinetics — not modelled. ${c.nonlinearKinetics.note}`.trim() });
  const unverified = used.filter((e) => !e.verified && !e.userEntered).length;
  const userEntered = used.filter((e) => e.userEntered).length;
  if (unverified) warnings.push({ level: 'info', text: `${unverified} plotted entr${unverified === 1 ? 'y uses' : 'ies use'} unverified library data.` });
  if (userEntered) warnings.push({ level: 'info', text: `${userEntered} plotted entr${userEntered === 1 ? 'y is' : 'ies are'} user-entered (not from the shared library).` });
  if (ibogaineAt !== null)
    for (const r of products)
      if (!r.isIbogaine && (r.clearAt === null || r.clearAt > ibogaineAt))
        warnings.push({ level: 'warn', text: `${r.name} is not clear by the planned ibogaine date (typical estimate).` });

  return {
    products, axisStart, axisEnd, now, ibogaineAt, ibogaineDoseTimes: ibTimes, cyp, cypAtTreatment, qt, lingering, overlaps, warnings,
  };
}

export const strongestAt = (cyp: CypInterval[], t: number): CypInterval | null =>
  cyp.filter((iv) => t >= iv.start && t <= iv.end).sort((a, b) => STRENGTH_RANK[b.strength] - STRENGTH_RANK[a.strength])[0] ?? null;
