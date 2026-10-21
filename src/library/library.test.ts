import { describe, expect, it } from 'vitest';
import { dataStatusLine } from '../export';
import { buildIndex, computeScenario, DAY, HOUR, toLocalInput } from '../model';
import { emptyCompound, emptyProduct, SCHEMA_VERSION } from '../schema';
import { buildRecords, ProductSearch } from '../search';
import { emptySession } from '../state';
import { displayName } from '../model';
import type { Compound, Library, Product } from '../types';
import { atAGlance, buildLibraryModel, filterEntries, sectionSources, treeLayout, type DrugEntry, type ListQuery } from './data';
import { closePlan, libraryHash, nextLibraryState, parseLibraryHash } from './route';
import { citationLabel, cleanNote, extractCitations } from './sources';
import { dataStatement, libraryStats, verifiedCountText } from './status';

function compound(id: string, hl: number | null, extra: Partial<Compound> = {}): Compound {
  return {
    ...emptyCompound(id, id[0].toUpperCase() + id.slice(1)),
    kinetics: hl ? { mode: 'intrinsic', halfLifeHours: { typical: hl, min: hl / 2, max: hl * 2, rangeType: 'observed-range', cv: null }, earlyPhase: null, steadyState: null }
      : { mode: 'unknown', halfLifeHours: null, earlyPhase: null, steadyState: null },
    ...extra,
  };
}
const metabolite = (id: string, from: string, fraction: number | null, hl: number | null, extra: Partial<Compound> = {}) =>
  compound(id, hl, { isMetabolite: true, clinicalRelevance: 'active', formedFrom: [{ compound: from, fraction, cyp2d6Multiplier: null }], ...extra });
const product = (id: string, name: string, c: string, route: string, cat: string, extra: Partial<Product> = {}): Product => ({
  ...emptyProduct(id, name, c, route, cat), candidateId: c, ...extra,
});

const verified = { verified: true, verifiedDate: '2026-09-01' };

function fixture(): Library {
  return {
    schemaVersion: SCHEMA_VERSION,
    categories: [{ id: 'opioids', name: 'Opioids', order: 1 }, { id: 'ad', name: 'Antidepressants', order: 2 }],
    compounds: [
      compound('codeine', 3, verified),
      metabolite('morphine', 'codeine', 0.1, 3, verified),
      compound('fluoxetine', 72),
      metabolite('norfluoxetine', 'fluoxetine', null, 240),
      compound('mystery', null),
      compound('partial', 10),
      metabolite('partial_met', 'partial', 0.5, null),
    ],
    products: [
      product('codeine_oral', 'Codeine (Oral)', 'codeine', 'Oral', 'opioids', verified),
      product('codeine_iv', 'Codeine (IV)', 'codeine', 'IV', 'opioids', verified),
      product('fluoxetine_oral', 'Fluoxetine (Oral)', 'fluoxetine', 'Oral', 'ad', { aliases: ['Prozac'] }),
      product('mystery_oral', 'Mystery (Oral)', 'mystery', 'Oral', 'ad'),
      product('partial_oral', 'Partial (Oral)', 'partial', 'Oral', 'ad'),
    ],
  };
}

function setup(lib = fixture()) {
  const idx = buildIndex(lib);
  const model = buildLibraryModel(idx, false);
  const search = new ProductSearch(buildRecords(lib.products, idx.compounds, lib.categories, displayName));
  return { lib, idx, model, search };
}
const q = (over: Partial<ListQuery> = {}): ListQuery => ({ query: '', categories: new Set(), statuses: new Set(), showMetabolites: false, ...over });
const drug = (m: ReturnType<typeof setup>['model'], id: string) => m.resolve(id) as DrugEntry;

