// Drug Library: entries, routing, filtering, the "at a glance" summary and the metabolite tree.
// No DOM here; every derived value comes from the app's own model and status functions.

import { computeScenario, DAY, HOUR, displayName, isRateUnit, productTree, requiredLabel, toLocalInput, type LibraryIndex, type ProductResult } from '../model';
import { compoundSections, primaryCompound, productSections } from '../schema';
import type { ProductSearch } from '../search';
import { emptySession } from '../state';
import type { Category, Compound, PhenotypeMap, Product, Provenance, Settings } from '../types';
import { drugIdOf } from '../validate';
import { libraryHash } from './route';
import { provenanceOf, PROVENANCE_LABEL } from './sources';
import { drugStates, libraryProducts, primaryProduct, type DrugState, type DrugStatus } from './status';

// ---------- entries ----------

export interface DrugEntry {
  kind: 'drug';
  id: string;
  name: string;
  aliases: string[];
  category: string;
  /** Primary and secondary categories of all its products. */
  categories: string[];
  className: string;
  routes: string[];
  products: Product[];
  primary: Product;
  /** Dosed compounds of all its products (parents first). */
  roots: string[];
  state: DrugState;
}

export interface MetaboliteEntry {
  kind: 'metabolite';
  id: string;
  name: string;
  aliases: string[];
  compound: Compound;
  /** Drugs whose metabolite tree contains this compound. */
  partOf: DrugEntry[];
  category: string;
  categories: string[];
}

export type Entry = DrugEntry | MetaboliteEntry;

export interface LibraryModel {
  idx: LibraryIndex;
  categories: Category[];
  drugs: DrugEntry[];
  metabolites: MetaboliteEntry[];
  /** Entry for a drug id, compound id or product id. */
  resolve: (id: string) => Entry | null;
}

export function buildLibraryModel(idx: LibraryIndex, unknownAsFL: boolean): LibraryModel {
  const states = drugStates(idx, unknownAsFL);
  const byDrug = new Map<string, Product[]>();
  for (const p of libraryProducts(idx)) byDrug.set(drugIdOf(p), [...(byDrug.get(drugIdOf(p)) ?? []), p]);

  const drugs: DrugEntry[] = [...byDrug].map(([id, ps]) => {
    const primary = primaryProduct(ps);
    const parent = idx.compounds.get(primaryCompound(primary));
    const roots = [...new Set([primaryCompound(primary), ...ps.flatMap((p) => p.components.map((c) => c.compound))])];
    return {
      kind: 'drug',
      id,
      name: displayName(primary).replace(/\s*\([^)]*\)\s*$/, ''),
      aliases: [...new Set([...ps.flatMap((p) => p.aliases ?? []), ...(parent?.aliases ?? [])])],
      category: primary.category,
      categories: [...new Set(ps.flatMap((p) => [p.category, ...(p.secondaryCategories ?? [])]))],
      className: primary.class,
      routes: [...new Set(ps.map((p) => p.route + (p.formulation && p.formulation !== 'IR' && !p.route.toLowerCase().includes(p.formulation.toLowerCase()) ? ` ${p.formulation}` : '')))],
      products: [...ps].sort((a, b) => (a === primary ? -1 : b === primary ? 1 : a.name.localeCompare(b.name))),
      primary,
      roots,
      state: states.get(id)!,
    };
  });

  const dosed = new Set(drugs.flatMap((d) => d.roots));
  const treeOf = new Map(drugs.map((d) => [d.id, new Set(productTree(idx, d.roots).map((n) => n.id))]));
  const metabolites: MetaboliteEntry[] = idx.lib.compounds
    .filter((c) => !c.userEntered && !dosed.has(c.id))
    .map((c) => {
      const partOf = drugs.filter((d) => treeOf.get(d.id)!.has(c.id));
      return {
        kind: 'metabolite', id: c.id, name: c.name, aliases: c.aliases ?? [], compound: c, partOf,
        category: partOf[0]?.category ?? '', categories: [...new Set(partOf.flatMap((d) => d.categories))],
      };
    });

  const drugById = new Map(drugs.map((d) => [d.id, d]));
  const metById = new Map(metabolites.map((m) => [m.id, m]));
  const drugOfProduct = new Map(drugs.flatMap((d) => d.products.map((p) => [p.id, d] as const)));
  const drugOfParent = new Map(drugs.map((d) => [primaryCompound(d.primary), d]));
  const resolve = (id: string): Entry | null =>
    drugById.get(id) ?? metById.get(id) ?? drugOfProduct.get(id) ?? drugOfParent.get(id) ?? drugs.find((d) => d.roots.includes(id)) ?? null;

  return { idx, categories: [...idx.lib.categories].sort((a, b) => a.order - b.order), drugs, metabolites, resolve };
}

