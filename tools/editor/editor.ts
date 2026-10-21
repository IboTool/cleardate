// ClearDate local data editor — populate public/drugs.json one candidate at a time.
// Runs only under `npm run editor` (127.0.0.1); never deployed.

import '@fontsource-variable/inter';
import '../../src/styles.css';
import './editor.css';
import {
  compoundHasData, emptyCompound, emptyProduct, emptyRange, formatRange, isConfirmedUnknown, isDraft, isFlagged, isReviewed, NA_NOTE, SCHEMA_VERSION, slug,
} from '../../src/schema';
import {
  confirmSection, flagSection, isCompound, markNotApplicable, markReviewed, NA_SECTIONS, nextIncomplete, SECTION_LABEL, sectionIssues, sectionsOf,
  unknownParts, verifyBlockers, type Entry, type Section,
} from '../../src/review';
import { validateLibrary, type Issue, type ValidationResult } from '../../src/validate';
import {
  COMPOUND_SECTIONS, DOSE_BASES, DOSE_UNITS, FORMULATIONS, INPUT_TYPES, PRODUCT_SECTIONS, PROVENANCE_TAGS, QT_TIERS,
  type Compound, type CompoundSection, type Formulation, type InputType, type Library, type Product, type ProductSection, type Provenance, type QtTier,
} from '../../src/types';
import { compoundSection, nullableNumber, phenotypeInputs, rangeInputs, type SectionName } from '../../src/ui/compoundForm';
import { append, badge, field, h, select, textInput, toast } from '../../src/ui/dom';
import { categoryColor } from '../../src/ui/picker';
import { productId, type Candidate, type CandidatesFile } from '../init-lib';
import { applyInputRule } from '../product-rules';

type Status = 'not-started' | 'draft' | 'verified';
type Flag = 'draft-values' | 'unknown-kinetics' | 'auto-assumptions' | 'unreviewed-sections' | 'flagged' | 'confirmed-unknown';
type View = 'queue' | 'review' | 'qt' | 'priority';

const st = {
  lib: null as Library | null,
  hash: '',
  queue: null as CandidatesFile | null,
  current: 0,
  view: 'queue' as View,
  filter: new Set<Status>(),
  flags: new Set<Flag>(),
  query: '',
  dirty: false,
  saving: false,
  validation: null as ValidationResult | null,
  collapsedCats: new Set<string>(),
  expanded: new Set<string>(),
  refreshers: [] as (() => void)[],
  prioritySort: { key: 'reason' as 'reason' | 'name' | 'candidate', dir: 1 },
  scrollTo: null as string | null,
  /** Section the keyboard shortcuts act on in the entry view. */
  focus: null as { id: string; section: Section } | null,
  review: { index: 0, key: '', byType: false, category: '', section: '' as Section | '', tag: '', flaggedOnly: false, priorityOnly: false, history: [] as string[] },
  qt: { key: 'tier' as 'name' | 'category' | 'tier' | 'weight', dir: 1, tier: '' as QtTier | '', category: '', preview: [{ id: '', mg: 10 }, { id: '', mg: 10 }, { id: '', mg: 10 }] },
};

const root = document.getElementById('editor')!;
const side = h('aside', { class: 'ed-side glass' });
const main = h('main', { class: 'ed-main' });
const top = h('header', { class: 'ed-top' });
root.append(top, h('div', { class: 'ed-layout' }, side, main));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- data helpers ----------

const lib = () => st.lib!;
const compound = (id: string) => lib().compounds.find((c) => c.id === id);
const candidates = () => [...st.queue!.candidates].sort((a, b) => a.order - b.order);

function childrenOf(id: string): Compound[] {
  return lib().compounds.filter((c) => c.formedFrom.some((f) => f.compound === id));
}

/** Parent + downstream metabolites (live, following formedFrom in drugs.json), depth-first. */
function tree(parentId: string): { c: Compound; depth: number; via: string | null }[] {
  const out: { c: Compound; depth: number; via: string | null }[] = [];
  const seen = new Set<string>();
  const walk = (id: string, depth: number, via: string | null) => {
    const c = compound(id);
    if (!c || seen.has(id)) return;
    seen.add(id);
    out.push({ c, depth, via });
    for (const ch of childrenOf(id).sort((a, b) => a.name.localeCompare(b.name))) walk(ch.id, depth + 1, id);
  };
  walk(parentId, 0, null);
  return out;
}

/** Products grouped under their candidate (combination products sit under their primary component's candidate). */
const productsOf = (cand: Candidate) => lib().products.filter((p) => p.candidateId === cand.id).sort((a, b) => a.id.localeCompare(b.id));

function statusOf(cand: Candidate): Status {
  const parent = compound(cand.parentCompound);
  if (!parent || !compoundHasData(parent)) return 'not-started';
  const ps = productsOf(cand);
  const allVerified = tree(cand.parentCompound).every((n) => n.c.verified) && ps.length > 0 && ps.every((p) => p.verified);
  return allVerified ? 'verified' : 'draft';
}

const AUTO_NOTE = /by migration|Auto-assigned/;
const hasAutoNote = (e: Compound | Product) => Object.values(e.sourceNotes ?? {}).some((n) => AUTO_NOTE.test(n ?? ''));

function flagsOf(cand: Candidate): Set<Flag> {
  const out = new Set<Flag>();
  const cs = tree(cand.parentCompound).map((n) => n.c);
  const ps = productsOf(cand);
  if ([...cs, ...ps].some(isDraft)) out.add('draft-values');
  if (cs.some((c) => c.kinetics.mode === 'unknown')) out.add('unknown-kinetics');
  if ([...cs, ...ps].some(hasAutoNote)) out.add('auto-assumptions');
  const entries: Entry[] = [...cs, ...ps];
  if (entries.some((e) => sectionsOf(e).some((s) => !isReviewed(e, s)))) out.add('unreviewed-sections');
  if (entries.some((e) => sectionsOf(e).some((s) => isFlagged(e, s)))) out.add('flagged');
  if (entries.some((e) => sectionsOf(e).some((s) => isConfirmedUnknown(e, s)))) out.add('confirmed-unknown');
  return out;
}

/** Sidebar filters (status chips, flag chips, search) — also scope review mode. */
function matchesFilters(c: Candidate): boolean {
  const q = st.query.toLowerCase();
  return (st.filter.size === 0 || st.filter.has(statusOf(c))) &&
    (st.flags.size === 0 || [...st.flags].every((f) => flagsOf(c).has(f))) &&
    (!q || c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)) || c.parentCompound.includes(q));
}

/** Candidate each compound is reviewed under (first in queue order whose tree contains it). */
function ownerMap(): Map<string, Candidate> {
  const out = new Map<string, Candidate>();
  for (const cand of candidates()) for (const n of tree(cand.parentCompound)) if (!out.has(n.c.id)) out.set(n.c.id, cand);
  return out;
}

/** The first candidate (queue order) whose tree contains a compound. */
function owner(compoundId: string): Candidate | undefined {
  return candidates().find((cand) => tree(cand.parentCompound).some((n) => n.c.id === compoundId));
}

const issuesFor = (id: string): { errors: Issue[]; warnings: Issue[] } => ({
  errors: st.validation?.errors.filter((e) => e.id === id) ?? [],
  warnings: st.validation?.warnings.filter((e) => e.id === id) ?? [],
});

// ---------- validation, dirty state, save ----------

let vTimer = 0;
function changed() {
  st.dirty = true;
  renderTop();
  clearTimeout(vTimer);
  vTimer = window.setTimeout(() => {
    st.validation = validateLibrary(lib());
    st.refreshers.forEach((f) => f());
    renderTop();
    renderSide();
  }, 180);
}

async function save() {
  if (!st.lib || st.saving) return;
  st.validation = validateLibrary(lib());
  if (st.validation.errors.length) {
    renderTop();
    st.refreshers.forEach((f) => f());
    return toast(`Not saved: ${st.validation.errors.length} validation error(s). Fix them first.`, 4000);
  }
  st.saving = true;
  try {
    const res = await fetch('/api/drugs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library: lib(), baseHash: st.hash }),
    });
    const body = await res.json();
    if (!res.ok) return toast(`Not saved: ${body.error}${body.errors ? ` (${body.errors.length} errors)` : ''}`, 7000);
    st.hash = body.hash;
    st.dirty = false;
    toast('Saved drugs.json');
  } catch (e) {
    toast(`Save failed: ${(e as Error).message}`, 5000);
  } finally {
    st.saving = false;
    renderTop();
  }
}

