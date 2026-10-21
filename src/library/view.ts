// Drug Library: a read-only, full-screen overlay over the app. Lazy-loaded on first open and
// hash-routed by main.ts. It never touches the session; every derived value comes from the app's
// own model (computeScenario, productTree, rangeBounds, status).

import './library.css';
import { QT_COLORS } from '../chart';
import { REPO_URL } from '../config';
import { requiredLabel, type LibraryIndex } from '../model';
import { RANGE_TYPE_LABEL, isRangeOnly, rangeBounds } from '../schema';
import type { ProductSearch } from '../search';
import type { Compound, Product, Range, Settings } from '../types';
import { clear, h } from '../ui/dom';
import { categoryColor, categoryTag } from '../ui/picker';
import {
  atAGlance, buildLibraryModel, entryStatus, filterEntries, hoursText, sectionSources, treeLayout,
  type DrugEntry, type Entry, type LibraryModel, type ListQuery, type MetaboliteEntry, type StatusFilter,
} from './data';
import { inhibitorText, strengthBasisNode } from './cyp';
import { lingeringDurationText, lingeringItems, lingeringPanel } from './lingering';
import { libraryHash, parseLibraryHash } from './route';
import { structureFigure } from './structure';
import { extractCitations, PROVENANCE_LABEL } from './sources';
import { dataStatement, libraryStats, verifiedCountText, type DrugStatus } from './status';

export interface LibraryCtx {
  idx: () => LibraryIndex;
  search: () => ProductSearch;
  settings: () => Settings;
  /** Push a library history entry and show it. */
  navigate: (id: string | null) => void;
  close: () => void;
}

export interface LibraryView {
  show: (id: string | null) => void;
  hide: () => void;
  isOpen: () => boolean;
}

const STATUS_TEXT: Record<DrugStatus, string> = {
  verified: 'Verified',
  'verified-incomplete': 'Verified — incomplete data',
  draft: 'Draft · AI-assisted, pending verification',
  'no-data': 'No data yet',
};
const STATUS_SHORT: Record<DrugStatus, string> = { verified: 'Verified', 'verified-incomplete': 'Verified — incomplete', draft: 'Draft', 'no-data': 'No data yet' };
const STATUS_FILTERS: [StatusFilter, string][] = [['verified', 'Verified'], ['draft', 'Draft'], ['incomplete', 'Incomplete data'], ['not-modelled', 'Not modelled'], ['no-data', 'No data yet']];

const RELEVANCE_TEXT = { active: 'active', inactive: 'inactive', unknown: 'relevance unknown' } as const;
const TRI = (v: string) => (v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unassessed');

const SVG_NS = 'http://www.w3.org/2000/svg';
function s(tag: string, attrs: Record<string, string | number> = {}, ...children: (Node | string)[]): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  for (const c of children) el.append(c);
  return el;
}

const section = (title: string, ...body: (Node | string | null | false | (Node | null)[])[]) =>
  h('section', { class: 'lib-sec' }, h('h3', null, title), ...body);
const muted = (t: string) => h('span', { class: 'lib-muted' }, t);
const kv = (k: string, v: Node | string) => h('div', { class: 'lib-kv' }, h('span', { class: 'lib-k' }, k), h('span', { class: 'lib-v' }, v));
const link = (id: string, text: string) => h('a', { href: libraryHash(id), class: 'lib-link' }, text);