// ---------- search and filters ----------

export type StatusFilter = 'verified' | 'draft' | 'incomplete' | 'not-modelled' | 'no-data';

export interface ListQuery {
  query: string;
  categories: Set<string>;
  statuses: Set<StatusFilter>;
  showMetabolites: boolean;
}

/** One status dot per row; metabolites take the status of their own compound entry. */
export function entryStatus(e: Entry): DrugStatus {
  if (e.kind === 'drug') return e.state.status;
  return e.compound.verified ? 'verified' : e.compound.kinetics.mode === 'unknown' ? 'no-data' : 'draft';
}

const isNotModelledEntry = (e: Entry) => (e.kind === 'drug' ? e.state.notModelled : e.compound.kinetics.mode === 'not-modelled');

function matchesStatus(e: Entry, statuses: Set<StatusFilter>): boolean {
  if (!statuses.size) return true;
  const st = entryStatus(e);
  const incomplete = e.kind === 'drug' ? e.state.incomplete : false;
  return (
    (statuses.has('verified') && (st === 'verified' || st === 'verified-incomplete')) ||
    (statuses.has('draft') && st === 'draft') ||
    (statuses.has('incomplete') && incomplete) ||
    (statuses.has('not-modelled') && isNotModelledEntry(e)) ||
    (statuses.has('no-data') && st === 'no-data')
  );
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Entries matching the query and filters. With a query, ordered by search rank (the app's own
 * Fuse.js product index; metabolites by name/alias prefix or substring); without one, alphabetical.
 */
export function filterEntries(model: LibraryModel, search: ProductSearch, q: ListQuery): Entry[] {
  const inCats = (e: Entry) => !q.categories.size || e.categories.some((c) => q.categories.has(c));
  const pool: Entry[] = [...model.drugs, ...(q.showMetabolites ? model.metabolites : [])].filter((e) => inCats(e) && matchesStatus(e, q.statuses));
  const query = norm(q.query);
  if (!query) return pool.sort((a, b) => a.name.localeCompare(b.name));

  const rank = new Map<string, number>();
  search.search(query, 400).forEach((hit, i) => {
    const e = model.resolve(hit.productId);
    if (e && !rank.has(e.id)) rank.set(e.id, i);
  });
  if (q.showMetabolites)
    for (const m of model.metabolites) {
      if (rank.has(m.id)) continue;
      const names = [m.name, ...m.aliases].map(norm);
      if (names.some((n) => n.startsWith(query))) rank.set(m.id, 1000);
      else if (names.some((n) => n.includes(query))) rank.set(m.id, 2000);
    }
  return pool.filter((e) => rank.has(e.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)! || a.name.localeCompare(b.name));
}

// ---------- at a glance ----------

export interface Glance {
  text: string;
  /** Extra sentences: assumed input, phenotype, threshold. */
  notes: string[];
  /** The simulation's own assumption lines. */
  assumptions: string[];
  result: ProductResult | null;
  /** Dose time used, epoch ms. */
  t0: number;
}

const GLANCE_T0 = new Date('2026-01-05T08:00').getTime();

/** Under 48 h in hours, otherwise days. */
const spanNumber = (ms: number, inDays: boolean) => {
  if (!inDays) return Math.max(1, Math.round(ms / HOUR));
  const d = ms / DAY;
  return d < 10 ? Math.round(d * 10) / 10 : Math.round(d);
};
const spanUnit = (ms: number) => ms >= 48 * HOUR;

export function fmtSpan(ms: number, days = spanUnit(ms)): string {
  const v = spanNumber(ms, days);
  return days ? `${v} days` : `${v} hour${v === 1 ? '' : 's'}`;
}

/** "5–19 days", in the unit of the upper bound. */
export function fmtRange(a: number, b: number): string {
  const days = spanUnit(b);
  return `${spanNumber(a, days)}–${spanNumber(b, days)} ${days ? 'days' : 'hours'}`;
}

/**
 * A single dose of the drug's primary product, normal CYP2D6 metaboliser, with the user's current
 * clear threshold and data settings, through the app's own computeScenario.
 */
export function atAGlance(idx: LibraryIndex, drug: DrugEntry, settings: Settings): Glance {
  const p = drug.primary;
  const notes: string[] = [];
  const none = (text: string): Glance => ({ text, notes, assumptions: [], result: null, t0: GLANCE_T0 });
  if (drug.state.noData) return none('No half-life in the library yet, so a clear time can’t be estimated.');
  if (drug.state.notModelled) {
    const reason = idx.compounds.get(primaryCompound(p))?.kinetics.notModelledReason;
    return none(`Not modelled — ${reason || 'no simulation for this product'}. Doses are shown as exposure markers and there is no clear date.`);
  }

  const session = emptySession();
  session.settings = { ...settings };
  session.patient.phenotype = 'normal';
  const rate = isRateUnit(p.doseUnit);
  const amount = p.typicalDose.amount && p.typicalDose.amount > 0 ? p.typicalDose.amount : rate ? 1 : 10;
  session.doses = [{
    id: 'glance', productId: p.id, amount, unit: p.doseUnit, kind: 'single', time: toLocalInput(GLANCE_T0),
    ...(rate && p.input.defaultDurationHours ? { durationHours: p.input.defaultDurationHours } : {}),
  }];
  const scn = computeScenario(idx, session, GLANCE_T0);
  const r = scn.products.find((x) => x.product.id === p.id) ?? null;
  if (!r) return none('This product can’t be simulated.');

  const since = (t: number) => t - GLANCE_T0;
  const after = rate ? 'After one patch' : p.input.type === 'first-order-release' && p.formulation === 'depot' ? 'After one injection' : 'After a single dose';
  let text: string;
  if (r.status === 'incomplete') {
    text = r.clearAt !== null
      ? `${after}, below the clear threshold not before ~${fmtSpan(since(r.clearAt))}. Incomplete: no kinetics for ${r.missing.join(', ')}.`
      : `${after}, the clear time can’t be estimated. Incomplete: no kinetics for ${r.missing.join(', ')}.`;
  } else if (r.clearAt === null) {
    text = `${after}, not below the clear threshold within the simulated window.`;
  } else {
    const lo = r.clearAtMin ?? r.clearAt;
    const hi = r.clearAtMax;
    const range = hi === null ? ' (slowest case beyond the simulated window)' : Math.abs(hi - lo) > HOUR ? ` (range ${fmtRange(since(lo), since(hi))})` : '';
    text = `${after}, typically below the clear threshold in ~${fmtSpan(since(r.clearAt), spanUnit(since(hi ?? r.clearAt)))}${range}.`;
  }

  if (rate) {
    notes.push(p.input.defaultDurationHours
      ? `Assumes one patch worn for its default wear time (${p.input.defaultDurationHours} h).`
      : 'Assumes one patch worn for 24 h (no default wear time in the library).');
  } else if (p.formulation === 'depot') notes.push('Assumes one injection.');
  if (r.curves.some((c) => c.compound.cyp2d6.substrate === 'yes')) notes.push('For a normal CYP2D6 metaboliser.');
  notes.push(`Clear threshold: ${settings.clearHalfLives} half-lives of the peak (Settings).`);
  return { text, notes, assumptions: r.status === 'incomplete' ? [] : r.assumptions, result: r, t0: GLANCE_T0 };
}

// ---------- metabolite tree ----------

export interface TreeNode {
  id: string;
  name: string;
  depth: number;
  row: number;
  relevance: 'active' | 'inactive' | 'unknown';
  halfLife: string;
  href: string;
}

export interface TreeEdge {
  from: string;
  to: string;
  label: string;
  /** "with alcohol": the link only applies while that compound is present (drawn dashed). */
  conditional?: string;
}

const phenText = (m: PhenotypeMap | null) =>
  m ? Object.entries(m).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k[0].toUpperCase()}M ×${v}`).join(' ') : '';

export function hoursText(h: number): string {
  const v = +h.toPrecision(3);
  return h >= 72 ? `${v} h (${+(h / 24).toPrecision(3)} d)` : `${v} h`;
}

/** Nodes (by depth column) and edges for the tree starting at the given roots. */
export function treeLayout(idx: LibraryIndex, roots: string[]): { nodes: TreeNode[]; edges: TreeEdge[] } {
  const order = productTree(idx, roots);
  const rows = new Map<number, number>();
  const nodes: TreeNode[] = order.map(({ id, depth }) => {
    const c = idx.compounds.get(id);
    const row = rows.get(depth) ?? 0;
    rows.set(depth, row + 1);
    const k = c?.kinetics;
    const rate = k?.zeroOrderRateMgPerKgPerHour?.typical;
    const hl = k?.mode === 'formation-limited' ? 'tracks parent'
      : k?.mode === 'zero-order' ? (rate ? `${+rate.toPrecision(3)} mg/kg/h` : 'rate unknown')
      : k?.mode === 'not-modelled' ? 'not modelled'
      : k?.halfLifeHours?.typical ? `t½ ${hoursText(k.halfLifeHours.typical)}`
      : c?.endogenous ? 'endogenous'
      : 't½ unknown';
    return {
      id, name: c?.name ?? id, depth, row, href: libraryHash(id),
      relevance: depth === 0 || idx.dosed.has(id) ? 'active' : (c?.clinicalRelevance ?? 'unknown'),
      halfLife: hl,
    };
  });
  const inTree = new Set(nodes.map((n) => n.id));
  const edges: TreeEdge[] = [];
  for (const n of nodes)
    for (const e of idx.children.get(n.id) ?? []) {
      if (!inTree.has(e.id)) continue;
      const f = e.fraction === null ? 'fraction unknown' : `fraction ${+e.fraction.toPrecision(3)}`;
      const m = phenText(e.multiplier);
      const cond = e.condition ? `with ${requiredLabel(idx, e.condition)}` : '';
      edges.push({ from: n.id, to: e.id, label: [f, m, cond].filter(Boolean).join(' · '), ...(cond ? { conditional: cond } : {}) });
    }
  return { nodes, edges };
}

// ---------- provenance per section ----------

export const COMPOUND_SECTION_LABEL: Record<string, string> = {
  halfLife: 'Half-life', metabolism: 'Metabolism', relevance: 'Clinical relevance', molecularWeight: 'Molecular weight',
  cyp2d6: 'CYP2D6', qt: 'QT', receptors: 'Receptors', lingeringEffects: 'Lingering effects', nonlinearKinetics: 'Nonlinear kinetics',
};
export const PRODUCT_SECTION_LABEL: Record<string, string> = {
  class: 'Class', aliases: 'Names and aliases', components: 'Components', conversion: 'Prodrug conversion', input: 'Input model', typicalDose: 'Typical dose',
};

export interface SectionSource {
  key: string;
  label: string;
  /** Raw note, verbatim. */
  note: string;
  tag: Provenance | null;
  /** Shown for unverified entries only. */
  marker: { tag: string; label: string } | null;
}

/** Each review section of a compound or product with its note and (drafts only) provenance marker. */
export function sectionSources(e: Compound | Product, kind: 'compound' | 'product'): SectionSource[] {
  const keys = kind === 'compound' ? compoundSections(e as Compound) : productSections(e as Product);
  const labels = kind === 'compound' ? COMPOUND_SECTION_LABEL : PRODUCT_SECTION_LABEL;
  return keys.map((key) => {
    const tag = provenanceOf(e.provenance?.[key as keyof typeof e.provenance] as string | null);
    return {
      key,
      label: labels[key] ?? key,
      note: (e.sourceNotes as Record<string, string>)?.[key] ?? '',
      tag,
      marker: e.verified ? null : { tag: tag ?? 'untagged', label: tag ? PROVENANCE_LABEL[tag] : 'not tagged' },
    };
  });
}