window.addEventListener('beforeunload', (e) => {
  if (st.dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});

// ---------- top bar ----------

function renderTop() {
  const v = st.validation;
  const p = v?.progress;
  top.replaceChildren();
  append(top, [
    h('div', { class: 'wordmark' }, 'Clear', h('span', null, 'Date'), h('small', null, ' data editor')),
    p ? h('span', { class: 'ed-progress' }, `Sections ${p.sectionsReviewed}/${p.sections} reviewed · Compounds ${p.compoundsVerified}/${p.compounds} verified · Products ${p.productsVerified}/${p.products} verified`) : null,
    st.lib
      ? h('div', { class: 'segmented ed-views' },
          ...(Object.keys(VIEW_LABEL) as View[]).map((vw) =>
            h('button', { type: 'button', class: `seg ${st.view === vw ? 'on' : ''}`, onclick: () => { st.view = vw; renderTop(); renderSide(); renderMain(); main.scrollTo(0, 0); } },
              VIEW_LABEL[vw])))
      : null,
    h('span', { class: 'spacer' }),
    v ? h('span', { class: `ed-vstat ${v.errors.length ? 'bad' : 'ok'}` }, v.errors.length ? `${v.errors.length} error(s)` : '✓ valid', v.warnings.length ? ` · ${v.warnings.length} warning(s)` : '') : null,
    st.dirty ? h('span', { class: 'ed-dirty' }, '● Unsaved changes') : h('span', { class: 'ed-clean' }, 'All changes saved'),
    h('button', { class: 'btn btn-primary', type: 'button', disabled: !st.dirty || st.saving, onclick: save, title: 'Ctrl+S' }, st.saving ? 'Saving…' : 'Save'),
  ]);
}

// ---------- sidebar (queue) ----------

const STATUS_LABEL: Record<Status, string> = { 'not-started': 'not started', draft: 'draft', verified: 'verified' };
const FLAG_LABEL: Record<Flag, string> = {
  'draft-values': 'has draft values', 'unknown-kinetics': 'unknown kinetics', 'auto-assumptions': 'auto-assumptions',
  'unreviewed-sections': 'unreviewed sections', flagged: 'flagged', 'confirmed-unknown': 'confirmed unknown',
};
const VIEW_LABEL: Record<View, string> = { queue: 'Queue', review: 'Review mode', qt: 'QT calibration', priority: 'Priority review' };

function renderSide() {
  if (!st.queue || !st.lib) return;
  const q = st.query.toLowerCase();
  const list = candidates();
  const statuses = new Map(list.map((c) => [c.order, statusOf(c)]));
  const visible = matchesFilters;
  const catProgress = new Map((st.validation?.progress.categories ?? []).map((c) => [c.id, c]));
  const search = h('input', { type: 'search', placeholder: 'Search the queue…', value: st.query });
  search.addEventListener('input', () => {
    st.query = search.value;
    renderSide();
    const el = side.querySelector('input[type=search]') as HTMLInputElement;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
  const active = list[st.current];
  side.replaceChildren();
  append(side, [
    search,
    h('div', { class: 'chips' }, ...(['not-started', 'draft', 'verified'] as Status[]).map((s) =>
      h('button', { type: 'button', class: `chip st-${s} ${st.filter.has(s) ? 'on' : ''}`, onclick: () => { st.filter.has(s) ? st.filter.delete(s) : st.filter.add(s); renderSide(); } }, STATUS_LABEL[s]))),
    h('div', { class: 'chips' }, ...(Object.keys(FLAG_LABEL) as Flag[]).map((f) =>
      h('button', { type: 'button', class: `chip fl ${st.flags.has(f) ? 'on' : ''}`, onclick: () => { st.flags.has(f) ? st.flags.delete(f) : st.flags.add(f); renderSide(); } }, FLAG_LABEL[f]))),
    ...st.queue.categories.map((cat) => {
      const cs = list.filter((c) => c.category === cat.id);
      const done = cs.filter((c) => statuses.get(c.order) === 'verified').length;
      const shown = cs.filter(visible);
      const collapsed = st.collapsedCats.has(cat.id) && !q;
      if (!shown.length && (st.filter.size || st.flags.size || q)) return null;
      return h('div', { class: 'ed-cat' },
        h('button', { type: 'button', class: 'ed-cat-head', style: `--c:${categoryColor(cat.id)}`, onclick: () => { st.collapsedCats.has(cat.id) ? st.collapsedCats.delete(cat.id) : st.collapsedCats.add(cat.id); renderSide(); } },
          h('span', { class: 'caret' }, collapsed ? '▸' : '▾'), h('span', { class: 'dot' }), cat.name, h('span', { class: 'count' }, `${done}/${cs.length}`)),
        catProgress.has(cat.id)
          ? h('div', { class: 'ed-cat-progress' }, `${catProgress.get(cat.id)!.sectionsReviewed} / ${catProgress.get(cat.id)!.sections} sections reviewed · ${catProgress.get(cat.id)!.drugsVerified} / ${catProgress.get(cat.id)!.drugs} drugs verified`)
          : null,
        collapsed ? null : shown.map((c) => {
          const ps = productsOf(c);
          const isActive = st.view === 'queue' && active?.order === c.order;
          return [
            h('button', { type: 'button', class: `ed-cand ${isActive ? 'active' : ''}`, onclick: () => { st.view = 'queue'; renderTop(); go(list.indexOf(c)); } },
              h('span', { class: `st-dot st-${statuses.get(c.order)}`, title: STATUS_LABEL[statuses.get(c.order)!] }),
              h('span', { class: 'ed-cand-name' }, c.name),
              ps.length > 1 ? h('span', { class: 'ed-cand-n', title: `${ps.length} products` }, `${ps.length}▸`) : null,
              h('span', { class: 'ed-cand-n' }, `#${c.order}`)),
            isActive && ps.length
              ? h('div', { class: 'ed-cand-products' }, ...ps.map((p) =>
                  h('button', { type: 'button', class: 'ed-cand-product', onclick: () => scrollToCard(p.id) },
                    h('span', { class: `st-dot st-${productStatus(p)}` }), p.name)))
              : null,
          ];
        }));
    }),
  ]);
}

function go(i: number) {
  const n = candidates().length;
  st.current = (i + n) % n;
  st.expanded.clear();
  renderMain();
  renderSide();
  if (st.scrollTo) {
    scrollToCard(st.scrollTo);
    st.scrollTo = null;
  } else main.scrollTo(0, 0);
}

function scrollToCard(id: string) {
  const el = document.getElementById(`card-${id}`);
  if (!el) return;
  el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1200);
}

/** Next candidate matching the active filters (or any, if none). */
function step(dir: 1 | -1) {
  const list = candidates();
  for (let k = 1; k <= list.length; k++) {
    const i = (st.current + dir * k + list.length) % list.length;
    const okStatus = st.filter.size === 0 || st.filter.has(statusOf(list[i]));
    const okFlags = st.flags.size === 0 || [...st.flags].every((f) => flagsOf(list[i]).has(f));
    if (okStatus && okFlags) return go(i);
  }
}

// ---------- provenance chips ----------

type ProvOwner = { provenance: Partial<Record<string, Provenance | null>> };
const chipRefreshers = new Map<string, () => void>();

function provChip(e: ProvOwner & { id: string }, section: string): HTMLElement {
  const sel = h('select', { class: 'prov-chip', title: `Provenance of ${section}` },
    h('option', { value: '' }, '—'), ...PROVENANCE_TAGS.map((t) => h('option', { value: t }, t)));
  const refresh = () => {
    const v = e.provenance[section] ?? '';
    sel.value = v;
    sel.dataset.tag = v;
  };
  sel.addEventListener('click', (ev) => ev.stopPropagation());
  sel.addEventListener('change', () => {
    e.provenance[section] = (sel.value || null) as Provenance | null;
    refresh();
    changed();
  });
  refresh();
  chipRefreshers.set(`${e.id}:${section}`, refresh);
  return sel;
}

/** A human edit: provenance becomes "reviewer" and the section's review date is stamped. */
function touched(e: Entry, section: string | undefined) {
  if (section) {
    markReviewed(e, section as Section, today());
    chipRefreshers.get(`${e.id}:${section}`)?.();
  }
  changed();
}

// ---------- section review (Confirm / Confirm as unknown / N/A / Flag) ----------

/** Renders URLs in a source note as links opening in a new tab. */
function linkify(text: string): (Node | string)[] {
  return text.split(/(https?:\/\/[^\s)\]]+)/g).map((part, i) =>
    i % 2 ? h('a', { href: part, target: '_blank', rel: 'noopener noreferrer' }, part) : part);
}

function reviewState(e: Entry, s: Section): { cls: string; text: string } {
  const note = (e.sourceNotes as Record<string, string>)[s] ?? '';
  const date = (e.reviewedDates as Record<string, string>)[s];
  if (isReviewed(e, s)) {
    const what = isConfirmedUnknown(e, s) ? 'confirmed unknown' : note.includes(NA_NOTE) ? 'N/A' : 'reviewed';
    return { cls: 'done', text: `✓ ${what}${date ? ` ${date}` : ''}` };
  }
  return isFlagged(e, s) ? { cls: 'flag', text: '⚑ flagged' } : { cls: 'open', text: 'unreviewed' };
}

/** Runs a review action, then re-renders and moves on. */
function act(e: Entry, s: Section, fn: () => string | null, advance: boolean) {
  const refused = fn();
  if (refused) return toast(refused, 4000);
  st.validation = validateLibrary(lib());
  changed();
  if (st.view === 'review') return renderReview();
  st.focus = { id: e.id, section: s };
  renderMain();
  if (advance) nextIncompleteOnPage();
  else focusSection(e.id, s);
}

const confirmAction = (e: Entry, s: Section, asUnknown = false) => act(e, s, () => confirmSection(e, s, today(), asUnknown), true);
const naAction = (e: Entry, s: Section) => act(e, s, () => markNotApplicable(e, s, today()), true);
function flagAction(e: Entry, s: Section) {
  const reason = prompt(`Flag ${SECTION_LABEL[s]} of ${e.name} for follow-up — reason:`);
  if (reason === null) return;
  act(e, s, () => (flagSection(e, s, reason), null), false);
}

/** Confirm (or Confirm as unknown, when values are unknown) — the Enter shortcut. */
function confirmDefault(e: Entry, s: Section) {
  confirmAction(e, s, unknownParts(e, s).length > 0);
}

function reviewBar(e: Entry, s: Section): HTMLElement {
  const bar = h('div', { class: 'rv-bar' });
  const refresh = () => {
    const errs = sectionIssues(st.validation?.errors ?? [], e, s);
    const unknown = unknownParts(e, s);
    const state = reviewState(e, s);
    const blocked = errs.length ? `Fix: ${errs.map((x) => x.message).join('; ')}` : '';
    bar.replaceChildren();
    append(bar, [
      h('span', { class: `rv-state rv-${state.cls}` }, SECTION_LABEL[s], ' · ', state.text),
      h('span', { class: 'spacer' }),
      unknown.length
        ? h('button', { class: 'btn btn-sm btn-primary', type: 'button', disabled: errs.length > 0, title: blocked || `Keeps unknown: ${unknown.join(', ')} (Enter)`, onclick: () => confirmAction(e, s, true) }, 'Confirm as unknown')
        : h('button', { class: 'btn btn-sm btn-primary', type: 'button', disabled: errs.length > 0, title: blocked || 'Keep these values (Enter)', onclick: () => confirmAction(e, s) }, 'Confirm'),
      NA_SECTIONS.includes(s) ? h('button', { class: 'btn btn-sm btn-ghost', type: 'button', title: 'Not applicable: set to none / empty', onclick: () => naAction(e, s) }, 'N/A') : null,
      h('button', { class: 'btn btn-sm btn-ghost', type: 'button', title: 'Keep unreviewed and note why', onclick: () => flagAction(e, s) }, 'Flag'),
    ]);
  };
  refresh();
  st.refreshers.push(refresh);
  return bar;
}