describe('library routing', () => {
  it('parses #library and #library/<id>, ignores other hashes', () => {
    expect(parseLibraryHash('#library')).toEqual({ id: null });
    expect(parseLibraryHash('#library/')).toEqual({ id: null });
    expect(parseLibraryHash('#library/codeine')).toEqual({ id: 'codeine' });
    expect(parseLibraryHash(libraryHash('5_htp'))).toEqual({ id: '5_htp' });
    expect(parseLibraryHash('')).toBeNull();
    expect(parseLibraryHash('#libraryx')).toBeNull();
    expect(parseLibraryHash('#cyp2d6')).toBeNull();
  });

  it('history: opening from the app, browsing, and closing back to the app', () => {
    const open = nextLibraryState(null, false);
    expect(open).toEqual({ lib: 1, root: 'app' });
    const entry = nextLibraryState(open, true);
    expect(entry).toEqual({ lib: 2, root: 'app' });
    expect(closePlan(entry)).toEqual({ back: 2, stripHash: false });
  });

  it('history: a deep link (no state) closes by stripping the hash', () => {
    expect(closePlan(null)).toEqual({ back: 0, stripHash: true });
    const next = nextLibraryState(null, true);
    expect(next).toEqual({ lib: 1, root: 'lib' });
    expect(closePlan(next)).toEqual({ back: 1, stripHash: true });
  });

  it('resolves drug, product, parent-compound and metabolite ids to entries', () => {
    const { model } = setup();
    expect(model.resolve('codeine')?.kind).toBe('drug');
    expect(model.resolve('codeine_iv')?.id).toBe('codeine');
    expect(model.resolve('morphine')).toMatchObject({ kind: 'metabolite', id: 'morphine' });
    expect(model.resolve('nope')).toBeNull();
  });
});

describe('library entries and status', () => {
  it('one row per drug, oral product first, with drug-level status', () => {
    const { model } = setup();
    expect(model.drugs.map((d) => d.id).sort()).toEqual(['codeine', 'fluoxetine', 'mystery', 'partial']);
    expect(drug(model, 'codeine').primary.id).toBe('codeine_oral');
    expect(drug(model, 'codeine').state.status).toBe('verified');
    expect(drug(model, 'fluoxetine').state.status).toBe('draft');
    expect(drug(model, 'mystery').state.status).toBe('no-data');
    expect(drug(model, 'partial').state).toMatchObject({ status: 'draft', incomplete: true });
  });

  it('a not-modelled drug has data (never "no data yet"), its own filter and an exposure-only glance', () => {
    const lib = fixture();
    lib.compounds.push(compound('n2o', null, { kinetics: { mode: 'not-modelled', halfLifeHours: null, earlyPhase: null, steadyState: null, notModelledReason: 'exhaled within minutes' } }));
    lib.products.push(product('n2o_inhaled', 'N2o (Inhaled)', 'n2o', 'Inhaled', 'ad', { doseUnit: 'session' }));
    const { model, search, idx } = setup(lib);
    expect(drug(model, 'n2o').state).toMatchObject({ status: 'draft', noData: false, incomplete: false, notModelled: true });
    expect(libraryStats(lib)).toMatchObject({ noData: 1, notModelled: 1 });
    expect(filterEntries(model, search, q({ statuses: new Set(['not-modelled']) })).map((e) => e.id)).toEqual(['n2o']);
    expect(atAGlance(idx, drug(model, 'n2o'), emptySession().settings).text).toMatch(/^Not modelled — exhaled within minutes\./);
  });

  it('a drug is only verified when its whole metabolite tree is', () => {
    const lib = fixture();
    lib.compounds.find((c) => c.id === 'morphine')!.verified = false;
    expect(drug(setup(lib).model, 'codeine').state.status).toBe('draft');
  });

  it('metabolites list the drugs they are part of', () => {
    const { model } = setup();
    expect(model.metabolites.find((m) => m.id === 'morphine')?.partOf.map((d) => d.id)).toEqual(['codeine']);
  });

  it('stats and the verified count are live', () => {
    const s = libraryStats(fixture());
    expect(s).toMatchObject({ drugs: 4, compounds: 7, products: 5, verified: 1, draft: 2, noData: 1, incomplete: 1, lastVerified: '2026-09-01' });
    expect(verifiedCountText(s)).toBe('1 of 4 drugs verified');
  });

  it('the data statement keeps the AI/hand-verification sentence but drops the Draft clause once all are verified', () => {
    expect(dataStatement({ drugs: 4, verified: 1 })).toMatch(/drafted with the assistance of AI language models.*verified by hand against those sources; entries marked Draft have not yet been verified\. The library will keep growing\.$/);
    const all = dataStatement({ drugs: 4, verified: 4 });
    expect(all).toMatch(/verified by hand against those sources\. The library will keep growing\.$/);
    expect(all).not.toMatch(/Draft/);
  });
});

