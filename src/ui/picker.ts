// Type-ahead product picker.

import type { DataStatus } from '../model';
import { isDraft } from '../schema';
import type { ProductSearch, SearchHit } from '../search';
import type { Category, Product } from '../types';
import { badge, h, highlight } from './dom';

/** Status badges shared by the picker, dose form and dose list. */
export function productBadges(p: Product, status: DataStatus, compoundsVerified = true): (HTMLElement | null)[] {
  const verified = !p.userEntered && !isDraft(p) && p.verified && compoundsVerified;
  if (verified && status === 'incomplete')
    return [badge('verified — incomplete data', 'warn', 'Fully reviewed, but kinetics for at least one compound are confirmed unknown — the clear date is a lower bound.')];
  return [
    status === 'no-data' ? badge('no data yet', 'muted')
      : status === 'incomplete' ? badge('incomplete', 'warn')
      : status === 'not-modelled' ? badge('not modelled', 'muted', 'Shown as exposure markers and the lingering-effects band, never a clear date.')
      : null,
    p.userEntered ? badge('user-entered', 'user')
      : isDraft(p) ? badge('draft', 'warn', 'AI-assisted draft: some values are from model recall or estimates, not yet checked against a source.')
      : !verified ? badge('unverified', 'warn', 'Not yet verified by hand against its sources.') : null,
  ];
}

const inCategory = (p: Product, cat: string) => p.category === cat || (p.secondaryCategories ?? []).includes(cat);

export const CATEGORY_COLORS: Record<string, string> = {
  opioids: '#ff8a65',
  sedatives: '#9575cd',
  antidepressants: '#4fc3f7',
  antipsychotics: '#f06292',
  mood_anticonvulsants: '#aed581',
  stimulants: '#ffd54f',
  psychedelics_dissociatives: '#4dd0a7',
  cardiovascular: '#e57373',
  other_interactors: '#90a4ae',
};
export const categoryColor = (id: string) => CATEGORY_COLORS[id] ?? '#90a4ae';

export function categoryTag(cat: Category | undefined, short = false) {
  const name = cat?.name ?? 'Other';
  const label = short ? name.split(/[ ,&]/)[0] : name;
  const col = categoryColor(cat?.id ?? '');
  return h('span', { class: 'cat-tag', style: `--c:${col}` }, label);
}

export interface PickerCtx {
  search: () => ProductSearch;
  products: () => Product[];
  categories: () => Category[];
  /** "no-data" products are listed but not selectable. */
  status: (p: Product) => DataStatus;
  recents: () => string[];
  onSelect: (productId: string) => void;
  onCustom: (name: string) => void;
}