/** Highlight a section in the entry view and make it the target of Enter / N. */
function focusSection(id: string, s: Section) {
  st.focus = { id, section: s };
  main.querySelectorAll('.rv-focus').forEach((x) => x.classList.remove('rv-focus'));
  const el = document.getElementById(`sec-${id}-${s}`);
  if (!el) return;
  const det = el.closest('details');
  if (det) det.open = true;
  el.classList.add('rv-focus');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Entries on the current candidate page, in display order. */
function pageEntries(): Entry[] {
  const cand = candidates()[st.current];
  const own = ownerMap();
  const cs = tree(cand.parentCompound).map((n) => n.c).filter((c) => !(c.verified && own.get(c.id) && own.get(c.id)!.order !== cand.order) || st.expanded.has(c.id));
  return [...cs, ...productsOf(cand)];
}

/** "Next incomplete": next unreviewed or invalid section on this page; returns false when there is none. */
function nextIncompleteOnPage(): boolean {
  const errors = st.validation?.errors ?? [];
  const entries = pageEntries();
  const at = st.focus ? entries.findIndex((e) => e.id === st.focus!.id) : -1;
  for (let k = Math.max(at, 0); k < entries.length; k++) {
    const e = entries[k];
    const s = nextIncomplete(e, errors, k === at ? st.focus!.section : null);
    if (s) {
      focusSection(e.id, s);
      return true;
    }
  }
  return false;
}

/** N: next incomplete section of this entry, then the next entries, then the next candidate in the filter. */
function nextIncompleteGlobal() {
  if (nextIncompleteOnPage()) return;
  const list = candidates();
  const errors = st.validation?.errors ?? [];
  for (let k = 1; k <= list.length; k++) {
    const i = (st.current + k) % list.length;
    const cand = list[i];
    if (!matchesFilters(cand)) continue;
    const entries: Entry[] = [...tree(cand.parentCompound).map((n) => n.c), ...productsOf(cand)];
    if (entries.some((e) => nextIncomplete(e, errors, null))) {
      st.focus = null;
      go(i);
      nextIncompleteOnPage();
      return;
    }
  }
  toast('No incomplete sections left in this filter.');
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(t.tagName));

window.addEventListener('keydown', (ev) => {
  if (!st.lib) return;
  const ctrl = ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Enter' && (ctrl || !isTyping(ev.target))) {
    if (st.view === 'review') {
      const it = reviewItems()[st.review.index];
      if (it) { ev.preventDefault(); confirmDefault(it.e, it.s); }
    } else if (st.view === 'queue' && st.focus) {
      const e = entryById(st.focus.id);
      if (e) { ev.preventDefault(); confirmDefault(e, st.focus.section); }
    }
  } else if (!ctrl && !ev.altKey && ev.key.toLowerCase() === 'n' && !isTyping(ev.target) && st.view === 'queue') {
    ev.preventDefault();
    nextIncompleteGlobal();
  }
});

const entryById = (id: string): Entry | undefined => compound(id) ?? lib().products.find((p) => p.id === id);

// ---------- main panel ----------

const SOURCES: [string, string, string][] = [
  ['DailyMed (FDA labels, §12.3)', 'https://dailymed.nlm.nih.gov', 'Half-life, metabolism, PM/EM data'],
  ['Drugs@FDA', 'https://www.accessdata.fda.gov/scripts/cder/daf/', 'Approval packages, clinical pharmacology reviews'],
  ['UK eMC (SmPC §5.2)', 'https://www.medicines.org.uk/emc', 'Non-US drugs'],
  ['EMA product information', 'https://www.ema.europa.eu', 'EU SmPC §5.2'],
  ['PubChem', 'https://pubchem.ncbi.nlm.nih.gov', 'Molecular weight'],
  ['DrugBank', 'https://go.drugbank.com', 'Orientation; confirm against primary sources'],
  ['PubMed', 'https://pubmed.ncbi.nlm.nih.gov', 'Primary PK, mass-balance and QT studies'],
  ['FDA substrates/inhibitors table', 'https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems', 'CYP2D6 inhibitor strength'],
  ['Flockhart Table', 'https://drug-interactions.medicine.iu.edu', 'Substrates/inhibitors by isoform'],
  ['ClinPGx (PharmGKB)', 'https://www.clinpgx.org', 'Pharmacogenomic label annotations'],
  ['CPIC', 'https://cpicpgx.org', 'Phenotype exposure changes'],
  ['PharmVar', 'https://www.pharmvar.org', 'CYP2D6 alleles'],
  ['CredibleMeds', 'https://crediblemeds.org', 'QT tier (enter by hand, cite, do not redistribute)'],
  ['ChEMBL', 'https://www.ebi.ac.uk/chembl/', 'hERG activity for qt.weight'],
  ['IUPHAR/BPS Guide to Pharmacology', 'https://www.guidetopharmacology.org', 'Receptor targets and actions'],
  ['PDSP Ki Database', 'https://pdsp.unc.edu', 'Ki values, psychedelics and psychiatric drugs'],
  ['EUDA drug profiles', 'https://www.euda.europa.eu', 'Illicit drugs, street names'],
  ['NPS Discovery (CFSRE)', 'https://www.npsdiscovery.org', 'Novel opioids, benzodiazepines, stimulants'],
];

const SECTIONS: [SectionName | 'metabolism' | 'identity', string, CompoundSection[]][] = [
  ['basics', 'Basics & aliases', ['molecularWeight']],
  ['identity', 'Chemical identity (PubChem)', ['identity']],
  ['kinetics', 'Kinetics', ['halfLife']],
  ['metabolism', 'Metabolite links & fractions', ['metabolism']],
  ['relevance', 'Clinical relevance', ['relevance']],
  ['cyp2d6', 'CYP2D6', ['cyp2d6']],
  ['qt', 'QT', ['qt']],
  ['receptors', 'Receptors', ['receptors']],
  ['lingering', 'Lingering effects & nonlinear kinetics', ['lingeringEffects', 'nonlinearKinetics']],
];

function issuesBox(id: string) {
  const box = h('div', { class: 'ed-issues' });
  const refresh = () => {
    const { errors, warnings } = issuesFor(id);
    box.replaceChildren(
      ...errors.map((e) => h('div', { class: 'warning danger' }, '⛔ ', e.message)),
      ...warnings.map((w) => h('div', { class: 'warning warn' }, '⚠ ', w.message)),
    );
  };
  refresh();
  st.refreshers.push(refresh);
  return box;
}

function verifyToggle(entry: Compound | Product) {
  const cb = h('input', { type: 'checkbox', checked: entry.verified });
  const why = h('span', { class: 'field-hint' });
  const refresh = () => {
    const blockers = verifyBlockers(entry, st.validation?.errors ?? []);
    cb.disabled = !entry.verified && blockers.length > 0;
    why.textContent = entry.verified ? `Verified ${entry.verifiedDate}` : blockers.length ? `To verify: ${blockers.join('; ')}.` : 'Every section reviewed — ready to verify.';
  };
  cb.addEventListener('change', () => {
    entry.verified = cb.checked;
    entry.verifiedDate = cb.checked ? today() : '';
    changed();
    refresh();
  });
  refresh();
  st.refreshers.push(refresh);
  return h('div', { class: 'ed-verify' }, h('label', { class: 'check' }, cb, h('b', null, 'Verify entry')), why);
}

function sourceField(entry: Compound | Product) {
  const ta = h('textarea', { rows: 2, placeholder: 'Main source(s) for this entry — label, section, paper…' }, entry.source);
  ta.addEventListener('input', () => {
    entry.source = ta.value;
    changed();
  });
  return field('Source', ta);
}

function edgeMultiplier(f: Compound['formedFrom'][number], onChange: () => void): HTMLElement {
  const on = h('input', { type: 'checkbox', checked: f.cyp2d6Multiplier !== null });
  const row = h('div', { class: 'row' });
  const render = () => {
    const m = f.cyp2d6Multiplier;
    row.hidden = !m;
    row.replaceChildren(...(m ? [...phenotypeInputs(m, true, onChange), h('div', { class: 'field-hint' }, '0 = not formed in that phenotype (e.g. codeine → morphine in poor metabolisers). Unknown phenotypes are assumed ×1 and labelled.')] : []));
  };
  on.addEventListener('change', () => {
    f.cyp2d6Multiplier = on.checked ? { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 } : null;
    render();
    onChange();
  });
  render();
  return h('div', { class: 'sub' }, h('label', { class: 'check' }, on, 'Formation depends on CYP2D6 (multiplier on the fraction by phenotype)'), row);
}

/** Conditional formation: the link only applies while another compound (e.g. ethanol) is present. */
function edgeCondition(f: Compound['formedFrom'][number], others: Compound[], onChange: () => void): HTMLElement {
  const sel = h('select', null,
    h('option', { value: '' }, 'Always formed'),
    ...others.map((o) => h('option', { value: o.id, selected: f.condition?.requiresCompound === o.id }, `Only while ${o.name} is present`)));
  sel.addEventListener('change', () => {
    if (sel.value) f.condition = { requiresCompound: sel.value };
    else delete f.condition;
    onChange();
  });
  return h('div', { class: 'sub' }, field('Condition', sel,
    'Conditional links are skipped unless the required compound is in the body while the parent is (e.g. cocaine → cocaethylene with alcohol). They never hold up a clear date.'));
}

