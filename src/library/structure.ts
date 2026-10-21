// Chemical structure panel for library entries: the RDKit drawing generated from PubChem data
// (tools/structures), with formula, molecular weight, PubChem link and InChIKey.

import type { Compound } from '../types';
import { h, toast } from '../ui/dom';

export const pubchemUrl = (cid: number) => `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
export const structureSrc = (id: string, theme: 'dark' | 'light' = 'dark') =>
  `${import.meta.env.BASE_URL}structures/${encodeURIComponent(id)}${theme === 'light' ? '.light' : ''}.svg`;

/** "C21H27NO" → C₂₁H₂₇NO as <sub> elements; charges (e.g. "+") as <sup>. */
export function formulaNode(formula: string): HTMLElement {
  const out = h('span', { class: 'lib-formula' });
  for (const [, el, n, charge] of formula.matchAll(/([A-Z][a-z]?|\.|\(|\))(\d*)|([+-]\d*)/g)) {
    if (charge) out.append(h('sup', null, charge));
    else {
      out.append(el);
      if (n) out.append(h('sub', null, n));
    }
  }
  return out;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('InChIKey copied');
  } catch {
    toast('Could not copy — select the key and copy it manually');
  }
}

/** The structure figure for a compound, or null when it has no identity at all. */
export function structureFigure(c: Compound): HTMLElement | null {
  const id = c.identity;
  if (!id) return null;
  if (id.confidence === 'not-applicable')
    return h('figure', { class: 'lib-struct lib-struct-empty' },
      h('div', { class: 'lib-struct-ph' }, 'No single structure'),
      h('figcaption', null, h('span', { class: 'lib-muted lib-small' }, id.note || 'Not a single defined molecule.')));
  if (id.confidence === 'unconfirmed' || !id.smiles || !id.pubchemCid)
    return h('figure', { class: 'lib-struct lib-struct-empty' },
      h('div', { class: 'lib-struct-ph' }, 'Structure pending confirmation'),
      h('figcaption', null,
        id.candidates.length
          ? h('span', { class: 'lib-muted lib-small' }, 'Candidates: ', id.candidates.flatMap((x, i) => [
            i ? ', ' : '',
            h('a', { href: pubchemUrl(x.cid), target: '_blank', rel: 'noopener noreferrer' }, `CID ${x.cid}`),
            x.name ? ` (${x.name})` : '',
          ]))
          : h('span', { class: 'lib-muted lib-small' }, 'No PubChem match yet.')));
  const probable = id.confidence === 'probable';
  return h('figure', { class: `lib-struct${probable ? ' probable' : ''}` },
    h('img', { src: structureSrc(c.id), alt: `Chemical structure of ${c.name}`, loading: 'lazy', decoding: 'async' }),
    h('figcaption', null,
      probable ? h('div', { class: 'lib-struct-probable', title: id.note }, 'Probable match — pending review') : null,
      h('div', null, id.formula ? formulaNode(id.formula) : null, c.molecularWeight !== null ? h('span', { class: 'lib-muted' }, ` · ${c.molecularWeight} g/mol`) : null),
      h('div', null, h('a', { href: pubchemUrl(id.pubchemCid), target: '_blank', rel: 'noopener noreferrer' }, `PubChem CID ${id.pubchemCid}`)),
      id.inchiKey ? h('div', { class: 'lib-inchikey' },
        h('code', { title: 'InChIKey' }, id.inchiKey),
        h('button', { type: 'button', class: 'icon-btn lib-copy', 'aria-label': 'Copy InChIKey', title: 'Copy InChIKey', onclick: () => copy(id.inchiKey!) }, '⧉')) : null));
}
