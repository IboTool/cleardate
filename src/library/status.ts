// Live data-status figures and wording, shared by the Library view, the PDF export and the help page.

import { productHasData, missingKinetics, buildIndex, type LibraryIndex } from '../model';
import { drugIdOf, verifiedDrugs } from '../validate';
import type { Library, Product } from '../types';

/** The data-status statement; the Draft clause drops out once every drug is verified. */
export function dataStatement(stats?: Pick<LibraryStats, 'drugs' | 'verified'>): string {
  const allVerified = !!stats && stats.drugs > 0 && stats.verified === stats.drugs;
  return 'Drug data was drafted with the assistance of AI language models from published, cited sources (FDA labels, Baselt, CredibleMeds, the Flockhart table, CPIC, the IUPHAR/BPS Guide to Pharmacology and the primary literature). Every value records its source. Entries are reviewed and verified by hand against those sources'
    + (allVerified ? '. ' : '; entries marked Draft have not yet been verified. ')
    + 'The library will keep growing.';
}

export type DrugStatus = 'verified' | 'verified-incomplete' | 'draft' | 'no-data';

export interface LibraryStats {
  drugs: number;
  compounds: number;
  products: number;
  verified: number;
  verifiedIncomplete: number;
  draft: number;
  incomplete: number;
  noData: number;
  /** Latest verifiedDate (YYYY-MM-DD), or null if nothing is verified yet. */
  lastVerified: string | null;
}

/** Library entries only: session custom drugs are not part of the shared library. */
export const libraryProducts = (idx: LibraryIndex) => idx.lib.products.filter((p) => !p.userEntered);

/** The product an "at a glance" summary and the drug's status use: plain oral, immediate input, single compound first. */
export function primaryProduct(ps: Product[]): Product {
  const route = (r: string) => (/^oral$/i.test(r) ? 0 : /^oral/i.test(r) ? 1 : /sublingual|buccal/i.test(r) ? 2 : 3);
  const rank = (p: Product) => route(p.route) * 4 + (p.input.type === 'bolus' ? 0 : 2) + (p.components.length > 1 ? 1 : 0);
  return [...ps].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))[0];
}

export interface DrugState {
  status: DrugStatus;
  verified: boolean;
  /** Primary product is Incomplete (some relevant compound has no kinetics). */
  incomplete: boolean;
  noData: boolean;
}

export function drugStates(idx: LibraryIndex, unknownAsFL: boolean): Map<string, DrugState> {
  const products = libraryProducts(idx);
  const verified = verifiedDrugs(idx.lib.compounds.filter((c) => !c.userEntered), products);
  const byDrug = new Map<string, Product[]>();
  for (const p of products) byDrug.set(drugIdOf(p), [...(byDrug.get(drugIdOf(p)) ?? []), p]);
  const out = new Map<string, DrugState>();
  for (const [id, ps] of byDrug) {
    const p = primaryProduct(ps);
    const noData = !productHasData(idx, p);
    const incomplete = !noData && missingKinetics(idx, p, unknownAsFL).length > 0;
    const v = verified.get(id) ?? false;
    out.set(id, { verified: v, noData, incomplete, status: v ? (incomplete || noData ? 'verified-incomplete' : 'verified') : noData ? 'no-data' : 'draft' });
  }
  return out;
}

export function libraryStats(lib: Library, idx: LibraryIndex = buildIndex(lib), unknownAsFL = false): LibraryStats {
  const states = [...drugStates(idx, unknownAsFL).values()];
  const dates = [...lib.compounds, ...lib.products]
    .filter((e) => !e.userEntered && e.verified && /^\d{4}-\d{2}-\d{2}$/.test(e.verifiedDate ?? ''))
    .map((e) => e.verifiedDate)
    .sort();
  return {
    drugs: states.length,
    compounds: lib.compounds.filter((c) => !c.userEntered).length,
    products: lib.products.filter((p) => !p.userEntered).length,
    verified: states.filter((s) => s.verified).length,
    verifiedIncomplete: states.filter((s) => s.status === 'verified-incomplete').length,
    draft: states.filter((s) => s.status === 'draft').length,
    incomplete: states.filter((s) => s.incomplete).length,
    noData: states.filter((s) => s.noData).length,
    lastVerified: dates.at(-1) ?? null,
  };
}

/** "3 of 227 drugs verified" — the live part of the data-status wording. */
export const verifiedCountText = (s: LibraryStats) => `${s.verified} of ${s.drugs} drug${s.drugs === 1 ? '' : 's'} verified`;