const REVIEWER_CID_NOTE = 'CID set by reviewer';

/** PubChem identity: drawing and identifiers (read-only; filled by npm run structures:lookup), plus setting a different CID. */
function identitySection(c: Compound): HTMLElement {
  const box = h('div', { class: 'ed-identity' });
  const render = () => {
    const id = c.identity;
    const lookupCmd = `npm run structures:lookup -- --id ${c.id}`;
    const setCid = (cid: number) => {
      c.identity = { pubchemCid: cid, smiles: null, inchiKey: null, formula: null, confidence: 'unconfirmed', candidates: id?.candidates ?? [], note: `${REVIEWER_CID_NOTE} — run ${lookupCmd}, then npm run structures:render.` };
      c.provenance.identity = null;
      changed();
      render();
    };
    const cidInput = h('input', { type: 'number', min: '1', step: '1', placeholder: 'PubChem CID', style: 'width:9em' });
    const kv = (k: string, v: Node | string | null) => h('div', null, h('b', null, `${k}: `), v ?? h('span', { class: 'field-hint' }, '—'));
    const pubchem = (cid: number) => h('a', { href: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`, target: '_blank', rel: 'noopener noreferrer' }, `CID ${cid}`);
    const drawn = id && (id.confidence === 'confirmed' || id.confidence === 'probable') && id.smiles;
    box.replaceChildren(
      !id ? h('p', { class: 'field-hint' }, 'Not looked up yet — run npm run structures:lookup.') : h('div', { class: 'ed-identity-grid' },
        drawn ? h('img', { src: `/structures/${encodeURIComponent(c.id)}.svg?v=${encodeURIComponent(id.inchiKey ?? '')}`, alt: `Chemical structure of ${c.name}`, class: 'ed-structure' }) : null,
        h('div', null,
          kv('Confidence', badge(id.confidence, id.confidence === 'confirmed' ? 'ok' : id.confidence === 'not-applicable' ? 'muted' : 'warn')),
          kv('CID', id.pubchemCid ? pubchem(id.pubchemCid) : null),
          kv('Formula', id.formula),
          kv('InChIKey', id.inchiKey ? h('code', null, id.inchiKey) : null),
          kv('SMILES', id.smiles ? h('code', { style: 'word-break:break-all' }, id.smiles) : null),
          id.note ? kv('Note', id.note) : null,
          id.candidates.length ? h('div', null, h('b', null, 'Candidates:'), h('ul', null, id.candidates.map((x) => h('li', null,
            pubchem(x.cid), x.name ? ` ${x.name}` : '', h('span', { class: 'field-hint' }, ` — ${x.reason} `),
            h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => setCid(x.cid) }, 'Use this CID'))))) : null)),
      h('div', { class: 'row' },
        field('Set a different CID', cidInput),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: () => {
          const n = Number(cidInput.value);
          if (!Number.isInteger(n) || n < 1) return toast('Enter a PubChem CID (a positive whole number).');
          setCid(n);
        } }, 'Set CID')),
      h('p', { class: 'field-hint' }, 'Confirm (review bar) accepts the drawing and identifiers. After setting a CID, save, then run ',
        h('code', null, lookupCmd), ' and ', h('code', null, 'npm run structures:render'), ' and reload; the entry comes back as probable for you to confirm.'));
  };
  render();
  return box;
}

function metabolismSection(c: Compound): HTMLElement {
  const edit = () => touched(c, 'metabolism');
  const others = lib().compounds.filter((x) => x.id !== c.id).sort((a, b) => a.name.localeCompare(b.name));
  const outgoing = childrenOf(c.id).map((ch) => ch.formedFrom.find((f) => f.compound === c.id)?.fraction ?? null);
  const outSum = outgoing.reduce<number>((s, f) => s + (f ?? 0), 0);
  const unknownOut = outgoing.filter((f) => f === null).length;
  const linkSel = h('select', null, h('option', { value: '' }, '+ Add “formed from” link…'), ...others.map((o) => h('option', { value: o.id }, o.name)));
  linkSel.addEventListener('change', () => {
    if (!linkSel.value) return;
    c.formedFrom.push({ compound: linkSel.value, fraction: null, cyp2d6Multiplier: null });
    c.isMetabolite = true;
    edit();
    renderMain();
  });
  const newMet = textInput('', () => {}, { placeholder: 'New metabolite name' });
  const addMet = () => {
    const name = newMet.value.trim();
    if (!name) return;
    let id = slug(name);
    const existing = compound(id);
    if (existing) {
      if (!existing.formedFrom.some((f) => f.compound === c.id)) existing.formedFrom.push({ compound: c.id, fraction: null, cyp2d6Multiplier: null });
      existing.isMetabolite = true;
      toast(`Linked existing compound ${existing.name}`);
    } else {
      if (!id) id = `metabolite_${Date.now()}`;
      lib().compounds.push({ ...emptyCompound(id, name), isMetabolite: true, formedFrom: [{ compound: c.id, fraction: null, cyp2d6Multiplier: null }] });
    }
    edit();
    renderMain();
  };
  return h('div', { class: 'form-section' },
    h('div', { class: 'field-hint' }, 'Fraction = share of the source compound’s elimination that forms this compound. Unknown → the curve is shown as timing only (% of own peak).'),
    c.formedFrom.length
      ? c.formedFrom.map((f, i) =>
          h('div', { class: 'ed-edge' },
            h('div', { class: 'row ed-link' },
              h('span', { class: 'ed-link-name' }, 'formed from ', h('b', null, compound(f.compound)?.name ?? f.compound)),
              field('fraction', nullableNumber(f.fraction, (v) => { f.fraction = v; edit(); }, { min: '0', max: '1', step: '0.01' })),
              h('button', { class: 'icon-btn', type: 'button', title: 'Remove link', onclick: () => {
                c.formedFrom.splice(i, 1);
                if (!c.formedFrom.length) c.isMetabolite = false;
                edit();
                renderMain();
              } }, '✕')),
            edgeMultiplier(f, edit),
            edgeCondition(f, others, edit)))
      : h('div', { class: 'field-hint' }, 'Not formed from any tracked compound.'),
    linkSel,
    h('div', { class: `field-hint ${outSum > 1 + 1e-9 ? 'bad' : ''}` },
      `Known fractions formed from ${c.name}: Σ = ${outSum.toFixed(3)} (must be ≤ 1)${unknownOut ? ` · ${unknownOut} unknown` : ''}`),
    h('div', { class: 'row' }, newMet, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: addMet }, `+ Add metabolite of ${c.name}`)),
    sourceNoteField(c, 'metabolism'));
}

function sourceNoteField(e: Compound | Product, key: string) {
  const ta = h('textarea', { rows: 2, class: 'source-note', placeholder: 'Source note ([checked] / [recall] / [estimate] / [gap] …)' }, e.sourceNotes[key] ?? '');
  ta.addEventListener('input', () => {
    e.sourceNotes[key] = ta.value;
    changed();
  });
  return field('Source note', ta);
}

const compoundStatus = (c: Compound): Status => (c.verified ? 'verified' : compoundHasData(c) ? 'draft' : 'not-started');

function compoundCard(node: { c: Compound; depth: number; via: string | null }, cand: Candidate): HTMLElement {
  const { c, depth } = node;
  const own = owner(c.id);
  const sharedWith = candidates().filter((x) => x.order !== cand.order && tree(x.parentCompound).some((n) => n.c.id === c.id));
  const verifiedElsewhere = c.verified && own && own.order !== cand.order;
  const open = !verifiedElsewhere || st.expanded.has(c.id);
  const head = h('div', { class: 'ed-card-head' },
    h('span', { class: `st-dot st-${compoundStatus(c)}` }),
    h('span', { class: 'ed-card-title' }, depth ? '↳ ' : '', c.name),
    h('code', null, c.id),
    depth ? badge(`metabolite · L${depth}`, 'muted') : badge('parent', 'muted'),
    badge(c.kinetics.mode, c.kinetics.mode === 'unknown' ? 'warn' : 'muted'),
    hasAutoNote(c) ? badge('auto-assumption', 'warn') : null,
    sharedWith.length ? h('span', { class: 'field-hint', title: sharedWith.map((x) => x.name).join(', ') }, ` shared with ${sharedWith.length} other candidate(s)`) : null,
    verifiedElsewhere ? h('span', { class: 'ed-via' }, `✓ verified via ${own!.name}`) : null,
    h('span', { class: 'spacer' }),
    verifiedElsewhere ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { st.expanded.has(c.id) ? st.expanded.delete(c.id) : st.expanded.add(c.id); renderMain(); } }, open ? 'Collapse' : 'Expand') : null,
    depth && node.via
      ? h('button', { class: 'icon-btn', type: 'button', title: `Remove from ${compound(node.via)?.name}'s metabolites`, onclick: () => removeMetabolite(c, node.via!) }, '✕')
      : null);
  const card = h('section', { class: `ed-card glass ${verifiedElsewhere && !open ? 'collapsed' : ''}`, id: `card-${c.id}`, style: `margin-left:${depth * 22}px` }, head);
  if (!open) return card;
  const notes = st.queue!.compounds.find((x) => x.id === c.id)?.notes;
  if (notes?.length) card.append(h('div', { class: 'ed-note' }, ...notes.map((n) => h('div', null, 'ℹ ', n))));
  card.append(
    ...SECTIONS.filter(([s]) => s !== 'relevance' || c.isMetabolite).map(([s, label, provKeys]) =>
      sectionDetails(c, label, provKeys, s === 'kinetics' || s === 'basics' || s === 'metabolism' || s === 'relevance',
        s === 'metabolism' ? metabolismSection(c) : s === 'identity' ? identitySection(c) : compoundSection(c, s, { sourceNotes: true, onChange: (sec) => touched(c, sec) }))),
    sourceField(c),
    issuesBox(c.id),
    verifyToggle(c),
  );
  return card;
}

/** A collapsible section: fields, provenance chips, and a review bar per provenance section. */
function sectionDetails(e: Entry, label: string, sections: Section[], open: boolean, body: Node): HTMLElement {
  const dots = sections.map((s) => h('span', { class: `rv-dot rv-${reviewState(e, s).cls}`, title: `${SECTION_LABEL[s]}: ${reviewState(e, s).text}` }));
  const det = h('details', { class: 'ed-sec', open: open || sections.some((s) => st.focus?.id === e.id && st.focus.section === s) },
    h('summary', null, ...dots, label, h('span', { class: 'prov-chips' }, ...sections.map((k) => provChip(e, k)))),
    body,
    ...sections.map((s) => {
      const bar = reviewBar(e, s);
      bar.id = `sec-${e.id}-${s}`;
      return bar;
    }));
  det.addEventListener('focusin', () => {
    st.focus = { id: e.id, section: sections.find((s) => !isReviewed(e, s)) ?? sections[0] };
  });
  return det;
}

function removeMetabolite(c: Compound, fromId: string) {
  c.formedFrom = c.formedFrom.filter((f) => f.compound !== fromId);
  if (!c.formedFrom.length) {
    c.isMetabolite = false;
    const usedByProduct = lib().products.some((p) => p.components.some((x) => x.compound === c.id));
    const isCandidate = st.queue!.candidates.some((x) => x.parentCompound === c.id);
    const hasKids = childrenOf(c.id).length > 0;
    if (!usedByProduct && !isCandidate && !hasKids && confirm(`${c.name} is no longer linked to anything. Delete it from drugs.json?`))
      st.lib!.compounds = lib().compounds.filter((x) => x.id !== c.id);
  }
  changed();
  renderMain();
}

const productStatus = (p: Product): Status =>
  p.verified ? 'verified' : p.typicalDose.amount !== null || p.class || Object.values(p.provenance).some((v) => v && v !== 'gap') ? 'draft' : 'not-started';

function componentsEditor(p: Product, edit: () => void): HTMLElement {
  const wrap = h('div', { class: 'ed-components' });
  const compounds = [...lib().compounds].sort((a, b) => a.name.localeCompare(b.name));
  const render = () => {
    wrap.replaceChildren(
      ...p.components.map((c, i) =>
        h('div', { class: 'row ed-component' },
          field(i === 0 ? 'Primary compound' : 'Compound', select(c.compound, compounds.map((x) => [x.id, x.name] as [string, string]), (v) => { c.compound = v; edit(); })),
          field('Ratio', h('input', { type: 'number', step: 'any', min: '0', value: String(c.ratio), oninput: (e: Event) => { c.ratio = Number((e.target as HTMLInputElement).value) || 0; edit(); } })),
          field('Salt factor', nullableNumber(c.saltFactor, (v) => { c.saltFactor = v; edit(); }, { min: '0', max: '1', step: '0.01' })),
          field('Bioavailability', nullableNumber(c.bioavailability, (v) => { c.bioavailability = v; edit(); }, { min: '0', max: '1', step: '0.05' })),
          p.components.length > 1
            ? h('button', { class: 'icon-btn', type: 'button', title: 'Remove component', onclick: () => { p.components.splice(i, 1); edit(); render(); } }, '✕')
            : null)),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
        p.components.push({ compound: compounds[0]?.id ?? '', ratio: 1, saltFactor: null, bioavailability: null });
        edit();
        render();
      } }, '+ Add component (combination product)'),
      h('div', { class: 'field-hint' }, 'A dose D delivers D × ratio × salt factor × bioavailability of each component. The first is the primary one (the dose amount refers to it). Unknown salt factor = free base; unknown bioavailability = amounts shown as administered.'),
    );
  };
  render();
  return wrap;
}

