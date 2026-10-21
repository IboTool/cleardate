// ClearDate local data editor — populate public/drugs.json one candidate at a time.
// Runs only under `npm run editor` (127.0.0.1); never deployed.

import '@fontsource-variable/inter';
import '../../src/styles.css';
import './editor.css';
import { emptyCompound, emptyProduct, slug } from '../../src/schema';
import { validateLibrary, type Issue, type ValidationResult } from '../../src/validate';
import type { Compound, Library, Product } from '../../src/types';
import { compoundSection, halfLifeInputs, type SectionName } from '../../src/ui/compoundForm';
import { append, badge, field, h, numberInput, select, textInput, toast } from '../../src/ui/dom';
import { categoryColor } from '../../src/ui/picker';
import { productId, type Candidate, type CandidatesFile } from '../init-lib';

type Status = 'not-started' | 'draft' | 'verified';

const st = {
  lib: null as Library | null,
  hash: '',
  queue: null as CandidatesFile | null,
  current: 0,
  filter: new Set<Status>(),
  query: '',
  dirty: false,
  saving: false,
  validation: null as ValidationResult | null,
  collapsedCats: new Set<string>(),
  expanded: new Set<string>(),
  refreshers: [] as (() => void)[],
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

const productsOf = (cand: Candidate) => lib().products.filter((p) => p.parentCompound === cand.parentCompound).sort((a, b) => a.id.localeCompare(b.id));

function statusOf(cand: Candidate): Status {
  const parent = compound(cand.parentCompound);
  if (!parent || !(parent.halfLifeHours.typical > 0)) return 'not-started';
  const ps = productsOf(cand);
  const allVerified = tree(cand.parentCompound).every((n) => n.c.verified) && ps.length > 0 && ps.every((p) => p.verified);
  return allVerified ? 'verified' : 'draft';
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
    h('span', { class: 'spacer' }),
    v ? h('span', { class: `ed-vstat ${v.errors.length ? 'bad' : 'ok'}` }, v.errors.length ? `${v.errors.length} error(s)` : '✓ valid', v.warnings.length ? ` · ${v.warnings.length} warning(s)` : '') : null,
    st.dirty ? h('span', { class: 'ed-dirty' }, '● Unsaved changes') : h('span', { class: 'ed-clean' }, 'All changes saved'),
    h('button', { class: 'btn btn-primary', type: 'button', disabled: !st.dirty || st.saving, onclick: save, title: 'Ctrl+S' }, st.saving ? 'Saving…' : 'Save'),
  ]);
}

// ---------- sidebar (queue) ----------

const STATUS_LABEL: Record<Status, string> = { 'not-started': 'not started', draft: 'draft', verified: 'verified' };

function renderSide() {
  if (!st.queue || !st.lib) return;
  const q = st.query.toLowerCase();
  const list = candidates();
  const statuses = new Map(list.map((c) => [c.order, statusOf(c)]));
  const visible = (c: Candidate) =>
    (st.filter.size === 0 || st.filter.has(statuses.get(c.order)!)) &&
    (!q || c.name.toLowerCase().includes(q) || c.aliases.some((a) => a.toLowerCase().includes(q)) || c.parentCompound.includes(q));
  const search = h('input', { type: 'search', placeholder: 'Search the queue…', value: st.query });
  search.addEventListener('input', () => {
    st.query = search.value;
    renderSide();
    const el = side.querySelector('input[type=search]') as HTMLInputElement;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  });
  side.replaceChildren(
    search,
    h('div', { class: 'chips' }, ...(['not-started', 'draft', 'verified'] as Status[]).map((s) =>
      h('button', { type: 'button', class: `chip st-${s} ${st.filter.has(s) ? 'on' : ''}`, onclick: () => { st.filter.has(s) ? st.filter.delete(s) : st.filter.add(s); renderSide(); } }, STATUS_LABEL[s]))),
    ...st.queue.categories.map((cat) => {
      const cs = list.filter((c) => c.category === cat.id);
      const done = cs.filter((c) => statuses.get(c.order) === 'verified').length;
      const shown = cs.filter(visible);
      const collapsed = st.collapsedCats.has(cat.id) && !q;
      return h('div', { class: 'ed-cat' },
        h('button', { type: 'button', class: 'ed-cat-head', style: `--c:${categoryColor(cat.id)}`, onclick: () => { st.collapsedCats.has(cat.id) ? st.collapsedCats.delete(cat.id) : st.collapsedCats.add(cat.id); renderSide(); } },
          h('span', { class: 'caret' }, collapsed ? '▸' : '▾'), h('span', { class: 'dot' }), cat.name, h('span', { class: 'count' }, `${done}/${cs.length}`)),
        collapsed ? null : shown.map((c) =>
          h('button', { type: 'button', class: `ed-cand ${list[st.current]?.order === c.order ? 'active' : ''}`, onclick: () => go(list.indexOf(c)) },
            h('span', { class: `st-dot st-${statuses.get(c.order)}`, title: STATUS_LABEL[statuses.get(c.order)!] }),
            h('span', { class: 'ed-cand-name' }, c.name), h('span', { class: 'ed-cand-n' }, `#${c.order}`))));
    }),
  );
}