export function createLibraryView(ctx: LibraryCtx): LibraryView {
  const q: ListQuery = { query: '', categories: new Set(), statuses: new Set(), showMetabolites: false };
  const collapsed = new Set<string>();
  let current: string | null = null;
  let open = false;
  let returnFocus: HTMLElement | null = null;
  let model: LibraryModel | null = null;
  let modelKey: unknown[] = [];

  const getModel = () => {
    const key = [ctx.idx(), ctx.settings().unknownAsFormationLimited];
    if (!model || key.some((k, i) => k !== modelKey[i])) {
      model = buildLibraryModel(ctx.idx(), ctx.settings().unknownAsFormationLimited);
      modelKey = key;
    }
    return model;
  };

  // ---------- shell ----------

  const searchInput = h('input', {
    type: 'search', class: 'lib-search', placeholder: 'Search drugs, brands, aliases…  ( / )', 'aria-label': 'Search the drug library', autocomplete: 'off', spellcheck: false,
  });
  const filtersEl = h('div', { class: 'lib-filters' });
  const listEl = h('div', { class: 'lib-list', role: 'navigation', 'aria-label': 'Drugs' });
  const countEl = h('div', { class: 'lib-count', 'aria-live': 'polite' });
  const detailEl = h('div', { class: 'lib-detail', tabindex: '-1' });
  const body = h('div', { class: 'lib-body' },
    h('div', { class: 'lib-side' }, searchInput, filtersEl, countEl, listEl),
    detailEl);
  const closeBtn = h('button', { class: 'icon-btn lib-close', type: 'button', 'aria-label': 'Close library', title: 'Close (Esc)', onclick: () => ctx.close() }, '✕');
  const titleId = 'lib-title';
  const panel = h('div', { class: 'lib glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('header', { class: 'lib-head' },
      h('h2', { id: titleId }, h('a', { href: libraryHash(null), class: 'lib-home', title: 'Back to the library overview' }, 'Drug Library')),
      h('span', { class: 'lib-sub' }, 'Read-only reference. Nothing here changes your patient’s data.'),
      h('span', { class: 'spacer' }),
      closeBtn),
    body);
  const overlay = h('div', { class: 'lib-overlay' }, panel);

  searchInput.addEventListener('input', () => {
    q.query = searchInput.value;
    renderList();
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      rows()[0]?.focus();
    } else if (e.key === 'Enter') {
      const first = rows()[0];
      if (first) {
        e.preventDefault();
        openFromList(first.dataset.id!);
      }
    }
  });

  const rows = () => [...listEl.querySelectorAll<HTMLAnchorElement>('a.lib-row')];
  const openFromList = (id: string) => {
    ctx.navigate(id);
    listEl.querySelector<HTMLElement>(`a.lib-row[data-id="${CSS.escape(id)}"]`)?.focus();
  };

  listEl.addEventListener('keydown', (e) => {
    const all = rows();
    const i = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (i < 0) return all[0]?.focus();
      const j = i + (e.key === 'ArrowDown' ? 1 : -1);
      if (j < 0) searchInput.focus();
      else all[Math.min(j, all.length - 1)]?.focus();
    }
  });

  overlay.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    const typing = !!t.closest('input, select, textarea');
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (typing && t === searchInput && searchInput.value) {
        searchInput.value = '';
        q.query = '';
        renderList();
      } else ctx.close();
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === 'Tab') trapTab(e);
  });

  // In-overlay library links navigate through history (so back/forward walk the entries).
  overlay.addEventListener('click', (e) => {
    const a = (e.target as Element).closest('a');
    const href = a?.getAttribute('href');
    if (!a || !href || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const route = parseLibraryHash(href);
    if (!route) return;
    e.preventDefault();
    if (a.classList.contains('lib-row')) openFromList(route.id!);
    else ctx.navigate(route.id);
  });

  function trapTab(e: KeyboardEvent) {
    const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button, input, select, summary, [tabindex="0"]')]
      .filter((el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ---------- list ----------

  function chip(label: string, pressed: boolean, onClick: () => void, color?: string) {
    return h('button', {
      type: 'button', class: `lib-chip${pressed ? ' on' : ''}`, 'aria-pressed': String(pressed), onclick: onClick,
      style: color ? `--c:${color}` : undefined,
    }, color ? h('span', { class: 'lib-dot', 'aria-hidden': 'true' }) : null, label);
  }

  function renderFilters() {
    const m = getModel();
    const toggle = <T>(set: Set<T>, v: T) => () => {
      if (set.has(v)) set.delete(v);
      else set.add(v);
      renderFilters();
      renderList();
    };
    clear(filtersEl);
    filtersEl.append(
      h('div', { class: 'lib-chips', role: 'group', 'aria-label': 'Category' },
        m.categories.map((c) => chip(c.name, q.categories.has(c.id), toggle(q.categories, c.id), categoryColor(c.id)))),
      h('div', { class: 'lib-chips', role: 'group', 'aria-label': 'Status' },
        STATUS_FILTERS.map(([v, l]) => chip(l, q.statuses.has(v), toggle(q.statuses, v)))),
      h('label', { class: 'lib-toggle' },
        h('input', { type: 'checkbox', checked: q.showMetabolites, onchange: (e: Event) => { q.showMetabolites = (e.target as HTMLInputElement).checked; renderList(); } }),
        'Show metabolites'),
    );
  }

  function row(e: Entry) {
    const st = entryStatus(e);
    const sub = (e.kind === 'drug' ? e.routes.join(' · ') : e.partOf.length ? `metabolite of ${e.partOf.map((d) => d.name).join(', ')}` : 'metabolite')
      + (q.query.trim() && e.category ? ` · ${getModel().categories.find((c) => c.id === e.category)?.name ?? ''}` : '');
    return h('a', {
      href: libraryHash(e.id), class: `lib-row${e.kind === 'metabolite' ? ' met' : ''}`, dataset: { id: e.id },
      'aria-current': e.id === current ? 'page' : undefined,
    },
    h('span', { class: `lib-st st-${st}`, title: STATUS_SHORT[st], 'aria-label': STATUS_SHORT[st] }),
    h('span', { class: 'lib-row-main' }, h('span', { class: 'lib-row-name' }, e.name), h('span', { class: 'lib-row-sub' }, sub)));
  }

  function renderList() {
    const m = getModel();
    const entries = filterEntries(m, ctx.search(), q);
    const drugs = entries.filter((e) => e.kind === 'drug').length;
    countEl.textContent = `${drugs} drug${drugs === 1 ? '' : 's'}${q.showMetabolites ? `, ${entries.length - drugs} metabolite${entries.length - drugs === 1 ? '' : 's'}` : ''}`;
    clear(listEl);
    if (!entries.length) {
      listEl.append(h('div', { class: 'lib-empty' }, 'Nothing matches. Try another name, or clear the filters.'));
      return;
    }
    // While searching: one list in rank order (best match first, so Enter opens it).
    if (q.query.trim()) {
      listEl.append(h('div', { class: 'lib-group-rows' }, entries.map(row)));
      return;
    }
    const groups = new Map<string, Entry[]>();
    for (const e of entries) groups.set(e.category, [...(groups.get(e.category) ?? []), e]);
    const cats = [...m.categories.map((c) => c.id), ''].filter((id) => groups.has(id));
    for (const id of cats) {
      const cat = m.categories.find((c) => c.id === id);
      const isOpen = !collapsed.has(id);
      const list = groups.get(id)!;
      const head = h('button', {
        type: 'button', class: 'lib-group-head', 'aria-expanded': String(isOpen), style: `--c:${categoryColor(id)}`,
        onclick: () => {
          if (collapsed.has(id)) collapsed.delete(id);
          else collapsed.add(id);
          renderList();
        },
      }, h('span', { class: 'lib-caret', 'aria-hidden': 'true' }, isOpen ? '▾' : '▸'), h('span', { class: 'lib-dot', 'aria-hidden': 'true' }), cat?.name ?? 'Other',
      h('span', { class: 'lib-group-count' }, String(list.length)));
      listEl.append(h('div', { class: 'lib-group' }, head, isOpen ? h('div', { class: 'lib-group-rows' }, list.map(row)) : null));
    }
  }

  function markCurrent() {
    for (const r of rows()) {
      if (r.dataset.id === current) r.setAttribute('aria-current', 'page');
      else r.removeAttribute('aria-current');
    }
  }

  // ---------- detail ----------

  function statusBadge(st: DrugStatus, date?: string) {
    return h('span', { class: `lib-status st-${st}` }, h('span', { class: `lib-st st-${st}`, 'aria-hidden': 'true' }),
      st === 'verified' && date ? `Verified ${date}` : STATUS_TEXT[st]);
  }

  function intro() {
    const m = getModel();
    const stats = libraryStats(m.idx.lib, m.idx, ctx.settings().unknownAsFormationLimited);
    const stat = (n: number | string, label: string, st?: DrugStatus) =>
      h('div', { class: 'lib-stat' }, h('div', { class: 'lib-stat-n' }, st ? h('span', { class: `lib-st st-${st}`, 'aria-hidden': 'true' }) : null, String(n)), h('div', { class: 'lib-stat-l' }, label));
    return h('div', { class: 'lib-intro' },
      h('h2', { class: 'lib-entry-title', tabindex: '-1' }, 'About the drug data'),
      h('p', { class: 'lib-statement' }, dataStatement(stats)),
      h('p', null, `${verifiedCountText(stats)}. `, stats.lastVerified ? `Last verification: ${stats.lastVerified}.` : 'No entry has been verified yet.'),
      h('div', { class: 'lib-stats' },
        stat(stats.drugs, 'drugs'), stat(stats.compounds, 'compounds'), stat(stats.products, 'products')),
      h('div', { class: 'lib-stats' },
        stat(stats.verified, 'verified', 'verified'), stat(stats.draft, 'draft', 'draft'),
        stat(stats.incomplete, 'incomplete data'), stat(stats.notModelled, 'not modelled'), stat(stats.noData, 'no data yet', 'no-data')),
      h('p', { class: 'lib-muted' },
        'Choose a drug on the left or search by name, brand or alias. Each entry shows what the app uses: kinetics, metabolites, safety flags and the cited sources. ',
        h('a', { href: 'help.html#library-view', target: '_blank', rel: 'noopener' }, 'How the library works')));
  }

  function rangeView(label: string, r: Range | null, note?: string) {
    const cv = ctx.settings().assumedCv;
    const b = rangeBounds(r, cv);
    if (!r || !b) return kv(label, muted('unknown'));
    const how = isRangeOnly(r) ? 'reported range only — typical is the assumed midpoint'
      : b.assumed && r.rangeType !== 'cv' ? `single value with assumed spread (CV ${Math.round(cv * 100)}%, Settings)`
      : r.rangeType === 'cv' ? `CV ${r.cv}%`
      : r.rangeType ? RANGE_TYPE_LABEL[r.rangeType] : 'range type not recorded';
    const lo = Math.min(b.min, b.typical);
    const hi = Math.max(b.max, b.typical);
    const span = hi * 1.08 || 1;
    const pct = (v: number) => `${(v / span) * 100}%`;
    return h('div', { class: 'lib-range' },
      h('div', { class: 'lib-range-head' }, h('span', { class: 'lib-k' }, label), h('span', null, `${hoursText(b.typical)}`), muted(` · ${how}`)),
      h('div', { class: 'lib-bar', role: 'img', 'aria-label': `${label}: ${hoursText(b.min)} to ${hoursText(b.max)}, typical ${hoursText(b.typical)}` },
        h('div', { class: `lib-bar-band${b.assumed ? ' assumed' : ''}`, style: `left:${pct(lo)};width:calc(${pct(hi)} - ${pct(lo)})` }),
        h('div', { class: 'lib-bar-tick', style: `left:${pct(b.typical)}` })),
      h('div', { class: 'lib-bar-scale' }, h('span', { style: `left:${pct(lo)}` }, hoursText(b.min)), h('span', { style: `left:${pct(hi)}` }, hoursText(b.max))),
      note ? h('div', { class: 'lib-muted lib-small' }, note) : null);
  }

  function kineticsBlock(c: Compound, isSelf: boolean) {
    const k = c.kinetics;
    const mode = k.mode === 'intrinsic' ? 'own half-life'
      : k.mode === 'formation-limited' ? 'formation-limited — tracks its parent’s half-life'
      : k.mode === 'zero-order' ? 'zero-order — fixed elimination rate per kg'
      : k.mode === 'not-modelled' ? 'not modelled — exposure only'
      : 'unknown — no half-life yet';
    const rate = k.zeroOrderRateMgPerKgPerHour;
    const rateText = (v: number | null) => (v === null ? '?' : `${+v.toPrecision(3)}`);
    return h('div', { class: 'lib-card' },
      h('div', { class: 'lib-card-head' }, isSelf ? h('strong', null, c.name) : link(c.id, c.name), muted(` · ${mode}`),
        c.isMetabolite ? h('span', { class: `lib-rel rel-${c.clinicalRelevance}` }, RELEVANCE_TEXT[c.clinicalRelevance]) : null,
        c.endogenous ? h('span', { class: 'lib-chip-endo', title: 'Also produced by the body. With unknown kinetics only the excess over baseline would matter, which isn’t modelled.' }, 'endogenous') : null),
      k.mode === 'intrinsic' ? rangeView('Half-life', k.halfLifeHours) : null,
      k.mode === 'zero-order'
        ? kv('Elimination rate', rate && rate.typical !== null
            ? `${rateText(rate.typical)} mg/kg/h${rate.min !== null || rate.max !== null ? ` (${rateText(rate.min)}–${rateText(rate.max)})` : ''} · × body weight`
            : muted('unknown — products containing it have no data yet'))
        : null,
      k.mode === 'not-modelled' ? kv('Why not modelled', k.notModelledReason || muted('no reason recorded')) : null,
      k.earlyPhase ? rangeView('Early phase', k.earlyPhase.halfLifeHours,
        `Clears ${k.earlyPhase.fraction === null ? 'an unknown share' : `${Math.round(k.earlyPhase.fraction * 100)}%`} of each dose before the terminal phase.`) : null,
      k.steadyState ? rangeView('At steady state', k.steadyState.halfLifeHours,
        k.steadyState.afterDays === null ? 'Onset unknown — the app runs both and uses the later clearance.' : `Applies after ${k.steadyState.afterDays} days of continuous dosing.`) : null,
      kv('Molecular weight', c.molecularWeight ? `${c.molecularWeight} g/mol` : muted('unknown')),
      c.nonlinearKinetics.flag === 'yes' ? h('div', { class: 'lib-flag' }, `Nonlinear kinetics${c.nonlinearKinetics.note ? `: ${c.nonlinearKinetics.note}` : ''}`) : null);
  }

  function treeSvg(roots: string[], selfId: string) {
    const idx = getModel().idx;
    const { nodes, edges } = treeLayout(idx, roots);
    const W = 178, H = 46, CW = 318, RH = 70, PAD = 8;
    const width = Math.max(...nodes.map((n) => n.depth)) * CW + W + PAD * 2;
    const height = Math.max(...nodes.map((n) => n.row)) * RH + H + PAD * 2;
    const pos = new Map(nodes.map((n) => [n.id, { x: PAD + n.depth * CW, y: PAD + n.row * RH }]));
    const svg = s('svg', { class: 'lib-tree', width, height, viewBox: `0 0 ${width} ${height}`, role: 'group', 'aria-label': 'Metabolite tree' });
    for (const e of edges) {
      const a = pos.get(e.from)!;
      const b = pos.get(e.to)!;
      const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
      const [frac, ...rest] = e.label.split(' · ');
      const mult = rest.join(' · ');
      svg.append(
        s('path', { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, class: e.conditional ? 'lib-edge conditional' : 'lib-edge' }),
        s('text', { x: x2 - 8, y: y2 - (mult ? 17 : 5), class: 'lib-edge-label', 'text-anchor': 'end' }, frac),
        mult ? s('text', { x: x2 - 8, y: y2 - 5, class: 'lib-edge-label', 'text-anchor': 'end' }, mult) : '');
    }
    const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    for (const n of nodes) {
      const p = pos.get(n.id)!;
      const self = n.id === selfId;
      const g = s('a', { href: n.href, class: `lib-node rel-${n.relevance}${self ? ' self' : ''}`, 'aria-label': `${n.name}, ${RELEVANCE_TEXT[n.relevance]}, ${n.halfLife}` },
        s('title', {}, `${n.name} — ${RELEVANCE_TEXT[n.relevance]}, ${n.halfLife}`),
        s('rect', { x: p.x, y: p.y, width: W, height: H, rx: 9 }),
        s('text', { x: p.x + 10, y: p.y + 19, class: 'lib-node-name' }, clip(n.name, 24)),
        s('text', { x: p.x + 10, y: p.y + 36, class: 'lib-node-sub' }, clip(`${RELEVANCE_TEXT[n.relevance]} · ${n.halfLife}`, 30)));
      svg.append(g);
    }
    return h('div', { class: 'lib-tree-wrap' }, svg);
  }

  function safetyBlock(c: Compound, isSelf: boolean) {
    const x = c.cyp2d6;
    const mult = x.halfLifeMultiplier
      ? Object.entries(x.halfLifeMultiplier).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k} ×${v}`).join(', ')
      : '';
    const basis = strengthBasisNode(x);
    const tier = c.qt.tier;
    const le = c.lingeringEffects;
    return h('div', { class: 'lib-card' },
      h('div', { class: 'lib-card-head' }, isSelf ? h('strong', null, c.name) : link(c.id, c.name)),
      kv('CYP2D6 substrate', `${TRI(x.substrate)}${mult ? ` · half-life ${mult}` : ''}`),
      kv('CYP2D6 inhibitor', inhibitorText(x)),
      basis ? kv('Strength basis', basis) : null,
      kv('QT', h('span', { class: 'lib-qt', style: `--c:${QT_COLORS[tier]}` }, tier === 'unassessed' ? 'unassessed' : tier === 'none' ? 'no known risk' : `${tier} risk`)),
      kv('Lingering effects', le.durationDays !== null || le.note
        ? `${le.durationDays !== null ? `${lingeringDurationText(le.durationDays, le.origin)}. ` : 'Duration unknown. '}${le.note}`
        : muted('none recorded')),
      kv('Nonlinear kinetics', `${TRI(c.nonlinearKinetics.flag)}${c.nonlinearKinetics.note ? ` — ${c.nonlinearKinetics.note}` : ''}`));
  }

  function receptorsBlock(c: Compound, isSelf: boolean) {
    return h('div', { class: 'lib-rec' },
      isSelf ? h('strong', null, c.name) : link(c.id, c.name),
      h('span', { class: 'lib-rec-chips' },
        !c.receptorsAssessed ? muted('unassessed')
          : c.receptors.length ? c.receptors.map((r) => h('span', { class: 'lib-rchip' }, r.target, muted(` ${r.action}`)))
          : muted('no relevant targets recorded')));
  }

  function sourcesBlock(e: Compound | Product, kind: 'compound' | 'product', openByDefault: boolean) {
    const secs = sectionSources(e, kind);
    const name = e.name.replace(/\s*\([^)]*\)\s*$/, '');
    const overall = extractCitations([e.source], name);
    const citesOf = (x: (typeof secs)[number]) => extractCitations([x.note], name, x.tag !== 'gap');
    const total = new Set([...overall, ...secs.flatMap(citesOf)].map((c) => c.url ?? c.label)).size;
    const cite = (cs: ReturnType<typeof extractCitations>) => cs.length
      ? h('ul', { class: 'lib-cites' }, cs.map((c) => h('li', null, c.url ? h('a', { href: c.url, target: '_blank', rel: 'noopener noreferrer' }, c.label) : c.label)))
      : muted('no link — see evidence notes');
    const raw = [e.source ? `Source: ${e.source}` : '', ...secs.filter((x) => x.note).map((x) => `${x.label}: ${x.note}`)].join('\n\n');
    return h('details', { class: 'lib-src', open: openByDefault },
      h('summary', null, h('strong', null, e.name), muted(` · ${kind} · ${total} source${total === 1 ? '' : 's'}`),
        e.verified ? h('span', { class: 'lib-status st-verified lib-small' }, `Reviewed and verified${e.verifiedDate ? ` ${e.verifiedDate}` : ''}`) : null),
      overall.length ? h('div', { class: 'lib-src-row' }, h('span', { class: 'lib-k' }, 'Entry'), h('span', null), cite(overall)) : null,
      secs.filter((x) => x.note || x.marker).map((x) => h('div', { class: 'lib-src-row' },
        h('span', { class: 'lib-k' }, x.label),
        x.marker ? h('span', { class: `lib-prov prov-${x.marker.tag}`, title: x.marker.label }, h('span', { class: 'sr-only' }, x.marker.label)) : h('span', null),
        x.note ? cite(citesOf(x)) : muted('no note'))),
      raw ? h('details', { class: 'lib-raw' }, h('summary', null, 'Show evidence notes'), h('pre', null, raw)) : null);
  }

  function legend() {
    return h('div', { class: 'lib-legend' }, muted('Draft markers: '),
      (['checked', 'recall', 'estimate', 'gap'] as const).map((t) => h('span', { class: 'lib-legend-item' },
        h('span', { class: `lib-prov prov-${t}`, 'aria-hidden': 'true' }), PROVENANCE_LABEL[t])));
  }

  function correction(e: Entry, sections: string[]) {
    const sel = h('select', { 'aria-label': 'Section to correct' }, sections.map((x) => h('option', { value: x }, x)));
    const a = h('a', { class: 'btn btn-ghost btn-sm', target: '_blank', rel: 'noopener noreferrer' }, 'Report a correction');
    const update = () => {
      const title = `Correction: ${e.name} (${e.id}) — ${sel.value}`;
      const body = `Entry: ${e.name} (\`${e.id}\`)\nSection: ${sel.value}\n\nWhat is wrong:\n\n\nWhat it should be:\n\n\nSource (citation or link):\n`;
      a.href = `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    };
    sel.addEventListener('change', update);
    update();
    return h('div', { class: 'lib-correct' }, muted('Spotted an error? '), sel, a, muted(' Opens a GitHub issue (needs a GitHub account); or email ian@ethovoa.com.'));
  }

  function header(e: Entry, st: DrugStatus, kicker: Node[], date?: string, structure?: Compound) {
    const fig = structure ? structureFigure(structure) : null;
    return h('div', { class: `lib-entry-head${fig ? ' has-struct' : ''}` },
      h('div', { class: 'lib-entry-head-text' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm lib-back', onclick: () => ctx.navigate(null) }, '← All drugs'),
        h('h2', { class: 'lib-entry-title', tabindex: '-1' }, e.name),
        e.aliases.length ? h('div', { class: 'lib-aliases' }, 'Also: ', e.aliases.join(', ')) : null,
        h('div', { class: 'lib-kicker' }, ...kicker),
        statusBadge(st, date)),
      fig);
  }

  function drugDetail(d: DrugEntry) {
    const m = getModel();
    const idx = m.idx;
    const settings = ctx.settings();
    const g = atAGlance(idx, d, settings);
    const tree = treeLayout(idx, d.roots);
    const compounds = tree.nodes.map((n) => idx.compounds.get(n.id)).filter(Boolean) as Compound[];
    const parentId = d.roots[0];
    const verifiedDate = d.products.map((p) => p.verifiedDate).sort().at(-1);
    const cat = m.categories.find((c) => c.id === d.category);
    const draft = !d.state.verified;
    return [
      header(d, d.state.status, [categoryTag(cat), d.className ? h('span', null, d.className) : null].filter(Boolean) as Node[], verifiedDate, idx.compounds.get(parentId)),
      section('At a glance',
        h('p', { class: 'lib-glance' }, g.text),
        g.notes.length ? h('p', { class: 'lib-muted lib-small' }, g.notes.join(' ')) : null,
        g.assumptions.length ? h('details', { class: 'lib-assume' }, h('summary', null, `Assumptions (${g.assumptions.length})`), h('ul', null, g.assumptions.map((a) => h('li', null, a)))) : null,
        h('p', { class: 'lib-muted lib-small' }, `Simulated with the app’s own model: one dose of ${d.primary.name}, normal metaboliser, your current settings.`)),
      lingeringPanel(lingeringItems(idx, compounds), parentId),
      section('Products', h('div', { class: 'lib-cards' }, d.products.map((p) => productCard(p, d)))),
      section('Kinetics', compounds.map((c) => kineticsBlock(c, d.roots.includes(c.id)))),
      section('Metabolites', tree.nodes.length > 1 ? [treeSvg(d.roots, parentId), h('p', { class: 'lib-muted lib-small' }, 'Select a compound to open its entry. Only active (and unknown) compounds count toward the clear date.')] : h('p', { class: 'lib-muted' }, 'No metabolites in the library.')),
      section('Safety', compounds.filter((c) => !c.isMetabolite || c.clinicalRelevance !== 'inactive').map((c) => safetyBlock(c, d.roots.includes(c.id)))),
      section('Receptors', compounds.map((c) => receptorsBlock(c, d.roots.includes(c.id)))),
      section('Sources',
        d.products.map((p, i) => sourcesBlock(p, 'product', i === 0)),
        compounds.map((c) => sourcesBlock(c, 'compound', c.id === parentId)),
        draft ? legend() : null),
      correction(d, ['At a glance', 'Products', 'Kinetics', 'Metabolites', 'Safety', 'Receptors', 'Sources', 'Other']),
    ];
  }

  function productCard(p: Product, d: DrugEntry) {
    const idx = getModel().idx;
    const i = p.input;
    const input = i.type === 'bolus' ? 'immediate (bolus)'
      : i.type === 'first-order-release' ? (i.releaseHalfLifeHours?.typical ? `first-order release, release half-life ${hoursText(i.releaseHalfLifeHours.typical)}` : 'first-order release, release half-life unknown — simulated as immediate')
      : p.doseUnit === 'session' ? `exposure session, ${i.defaultDurationHours ? `default ${i.defaultDurationHours} h` : 'duration entered per session (1 h default)'}`
      : `zero-order (patch or infusion), ${i.defaultDurationHours ? `default wear ${i.defaultDurationHours} h` : 'no default wear time (24 h assumed)'}`;
    const td = p.typicalDose;
    const name = (id: string) => idx.compounds.get(id)?.name ?? id;
    const prodrugs = p.components.filter((c) => c.administeredAs || c.massFactor != null);
    return h('div', { class: 'lib-card' },
      h('div', { class: 'lib-card-head' }, h('strong', null, p.name), p === d.primary ? h('span', { class: 'lib-pill' }, 'used for “at a glance”') : null),
      kv('Route', p.route),
      kv('Formulation', p.formulation ?? muted('unspecified')),
      kv('Dose unit', p.doseUnit),
      kv('Input', input),
      kv('Typical dose', td.amount ? `${td.amount} ${td.unit}${td.basis ? ` (${td.basis})` : ''}` : muted('not set')),
      ...prodrugs.map((c) => kv('Prodrug', h('span', null,
        'administered as ', link(c.administeredAs ?? c.compound, name(c.administeredAs ?? c.compound)),
        ', modelled as ', link(c.compound, name(c.compound)),
        muted(c.massFactor != null ? ` · × ${c.massFactor} (molar mass ratio)` : ' · mass factor unknown')))),
      p.components.length > 1 || p.components.some((c) => c.saltFactor !== null || c.bioavailability !== null)
        ? kv('Components', h('ul', { class: 'lib-comp' }, p.components.map((c) => h('li', null,
          link(c.compound, idx.compounds.get(c.compound)?.name ?? c.compound),
          ` × ${c.ratio}`,
          muted(` · salt factor ${c.saltFactor ?? 'not applied'} · bioavailability ${c.bioavailability ?? 'not applied'}`)))))
        : null);
  }

  function metaboliteDetail(e: MetaboliteEntry) {
    const idx = getModel().idx;
    const c = e.compound;
    const st = entryStatus(e);
    const hasChildren = (idx.children.get(c.id) ?? []).length > 0;
    return [
      header(e, st, [h('span', null, 'Metabolite'), h('span', { class: `lib-rel rel-${c.clinicalRelevance}` }, RELEVANCE_TEXT[c.clinicalRelevance])], c.verifiedDate, c),
      section('Where it comes from',
        kv('Formed from', c.formedFrom.length
          ? h('span', null, c.formedFrom.map((f, i) => [i ? ', ' : '', link(f.compound, idx.compounds.get(f.compound)?.name ?? f.compound),
            muted(` (fraction ${f.fraction ?? 'unknown'}${f.condition ? `, only with ${requiredLabel(idx, f.condition.requiresCompound)}` : ''})`)]).flat())
          : muted('unknown')),
        kv('Part of', e.partOf.length ? h('span', null, e.partOf.map((d, i) => [i ? ', ' : '', link(d.id, d.name)]).flat()) : muted('no drug in the library')),
        h('p', { class: 'lib-muted lib-small' }, c.clinicalRelevance === 'inactive'
          ? 'Classed inactive: plotted faintly if enabled, never counted toward the clear date.'
          : 'Counts toward the clear date of the drugs it is part of.')),
      lingeringPanel(lingeringItems(idx, [c]), c.id),
      section('Kinetics', kineticsBlock(c, true)),
      hasChildren ? section('Metabolites', treeSvg([c.id], c.id)) : null,
      section('Safety', safetyBlock(c, true)),
      section('Receptors', receptorsBlock(c, true)),
      section('Sources', sourcesBlock(c, 'compound', true), !c.verified ? legend() : null),
      correction(e, ['Kinetics', 'Metabolism', 'Clinical relevance', 'Safety', 'Receptors', 'Sources', 'Other']),
    ];
  }

  function renderDetail(focus: boolean) {
    clear(detailEl);
    detailEl.scrollTop = 0;
    const m = getModel();
    const e = current ? m.resolve(current) : null;
    body.classList.toggle('has-entry', !!e);
    if (current && !e) {
      detailEl.append(h('div', { class: 'lib-intro' },
        h('h2', { class: 'lib-entry-title', tabindex: '-1' }, 'Not in the library'),
        h('p', null, `There is no library entry “${current}”. `, h('a', { href: libraryHash(null) }, 'Back to the library'))));
    } else detailEl.append(...(e ? (e.kind === 'drug' ? drugDetail(e) : metaboliteDetail(e)) : [intro()]).filter(Boolean) as Node[]);
    if (focus) detailEl.querySelector<HTMLElement>('.lib-entry-title')?.focus({ preventScroll: true });
  }

  // ---------- open / close ----------

  return {
    show(id) {
      const opening = !open;
      if (opening) {
        returnFocus = document.activeElement as HTMLElement | null;
        document.body.append(overlay);
        document.getElementById('app')?.setAttribute('inert', '');
        document.body.classList.add('lib-open');
        open = true;
        renderFilters();
        renderList();
      }
      const fromList = overlay.contains(document.activeElement) && !!(document.activeElement as HTMLElement).closest('.lib-side');
      const changed = opening || id !== current;
      current = id;
      if (changed) {
        renderDetail(!fromList && !(opening && !id));
        markCurrent();
        listEl.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
      }
      if (opening && !id) searchInput.focus();
    },
    hide() {
      if (!open) return;
      open = false;
      overlay.remove();
      document.getElementById('app')?.removeAttribute('inert');
      document.body.classList.remove('lib-open');
      if (returnFocus?.isConnected) returnFocus.focus();
      returnFocus = null;
    },
    isOpen: () => open,
  };
}