/** Prodrug conversion per component: administered compound and molar mass factor (spec v2.2 §1). */
function conversionEditor(p: Product, edit: () => void): HTMLElement {
  const wrap = h('div', { class: 'ed-components' });
  const compounds = [...lib().compounds].sort((a, b) => a.name.localeCompare(b.name));
  const render = () => {
    wrap.replaceChildren(
      ...p.components.map((c) => {
        const modelled = compound(c.compound);
        const given = c.administeredAs ? compound(c.administeredAs) : undefined;
        const mwM = modelled?.molecularWeight ?? null;
        const mwA = given?.molecularWeight ?? null;
        const helper = mwM && mwA
          ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', title: `${mwM} / ${mwA} g/mol`, onclick: () => {
            c.massFactor = +(mwM / mwA).toFixed(4);
            edit();
            render();
          } }, `Use molar masses (${(mwM / mwA).toFixed(4)})`)
          : h('span', { class: 'field-hint' }, c.administeredAs ? 'Set both molecular weights to compute the factor.' : '');
        return h('div', { class: 'row ed-component' },
          field(`Administered as (modelled: ${modelled?.name ?? c.compound})`, select(c.administeredAs ?? '', [['', '— (not a prodrug)'], ...compounds.filter((x) => x.id !== c.compound).map((x) => [x.id, x.name] as [string, string])], (v) => {
            if (v) c.administeredAs = v;
            else delete c.administeredAs;
            edit();
            render();
          })),
          field('Mass factor', nullableNumber(c.massFactor ?? null, (v) => {
            if (v === null) delete c.massFactor;
            else c.massFactor = v;
            edit();
          }, { min: '0', max: '2', step: '0.0001' })),
          helper);
      }),
      h('div', { class: 'field-hint' }, 'Prodrugs converted almost completely to another compound (psilocybin → psilocin). The dose is entered as the administered compound; the modelled compound receives D × ratio × salt factor × mass factor × bioavailability. Mass factor = modelled molar mass ÷ administered molar mass (complete conversion).'),
    );
  };
  render();
  return wrap;
}

function inputEditor(p: Product, edit: () => void): HTMLElement {
  const body = h('div', { class: 'sub' });
  const render = () => {
    const inp = p.input;
    body.replaceChildren();
    if (inp.type === 'first-order-release')
      body.append(rangeInputs(() => inp.releaseHalfLifeHours, (r) => (inp.releaseHalfLifeHours = r), edit, 'Release half-life (absorption from depot / ER tablet)'));
    else if (inp.type === 'zero-order')
      body.append(
        field('Default wear / infusion time (hours)', nullableNumber(inp.defaultDurationHours, (v) => { inp.defaultDurationHours = v; edit(); }, { min: '0' })),
        rangeInputs(() => inp.releaseHalfLifeHours, (r) => (inp.releaseHalfLifeHours = r), edit, 'Skin-depot half-life after removal (optional)'));
  };
  render();
  return h('div', null,
    h('div', { class: 'row' },
      field('Input model', select(p.input.type, INPUT_TYPES.map((t) => [t, t === 'bolus' ? 'bolus (immediate)' : t === 'first-order-release' ? 'first-order release (depot / ER)' : 'zero-order (patch / infusion)'] as [string, string]), (v) => {
        p.input.type = v as InputType;
        if (p.input.type === 'bolus') p.input.releaseHalfLifeHours = null;
        if (p.input.type !== 'zero-order') p.input.defaultDurationHours = null;
        else p.input.defaultDurationHours ??= 72;
        if (p.input.type === 'first-order-release') p.input.releaseHalfLifeHours ??= emptyRange();
        edit();
        render();
      })),
      field('Dose unit', select(p.doseUnit, DOSE_UNITS, (v) => { p.doseUnit = v; edit(); })),
      field('Formulation', select(p.formulation ?? '', [['', '—'], ...FORMULATIONS.map((f) => [f, f] as [string, string])], (v) => { p.formulation = (v || null) as Formulation | null; edit(); }))),
    body);
}

function productCard(p: Product): HTMLElement {
  const cats = lib().categories;
  const secondary = h('div', { class: 'chips ed-secondary' }, ...cats.filter((c) => c.id !== p.category).map((c) =>
    h('button', {
      type: 'button', class: `chip ${p.secondaryCategories.includes(c.id) ? 'on' : ''}`, style: `--c:${categoryColor(c.id)}`,
      onclick: (e: Event) => {
        p.secondaryCategories = p.secondaryCategories.includes(c.id) ? p.secondaryCategories.filter((x) => x !== c.id) : [...p.secondaryCategories, c.id];
        (e.currentTarget as HTMLElement).classList.toggle('on');
        changed();
      },
    }, c.name.split(/[ ,&]/)[0])));
  const block = (key: ProductSection) => sectionDetails(p, SECTION_LABEL[key], [key], true, productSectionBody(p, key));
  const isCombo = p.components.length > 1;
  return h('section', { class: 'ed-card glass', id: `card-${p.id}` },
    h('div', { class: 'ed-card-head' },
      h('span', { class: `st-dot st-${productStatus(p)}` }),
      h('span', { class: 'ed-card-title' }, p.name), h('code', null, p.id),
      isCombo ? badge('combination', 'muted') : null,
      p.formulation ? badge(p.formulation, 'muted') : null,
      hasAutoNote(p) ? badge('auto-assumption', 'warn') : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'icon-btn', type: 'button', title: 'Remove product', onclick: () => {
        if (!confirm(`Remove product ${p.name}?`)) return;
        st.lib!.products = lib().products.filter((x) => x.id !== p.id);
        changed();
        renderMain();
      } }, '✕')),
    h('div', { class: 'form-section' },
      h('div', { class: 'row' },
        field('Name', textInput(p.name, (v) => { p.name = v; changed(); })),
        field('Route', textInput(p.route, (v) => { p.route = v; changed(); }))),
      h('div', { class: 'row' },
        field('Category', select(p.category, cats.map((c) => [c.id, c.name] as [string, string]), (v) => { p.category = v; changed(); renderMain(); })),
        field('Candidate', textInput(p.candidateId, (v) => { p.candidateId = v.trim(); changed(); }), 'Groups this product in the queue.')),
      field('Also list under', secondary)),
    ...PRODUCT_SECTIONS.map(block),
    sourceField(p),
    issuesBox(p.id),
    verifyToggle(p));
}

