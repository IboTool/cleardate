// Shared by init-data and the local editor (which can run it when drugs.json is missing).

import { emptyCompound, emptyProduct, SCHEMA_VERSION, slug } from '../src/schema';
import type { Category, Library, Product } from '../src/types';
import { assignRelevance } from './migrate-v21-lib';
import { applyProductRules, applyV21ProductRules } from './product-rules';

export interface Candidate {
  id: string;
  order: number;
  name: string;
  aliases: string[];
  category: string;
  parentCompound: string;
  routes: string[];
  metaboliteTree: string[];
  untrackedMetabolites: string[];
  reviewHints: string;
  sourceRow: number;
}

export interface CandidateCompound {
  id: string;
  name: string;
  aliases: string[];
  formedFrom: string[];
  isMetabolite: boolean;
  alsoTakenDirectly: boolean;
  notes?: string[];
}

export interface CandidatesFile {
  categories: Category[];
  candidates: Candidate[];
  compounds: CandidateCompound[];
}

export function productId(parentCompound: string, route: string) {
  return `${parentCompound}_${slug(route)}`;
}

/** An empty v2.1 library: every compound and product from the queue, all values unknown. */
export function buildInitialLibrary(src: CandidatesFile): Library {
  const compounds = src.compounds.map((c) => ({
    ...emptyCompound(c.id, c.name),
    aliases: [...c.aliases],
    isMetabolite: c.isMetabolite,
    formedFrom: c.formedFrom.map((p) => ({ compound: p, fraction: null, cyp2d6Multiplier: null })),
  }));
  const products: Product[] = [];
  const seen = new Set<string>();
  for (const cand of src.candidates) {
    for (const route of cand.routes) {
      const id = productId(cand.parentCompound, route);
      if (seen.has(id)) continue;
      seen.add(id);
      products.push({
        ...emptyProduct(id, `${cand.name} (${route})`, cand.parentCompound, route, cand.category),
        candidateId: cand.id,
        aliases: [...cand.aliases],
      });
    }
  }
  const lib: Library = { schemaVersion: SCHEMA_VERSION, categories: src.categories.map((c) => ({ ...c })), compounds, products };
  applyProductRules(lib, { annotate: false });
  applyV21ProductRules(lib, { annotate: false });
  assignRelevance(lib);
  return lib;
}