function go(i: number) {
  const n = candidates().length;
  st.current = (i + n) % n;
  st.expanded.clear();
  renderMain();
  renderSide();
  main.scrollTo(0, 0);
}

/** Next candidate matching the active filters (or any, if none). */
function step(dir: 1 | -1) {
  const list = candidates();
  for (let k = 1; k <= list.length; k++) {
    const i = (st.current + dir * k + list.length) % list.length;
    if (st.filter.size === 0 || st.filter.has(statusOf(list[i]))) return go(i);
  }
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

const SECTIONS: [SectionName | 'metabolism', string][] = [
  ['basics', 'Basics & aliases'], ['halfLife', 'Half-life'], ['metabolism', 'Metabolite links & fractions'], ['cyp2d6', 'CYP2D6'],
  ['qt', 'QT'], ['receptors', 'Receptors'], ['lingering', 'Lingering effects & nonlinear kinetics'],
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

function metabolismSection(c: Compound): HTMLElement {
  const others = lib().compounds.filter((x) => x.id !== c.id).sort((a, b) => a.name.localeCompare(b.name));
  const outSum = childrenOf(c.id).reduce((s, ch) => s + (ch.formedFrom.find((f) => f.compound === c.id)?.fraction ?? 0), 0);
  const linkSel = h('select', null, h('option', { value: '' }, '+ Add “formed from” link…'), ...others.map((o) => h('option', { value: o.id }, o.name)));
  linkSel.addEventListener('change', () => {
    if (!linkSel.value) return;
    c.formedFrom.push({ compound: linkSel.value, fraction: 0 });
    c.isMetabolite = true;
    changed();
    renderMain();
  });
  const newMet = textInput('', () => {}, { placeholder: 'New metabolite name' });
  const addMet = () => {
    const name = newMet.value.trim();
    if (!name) return;
    let id = slug(name);
    const existing = compound(id);
    if (existing) {
      if (!existing.formedFrom.some((f) => f.compound === c.id)) existing.formedFrom.push({ compound: c.id, fraction: 0 });
      existing.isMetabolite = true;
      toast(`Linked existing compound ${existing.name}`);
    } else {
      if (!id) id = `metabolite_${Date.now()}`;
      lib().compounds.push({ ...emptyCompound(id, name), isMetabolite: true, formedFrom: [{ compound: c.id, fraction: 0 }] });
    }
    changed();
    renderMain();
  };
  return h('div', { class: 'form-section' },
    h('div', { class: 'field-hint' }, 'Fraction = share of the source compound’s elimination that forms this compound.'),
    c.formedFrom.length
      ? c.formedFrom.map((f, i) =>
          h('div', { class: 'row ed-link' },
            h('span', { class: 'ed-link-name' }, 'formed from ', h('b', null, compound(f.compound)?.name ?? f.compound)),
            field('fraction', numberInput(f.fraction, (v) => { f.fraction = v; changed(); }, { min: '0', max: '1', step: '0.01' })),
            h('button', { class: 'icon-btn', type: 'button', title: 'Remove link', onclick: () => {
              c.formedFrom.splice(i, 1);
              if (!c.formedFrom.length) c.isMetabolite = false;
              changed();
              renderMain();
            } }, '✕')))
      : h('div', { class: 'field-hint' }, 'Not formed from any tracked compound.'),
    linkSel,
    h('div', { class: `field-hint ${outSum > 1 + 1e-9 ? 'bad' : ''}` }, `Fractions formed from ${c.name}: Σ = ${outSum.toFixed(3)} (must be ≤ 1)`),
    h('div', { class: 'row' }, newMet, h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: addMet }, `+ Add metabolite of ${c.name}`)),
    sourceNoteField(c, 'metabolism'));
}

