// ClearDate local data editor — populate public/drugs.json one candidate at a time.
// Runs only under `npm run editor` (127.0.0.1); never deployed.

import '@fontsource-variable/inter';
import '../../src/styles.css';
import './editor.css';
import { compoundHasData, emptyCompound, emptyProduct, emptyRange, hasIntrinsicKinetics, isDraft, slug } from '../../src/schema';
import { validateLibrary, type Issue, type ValidationResult } from '../../src/validate';
import {
  DOSE_BASES, DOSE_UNITS, FORMULATIONS, INPUT_TYPES, PHENOTYPES, PROVENANCE_TAGS,
  type Compound, type CompoundSection, type Formulation, type InputType, type Library, type Product, type ProductSection, type Provenance,
} from '../../src/types';
import { compoundSection, nullableNumber, rangeInputs, type SectionName } from '../../src/ui/compoundForm';
import { append, badge, field, h, select, textInput, toast } from '../../src/ui/dom';
import { categoryColor } from '../../src/ui/picker';
import { productId, type Candidate, type CandidatesFile } from '../init-lib';
import { applyInputRule } from '../product-rules';

type Status = 'not-started' | 'draft' | 'verified';
type Flag = 'draft-values' | 'unknown-kinetics' | 'auto-assumptions';
type View = 'queue' | 'priority';

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
    p ? h('span', { class: 'ed-progress' }, `Compounds ${p.compoundsVerified}/${p.compounds} verified · Products ${p.productsVerified}/${p.products} verified`) : null,
    st.lib
      ? h('div', { class: 'segmented ed-views' },
          ...(['queue', 'priority'] as View[]).map((vw) =>
            h('button', { type: 'button', class: `seg ${st.view === vw ? 'on' : ''}`, onclick: () => { st.view = vw; renderTop(); renderSide(); renderMain(); } },
              vw === 'queue' ? 'Queue' : 'Priority review')))
      : null,
    h('span', { class: 'spacer' }),
    v ? h('span', { class: `ed-vstat ${v.errors.length ? 'bad' : 'ok'}` }, v.errors.length ? `${v.errors.length} error(s)` : '✓ valid', v.warnings.length ? ` · ${v.warnings.length} warning(s)` : '') : null,
    st.dirty ? h('span', { class: 'ed-dirty' }, '● Unsaved changes') : h('span', { class: 'ed-clean' }, 'All changes saved'),
    h('button', { class: 'btn btn-primary', type: 'button', disabled: !st.dirty || st.saving, onclick: save, title: 'Ctrl+S' }, st.saving ? 'Saving…' : 'Save'),
  ]);
}

// ---------- sidebar (queue) ----------

const STATUS_LABEL: Record<Status, string> = { 'not-started': 'not started', draft: 'draft', verified: 'verified' };
const FLAG_LABEL: Record<Flag, string> = { 'draft-values': 'has draft values', 'unknown-kinetics': 'unknown kinetics', 'auto-assumptions': 'auto-assumptions' };

function renderSide() {
  if (!st.queue || !st.lib) return;
  const q = st.query.toLowerCase();
  const list = candidates();
  const statuses = new Map(list.map((c) => [c.order, statusOf(c)]));
  const flags = st.flags.size ? new Map(list.map((c) => [c.order, flagsOf(c)])) : null;
  const visible = (c: Candidate) =>
    (st.filter.size === 0 || st.filter.has(statuses.get(c.order)!)) &&
    (!flags || [...st.flags].every((f) => flags.get(c.order)!.has(f))) &&
    (!q || c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)) || c.parentCompound.includes(q));
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

/** A human edit: provenance becomes "reviewer". */
function touched(e: ProvOwner & { id: string }, section: string | undefined) {
  if (section && e.provenance[section] !== 'reviewer') {
    e.provenance[section] = 'reviewer';
    chipRefreshers.get(`${e.id}:${section}`)?.();
  }
  changed();
}

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