function productSectionBody(p: Product, key: ProductSection): HTMLElement {
  const sec = () => touched(p, key);
  const body = (...xs: (Node | null)[]) => h('div', { class: 'form-section' }, ...xs.filter((x): x is Node => x !== null));
  switch (key) {
    case 'class':
      return body(field('Class', textInput(p.class, (v) => { p.class = v; sec(); }, { placeholder: 'e.g. opioid partial agonist' })), sourceNoteField(p, 'class'));
    case 'aliases':
      return body(field('Aliases', textInput(p.aliases.join(', '), (v) => { p.aliases = v.split(',').map((s) => s.trim()).filter(Boolean); sec(); })), sourceNoteField(p, 'aliases'));
    case 'components':
      return body(componentsEditor(p, sec), sourceNoteField(p, 'components'));
    case 'conversion':
      return body(conversionEditor(p, sec), sourceNoteField(p, 'conversion'));
    case 'input':
      return body(inputEditor(p, sec), sourceNoteField(p, 'input'));
    case 'typicalDose':
      return body(
        h('div', { class: 'row' },
          field('Amount', nullableNumber(p.typicalDose.amount, (v) => { p.typicalDose.amount = v; sec(); }, { min: '0' })),
          field('Unit', select(p.typicalDose.unit, DOSE_UNITS, (v) => { p.typicalDose.unit = v; sec(); })),
          field('Basis', select(p.typicalDose.basis, DOSE_BASES, (v) => { p.typicalDose.basis = v; sec(); }))),
        h('div', { class: 'field-hint' }, 'Display and dose-form placeholder only (label §2 / SmPC 4.2). Unknown for illicit or recreational substances.'),
        sourceNoteField(p, 'typicalDose'));
  }
}

function renderMain() {
  st.refreshers = [];
  chipRefreshers.clear();
  if (!st.lib || !st.queue) return;
  if (st.view === 'priority') return renderPriority();
  if (st.view === 'review') return renderReview();
  if (st.view === 'qt') return renderQt();
  const list = candidates();
  const cand = list[st.current];
  const status = statusOf(cand);
  const cat = st.queue.categories.find((c) => c.id === cand.category);
  const nodes = tree(cand.parentCompound);
  const extraCompounds = productsOf(cand).flatMap((p) => p.components.slice(1).map((x) => x.compound)).filter((id) => !nodes.some((n) => n.c.id === id));
  const newRoute = textInput('', () => {}, { placeholder: 'New route, e.g. IM depot' });
  main.replaceChildren(
    h('div', { class: 'ed-nav' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => step(-1) }, '← Previous'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => step(1), title: 'Leave this one for later' }, 'Skip'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => step(1) }, 'Next →'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: nextIncompleteGlobal, title: 'Next unreviewed or invalid section (N). Enter confirms the highlighted section.' }, 'Next incomplete (N)'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'field-hint' }, `#${cand.order} of ${list.length}`)),
    h('div', { class: 'ed-cand-head' },
      h('h1', null, cand.name),
      h('span', { class: 'cat-tag', style: `--c:${categoryColor(cand.category)}` }, cat?.name ?? cand.category),
      h('span', { class: `ed-status st-${status}` }, STATUS_LABEL[status]),
      ...[...flagsOf(cand)].map((f) => badge(FLAG_LABEL[f], 'warn')),
      cand.aliases.length ? h('div', { class: 'field-hint' }, 'Aliases: ', cand.aliases.join(', ')) : null),
    h('div', { class: 'ed-refs glass' },
      cand.reviewHints ? h('div', null, h('b', null, 'Review hints: '), cand.reviewHints) : null,
      cand.untrackedMetabolites.length ? h('div', null, h('b', null, 'Untracked metabolites: '), cand.untrackedMetabolites.join('; ')) : null,
      h('div', null, h('b', null, 'Routes in queue: '), cand.routes.join(', ')),
      extraCompounds.length ? h('div', null, h('b', null, 'Also delivered by combination products: '), extraCompounds.map((id) => compound(id)?.name ?? id).join(', '), ' (edit them under their own candidate)') : null,
      h('details', { class: 'ed-sources' }, h('summary', null, 'Data sources'),
        h('div', { class: 'ed-source-list' }, ...SOURCES.map(([n, url, what]) =>
          h('div', null, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, n), h('span', { class: 'field-hint' }, ` — ${what}`)))),
        h('div', { class: 'field-hint' }, 'Field-by-field guidance: docs/ClearDate_Data_Sources.pdf'))),
    h('h2', { class: 'ed-h2' }, 'Compounds'),
    ...(nodes.length ? nodes.map((n) => compoundCard(n, cand)) : [h('div', { class: 'warning danger' }, `Parent compound ${cand.parentCompound} is missing from drugs.json.`)]),
    h('h2', { class: 'ed-h2' }, 'Products'),
    ...productsOf(cand).map(productCard),
    h('div', { class: 'row ed-addroute' }, newRoute, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
      const route = newRoute.value.trim();
      if (!route) return;
      const id = productId(cand.parentCompound, route);
      if (lib().products.some((p) => p.id === id)) return toast(`Product ${id} already exists`);
      const p = applyInputRule({ ...emptyProduct(id, `${cand.name} (${route})`, cand.parentCompound, route, cand.category), candidateId: cand.id, aliases: [...cand.aliases] });
      p.typicalDose.unit = p.doseUnit;
      lib().products.push(p);
      changed();
      renderMain();
    } }, '+ Add route')),
  );
}

// ---------- review mode ----------

interface ReviewItem { key: string; e: Entry; s: Section; cand: Candidate }

const SECTION_ORDER: Section[] = [...COMPOUND_SECTIONS, ...PRODUCT_SECTIONS];

/** Unreviewed sections in the current filter (sidebar filters + review-mode filters), each entry once. */
function reviewItems(): ReviewItem[] {
  const f = st.review;
  const prio = f.priorityOnly ? new Set(priorityRows().map((r) => r.id)) : null;
  const seen = new Set<string>();
  const out: ReviewItem[] = [];
  for (const cand of candidates()) {
    if (!matchesFilters(cand) || (f.category && cand.category !== f.category)) continue;
    const entries: Entry[] = [...tree(cand.parentCompound).map((n) => n.c), ...productsOf(cand)];
    for (const e of entries) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (prio && !prio.has(e.id)) continue;
      for (const s of sectionsOf(e)) {
        if (isReviewed(e, s) || (f.section && s !== f.section)) continue;
        if (f.tag && ((e.provenance as Record<string, string | null>)[s] ?? 'untagged') !== f.tag) continue;
        if (f.flaggedOnly && !isFlagged(e, s)) continue;
        out.push({ key: `${e.id}:${s}`, e, s, cand });
      }
    }
  }
  if (f.byType) {
    const rank = new Map(out.map((it, i) => [it.key, i]));
    out.sort((a, b) => SECTION_ORDER.indexOf(a.s) - SECTION_ORDER.indexOf(b.s) || rank.get(a.key)! - rank.get(b.key)!);
  }
  return out;
}

const sectionNameFor: Partial<Record<Section, SectionName>> = {
  halfLife: 'kinetics', relevance: 'relevance', molecularWeight: 'basics', cyp2d6: 'cyp2d6', qt: 'qt', receptors: 'receptors',
  lingeringEffects: 'lingering', nonlinearKinetics: 'lingering',
};

function reviewBody(it: ReviewItem): HTMLElement {
  const { e, s } = it;
  if (!isCompound(e)) return productSectionBody(e, s as ProductSection);
  if (s === 'metabolism') return metabolismSection(e);
  if (s === 'identity') return identitySection(e);
  return compoundSection(e, sectionNameFor[s]!, { sourceNotes: true, onChange: (sec) => touched(e, sec) });
}

/** Related data that helps judge a section. */
function reviewContext(it: ReviewItem): (Node | null)[] {
  const { e, s } = it;
  const hl = (c: Compound) => (c.kinetics.mode === 'intrinsic' ? formatRange(c.kinetics.halfLifeHours) : c.kinetics.mode);
  if (!isCompound(e)) {
    const c = compound(e.components[0]?.compound ?? '');
    return [c ? h('div', null, h('b', null, `${c.name} half-life: `), hl(c)) : null];
  }
  const out: (Node | null)[] = [];
  if (e.isMetabolite && (s === 'halfLife' || s === 'metabolism' || s === 'relevance'))
    for (const f of e.formedFrom) {
      const p = compound(f.compound);
      if (p) out.push(h('div', null, h('b', null, `Parent ${p.name}: `), `half-life ${hl(p)} · fraction to ${e.name}: ${f.fraction ?? 'unknown'}`));
    }
  if (s === 'relevance' || s === 'halfLife') {
    const kids = childrenOf(e.id);
    if (kids.length) out.push(h('div', null, h('b', null, 'Metabolites: '), kids.map((k) => k.name).join(', ')));
  }
  if (s === 'qt' || s === 'cyp2d6')
    out.push(
      h('div', null, h('b', null, 'Half-life: '), hl(e), e.molecularWeight ? ` · MW ${e.molecularWeight}` : ''),
      h('div', null, h('b', null, 'CYP2D6: '), `substrate ${e.cyp2d6.substrate}, inhibitor ${e.cyp2d6.inhibitor}`),
      e.receptors.length ? h('div', null, h('b', null, 'Receptors: '), e.receptors.map((r) => `${r.target} (${r.action})`).join(', ')) : null);
  return out;
}