function sourceNoteField(c: Compound, key: string) {
  const ta = h('textarea', { rows: 2, class: 'source-note', placeholder: 'Source note ([checked] / [recall] / [estimate] / [gap] …)' }, c.sourceNotes[key] ?? '');
  ta.addEventListener('input', () => {
    c.sourceNotes[key] = ta.value;
    changed();
  });
  return field('Source note', ta);
}

function compoundCard(node: { c: Compound; depth: number; via: string | null }, cand: Candidate): HTMLElement {
  const { c, depth } = node;
  const own = owner(c.id);
  const sharedWith = candidates().filter((x) => x.order !== cand.order && tree(x.parentCompound).some((n) => n.c.id === c.id));
  const verifiedElsewhere = c.verified && own && own.order !== cand.order;
  const open = !verifiedElsewhere || st.expanded.has(c.id);
  const status: Status = c.verified ? 'verified' : c.halfLifeHours.typical > 0 ? 'draft' : 'not-started';
  const head = h('div', { class: 'ed-card-head' },
    h('span', { class: `st-dot st-${status}` }),
    h('span', { class: 'ed-card-title' }, depth ? '↳ ' : '', c.name),
    h('code', null, c.id),
    depth ? badge(`metabolite · L${depth}`, 'muted') : badge('parent', 'muted'),
    sharedWith.length ? h('span', { class: 'field-hint', title: sharedWith.map((x) => x.name).join(', ') }, ` shared with ${sharedWith.length} other candidate(s)`) : null,
    verifiedElsewhere ? h('span', { class: 'ed-via' }, `✓ verified via ${own!.name}`) : null,
    h('span', { class: 'spacer' }),
    verifiedElsewhere ? h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { st.expanded.has(c.id) ? st.expanded.delete(c.id) : st.expanded.add(c.id); renderMain(); } }, open ? 'Collapse' : 'Expand') : null,
    depth && node.via
      ? h('button', { class: 'icon-btn', type: 'button', title: `Remove from ${compound(node.via)?.name}'s metabolites`, onclick: () => removeMetabolite(c, node.via!) }, '✕')
      : null);
  const card = h('section', { class: `ed-card glass ${verifiedElsewhere && !open ? 'collapsed' : ''}`, style: `margin-left:${depth * 22}px` }, head);
  if (!open) return card;
  const notes = st.queue!.compounds.find((x) => x.id === c.id)?.notes;
  if (notes?.length) card.append(h('div', { class: 'ed-note' }, ...notes.map((n) => h('div', null, 'ℹ ', n))));
  card.append(
    ...SECTIONS.map(([s, label]) =>
      h('details', { class: 'ed-sec', open: s === 'halfLife' || s === 'basics' || s === 'metabolism' },
        h('summary', null, label),
        s === 'metabolism' ? metabolismSection(c) : compoundSection(c, s, { sourceNotes: true, onChange: changed }))),
    sourceField(c),
    issuesBox(c.id),
    verifyToggle(c, () => (c.halfLifeHours.typical > 0 ? null : 'enter a half-life')),
  );
  return card;
}