describe('PDF data-status line', () => {
  it('counts verified drugs and lists the draft drugs used in the report', () => {
    const { idx } = setup();
    const s = emptySession();
    s.doses = ['codeine_oral', 'fluoxetine_oral'].map((productId, i) => ({ id: String(i), productId, amount: 10, unit: 'mg' as const, kind: 'single' as const, time: toLocalInput(Date.now()) }));
    const line = dataStatusLine(computeScenario(idx, s, Date.now()), idx, '2026-10-20');
    expect(line).toBe('Drug data: AI-assisted drafts from cited sources; 1 of 4 drugs verified as of 2026-09-01. Draft entries used in this report: Fluoxetine.');
  });
});

describe('library search and filters', () => {
  it('search uses the app index (aliases) and returns drug rows', () => {
    const { model, search } = setup();
    expect(filterEntries(model, search, q({ query: 'prozac' })).map((e) => e.id)).toEqual(['fluoxetine']);
    expect(filterEntries(model, search, q({ query: 'cod' })).map((e) => e.id)).toEqual(['codeine']);
  });

  it('metabolites only appear with the toggle on', () => {
    const { model, search } = setup();
    expect(filterEntries(model, search, q({ query: 'morph' })).map((e) => e.id)).toEqual([]);
    expect(filterEntries(model, search, q({ query: 'morph', showMetabolites: true })).map((e) => e.id)).toEqual(['morphine']);
    expect(filterEntries(model, search, q({ showMetabolites: true })).length).toBe(7);
  });

  it('category and status chips filter (OR within a group, AND across groups)', () => {
    const { model, search } = setup();
    const ids = (o: Partial<ListQuery>) => filterEntries(model, search, q(o)).map((e) => e.id);
    expect(ids({ categories: new Set(['opioids']) })).toEqual(['codeine']);
    expect(ids({ statuses: new Set(['verified']) })).toEqual(['codeine']);
    expect(ids({ statuses: new Set(['no-data']) })).toEqual(['mystery']);
    expect(ids({ statuses: new Set(['incomplete']) })).toEqual(['partial']);
    expect(ids({ statuses: new Set(['draft', 'no-data']), categories: new Set(['ad']) })).toEqual(['fluoxetine', 'mystery', 'partial']);
    expect(ids({ statuses: new Set(['verified']), categories: new Set(['ad']) })).toEqual([]);
  });
});

describe('at a glance', () => {
  const settings = emptySession().settings;

  it('equals the main simulation for the same single dose', () => {
    const { idx, model } = setup();
    for (const id of ['codeine', 'fluoxetine']) {
      const d = drug(model, id);
      const g = atAGlance(idx, d, settings);
      const s = emptySession();
      s.patient.phenotype = 'normal';
      s.doses = [{ id: 'x', productId: d.primary.id, amount: 30, unit: 'mg', kind: 'single', time: toLocalInput(g.t0) }];
      const r = computeScenario(idx, s, g.t0).products[0];
      expect(g.result?.clearAt).toBe(r.clearAt);
      expect(g.result?.clearAtMax).toBe(r.clearAtMax);
      expect(g.result?.clearAtMin).toBe(r.clearAtMin);
    }
  });

  it('phrases a typical time with its range', () => {
    const { idx, model } = setup();
    const g = atAGlance(idx, drug(model, 'codeine'), settings);
    expect((g.result!.clearAt! - g.t0) / HOUR).toBeGreaterThan(10);
    expect(g.text).toBe('After a single dose, typically below the clear threshold in ~1.2 days (range 0.6–2.4 days).');
    expect(g.result!.clearAtMin!).toBeLessThan(g.result!.clearAt!);
    expect(g.result!.clearAtMax!).toBeGreaterThan(g.result!.clearAt!);
  });

  it('long half-lives are given in days', () => {
    const { idx, model } = setup();
    const g = atAGlance(idx, drug(model, 'fluoxetine'), settings);
    expect((g.result!.clearAt! - g.t0) / DAY).toBeGreaterThan(2);
    expect(g.text).toMatch(/~[\d.]+ days/);
  });

  it('incomplete: "not before" and names the missing compound', () => {
    const { idx, model } = setup();
    const g = atAGlance(idx, drug(model, 'partial'), settings);
    expect(g.result?.status).toBe('incomplete');
    expect(g.text).toMatch(/^After a single dose, below the clear threshold not before ~[\d.]+ days\. Incomplete: no kinetics for Partial_met\.$/);
  });

  it('no data: says so without a number', () => {
    const { idx, model } = setup();
    const g = atAGlance(idx, drug(model, 'mystery'), settings);
    expect(g.result).toBeNull();
    expect(g.text).toBe('No half-life in the library yet, so a clear time can’t be estimated.');
  });

  it('follows the clear-threshold setting', () => {
    const { idx, model } = setup();
    const a = atAGlance(idx, drug(model, 'codeine'), { ...settings, clearHalfLives: 5 }).result!.clearAt!;
    const b = atAGlance(idx, drug(model, 'codeine'), { ...settings, clearHalfLives: 7 }).result!.clearAt!;
    expect(b).toBeGreaterThan(a);
  });
});