function renderReview() {
  st.refreshers = [];
  chipRefreshers.clear();
  const r = st.review;
  const items = reviewItems();
  let idx = items.findIndex((it) => it.key === r.key);
  if (idx < 0) idx = Math.min(r.index, items.length - 1);
  r.index = Math.max(idx, 0);
  const it = items[r.index];
  r.key = it?.key ?? '';
  const rerender = () => { r.key = ''; r.index = 0; r.history = []; renderReview(); };
  const opt = <T extends string>(value: T, options: [T | '', string][], set: (v: T | '') => void) =>
    select(value, options as [string, string][], (v) => { set(v as T | ''); rerender(); });
  const check = (label: string, on: boolean, set: (v: boolean) => void) =>
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: on, onchange: (ev: Event) => { set((ev.target as HTMLInputElement).checked); rerender(); } }), label);
  const controls = h('div', { class: 'row rv-filters' },
    field('Category', opt(r.category, [['', 'All categories'], ...st.queue!.categories.map((c) => [c.id, c.name] as [string, string])], (v) => (r.category = v))),
    field('Section', opt(r.section, [['', 'All sections'], ...SECTION_ORDER.map((s) => [s, SECTION_LABEL[s]] as [Section, string])], (v) => (r.section = v))),
    field('Provenance', opt(r.tag, [['', 'Any'], ...PROVENANCE_TAGS.filter((t) => t !== 'reviewer').map((t) => [t, t] as [string, string]), ['untagged', 'untagged']], (v) => (r.tag = v))),
    h('div', { class: 'rv-checks' },
      check('Flagged only', r.flaggedOnly, (v) => (r.flaggedOnly = v)),
      check('Priority list only', r.priorityOnly, (v) => (r.priorityOnly = v)),
      check('Step by section type', r.byType, (v) => (r.byType = v))));
  const scope = st.filter.size || st.flags.size || st.query ? ' (sidebar filters apply)' : '';
  if (!it) {
    main.replaceChildren(
      h('div', { class: 'ed-cand-head' }, h('h1', null, 'Review mode')), controls,
      h('div', { class: 'ed-empty glass' }, h('h2', null, 'Nothing to review'), h('p', null, `No unreviewed sections in this filter${scope}.`)));
    return;
  }
  const { e, s, cand } = it;
  const cat = st.queue!.categories.find((c) => c.id === cand.category);
  const note = (e.sourceNotes as Record<string, string>)[s] ?? '';
  const issues = sectionIssues([...(st.validation?.errors ?? []), ...(st.validation?.warnings ?? [])], e, s);
  const unknown = unknownParts(e, s);
  const errs = sectionIssues(st.validation?.errors ?? [], e, s);
  const move = (to: number) => {
    if (to > r.index) r.history.push(r.key);
    r.index = to;
    r.key = '';
    renderReview();
  };
  const ctx = reviewContext(it).filter(Boolean);
  main.replaceChildren(
    h('div', { class: 'ed-nav' },
      h('button', { class: 'btn btn-ghost', type: 'button', disabled: !r.history.length && r.index === 0, onclick: () => {
        const back = r.history.pop();
        const i = back ? items.findIndex((x) => x.key === back) : -1;
        if (i >= 0) { r.key = back!; r.index = i; renderReview(); } else move(Math.max(0, r.index - 1));
      } }, '← Back'),
      h('button', { class: 'btn btn-ghost', type: 'button', disabled: r.index >= items.length - 1, onclick: () => move(r.index + 1) }, 'Skip'),
      h('span', { class: 'spacer' }),
      h('span', { class: 'rv-count' }, `Section ${r.index + 1} of ${items.length} in this filter${scope}`)),
    h('div', { class: 'ed-cand-head' }, h('h1', null, 'Review mode')),
    controls,
    h('section', { class: 'ed-card glass rv-card' },
      h('div', { class: 'ed-card-head' },
        h('span', { class: 'ed-card-title' }, e.name), h('code', null, e.id),
        badge(isCompound(e) ? (e.isMetabolite ? 'metabolite' : 'parent compound') : 'product', 'muted'),
        h('span', { class: 'cat-tag', style: `--c:${categoryColor(cand.category)}` }, cat?.name ?? cand.category),
        h('span', { class: 'field-hint' }, `in ${cand.name} #${cand.order}`),
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
          st.view = 'queue';
          st.scrollTo = e.id;
          if (isCompound(e)) st.expanded.add(e.id);
          st.focus = { id: e.id, section: s };
          renderTop();
          go(candidates().indexOf(cand));
          focusSection(e.id, s);
        } }, 'Open entry')),
      h('div', { class: 'rv-section-head' }, h('b', null, SECTION_LABEL[s]), provChip(e, s), h('span', { class: `rv-state rv-${reviewState(e, s).cls}` }, reviewState(e, s).text)),
      note ? h('div', { class: 'rv-note' }, h('b', null, 'Source note: '), ...linkify(note)) : h('div', { class: 'field-hint' }, 'No source note.'),
      ctx.length ? h('div', { class: 'ed-refs rv-context' }, ...ctx) : null,
      reviewBody(it),
      issues.length ? h('div', { class: 'ed-issues' }, ...issues.map((i) => h('div', { class: `warning ${errs.includes(i) ? 'danger' : 'warn'}` }, errs.includes(i) ? '⛔ ' : '⚠ ', i.message))) : null,
      h('div', { class: 'rv-actions' },
        unknown.length ? h('span', { class: 'field-hint' }, `Unknown: ${unknown.join(', ')}`) : null,
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => flagAction(e, s) }, 'Flag'),
        NA_SECTIONS.includes(s) ? h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => naAction(e, s) }, 'N/A') : null,
        h('button', { class: 'btn btn-primary', type: 'button', disabled: errs.length > 0, title: 'Enter', onclick: () => confirmDefault(e, s) },
          unknown.length ? 'Confirm as unknown' : 'Confirm'))),
    h('p', { class: 'field-hint' }, 'Editing a field marks the section reviewed. Enter (outside a text field) or Ctrl+Enter confirms; Skip leaves it for later.'),
  );
}

// ---------- QT calibration ----------

const TIER_RANK: Record<QtTier, number> = { known: 0, possible: 1, conditional: 2, unassessed: 3, none: 4 };
const DEFAULT_QT_NOTE = 'Weight 1.0 = a reference-strength QT effect (e.g. a known-risk drug at its usual therapeutic exposure) when the body holds the reference amount. Contributions scale linearly: weight × amount ÷ reference amount.';

function renderQt() {
  st.refreshers = [];
  chipRefreshers.clear();
  const q = st.qt;
  const own = ownerMap();
  const catName = new Map(st.queue!.categories.map((c) => [c.id, c.name]));
  const catOf = (c: Compound) => own.get(c.id)?.category ?? '';
  const rows = lib().compounds
    .filter((c) => c.qt.tier !== 'none' && (!q.tier || c.qt.tier === q.tier) && (!q.category || catOf(c) === q.category))
    .sort((a, b) => {
      const v = q.key === 'name' ? a.name.localeCompare(b.name)
        : q.key === 'category' ? (catName.get(catOf(a)) ?? '').localeCompare(catName.get(catOf(b)) ?? '') || a.name.localeCompare(b.name)
        : q.key === 'weight' ? (b.qt.weight ?? -1) - (a.qt.weight ?? -1)
        : TIER_RANK[a.qt.tier] - TIER_RANK[b.qt.tier] || a.name.localeCompare(b.name);
      return v * q.dir;
    });
  const th = (key: typeof q.key, label: string) =>
    h('th', { class: 'sortable', onclick: () => { q.dir = q.key === key ? -q.dir : 1; q.key = key; renderQt(); } }, label, q.key === key ? (q.dir > 0 ? ' ▴' : ' ▾') : '');
  const noteBox = h('textarea', { rows: 2, placeholder: DEFAULT_QT_NOTE }, lib().qtCalibrationNote ?? '');
  noteBox.addEventListener('input', () => {
    const v = noteBox.value.trim();
    if (v) lib().qtCalibrationNote = noteBox.value;
    else delete lib().qtCalibrationNote;
    changed();
  });

  const preview = h('div', { class: 'qt-preview' });
  const calibrated = lib().compounds.filter((c) => c.qt.tier !== 'none' && c.qt.weight && c.qt.referenceAmountMg).sort((a, b) => a.name.localeCompare(b.name));
  const renderPreview = () => {
    const parts = q.preview.map((p) => {
      const c = calibrated.find((x) => x.id === p.id);
      return { c, mg: p.mg, load: c ? (c.qt.weight! * p.mg) / c.qt.referenceAmountMg! : 0 };
    });
    const max = Math.max(1, ...parts.map((x) => x.load));
    preview.replaceChildren(
      ...q.preview.map((p, i) => h('div', { class: 'row qt-prev-row' },
        select(p.id, [['', '— compound —'], ...calibrated.map((c) => [c.id, `${c.name} (w ${c.qt.weight}, ref ${c.qt.referenceAmountMg} mg)`] as [string, string])], (v) => { p.id = v; renderPreview(); }),
        h('input', { type: 'number', min: '0', step: 'any', value: String(p.mg), oninput: (ev: Event) => { p.mg = Number((ev.target as HTMLInputElement).value) || 0; renderPreview(); } }),
        h('span', { class: 'field-hint' }, 'mg in body'),
        h('span', { class: 'qt-bar' }, h('span', { style: `width:${(100 * parts[i].load) / max}%` })),
        h('span', { class: 'qt-load' }, parts[i].c ? parts[i].load.toFixed(2) : '—'))),
      h('div', { class: 'field-hint' }, `Summed relative load: ${parts.reduce((a, x) => a + x.load, 0).toFixed(2)}`));
  };
  renderPreview();

  main.replaceChildren(
    h('div', { class: 'ed-cand-head' }, h('h1', null, 'QT calibration'), h('span', { class: 'field-hint' }, `${rows.length} compounds`)),
    field('Scale (saved in drugs.json as qtCalibrationNote)', noteBox),
    h('details', { class: 'ed-sec', open: true }, h('summary', null, 'Preview: relative contributions on the shared scale'), preview),
    h('div', { class: 'row rv-filters' },
      field('Tier', select(q.tier, [['', 'All tiers'], ...QT_TIERS.filter((t) => t !== 'none').map((t) => [t, t] as [string, string])], (v) => { q.tier = v as QtTier | ''; renderQt(); })),
      field('Category', select(q.category, [['', 'All categories'], ...st.queue!.categories.map((c) => [c.id, c.name] as [string, string])], (v) => { q.category = v; renderQt(); }))),
    h('table', { class: 'ed-priority qt-table' },
      h('thead', null, h('tr', null, th('name', 'Compound'), th('category', 'Category'), th('tier', 'Tier'), h('th', null, 'Provenance'), th('weight', 'Weight'),
        h('th', null, 'Reference (mg)'), h('th', null, 'Terminal half-life'), h('th', null, 'QT source note'), h('th', null, 'Review'))),
      h('tbody', null, ...rows.map((c) => {
        const status = h('span');
        const cell = h('td');
        const refresh = () => {
          const unknown = unknownParts(c, 'qt');
          const errs = sectionIssues(st.validation?.errors ?? [], c, 'qt');
          const rs = reviewState(c, 'qt');
          status.className = `rv-state rv-${rs.cls}`;
          status.textContent = rs.text;
          cell.replaceChildren(status, ' ', h('button', {
            class: 'btn btn-sm btn-primary', type: 'button', disabled: errs.length > 0, title: errs.map((x) => x.message).join('; ') || (unknown.length ? `Keeps unknown: ${unknown.join(', ')}` : ''),
            onclick: () => {
              const refused = confirmSection(c, 'qt', today(), unknown.length > 0);
              if (refused) return toast(refused, 4000);
              chipRefreshers.get(`${c.id}:qt`)?.();
              changed();
              refresh();
            },
          }, unknown.length ? 'Confirm as unknown' : 'Confirm'));
        };
        refresh();
        st.refreshers.push(refresh);
        const edit = () => { touched(c, 'qt'); refresh(); };
        const note = c.sourceNotes.qt ?? '';
        return h('tr', null,
          h('td', null, c.name, ' ', h('code', null, c.id)),
          h('td', null, catName.get(catOf(c)) ?? '—'),
          h('td', null, select(c.qt.tier, QT_TIERS.map((t) => [t, t] as [string, string]), (v) => { c.qt.tier = v as QtTier; edit(); })),
          h('td', null, provChip(c, 'qt')),
          h('td', null, nullableNumber(c.qt.weight, (v) => { c.qt.weight = v; edit(); }, { min: '0', step: '0.1' })),
          h('td', null, nullableNumber(c.qt.referenceAmountMg, (v) => { c.qt.referenceAmountMg = v; edit(); }, { min: '0' })),
          h('td', null, c.kinetics.mode === 'intrinsic' ? formatRange(c.kinetics.halfLifeHours) : c.kinetics.mode),
          h('td', { class: 'qt-note' }, note ? h('details', null, h('summary', null, note.length > 70 ? `${note.slice(0, 70)}…` : note), h('div', null, ...linkify(note))) : '—'),
          cell);
      }))),
  );
}