function removeMetabolite(c: Compound, fromId: string) {
  c.formedFrom = c.formedFrom.filter((f) => f.compound !== fromId);
  if (!c.formedFrom.length) {
    c.isMetabolite = false;
    const usedByProduct = lib().products.some((p) => p.parentCompound === c.id);
    const isCandidate = st.queue!.candidates.some((x) => x.parentCompound === c.id);
    const hasKids = childrenOf(c.id).length > 0;
    if (!usedByProduct && !isCandidate && !hasKids && confirm(`${c.name} is no longer linked to anything. Delete it from drugs.json?`))
      st.lib!.compounds = lib().compounds.filter((x) => x.id !== c.id);
  }
  changed();
  renderMain();
}

function productCard(p: Product): HTMLElement {
  const hasApparent = !!p.apparentHalfLifeHours;
  const depot = h('input', { type: 'checkbox', checked: hasApparent });
  const apparentWrap = h('div', { class: 'sub' });
  const renderApparent = () => {
    apparentWrap.replaceChildren();
    if (p.apparentHalfLifeHours) apparentWrap.append(halfLifeInputs(p.apparentHalfLifeHours, changed, 'Apparent (release-limited) half-life'));
  };
  depot.addEventListener('change', () => {
    if (depot.checked) p.apparentHalfLifeHours = { typical: 0, min: 0, max: 0 };
    else delete p.apparentHalfLifeHours;
    renderApparent();
    changed();
  });
  renderApparent();
  return h('section', { class: 'ed-card glass' },
    h('div', { class: 'ed-card-head' },
      h('span', { class: `st-dot st-${p.verified ? 'verified' : p.class || p.typicalDoseMg ? 'draft' : 'not-started'}` }),
      h('span', { class: 'ed-card-title' }, p.name), h('code', null, p.id),
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
        field('Class', textInput(p.class, (v) => { p.class = v; changed(); }, { placeholder: 'e.g. opioid partial agonist' })),
        field('Category', select(p.category, lib().categories.map((c) => [c.id, c.name] as [string, string]), (v) => { p.category = v; changed(); }))),
      field('Aliases', textInput(p.aliases.join(', '), (v) => { p.aliases = v.split(',').map((s) => s.trim()).filter(Boolean); changed(); })),
      field('Typical dose (mg)', numberInput(p.typicalDoseMg, (v) => { p.typicalDoseMg = v; changed(); }, { min: '0' }), 'Prescription products: usual adult maintenance dose (label §2 / SmPC 4.2). Leave 0 for illicit or recreational substances.'),
      h('label', { class: 'check' }, depot, 'Depot / extended release — apparent half-life overrides the compound’s'),
      apparentWrap,
      sourceField(p)),
    issuesBox(p.id),
    verifyToggle(p, () => null));
}

function renderMain() {
  st.refreshers = [];
  if (!st.lib || !st.queue) return;
  const list = candidates();
  const cand = list[st.current];
  const status = statusOf(cand);
  const cat = st.queue.categories.find((c) => c.id === cand.category);
  const nodes = tree(cand.parentCompound);
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
      cand.aliases.length ? h('div', { class: 'field-hint' }, 'Aliases: ', cand.aliases.join(', ')) : null),
    h('div', { class: 'ed-refs glass' },
      cand.reviewHints ? h('div', null, h('b', null, 'Review hints: '), cand.reviewHints) : null,
      cand.untrackedMetabolites.length ? h('div', null, h('b', null, 'Untracked metabolites: '), cand.untrackedMetabolites.join('; ')) : null,
      h('div', null, h('b', null, 'Routes in queue: '), cand.routes.join(', ')),
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
      lib().products.push({ ...emptyProduct(id, `${cand.name} (${route})`, cand.parentCompound, route, cand.category), aliases: [...cand.aliases] });
      changed();
      renderMain();
    } }, '+ Add route')),
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
