import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRecords, ProductSearch } from './search';
import { displayName } from './model';
import { buildInitialLibrary } from '../tools/init-lib';

// The real library structure, built from the provided work queue (only names and aliases matter here).
const lib = buildInitialLibrary(JSON.parse(readFileSync(new URL('../tools/candidates.json', import.meta.url), 'utf8')));
const search = new ProductSearch(buildRecords(lib.products, new Map(lib.compounds.map((c) => [c.id, c])), lib.categories, displayName));
const top = (q: string) => search.search(q).map((h) => search.record(h.productId)!.name);

describe('search ranking', () => {
  it('puts an exact name match first', () => {
    expect(top('Methadone')[0]).toBe('Methadone');
    expect(search.search('morphine')[0].tier).toBe(0);
  });

  it('ranks prefix matches above fuzzy ones', () => {
    const hits = search.search('dex');
    const names = hits.map((h) => search.record(h.productId)!.name);
    expect(names[0]).toMatch(/^Dex/);
    const firstFuzzy = hits.findIndex((h) => h.tier === 2);
    const lastPrefix = hits.map((h) => h.tier).lastIndexOf(1);
    if (firstFuzzy >= 0) expect(lastPrefix).toBeLessThan(firstFuzzy);
    expect(names.slice(0, 5)).toContain('Dextromethorphan');
  });

  it('resolves brand and street aliases to the right product', () => {
    const xanax = search.search('Xanax')[0];
    expect(search.record(xanax.productId)!.name).toBe('Alprazolam (Oral IR)');
    expect(xanax.matchedAlias).toBe('Xanax');
    expect(top('molly')[0]).toBe('MDMA');
    expect(top('subs')[0]).toBe('Buprenorphine');
    expect(top('Suboxone')[0]).toBe('Buprenorphine/naloxone');
  });

  it('still finds a misspelled drug', () => {
    expect(top('dextromorphan').slice(0, 3)).toContain('Dextromethorphan');
    expect(top('alprazolom').slice(0, 3)).toContain('Alprazolam (Oral IR)');
    expect(top('quetiapene').slice(0, 3)).toContain('Quetiapine (Oral IR)');
  });

  it('records highlight ranges for prefix matches', () => {
    const h = search.search('dext')[0];
    expect(h.nameRanges[0]).toEqual([0, 3]);
  });
});
