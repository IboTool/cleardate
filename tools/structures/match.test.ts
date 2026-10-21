import { describe, expect, it } from 'vitest';
import { emptyCompound } from '../../src/schema';
import type { Compound } from '../../src/types';
import fixture from './fixtures/pubchem.json';
import { capStereoSiblings, isAbbreviation, matchIdentity, notApplicableReason, stripSalt, type NameHit, type PubchemRecord } from './match';

// Recorded PubChem answers (tools/structures/fixtures/pubchem.json); no network.
const records = new Map((fixture.records as PubchemRecord[]).map((r) => [r.cid, r]));
const hit = (query: string): NameHit => fixture.hits.find((h) => h.query === query)!;
const compound = (id: string, name: string, extra: Partial<Compound> = {}): Compound => ({ ...emptyCompound(id, name), ...extra });
const withSynonym = (cid: number, synonym: string) => {
  const m = new Map(records);
  m.set(cid, { ...records.get(cid)!, synonyms: [...records.get(cid)!.synonyms, synonym] });
  return m;
};

describe('PubChem identity matching', () => {
  it('exact synonym of one parent CID → confirmed, with SMILES, InChIKey and formula', () => {
    const r = matchIdentity({ compound: compound('methadone', 'Methadone'), hits: [hit('Methadone')], records });
    expect(r.identity).toMatchObject({ pubchemCid: 4095, confidence: 'confirmed', inchiKey: 'USSIQXCVUWKGNF-UHFFFAOYSA-N', formula: 'C21H27NO' });
    expect(r.identity.smiles).toBe('CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2');
  });

  it('salt → parent CID', () => {
    expect(hit('morphine sulfate').cids).toEqual([5288826]);
    expect(stripSalt('Morphine sulfate pentahydrate')).toBe('Morphine pentahydrate');
    const r = matchIdentity({ compound: compound('morphine', 'Morphine sulfate'), hits: [hit('morphine sulfate')], records });
    expect(r.identity.pubchemCid).toBe(5288826);
    expect(r.record?.title).toBe('Morphine');
    expect(r.identity.confidence).toBe('confirmed');
  });

  it('stereo-specific name vs racemic record → not confirmed', () => {
    const r = matchIdentity({
      compound: compound('escitalopram', 'Escitalopram'),
      hits: [{ query: 'Escitalopram', cids: [2771] }],
      records: withSynonym(2771, 'Escitalopram'),
    });
    expect(r.identity.confidence).toBe('unconfirmed');
    expect(r.identity.smiles).toBeNull();
    expect(r.identity.candidates[0]).toMatchObject({ cid: 2771, reason: 'stereo conflict' });
  });

  it('racemate name vs single enantiomer → not confirmed', () => {
    const r = matchIdentity({
      compound: compound('x', 'rac-Escitalopram'),
      hits: [{ query: 'rac-Escitalopram', cids: [146570] }],
      records: withSynonym(146570, 'rac-Escitalopram'),
    });
    expect(r.identity.confidence).toBe('unconfirmed');
  });

  it('multiple CIDs → unconfirmed with candidates', () => {
    const r = matchIdentity({ compound: compound('2_ene_vpa', '2-ene-VPA', { isMetabolite: true }), hits: [hit('2-ene-VPA')], records });
    expect(r.identity.confidence).toBe('unconfirmed');
    expect(r.identity.pubchemCid).toBeNull();
    expect(r.identity.candidates.map((c) => c.cid).sort()).toEqual([6437068, 6439659]);
    expect(r.identity.candidates.every((c) => c.name)).toBe(true);
  });

  it('MW conflict → unconfirmed and reported, never overwritten', () => {
    const r = matchIdentity({ compound: compound('methadone', 'Methadone', { molecularWeight: 345.9 }), hits: [hit('Methadone')], records });
    expect(r.identity.confidence).toBe('unconfirmed');
    expect(r.mwConflict).toEqual({ existing: 345.9, pubchem: 309.4, cid: 4095 });
    expect(r.record).toBeNull();
  });

  it('agreeing MW (within 0.5 g/mol) still confirms', () => {
    const r = matchIdentity({ compound: compound('methadone', 'Methadone', { molecularWeight: 309.45 }), hits: [hit('Methadone')], records });
    expect(r.identity.confidence).toBe('confirmed');
  });

  it('mixtures, extracts and peptides → not-applicable with a reason', () => {
    for (const id of ['kavalactones', 'semaglutide', 'tirzepatide']) {
      const r = matchIdentity({ compound: compound(id, id), hits: [], records });
      expect(r.identity.confidence).toBe('not-applicable');
      expect(r.identity.note).not.toBe('');
    }
    expect(notApplicableReason(compound('x', 'X', { sourceNotes: { halfLife: 'X is a mixture of alkaloids.' } }))).toMatch(/mixture/);
    expect(notApplicableReason(compound('x', 'X', { sourceNotes: { halfLife: 'Studied after a single dose of kava extract.' } }))).toBeNull();
  });

  it('abbreviations need an alias that agrees', () => {
    expect(isAbbreviation('EDDP')).toBe(true);
    expect(isAbbreviation('11-OH-THC')).toBe(true);
    expect(isAbbreviation('Methadone')).toBe(false);
    const eddp = matchIdentity({ compound: compound('eddp', 'EDDP', { isMetabolite: true }), hits: [hit('EDDP')], records });
    expect(eddp.identity.confidence).toBe('unconfirmed');
    expect(eddp.identity.candidates[0].name).toBe('Edifenphos');
    const mdea = matchIdentity({ compound: compound('mdea', 'MDEA', { aliases: ['MDE'] }), hits: [hit('MDEA')], aliasHits: [hit('MDE')], records });
    expect(mdea.identity.confidence).toBe('unconfirmed');
    expect(mdea.identity.candidates.map((c) => c.cid)).toEqual([7767, 105039]);
  });

  it('known traps are never auto-confirmed', () => {
    const r = matchIdentity({
      compound: compound('norfluoxetine', 'Norfluoxetine', { isMetabolite: true, formedFrom: [{ compound: 'fluoxetine', fraction: null, cyp2d6Multiplier: null }] }),
      hits: [hit('Norfluoxetine')], records,
    });
    expect(r.identity.confidence).toBe('unconfirmed');
    expect(r.identity.candidates[0].cid).toBe(4541);
  });

  it('no PubChem match → unconfirmed without candidates', () => {
    const r = matchIdentity({ compound: compound('x', 'Nothing'), hits: [{ query: 'Nothing', cids: [] }], records });
    expect(r.identity).toMatchObject({ confidence: 'unconfirmed', candidates: [] });
  });

  it('a compound with an enantiomer or racemate sibling in the library stays probable', () => {
    const citalopram = compound('citalopram', 'Citalopram');
    const escitalopram = compound('escitalopram', 'Escitalopram');
    const methadone = compound('methadone', 'Methadone');
    citalopram.identity = matchIdentity({ compound: citalopram, hits: [hit('Citalopram')], records }).identity;
    escitalopram.identity = matchIdentity({ compound: escitalopram, hits: [hit('Escitalopram')], records }).identity;
    methadone.identity = matchIdentity({ compound: methadone, hits: [hit('Methadone')], records }).identity;
    expect([citalopram, escitalopram].map((c) => c.identity!.confidence)).toEqual(['confirmed', 'confirmed']);
    expect(capStereoSiblings([citalopram, escitalopram, methadone]).sort()).toEqual(['citalopram', 'escitalopram']);
    expect(citalopram.identity!.confidence).toBe('probable');
    expect(escitalopram.identity!.note).toMatch(/Citalopram/);
    expect(methadone.identity!.confidence).toBe('confirmed');
  });
});