describe('metabolite tree', () => {
  it('nodes link to their own library entry, edges carry fractions', () => {
    const { idx } = setup();
    const t = treeLayout(idx, ['codeine']);
    expect(t.nodes.map((n) => [n.id, n.depth, n.href])).toEqual([['codeine', 0, '#library/codeine'], ['morphine', 1, '#library/morphine']]);
    expect(t.edges).toEqual([{ from: 'codeine', to: 'morphine', label: 'fraction 0.1' }]);
    expect(treeLayout(idx, ['fluoxetine']).edges[0].label).toBe('fraction unknown');
  });
});

describe('sources and provenance', () => {
  it('provenance markers are shown for drafts and hidden for verified entries', () => {
    const lib = fixture();
    const flu = lib.compounds.find((c) => c.id === 'fluoxetine')!;
    flu.provenance.halfLife = 'recall';
    const draft = sectionSources(flu, 'compound').find((s) => s.key === 'halfLife')!;
    expect(draft.marker).toEqual({ tag: 'recall', label: 'from model recall — not yet checked' });
    const cod = lib.compounds.find((c) => c.id === 'codeine')!;
    cod.provenance.halfLife = 'checked';
    expect(sectionSources(cod, 'compound').every((s) => s.marker === null)).toBe(true);
  });

  it('strips the DRAFT prefix and provenance tags from the clean view', () => {
    expect(cleanNote('DRAFT — AI-prepopulated, unverified. Label 12.3.')).toBe('Label 12.3.');
    expect(cleanNote('[recall] [recall — check CredibleMeds] Provisional known tier.')).toBe('Provisional known tier.');
  });

  it('extracts readable, deduplicated citations', () => {
    const notes = [
      '[checked] Wu1993 https://pubmed.ncbi.nlm.nih.gov/8448065/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC3403206/.',
      '[recall] Same paper https://pubmed.ncbi.nlm.nih.gov/8448065 again; CredibleMeds tier recalled; Baselt.',
      'DRAFT — AI-prepopulated, unverified. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=abc',
    ];
    expect(extractCitations(notes, 'Methadone')).toEqual([
      { label: 'PubMed 8448065', url: 'https://pubmed.ncbi.nlm.nih.gov/8448065/' },
      { label: 'PubMed Central PMC3403206', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3403206/' },
      { label: 'DailyMed — Methadone label', url: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=abc' },
      { label: 'Baselt, Disposition of Toxic Drugs and Chemicals in Man' },
      { label: 'CredibleMeds' },
    ]);
  });

  it('"no data found" notes list only links, not sources they name but did not use', () => {
    expect(extractCitations(['[gap] CredibleMeds not accessed.'], 'X', false)).toEqual([]);
    expect(extractCitations(['[gap] CredibleMeds not accessed.'], 'X')).toEqual([{ label: 'CredibleMeds' }]);
  });

  it('a named source is not repeated when it is already linked', () => {
    const c = extractCitations(['CredibleMeds https://www.crediblemeds.org/ and the FDA label https://www.accessdata.fda.gov/drugsatfda_docs/label/2020/x.pdf'], 'X');
    expect(c.map((x) => x.label)).toEqual(['CredibleMeds', 'FDA — X label']);
  });

  it('labels unknown hosts by host and page name', () => {
    expect(citationLabel('https://example.org/papers/some-study_2019.html')).toBe('example.org — some study 2019');
    expect(citationLabel('https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/j.1365-2125.1993.tb05666.x')).toBe('DOI 10.1111/j.1365-2125.1993.tb05666.x');
    expect(citationLabel('https://doi.org/10.1002/cpt.123')).toBe('DOI 10.1002/cpt.123');
  });
});