export function createPicker(ctx: PickerCtx) {
  const input = h('input', {
    type: 'search', class: 'picker-input', placeholder: 'Search drugs — name, brand, street name, class…',
    autocomplete: 'off', spellcheck: false, 'aria-label': 'Search drugs',
  });
  const chips = h('div', { class: 'chips' });
  const list = h('div', { class: 'picker-list', role: 'listbox' });
  const pop = h('div', { class: 'picker-pop glass', hidden: true }, chips, list);
  const root = h('div', { class: 'picker' }, input, pop);
  const activeCats = new Set<string>();
  const collapsed = new Set<string>();
  let items: { id: string; el: HTMLElement; enabled: boolean }[] = [];
  let cursor = -1;

  const productById = () => new Map(ctx.products().map((p) => [p.id, p]));
  const catById = () => new Map(ctx.categories().map((c) => [c.id, c]));

  const row = (p: Product, hit?: SearchHit) => {
    const status = ctx.status(p);
    const enabled = status !== 'no-data';
    const rec = ctx.search().record(p.id);
    const name = rec?.name ?? p.name;
    const cat = catById().get(p.category);
    const el = h('div', { class: `picker-item ${enabled ? '' : 'disabled'}`, role: 'option', 'aria-disabled': !enabled },
      h('div', { class: 'pi-main' },
        h('span', { class: 'pi-name' }, hit ? highlight(name, hit.nameRanges) : name),
        h('span', { class: 'pi-route' }, ' · ', p.route),
        categoryTag(cat, true),
        ...productBadges(p, status)),
      hit?.matchedAlias ? h('div', { class: 'pi-alias' }, 'matched ‘', highlight(hit.matchedAlias, hit.aliasRanges), '’') : null,
      p.class ? h('div', { class: 'pi-class' }, p.class) : null);
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (enabled) choose(p.id);
    });
    return { id: p.id, el, enabled };
  };

  const renderChips = () => {
    chips.replaceChildren(
      ...ctx.categories().map((c) =>
        h('button', {
          type: 'button',
          class: `chip ${activeCats.has(c.id) ? 'on' : ''}`,
          style: `--c:${categoryColor(c.id)}`,
          onmousedown: (e: Event) => {
            e.preventDefault();
            activeCats.has(c.id) ? activeCats.delete(c.id) : activeCats.add(c.id);
            render();
          },
        }, c.name.split(/[ ,&]/)[0])),
    );
  };

  const setCursor = (i: number) => {
    items.forEach((it, k) => it.el.classList.toggle('active', k === i));
    cursor = i;
    items[i]?.el.scrollIntoView({ block: 'nearest' });
  };

  const render = () => {
    renderChips();
    const q = input.value.trim();
    const byId = productById();
    const inCats = (p: Product) => activeCats.size === 0 || [...activeCats].some((c) => inCategory(p, c));
    items = [];
    list.replaceChildren();
    if (q) {
      const hits = ctx.search().search(q).filter((hit) => byId.has(hit.productId) && inCats(byId.get(hit.productId)!));
      for (const hit of hits) items.push(row(byId.get(hit.productId)!, hit));
      list.append(...items.map((i) => i.el));
      if (!items.length)
        list.append(h('div', { class: 'picker-empty', onmousedown: (e: Event) => { e.preventDefault(); close(); ctx.onCustom(q); } },
          'No match — ', h('a', { href: '#' }, `add “${q}” as custom drug?`)));
    } else {
      const recents = ctx.recents().map((id) => byId.get(id)).filter((p): p is Product => !!p && inCats(p));
      if (recents.length) {
        list.append(h('div', { class: 'picker-group' }, 'Recently used'));
        for (const p of recents.slice(0, 6)) {
          const r = row(p);
          items.push(r);
          list.append(r.el);
        }
      }
      for (const cat of ctx.categories()) {
        if (activeCats.size && !activeCats.has(cat.id)) continue;
        const ps = [...byId.values()].filter((p) => inCategory(p, cat.id)).sort((a, b) => a.name.localeCompare(b.name));
        if (!ps.length) continue;
        const isCollapsed = collapsed.has(cat.id) && activeCats.size === 0;
        list.append(h('div', {
          class: 'picker-group clickable', style: `--c:${categoryColor(cat.id)}`,
          onmousedown: (e: Event) => { e.preventDefault(); collapsed.has(cat.id) ? collapsed.delete(cat.id) : collapsed.add(cat.id); render(); },
        }, h('span', { class: 'caret' }, isCollapsed ? '▸' : '▾'), h('span', { class: 'dot' }), cat.name, h('span', { class: 'count' }, String(ps.length))));
        if (isCollapsed) continue;
        for (const p of ps) {
          const r = row(p);
          items.push(r);
          list.append(r.el);
        }
      }
    }
    // Preselect the first selectable result so "type → Enter" picks it.
    setCursor(q ? items.findIndex((i) => i.enabled) : -1);
  };

  const open = () => {
    pop.hidden = false;
    render();
  };
  const close = () => {
    pop.hidden = true;
  };
  const choose = (id: string) => {
    input.value = '';
    close();
    ctx.onSelect(id);
  };

  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  input.addEventListener('input', () => {
    pop.hidden = false;
    render();
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    if (pop.hidden && (e.key === 'ArrowDown' || e.key === 'Enter')) open();
    const move = (dir: 1 | -1) => {
      let i = cursor;
      for (let k = 0; k < items.length; k++) {
        i = (i + dir + items.length) % items.length;
        if (items[i].enabled) return setCursor(i);
      }
    };
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const it = items[cursor];
      if (it?.enabled) choose(it.id);
      else if (!items.length && input.value.trim()) { const q = input.value.trim(); close(); ctx.onCustom(q); }
    } else if (e.key === 'Escape') {
      close();
      input.blur();
    }
  });

  return { el: root, input, refresh: () => !pop.hidden && render() };
}
