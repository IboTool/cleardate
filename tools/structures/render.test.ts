// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { emptyCompound } from '../../src/schema';
import type { Compound, Identity } from '../../src/types';
import { DARK, drawable, LIGHT, renderSmiles } from './render-lib';

const METHADONE = 'CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2';
const MORPHINE = 'CN1CC[C@]23[C@@H]4[C@H]1CC5=C2C(=C(C=C5)O)O[C@H]3[C@H](C=C4)O';
const CHLORPROMAZINE = 'CN(C)CCCN1C2=CC=CC=C2SC3=C1C=C(C=C3)Cl';

const identity = (confidence: Identity['confidence'], smiles: string | null): Identity =>
  ({ pubchemCid: smiles ? 1 : null, smiles, inchiKey: smiles ? 'AAAAAAAAAAAAAA-BBBBBBBBBB-N' : null, formula: smiles ? 'C' : null, confidence, candidates: [], note: '' });
const compound = (id: Identity | null): Compound => ({ ...emptyCompound('x', 'X'), identity: id });

describe('structure rendering', () => {
  it('produces a valid, compact SVG with a fitted viewBox', async () => {
    const { dark } = await renderSmiles(METHADONE);
    const doc = new DOMParser().parseFromString(dark, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const svg = doc.documentElement;
    expect(svg.tagName.toLowerCase()).toBe('svg');
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(w).toBeGreaterThan(50);
    expect(h).toBeGreaterThan(30);
    expect(dark).not.toMatch(/<\?xml|<!--|rdkit|class=/);
    expect(dark.length).toBeLessThan(8000);
  }, 30_000);

  it('applies the theme colours and never leaks the placeholder palette', async () => {
    const { dark, light } = await renderSmiles(CHLORPROMAZINE);
    for (const c of [DARK.c, DARK.n, DARK.s, DARK.hal]) expect(dark).toContain(c);
    for (const c of [LIGHT.c, LIGHT.n, LIGHT.s, LIGHT.hal]) expect(light).toContain(c);
    for (const sentinel of ['#000000', '#0000FF', '#FF0000', '#FFFF00', '#00FF00']) {
      expect(dark.toUpperCase()).not.toContain(sentinel);
      expect(light.toUpperCase()).not.toContain(sentinel);
    }
    expect(dark).not.toContain('fill="#ffffff"');
  }, 30_000);

  it('is deterministic and shares geometry between themes', async () => {
    const a = await renderSmiles(MORPHINE);
    const b = await renderSmiles(MORPHINE);
    expect(a.dark).toBe(b.dark);
    expect(a.light).toBe(b.light);
    const geometry = (s: string) => s.replace(/#[0-9a-f]{6}/gi, '');
    expect(geometry(a.dark)).toBe(geometry(a.light));
  }, 30_000);

  it('draws only confirmed and probable identities', () => {
    expect(drawable(compound(identity('confirmed', METHADONE)))).toBe(true);
    expect(drawable(compound(identity('probable', METHADONE)))).toBe(true);
    expect(drawable(compound(identity('unconfirmed', null)))).toBe(false);
    expect(drawable(compound(identity('unconfirmed', METHADONE)))).toBe(false);
    expect(drawable(compound(identity('not-applicable', null)))).toBe(false);
    expect(drawable(compound(null))).toBe(false);
  });
});