// ---------- priority review ----------

interface PriorityRow { id: string; name: string; kind: 'compound' | 'product'; reasons: string[]; rank: number; cand: Candidate | undefined }

function priorityRows(): PriorityRow[] {
  const rows: PriorityRow[] = [];
  const byCand = new Map(candidates().map((c) => [c.id, c]));
  const est = (e: Compound | Product, keys: string[]) => keys.filter((k) => (e.provenance as Record<string, string | null>)[k] === 'estimate');
  for (const c of lib().compounds) {
    const r: [number, string][] = [];
    if (c.qt.tier === 'known' || c.qt.tier === 'possible') r.push([c.qt.tier === 'known' ? 0 : 1, `QT ${c.qt.tier}`]);
    if (c.cyp2d6.inhibitor === 'strong') r.push([2, 'strong CYP2D6 inhibitor']);
    if (c.cyp2d6.inhibitionType === 'mechanism-based') r.push([2, 'mechanism-based CYP2D6 inhibition']);
    const t = c.kinetics.halfLifeHours?.typical ?? null;
    if (t !== null && t > 48) r.push([3, `terminal half-life ${+t.toFixed(1)} h`]);
    const e = est(c, ['halfLife', 'metabolism']);
    if (e.length) r.push([5, `estimate: ${e.map((k) => (k === 'metabolism' ? 'fraction' : 'half-life / phase')).join(', ')}`]);
    if (hasAutoNote(c)) r.push([6, 'migration auto-assumption']);
    if (r.length) rows.push({ id: c.id, name: c.name, kind: 'compound', reasons: r.map((x) => x[1]), rank: Math.min(...r.map((x) => x[0])), cand: owner(c.id) });
  }
  for (const p of lib().products) {
    const r: [number, string][] = [];
    if (p.input.type === 'zero-order') r.push([4, 'patch / infusion']);
    else if (p.formulation === 'depot') r.push([4, 'depot']);
    if (est(p, ['input']).length) r.push([5, 'estimate: release']);
    if (hasAutoNote(p)) r.push([6, 'migration auto-assumption']);
    if (r.length) rows.push({ id: p.id, name: p.name, kind: 'product', reasons: r.map((x) => x[1]), rank: Math.min(...r.map((x) => x[0])), cand: byCand.get(p.candidateId) });
  }
  return rows;
}

function renderPriority() {
  const s = st.prioritySort;
  const rows = priorityRows().sort((a, b) => {
    const v = s.key === 'reason' ? a.rank - b.rank || a.name.localeCompare(b.name)
      : s.key === 'name' ? a.name.localeCompare(b.name)
      : (a.cand?.order ?? 1e9) - (b.cand?.order ?? 1e9);
    return v * s.dir;
  });
  const th = (key: typeof s.key, label: string) =>
    h('th', { class: 'sortable', onclick: () => { s.dir = s.key === key ? -s.dir : 1; s.key = key; renderPriority(); } }, label, s.key === key ? (s.dir > 0 ? ' ▴' : ' ▾') : '');
  const statusDot = (r: PriorityRow) => {
    const e = r.kind === 'compound' ? compound(r.id) : lib().products.find((p) => p.id === r.id);
    const s2: Status = !e ? 'not-started' : r.kind === 'compound' ? compoundStatus(e as Compound) : productStatus(e as Product);
    return h('span', { class: `st-dot st-${s2}` });
  };
  main.replaceChildren(
    h('div', { class: 'ed-cand-head' }, h('h1', null, 'Priority review'), h('span', { class: 'field-hint' }, `${rows.length} entries`)),
    h('p', { class: 'field-hint' }, 'Entries where an error matters most: QT known/possible, strong or mechanism-based CYP2D6 inhibitors, terminal half-life over 48 h, depots and patches, estimated half-lives / fractions / release, and migration auto-assumptions. Click a row to open it.'),
    h('table', { class: 'ed-priority' },
      h('thead', null, h('tr', null, h('th', null, ''), th('name', 'Entry'), h('th', null, 'Type'), th('reason', 'Why'), th('candidate', 'Candidate'))),
      h('tbody', null, ...rows.map((r) =>
        h('tr', { onclick: () => {
          if (!r.cand) return toast('Not part of any candidate in the queue.');
          st.view = 'queue';
          st.scrollTo = r.id;
          if (r.kind === 'compound') st.expanded.add(r.id);
          renderTop();
          go(candidates().indexOf(r.cand));
        } },
          h('td', null, statusDot(r)),
          h('td', null, r.name, ' ', h('code', null, r.id)),
          h('td', null, r.kind),
          h('td', null, r.reasons.join(' · ')),
          h('td', null, r.cand ? `${r.cand.name} #${r.cand.order}` : '—'))))),
  );
}

// ---------- boot ----------

async function boot() {
  st.queue = await (await fetch('/api/candidates')).json();
  const res = await fetch('/api/drugs');
  if (res.status === 404) {
    main.replaceChildren(h('div', { class: 'ed-empty glass' },
      h('h2', null, 'public/drugs.json does not exist yet'),
      h('p', null, 'Create it from tools/candidates.json (structure only, every value empty)?'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
        const r = await fetch('/api/init', { method: 'POST' });
        if (!r.ok) return toast((await r.json()).error);
        boot();
      } }, 'Run init-data')));
    renderTop();
    return;
  }
  const body = await res.json();
  const version = body.library?.schemaVersion;
  if (version !== SCHEMA_VERSION) {
    const steps = [['migrate-v2', undefined], ['migrate-v2.1', 2], ['migrate-v2.2', 2.1], ['migrate-v2.3', 2.2], ['migrate-v2.4', 2.3]] as const;
    const from = steps.findIndex(([, v]) => v === version);
    const todo = steps.slice(from < 0 ? 0 : from).map(([cmd]) => h('code', null, `npm run ${cmd}`));
    main.replaceChildren(h('div', { class: 'ed-empty glass' },
      h('h2', null, `drugs.json is in an older format (schema ${version ?? 1})`),
      h('p', null, 'Stop the editor and run ', ...todo.flatMap((c, i) => (i ? [', then ', c] : [c])),
        '. Each step backs up the file to backups/. Then start the editor again.')));
    renderTop();
    return;
  }
  st.lib = body.library;
  st.hash = body.hash;
  st.validation = validateLibrary(lib());
  // Start at the first candidate that isn't verified yet.
  const list = candidates();
  const first = list.findIndex((c) => statusOf(c) !== 'verified');
  st.current = first >= 0 ? first : 0;
  renderTop();
  renderSide();
  renderMain();
}

boot().catch((e) => toast(`Editor failed to start: ${(e as Error).message}`, 8000));
