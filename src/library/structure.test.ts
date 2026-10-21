// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { emptyCompound } from '../schema';
import type { Compound, Identity } from '../types';
import { formulaNode, structureFigure } from './structure';

const METHADONE: Identity = {
  pubchemCid: 4095,
  smiles: 'CCC(=O)C(CC(C)N(C)C)(C1=CC=CC=C1)C2=CC=CC=C2',
  inchiKey: 'USSIQXCVUWKGNF-UHFFFAOYSA-N',
  formula: 'C21H27NO',
  confidence: 'confirmed',
  candidates: [],
  note: '',
};
const compound = (identity: Identity | null): Compound => ({ ...emptyCompound('methadone', 'Methadone'), molecularWeight: 309.4, identity });

describe('library structure figure', () => {
  it('confirmed: drawing, formula, MW, PubChem link and InChIKey with copy', () => {
    const fig = structureFigure(compound(METHADONE))!;
    const img = fig.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/structures\/methadone\.svg$/);
    expect(img.getAttribute('alt')).toBe('Chemical structure of Methadone');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(fig.textContent).toContain('309.4 g/mol');
    expect(fig.querySelector('a')!.textContent).toBe('PubChem CID 4095');
    expect(fig.querySelector('a')!.getAttribute('href')).toBe('https://pubchem.ncbi.nlm.nih.gov/compound/4095');
    expect(fig.querySelector('code')!.textContent).toBe('USSIQXCVUWKGNF-UHFFFAOYSA-N');
    expect(fig.querySelector('button[aria-label="Copy InChIKey"]')).not.toBeNull();
    expect(fig.textContent).not.toContain('Probable');
  });

  it('probable: drawing with the pending-review label', () => {
    const fig = structureFigure(compound({ ...METHADONE, confidence: 'probable' }))!;
    expect(fig.querySelector('img')).not.toBeNull();
    expect(fig.textContent).toContain('Probable match — pending review');
  });

  it('unconfirmed: no drawing, placeholder and candidate CIDs', () => {
    const fig = structureFigure(compound({
      ...METHADONE, pubchemCid: null, smiles: null, inchiKey: null, formula: null, confidence: 'unconfirmed',
      candidates: [{ cid: 1, name: 'A', reason: 'same name' }, { cid: 2, name: 'B', reason: 'same name' }], note: 'two records',
    }))!;
    expect(fig.querySelector('img')).toBeNull();
    expect(fig.textContent).toContain('Structure pending confirmation');
    expect([...fig.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['CID 1', 'CID 2']);
  });

  it('not-applicable: placeholder with the reason', () => {
    const fig = structureFigure(compound({ ...METHADONE, pubchemCid: null, smiles: null, inchiKey: null, formula: null, confidence: 'not-applicable', note: 'Mixture of six kavalactones' }))!;
    expect(fig.querySelector('img')).toBeNull();
    expect(fig.textContent).toContain('Mixture of six kavalactones');
  });

  it('no identity: nothing', () => {
    expect(structureFigure(compound(null))).toBeNull();
  });

  it('formula subscripts', () => {
    expect(formulaNode('C21H27NO').innerHTML).toBe('C<sub>21</sub>H<sub>27</sub>NO');
  });
});