const SECTIONS: [SectionName | 'metabolism', string, CompoundSection[]][] = [
  ['basics', 'Basics & aliases', ['molecularWeight']],
  ['kinetics', 'Kinetics', ['halfLife']],
  ['metabolism', 'Metabolite links & fractions', ['metabolism']],
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

function verifyToggle(entry: Compound | Product, extraCheck: () => string | null) {
  const cb = h('input', { type: 'checkbox', checked: entry.verified });
  const why = h('span', { class: 'field-hint' });
  const refresh = () => {
    const blockers: string[] = [];
    if (issuesFor(entry.id).errors.length) blockers.push('fix validation errors');
    if (!entry.source.trim()) blockers.push('add a source');
    const extra = extraCheck();
    if (extra) blockers.push(extra);
    cb.disabled = !entry.verified && blockers.length > 0;
    why.textContent = entry.verified ? `Verified ${entry.verifiedDate}` : blockers.length ? `To verify: ${blockers.join(', ')}.` : 'Ready to mark verified.';
  };
  cb.addEventListener('change', () => {
    entry.verified = cb.checked;
    entry.verifiedDate = cb.checked ? today() : '';
    changed();
    refresh();
  });
  refresh();
  st.refreshers.push(refresh);
  return h('div', { class: 'ed-verify' }, h('label', { class: 'check' }, cb, h('b', null, 'Mark verified')), why);
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
    row.replaceChildren(...(m ? PHENOTYPES.map((p) => field(p, h('input', {
      type: 'number', step: 'any', min: '0', value: String(m[p]),
      oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); m[p] = v >= 0 ? v : 1; onChange(); },
    }))) : []));
  };
  on.addEventListener('change', () => {
    f.cyp2d6Multiplier = on.checked ? { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 } : null;
    render();
    onChange();
  });
  render();
  return h('div', { class: 'sub' }, h('label', { class: 'check' }, on, 'Formation depends on CYP2D6 (multiplier on the fraction by phenotype)'), row);
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
            edgeMultiplier(f, edit)))
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
    ...SECTIONS.map(([s, label, provKeys]) =>
      h('details', { class: 'ed-sec', open: s === 'kinetics' || s === 'basics' || s === 'metabolism' },
        h('summary', null, label, h('span', { class: 'prov-chips' }, ...provKeys.map((k) => provChip(c, k)))),
        s === 'metabolism' ? metabolismSection(c) : compoundSection(c, s, { sourceNotes: true, onChange: (sec) => touched(c, sec) }))),
    sourceField(c),
    issuesBox(c.id),
    verifyToggle(c, () =>
      c.kinetics.mode === 'unknown' ? 'set the kinetic mode'
      : c.kinetics.mode === 'intrinsic' && !hasIntrinsicKinetics(c) ? 'enter a typical half-life'
      : null),
  );
  return card;
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
  const sec = (s: ProductSection) => () => touched(p, s);
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
  const block = (label: string, key: ProductSection, ...body: (Node | null)[]) =>
    h('details', { class: 'ed-sec', open: true }, h('summary', null, label, h('span', { class: 'prov-chips' }, provChip(p, key))), h('div', { class: 'form-section' }, ...body.filter((x): x is Node => x !== null)));
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
    block('Class', 'class', field('Class', textInput(p.class, (v) => { p.class = v; sec('class')(); }, { placeholder: 'e.g. opioid partial agonist' }))),
    block('Aliases', 'aliases', field('Aliases', textInput(p.aliases.join(', '), (v) => { p.aliases = v.split(',').map((s) => s.trim()).filter(Boolean); sec('aliases')(); }))),
    block('Components', 'components', componentsEditor(p, sec('components')), sourceNoteField(p, 'components')),
    block('Input model (release)', 'input', inputEditor(p, sec('input')), sourceNoteField(p, 'input')),
    block('Typical dose', 'typicalDose',
      h('div', { class: 'row' },
        field('Amount', nullableNumber(p.typicalDose.amount, (v) => { p.typicalDose.amount = v; sec('typicalDose')(); }, { min: '0' })),
        field('Unit', select(p.typicalDose.unit, DOSE_UNITS, (v) => { p.typicalDose.unit = v; sec('typicalDose')(); })),
        field('Basis', select(p.typicalDose.basis, DOSE_BASES, (v) => { p.typicalDose.basis = v; sec('typicalDose')(); }))),
      h('div', { class: 'field-hint' }, 'Display and dose-form placeholder only (label §2 / SmPC 4.2). Unknown for illicit or recreational substances.')),
    sourceField(p),
    issuesBox(p.id),
    verifyToggle(p, () => null));
}

function renderMain() {
  st.refreshers = [];
  chipRefreshers.clear();
  if (!st.lib || !st.queue) return;
  if (st.view === 'priority') return renderPriority();
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
  if (body.library?.schemaVersion !== 2) {
    main.replaceChildren(h('div', { class: 'ed-empty glass' },
      h('h2', null, 'drugs.json is in the old (v1) format'),
      h('p', null, 'Stop the editor and run ', h('code', null, 'npm run migrate-v2'), '. It backs up the file to drugs.v1-backup.json, converts it, and writes docs/migration_v2_report.md. Then start the editor again.')));
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
