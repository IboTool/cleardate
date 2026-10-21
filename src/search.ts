// Type-ahead product search. Ranking: exact name/alias match, then prefix matches on a name or
// alias (including word prefixes, e.g. "xan" → "Xanax"), then Fuse.js fuzzy matches.

import Fuse, { type FuseResultMatch } from 'fuse.js';
import type { Category, Compound, Product } from './types';

export interface SearchRecord {
  productId: string;
  name: string; // generic name without route
  route: string;
  className: string;
  category: string;
  categoryName: string;
  aliases: string[]; // product + parent compound aliases
}

export interface SearchHit {
  productId: string;
  tier: 0 | 1 | 2; // exact, prefix, fuzzy
  score: number;
  /** Set when the match came from an alias rather than the name. */
  matchedAlias?: string;
  /** Character ranges to highlight in the displayed name (inclusive). */
  nameRanges: [number, number][];
  aliasRanges: [number, number][];
}

export function buildRecords(products: Product[], compounds: Map<string, Compound>, categories: Category[], nameOf: (p: Product) => string): SearchRecord[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return products.map((p) => {
    const parent = compounds.get(p.parentCompound);
    const aliases = [...new Set([...(p.aliases ?? []), ...(parent?.aliases ?? [])])].filter(Boolean);
    return {
      productId: p.id,
      name: nameOf(p),
      route: p.route,
      className: p.class,
      category: p.category,
      categoryName: catName.get(p.category) ?? p.category,
      aliases,
    };
  });
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim();

/** Index of a prefix match of q in s: at the start or at a word boundary. -1 if none. */
function prefixAt(s: string, q: string): number {
  const n = norm(s);
  if (n.startsWith(q)) return 0;
  const re = /[\s\-/(,.]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(n))) {
    const i = m.index + m[0].length;
    if (n.startsWith(q, i)) return i;
  }
  return -1;
}

export class ProductSearch {
  private fuse: Fuse<SearchRecord>;
  private byId: Map<string, SearchRecord>;

  constructor(private records: SearchRecord[]) {
    this.byId = new Map(records.map((r) => [r.productId, r]));
    this.fuse = new Fuse(records, {
      keys: [
        { name: 'name', weight: 3 },
        { name: 'aliases', weight: 2 },
        { name: 'route', weight: 0.6 },
        { name: 'className', weight: 0.6 },
        { name: 'categoryName', weight: 0.5 },
      ],
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      threshold: 0.4,
      minMatchCharLength: 1,
    });
  }

  record(id: string) {
    return this.byId.get(id);
  }

  search(query: string, limit = 60): SearchHit[] {
    const q = norm(query);
    if (!q) return [];
    const hits = new Map<string, SearchHit>();
    const put = (h: SearchHit) => {
      const prev = hits.get(h.productId);
      if (!prev || h.tier < prev.tier || (h.tier === prev.tier && h.score < prev.score)) hits.set(h.productId, h);
    };

    for (const r of this.records) {
      if (norm(r.name) === q) put({ productId: r.productId, tier: 0, score: 0, nameRanges: [[0, r.name.length - 1]], aliasRanges: [] });
      for (const a of r.aliases)
        if (norm(a) === q) put({ productId: r.productId, tier: 0, score: 0.01, matchedAlias: a, nameRanges: [], aliasRanges: [[0, a.length - 1]] });
      const pi = prefixAt(r.name, q);
      // Shorter names first among prefix matches ("dex" → shortest completions on top), start-of-name before word-start.
      if (pi >= 0) put({ productId: r.productId, tier: 1, score: (pi > 0 ? 0.5 : 0) + r.name.length / 1000, nameRanges: [[pi, pi + q.length - 1]], aliasRanges: [] });
      for (const a of r.aliases) {
        const ai = prefixAt(a, q);
        if (ai >= 0)
          put({ productId: r.productId, tier: 1, score: 0.25 + (ai > 0 ? 0.5 : 0) + a.length / 1000, matchedAlias: a, nameRanges: [], aliasRanges: [[ai, ai + q.length - 1]] });
      }
    }

    for (const res of this.fuse.search(q, { limit: limit * 2 })) {
      const r = res.item;
      const ranges = (key: string, value?: string) =>
        (res.matches ?? []).filter((m: FuseResultMatch) => m.key === key && (value === undefined || m.value === value)).flatMap((m) => m.indices.map((x) => [x[0], x[1]] as [number, number]));
      const aliasMatch = (res.matches ?? []).find((m) => m.key === 'aliases');
      const nameMatch = (res.matches ?? []).some((m) => m.key === 'name');
      put({
        productId: r.productId,
        tier: 2,
        score: res.score ?? 1,
        matchedAlias: !nameMatch && aliasMatch ? aliasMatch.value : undefined,
        nameRanges: ranges('name'),
        aliasRanges: !nameMatch && aliasMatch ? ranges('aliases', aliasMatch.value) : [],
      });
    }

    return [...hits.values()]
      .sort((a, b) => a.tier - b.tier || a.score - b.score || this.byId.get(a.productId)!.name.localeCompare(this.byId.get(b.productId)!.name))
      .slice(0, limit);
  }
}
