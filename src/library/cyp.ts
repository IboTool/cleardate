// CYP2D6 inhibitor rows of a library entry's safety block: the strength as shown ("predicted moderate" for
// model-derived tiers) and the evidence it rests on (schema 2.4 strength basis).

import { strengthEvidenceText, strengthLabel } from '../schema';
import type { Compound } from '../types';
import { h } from '../ui/dom';

export function inhibitorText(x: Compound['cyp2d6']): string {
  const documented = x.inhibitionType === 'reversible' || x.inhibitionType === 'mechanism-based';
  if (x.inhibitor === 'none') return 'no';
  if (x.inhibitor === 'unassessed')
    return documented ? `inhibition documented (${x.inhibitionType}), strength unassessed — treated as at least weak` : 'unassessed';
  return `${strengthLabel(x)}${documented ? ` (${x.inhibitionType})` : ''}`;
}

/** "clinical probe AUC ratio: desipramine AUC ×2.00, 20 mg/day for 21 days · source", or null when no basis is recorded. */
export function strengthBasisNode(x: Compound['cyp2d6']): HTMLElement | null {
  const text = strengthEvidenceText(x.strengthEvidence);
  if (!text) return null;
  const cite = x.strengthEvidence?.citation?.trim();
  return h('span', { class: 'lib-basis' }, text,
    cite ? [' · ', /^https?:\/\//.test(cite) ? h('a', { href: cite, target: '_blank', rel: 'noopener noreferrer' }, 'source') : cite] : null);
}
