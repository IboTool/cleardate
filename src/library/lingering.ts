// Lingering-effects panel for library entries: clinically important effects that outlast the drug
// (MAOI washout, benzodiazepine protracted withdrawal, enzyme recovery). Not part of the clear date.

import type { LibraryIndex } from '../model';
import type { Compound, LingeringOrigin } from '../types';
import { h } from '../ui/dom';
import { libraryHash } from './route';

export const LINGERING_CAVEAT = 'Lingering effects persist after the drug has cleared and are not reflected in the clear date.';

export interface LingeringItem {
  id: string;
  name: string;
  note: string;
  durationDays: number | null;
  origin: LingeringOrigin;
  /** Names of the compounds it is formed from, when it is a metabolite. */
  metaboliteOf: { id: string; name: string }[] | null;
}

/** "~14 days after last dose" / "~3 days after clearance". */
export const lingeringDurationText = (days: number, origin: LingeringOrigin = 'clearance') =>
  `~${days} day${days === 1 ? '' : 's'} after ${origin === 'last-dose' ? 'last dose' : 'clearance'}`;

export const hasLingering = (c: Compound) => !!c.lingeringEffects.note.trim() || c.lingeringEffects.durationDays !== null;

/** Compounds (in the given order) that carry a lingering-effects note or duration. */
export function lingeringItems(idx: LibraryIndex, compounds: Compound[]): LingeringItem[] {
  return compounds.filter(hasLingering).map((c) => ({
    id: c.id,
    name: c.name,
    note: c.lingeringEffects.note.trim(),
    durationDays: c.lingeringEffects.durationDays,
    origin: c.lingeringEffects.origin ?? 'clearance',
    metaboliteOf: c.isMetabolite
      ? c.formedFrom.map((f) => ({ id: f.compound, name: idx.compounds.get(f.compound)?.name ?? f.compound }))
      : null,
  }));
}

/** The panel, or null when no compound has lingering effects. `selfId` is shown as plain text, not a link. */
export function lingeringPanel(items: LingeringItem[], selfId?: string): HTMLElement | null {
  if (!items.length) return null;
  const name = (id: string, text: string) => id === selfId ? h('strong', null, text) : h('a', { href: libraryHash(id), class: 'lib-link' }, text);
  return h('section', { class: 'lib-sec lib-linger' },
    h('h3', null, 'Lingering effects'),
    items.map((it) => h('div', { class: 'lib-linger-item' },
      h('div', { class: 'lib-linger-head' },
        name(it.id, it.name),
        it.metaboliteOf
          ? h('span', { class: 'lib-muted' }, ' · metabolite of ', ...(it.metaboliteOf.length
            ? it.metaboliteOf.flatMap((p, i) => [i ? ', ' : '', name(p.id, p.name)])
            : ['an unknown parent']))
          : null,
        h('span', { class: `lib-linger-days${it.durationDays === null ? ' unq' : ''}` },
          it.durationDays === null ? 'duration not quantified' : lingeringDurationText(it.durationDays, it.origin))),
      it.note ? h('p', { class: 'lib-linger-note' }, it.note) : null)),
    h('p', { class: 'lib-muted lib-small' }, LINGERING_CAVEAT));
}
