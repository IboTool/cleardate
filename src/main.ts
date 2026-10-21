// ClearDate — app entry. Fully client-side: the only fetch is drugs.json from this same static site.

import '@fontsource-variable/inter';
import './styles.css';
import * as echarts from './echarts';
import { buildChartOption } from './chart';
import { exportPdf, exportPng, download, DISCLAIMER } from './export';
import { ageFrom, fmtDate, fmtDateTime } from './format';
import {
  buildIndex, computeScenario, displayName, expandDose, IBOGAINE_KEY, mergeLibraries, parseLocal, productColors,
  productHasData, toLocalInput, withCustom, DAY, HOUR, type LibraryIndex, type Scenario,
} from './model';
import { buildRecords, ProductSearch } from './search';
import {
  clearStoredSession, emptySession, loadSession, normaliseSession, patientFileName, resolveCustomClashes, saveSession,
} from './state';
import type { CustomDrugs, DoseEntry, IbogaineTreatment, Library, Product, Session } from './types';
import { validateLibrary } from './validate';
import { $, append, badge, field, h, modal, numberInput, select, textInput, toast } from './ui/dom';
import { categoryColor, categoryTag, createPicker } from './ui/picker';
import { copyLibraryEntry, openWizard } from './ui/wizard';

// ---------- app state ----------

const app = {
  base: { categories: [], compounds: [], products: [] } as Library,
  demo: null as Library | null,
  session: loadSession(),
  idx: null as unknown as LibraryIndex,
  search: null as unknown as ProductSearch,
  scn: null as unknown as Scenario,
  focusKey: null as string | null,
  zoom: null as { start: number; end: number } | null,
  chart: null as unknown as echarts.ECharts,
  libraryErrors: [] as string[],
  tab: 'doses' as 'doses' | 'patient' | 'settings',
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const S = () => app.session.settings;

function rebuildLibrary() {
  const base = app.demo ? mergeLibraries(app.base, app.demo) : app.base;
  const lib = withCustom(base, app.session.custom);
  app.idx = buildIndex(lib);
  app.search = new ProductSearch(buildRecords(lib.products, app.idx.compounds, lib.categories, displayName));
}

type Change = 'doses' | 'library' | 'view' | 'patient';

/** Persist, recompute and re-render after any change. */
function commit(change: Change) {
  saveSession(app.session);
  if (change === 'library') rebuildLibrary();
  app.scn = computeScenario(app.idx, app.session, Date.now());
  if (change === 'doses' || change === 'library') app.zoom = null;
  renderChart(change === 'doses');
  renderLegend();
  renderWarnings();
  renderBanner();
  if (app.tab === 'doses') renderDoseList();
  flashSaved();
}

// ---------- layout ----------

const root = $('#app');
const chartEl = h('div', { id: 'chart' });
const emptyHint = h('div', { class: 'chart-empty' },
  h('div', { class: 'chart-empty-title' }, 'No doses yet'),
  h('div', null, 'Search for a drug in the Doses panel, enter the amount and time, and its clearance curve appears here.'));
const legendEl = h('div', { class: 'legend' });
const warningsEl = h('div', { class: 'warnings' });
const bannerEl = h('div', { class: 'banners' });
const sideBody = h('div', { class: 'side-body' });
const savedEl = h('span', { class: 'saved', title: 'Everything you enter is autosaved to this browser’s localStorage and never sent anywhere.' }, '● Stored only in this browser');

function flashSaved() {
  savedEl.classList.remove('pulse');
  void savedEl.offsetWidth;
  savedEl.classList.add('pulse');
}

const tabs = (['doses', 'patient', 'settings'] as const).map((t) =>
  h('button', { class: 'tab', type: 'button', dataset: { tab: t }, onclick: () => setTab(t) }, t[0].toUpperCase() + t.slice(1)));

function setTab(t: typeof app.tab) {
  app.tab = t;
  tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  renderSide();
}

const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
fileInput.addEventListener('change', async () => {
  const f = fileInput.files?.[0];
  fileInput.value = '';
  if (!f) return;
  try {
    const raw = JSON.parse(await f.text());
    const base = app.demo ? mergeLibraries(app.base, app.demo) : app.base;
    const { session, renamed } = resolveCustomClashes(normaliseSession(raw), base);
    if (!import.meta.env.DEV) session.settings.demoData = false;
    app.session = session;
    await applyDemoSetting();
    rebuildLibrary();
    commit('library');
    setTab(app.tab);
    toast(renamed.length ? `Loaded. Renamed custom IDs that clash with the library: ${renamed.map((r) => `${r[0]} → ${r[1]}`).join(', ')}` : 'Patient file loaded', 5000);
  } catch (e) {
    toast(`Could not read that file: ${(e as Error).message}`, 5000);
  }
});

root.append(
  h('header', { class: 'topbar' },
    h('div', { class: 'wordmark' }, 'Clear', h('span', null, 'Date')),
    savedEl,
    h('span', { class: 'spacer' }),
    h('button', { class: 'btn btn-gold', type: 'button', onclick: () => openIbogaineForm() }, '✦ Ibogaine treatment'),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { app.zoom = null; renderChart(false); } }, 'Reset view'),
    h('div', { class: 'btn-group' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportPng(app.scn, app.session, currentZoom()) }, 'PNG'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportPdf(app.scn, app.session, app.idx, currentZoom()) }, 'PDF')),
    h('div', { class: 'btn-group' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: savePatientFile }, 'Save file'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => fileInput.click() }, 'Load file')),
    fileInput),
  bannerEl,
  h('main', { class: 'layout' },
    h('aside', { class: 'side glass' }, h('nav', { class: 'tabs' }, ...tabs), sideBody),
    h('section', { class: 'stage' },
      legendEl,
      h('div', { class: 'chart-wrap glass' }, chartEl, emptyHint),
      warningsEl)),
  h('footer', { class: 'footer' }, DISCLAIMER, ' ClearDate is not a medical device.'),
);

function savePatientFile() {
  const s: Session = structuredClone(app.session);
  for (const c of s.custom.compounds) delete c.userEntered;
  for (const p of s.custom.products) delete p.userEntered;
  download(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }), patientFileName(app.session));
}

// ---------- chart ----------

function currentZoom(): { start: number; end: number } | null {
  return app.zoom;
}

function renderChart(animate: boolean) {
  const height = chartEl.clientHeight || 600;
  app.chart.setOption(
    buildChartOption(app.scn, app.session, { theme: 'dark', height, focusKey: app.focusKey, animate, zoom: app.zoom }),
    { notMerge: true },
  );
  emptyHint.hidden = app.scn.products.length > 0 || app.scn.ibogaineAt !== null;
}

function setFocus(key: string | null) {
  app.focusKey = app.focusKey === key ? null : key;
  renderChart(false);
  renderLegend();
}

function initChart() {
  app.chart = echarts.init(chartEl, null, { renderer: 'canvas' });
  app.chart.on('datazoom', () => {
    const dz = (app.chart.getOption().dataZoom as { startValue?: number; endValue?: number }[])[0];
    if (dz?.startValue !== undefined && dz.endValue !== undefined) app.zoom = { start: dz.startValue, end: dz.endValue };
  });
  app.chart.on('click', (p) => {
    const id = String((p as { seriesId?: string }).seriesId ?? '');
    if (id.startsWith('line:')) setFocus(id.slice(5).split(':')[0]);
  });
  app.chart.getZr().on('click', (e) => {
    if (!e.target && app.focusKey) setFocus(null);
  });
  let pending = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      app.chart.resize();
      if (app.scn) renderChart(false);
    });
  }).observe(chartEl);
}

// ---------- legend ----------

function entryBadges(p: Product, compoundsVerified = true) {
  return p.userEntered ? badge('user-entered', 'user') : !p.verified || !compoundsVerified ? badge('unverified', 'warn') : null;
}

function renderLegend() {
  const scn = app.scn;
  const cats = app.idx.lib.categories;
  const s = S();
  const item = (key: string, name: string, color: string, sub: string, extra: (Node | null)[] = []) =>
    h('button', {
      type: 'button',
      class: `legend-item ${app.focusKey === key ? 'focused' : ''} ${app.focusKey && app.focusKey !== key ? 'dimmed' : ''}`,
      onclick: () => setFocus(key),
      title: 'Click to highlight this product and its metabolites',
    },
      h('span', { class: 'swatch', style: `--c:${color}` }),
      h('span', { class: 'legend-name' }, name),
      h('span', { class: 'legend-sub' }, sub),
      ...extra);
  const groups: Node[] = [];
  const ib = scn.products.find((r) => r.isIbogaine);
  if (ib)
    groups.push(h('div', { class: 'legend-group' },
      h('span', { class: 'legend-cat', style: '--c:#e8c36a' }, 'Treatment'),
      item(IBOGAINE_KEY, ib.name, ib.color, ib.pmAdjusted ? 'CYP2D6 inhibited' : '', [entryBadges(ib.product, ib.curves.every((c) => c.compound.verified))])));
  for (const cat of cats) {
    const rs = scn.products.filter((r) => !r.isIbogaine && r.product.category === cat.id);
    if (!rs.length) continue;
    groups.push(h('div', { class: 'legend-group' },
      h('span', { class: 'legend-cat', style: `--c:${categoryColor(cat.id)}` }, cat.name),
      ...rs.map((r) => {
        const nonlinear = r.curves.some((c) => c.compound.nonlinearKinetics.flag);
        return item(r.key, r.name, r.color,
          r.clearAt === null ? 'clear: beyond window' : `clear ${fmtDate(r.clearAt, s)}`,
          [
            nonlinear ? h('span', { class: 'warn-icon', title: r.curves.filter((c) => c.compound.nonlinearKinetics.flag).map((c) => `${c.compound.name}: nonlinear kinetics — not modelled. ${c.compound.nonlinearKinetics.note}`).join('\n') }, '⚠') : null,
            entryBadges(r.product, r.curves.every((c) => c.compound.verified || c.compound.userEntered)),
          ]);
      })));
  }
  const hasMetabolites = scn.products.some((r) => r.curves.some((c) => c.depth > 0));
  if (groups.length && hasMetabolites && s.showMetabolites)
    groups.push(h('span', { class: 'legend-key' }, h('span', { class: 'k-solid' }), 'parent', h('span', { class: 'k-dash' }), 'metabolites',
      s.showBands ? [h('span', { class: 'k-band' }), 'min–max range'] : null));
  legendEl.replaceChildren(...groups);
}

// ---------- warnings ----------

function renderWarnings() {
  const scn = app.scn;
  const items: Node[] = [];
  for (const e of app.libraryErrors) items.push(h('div', { class: 'warning danger' }, '⛔ ', e));
  for (const w of scn.warnings.filter((w) => w.level === 'danger')) items.push(h('div', { class: 'warning danger big' }, '⚠ ', w.text));
  if (scn.overlaps.length)
    items.push(h('div', { class: 'overlaps' },
      h('div', { class: 'overlaps-title' }, 'Receptor overlap at the ibogaine date'),
      ...scn.overlaps.map((o) => h('div', { class: 'overlap' },
        h('b', null, o.target), ' — ',
        o.hits.map((x) => `${x.compound} (${x.action})`).join(', ')))));
  for (const w of scn.warnings.filter((w) => w.level !== 'danger')) items.push(h('div', { class: `warning ${w.level}` }, w.level === 'warn' ? '⚠ ' : 'ℹ ', w.text));
  warningsEl.replaceChildren(...items);
  warningsEl.hidden = items.length === 0;
}

function renderBanner() {
  bannerEl.replaceChildren();
  if (app.demo) bannerEl.append(h('div', { class: 'banner demo' }, 'DEMO DATA — fictional development compounds are loaded. Not real pharmacology.'));
}

// ---------- side panel ----------

function renderSide() {
  if (app.tab === 'doses') renderDosesTab();
  else if (app.tab === 'patient') renderPatientTab();
  else renderSettingsTab();
}

// Doses tab ------------------------------------------------------------

const doseListEl = h('div', { class: 'dose-list' });
let editing: DoseEntry | null = null;
let formProduct: string | null = null;

const picker = createPicker({
  search: () => app.search,
  products: () => app.idx.lib.products,
  categories: () => app.idx.lib.categories,
  hasData: (p) => productHasData(app.idx, p),
  recents: () => app.session.recents,
  onSelect: (id) => {
    formProduct = id;
    editing = null;
    renderDoseForm();
    requestAnimationFrame(() => (doseFormEl.querySelector('input[name=amount]') as HTMLInputElement | null)?.focus());
  },
  onCustom: (name) => launchWizard(name),
});

const doseFormEl = h('div', { class: 'dose-form' });

function defaultTime() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return toLocalInput(d.getTime());
}

function renderDoseForm() {
  if (!formProduct) {
    doseFormEl.replaceChildren();
    return;
  }
  const p = app.idx.products.get(formProduct);
  if (!p) return;
  const d: DoseEntry = editing
    ? structuredClone(editing)
    : { id: uid(), productId: p.id, amountMg: p.typicalDoseMg || 0, kind: 'single', time: defaultTime() };
  d.regimen ??= { every: 24, unit: 'hours', start: d.time ?? defaultTime(), end: toLocalInput(Date.now()) };

  const mgkg = h('span', { class: 'mgkg' });
  const updMgkg = () => {
    const w = app.session.patient.weightKg;
    mgkg.textContent = w > 0 && d.amountMg > 0 ? `${(d.amountMg / w).toFixed(2)} mg/kg` : '';
  };
  updMgkg();
  const amount = numberInput(d.amountMg, (v) => { d.amountMg = v; updMgkg(); }, { name: 'amount', min: '0', placeholder: 'mg' });
  const single = h('div', { class: 'single' });
  const regimen = h('div', { class: 'regimen' });
  const time = h('input', { type: 'datetime-local', value: d.time ?? '' });
  time.addEventListener('input', () => (d.time = time.value));
  single.append(field('Date & time', time));
  const r = d.regimen!;
  const start = h('input', { type: 'datetime-local', value: r.start });
  start.addEventListener('input', () => (r.start = start.value));
  const end = h('input', { type: 'datetime-local', value: r.end });
  end.addEventListener('input', () => (r.end = end.value));
  const count = h('span', { class: 'field-hint' });
  const updCount = () => {
    const n = expandDose({ ...d, kind: 'regimen' }).length;
    count.textContent = n ? `${n} doses` : '';
  };
  for (const el of [start, end]) el.addEventListener('input', updCount);
  regimen.append(
    h('div', { class: 'row' },
      field('Every', numberInput(r.every, (v) => { r.every = v; updCount(); }, { min: '0' })),
      field('Unit', select(r.unit, ['hours', 'days'] as const, (v) => { r.unit = v; updCount(); }))),
    h('div', { class: 'row' }, field('Start', start), field('End', end)), count);
  updCount();
  const setKind = (k: DoseEntry['kind']) => {
    d.kind = k;
    single.hidden = k !== 'single';
    regimen.hidden = k !== 'regimen';
    kindBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  };
  const kindBtns = (['single', 'regimen'] as const).map((k) =>
    h('button', { type: 'button', class: 'seg', dataset: { k }, onclick: () => setKind(k) }, k === 'single' ? 'Single dose' : 'Regimen'));

  const submit = () => {
    if (!(d.amountMg > 0)) return toast('Enter an amount in mg.');
    if (d.kind === 'single') {
      if (!Number.isFinite(parseLocal(d.time))) return toast('Enter the date and time of the dose.');
      delete d.regimen;
    } else {
      if (!expandDose(d).length) return toast('Check the regimen: interval > 0 and end after start.');
      delete d.time;
    }
    if (editing) app.session.doses = app.session.doses.map((x) => (x.id === editing!.id ? d : x));
    else app.session.doses.push(d);
    app.session.recents = [p.id, ...app.session.recents.filter((x) => x !== p.id)].slice(0, 8);
    editing = null;
    formProduct = null;
    renderDoseForm();
    commit('doses');
    picker.input.focus();
  };
  // Enter flows amount → date → add.
  amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (d.kind === 'single' ? time : start).focus(); } });
  time.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  const compound = app.idx.compounds.get(p.parentCompound);
  doseFormEl.replaceChildren(
    h('div', { class: 'dose-form-head' },
      h('div', null,
        h('div', { class: 'df-name' }, displayName(p), h('span', { class: 'pi-route' }, ' · ', p.route)),
        h('div', { class: 'df-meta' }, categoryTag(app.idx.lib.categories.find((c) => c.id === p.category), true), p.class ? ` ${p.class}` : '', ' ',
          entryBadges(p, compound?.verified ?? false))),
      h('button', { class: 'icon-btn', type: 'button', title: 'Cancel', onclick: () => { formProduct = null; editing = null; renderDoseForm(); } }, '✕')),
    h('div', { class: 'segmented' }, ...kindBtns),
    h('div', { class: 'row' }, field('Amount (mg)', amount, mgkg)),
    single, regimen,
    h('button', { class: 'btn btn-primary wide', type: 'button', onclick: submit }, editing ? 'Save changes' : 'Add dose'),
  );
  setKind(d.kind);
}

function doseSummary(d: DoseEntry) {
  const s = S();
  if (d.kind === 'single') return d.time ? fmtDateTime(parseLocal(d.time), s) : '—';
  const r = d.regimen!;
  return `every ${r.every} ${r.unit} · ${fmtDate(parseLocal(r.start), s)} → ${fmtDate(parseLocal(r.end), s)} (${expandDose(d).length}×)`;
}

function renderDoseList() {
  const colors = productColors(app.session);
  const groups: Node[] = [];
  const cats = app.idx.lib.categories;
  const byCat = new Map<string, DoseEntry[]>();
  for (const d of app.session.doses) {
    const p = app.idx.products.get(d.productId);
    const k = p?.category ?? '__unknown';
    byCat.set(k, [...(byCat.get(k) ?? []), d]);
  }
  for (const cat of [...cats, { id: '__unknown', name: 'Unknown product', order: 99 }]) {
    const ds = byCat.get(cat.id);
    if (!ds) continue;
    groups.push(h('div', { class: 'dose-group' },
      h('div', { class: 'dose-cat', style: `--c:${categoryColor(cat.id)}` }, cat.name),
      ...ds.map((d) => {
        const p = app.idx.products.get(d.productId);
        const res = app.scn.products.find((r) => r.key === d.productId);
        return h('div', { class: 'dose-item' },
          h('span', { class: 'swatch', style: `--c:${colors.get(d.productId) ?? '#888'}` }),
          h('div', { class: 'dose-main' },
            h('div', { class: 'dose-name' }, p ? displayName(p) : d.productId, h('span', { class: 'pi-route' }, p ? ` · ${p.route}` : ''), ' ',
              p && !productHasData(app.idx, p) ? badge('no data yet', 'muted') : null, p ? entryBadges(p) : null),
            h('div', { class: 'dose-sub' }, `${d.amountMg} mg · ${doseSummary(d)}`),
            res ? h('div', { class: 'dose-clear' }, res.clearAt === null ? 'Clear: beyond window' : `Clear ≈ ${fmtDateTime(res.clearAt, S())}`) : null),
          h('div', { class: 'dose-actions' },
            h('button', { class: 'icon-btn', type: 'button', title: 'Edit', onclick: () => { editing = d; formProduct = d.productId; renderDoseForm(); } }, '✎'),
            h('button', { class: 'icon-btn', type: 'button', title: 'Delete', onclick: () => {
              app.session.doses = app.session.doses.filter((x) => x.id !== d.id);
              commit('doses');
            } }, '🗑')));
      })));
  }
  const ib = app.session.ibogaine;
  if (ib)
    groups.unshift(h('div', { class: 'dose-group' },
      h('div', { class: 'dose-cat', style: '--c:#e8c36a' }, 'Planned ibogaine'),
      h('div', { class: 'dose-item ib' },
        h('span', { class: 'swatch', style: '--c:#e8c36a' }),
        h('div', { class: 'dose-main' },
          h('div', { class: 'dose-name' }, `Flood ${ib.flood.mg || '—'} mg`),
          h('div', { class: 'dose-sub' }, ib.flood.time ? fmtDateTime(parseLocal(ib.flood.time), S()) : '—', ib.boosters.length ? ` · ${ib.boosters.length} booster(s)` : '')),
        h('div', { class: 'dose-actions' }, h('button', { class: 'icon-btn', type: 'button', title: 'Edit', onclick: () => openIbogaineForm() }, '✎')))));
  doseListEl.replaceChildren(...(groups.length ? groups : [h('div', { class: 'empty' }, 'No doses entered.')]));
}

function renderDosesTab() {
  sideBody.replaceChildren(
    h('div', { class: 'section' }, picker.el, doseFormEl,
      h('div', { class: 'row tight' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => launchWizard('') }, '+ Add custom drug'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openIbogaineForm() }, '✦ Ibogaine treatment'))),
    h('div', { class: 'section' }, h('h3', null, 'Entered doses'), doseListEl),
  );
  renderDoseForm();
  renderDoseList();
}

function launchWizard(name: string) {
  openWizard({
    library: app.idx.lib,
    custom: app.session.custom,
    prefillName: name,
    onSave: (add, productId) => {
      const c = app.session.custom;
      c.compounds.push(...add.compounds);
      c.products.push(...add.products);
      c.links = [...(c.links ?? []), ...(add.links ?? [])];
      commit('library');
      formProduct = productId;
      editing = null;
      if (app.tab === 'doses') renderDosesTab();
    },
  });
}

// Patient tab ----------------------------------------------------------

function renderPatientTab() {
  const p = app.session.patient;
  const ch = () => commit('patient');
  const age = h('span', { class: 'field-hint' });
  const updAge = () => {
    const a = ageFrom(p.dob);
    age.textContent = a !== null ? `Age ${a}` : '';
  };
  updAge();
  const dob = h('input', { type: 'date', value: p.dob });
  dob.addEventListener('input', () => { p.dob = dob.value; updAge(); ch(); });
  const weight = h('input', { type: 'number', step: 'any', min: '0' });
  const showWeight = () => (weight.value = p.weightKg > 0 ? String(+(p.weightUnit === 'lb' ? p.weightKg * 2.20462 : p.weightKg).toFixed(1)) : '');
  showWeight();
  weight.addEventListener('input', () => {
    const v = Number(weight.value) || 0;
    p.weightKg = p.weightUnit === 'lb' ? v / 2.20462 : v;
    ch();
  });
  const unit = select(p.weightUnit, ['kg', 'lb'] as const, (v) => { p.weightUnit = v; showWeight(); ch(); });
  const notes = h('textarea', { rows: 5 }, p.notes);
  notes.addEventListener('input', () => { p.notes = notes.value; saveSession(app.session); });
  sideBody.replaceChildren(h('div', { class: 'section form-section' },
    field('Name', textInput(p.name, (v) => { p.name = v; saveSession(app.session); })),
    h('div', { class: 'row' }, field('Date of birth', dob, age), field('Sex', select(p.sex, [['', '—'], ['female', 'Female'], ['male', 'Male'], ['other', 'Other']] as const, (v) => { p.sex = v; ch(); }))),
    h('div', { class: 'row' }, field('Body weight', weight, 'Used only for mg/kg display — it does not change the curves.'), field('Unit', unit)),
    field('CYP2D6 phenotype', select(p.phenotype, [['unknown', 'Unknown (widen range)'], ['poor', 'Poor'], ['intermediate', 'Intermediate'], ['normal', 'Normal'], ['ultrarapid', 'Ultrarapid']] as const, (v) => { p.phenotype = v; commit('view'); })),
    h('div', { class: 'row' },
      field('Baseline QTc (ms)', numberInput(p.qtcMs, (v) => { p.qtcMs = v; commit('view'); }, { min: '0' })),
      field('Formula', select(p.qtcFormula, ['Fridericia', 'Bazett'] as const, (v) => { p.qtcFormula = v; commit('view'); }))),
    field('Notes', notes)));
}

// Settings tab ---------------------------------------------------------

function toggle(label: string, value: boolean, set: (v: boolean) => void) {
  const i = h('input', { type: 'checkbox', checked: value });
  i.addEventListener('change', () => set(i.checked));
  return h('label', { class: 'check' }, i, label);
}

function renderSettingsTab() {
  const s = S();
  const view = () => commit('view');
  const pct = h('span', { class: 'field-hint' });
  const updPct = () => (pct.textContent = `≈ ${(100 * Math.pow(2, -s.clearHalfLives)).toFixed(2)}% of each compound’s peak remaining`);
  updPct();
  const custom = app.session.custom;
  sideBody.replaceChildren();
  append(sideBody, [
    h('div', { class: 'section form-section' },
      h('h3', null, 'Clearance'),
      field('Clear threshold (half-lives)', numberInput(s.clearHalfLives, (v) => { if (v > 0) { s.clearHalfLives = v; updPct(); view(); } }, { min: '1', step: '0.5' }), pct),
      field('CYP2D6 recovery half-life (h)', numberInput(s.cypRecoveryHalfLifeHours, (v) => { if (v > 0) { s.cypRecoveryHalfLifeHours = v; view(); } }, { min: '1' }),
        h('span', null, badge('verify', 'warn'), ' Enzyme resynthesis after mechanism-based inhibition. Default 51 h — check the literature.'))),
    h('div', { class: 'section form-section' },
      h('h3', null, 'Display'),
      h('div', { class: 'row' },
        field('Y-axis', select(s.yScale, [['linear', 'Linear'], ['log', 'Log']] as const, (v) => { s.yScale = v; view(); })),
        field('Units', select(s.units, [['mg', 'mg amount'], ['percent', '% of dose']] as const, (v) => { s.units = v; view(); }))),
      toggle('Show metabolites', s.showMetabolites, (v) => { s.showMetabolites = v; view(); }),
      toggle('Show range bands (min–max half-life)', s.showBands, (v) => { s.showBands = v; view(); }),
      toggle('CYP2D6 inhibition track', s.showCypTrack, (v) => { s.showCypTrack = v; view(); }),
      toggle('QT load track', s.showQtTrack, (v) => { s.showQtTrack = v; view(); }),
      toggle('Lingering effects track', s.showLingeringTrack, (v) => { s.showLingeringTrack = v; view(); }),
      h('div', { class: 'row' },
        field('Date format', select(s.dateOrder, [['dmy', 'Day first (31/12)'], ['mdy', 'Month first (12/31)']] as const, (v) => { s.dateOrder = v; view(); renderSettingsTab(); })),
        field('Time', select(s.hour12 ? '12' : '24', [['24', '24-hour'], ['12', '12-hour']] as const, (v) => { s.hour12 = v === '12'; view(); })))),
    h('div', { class: 'section form-section' },
      h('h3', null, 'Exports'),
      field('Clinic name (export header)', textInput(s.clinicName, (v) => { s.clinicName = v; saveSession(app.session); }))),
    h('div', { class: 'section' },
      h('h3', null, 'Custom drugs'),
      custom.products.length
        ? custom.products.map((p) =>
            h('div', { class: 'custom-item' },
              h('span', null, p.name, ' ', badge('user-entered', 'user')),
              h('span', { class: 'spacer' }),
              h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => copyLibraryEntry(customBundle(p), app.idx.lib) }, 'Copy as library entry'),
              h('button', { class: 'icon-btn', type: 'button', title: 'Delete', onclick: () => deleteCustom(p) }, '🗑')))
        : h('div', { class: 'empty' }, 'None. Use “Add custom drug” in the Doses tab.')),
    import.meta.env.DEV
      ? h('div', { class: 'section' },
          h('h3', null, 'Developer'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => { s.demoData = !s.demoData; await applyDemoSetting(); commit('library'); renderSettingsTab(); } },
            s.demoData ? 'Unload demo data' : 'Load demo data'),
          h('p', { class: 'field-hint' }, 'Dev builds only. Fictional compounds for testing the UI; never shipped.'))
      : null,
    h('div', { class: 'section' },
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => {
        if (!confirm('Clear all data in this browser? Patient details, doses, custom drugs and settings will be deleted. This cannot be undone.')) return;
        clearStoredSession();
        app.session = emptySession();
        app.demo = null;
        rebuildLibrary();
        commit('library');
        setTab('doses');
      } }, 'Clear all data')),
  ]);
}

/** A custom product plus every custom compound in its tree. */
function customBundle(p: Product): CustomDrugs {
  const c = app.session.custom;
  const ids = new Set([p.parentCompound]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const x of c.compounds) if (!ids.has(x.id) && x.formedFrom.some((f) => ids.has(f.compound))) { ids.add(x.id); grew = true; }
  }
  return {
    compounds: c.compounds.filter((x) => ids.has(x.id)),
    products: [p],
    links: (c.links ?? []).filter((l) => ids.has(l.from)),
  };
}

function deleteCustom(p: Product) {
  const inUse = app.session.doses.some((d) => d.productId === p.id);
  if (!confirm(`Delete custom drug “${p.name}”?${inUse ? ' Its doses will be removed too.' : ''}`)) return;
  const b = customBundle(p);
  const c = app.session.custom;
  const otherParents = new Set(c.products.filter((x) => x.id !== p.id).map((x) => x.parentCompound));
  const drop = new Set(b.compounds.map((x) => x.id).filter((id) => !otherParents.has(id)));
  c.products = c.products.filter((x) => x.id !== p.id);
  if (!c.products.some((x) => x.parentCompound === p.parentCompound)) {
    c.compounds = c.compounds.filter((x) => !drop.has(x.id));
    c.links = (c.links ?? []).filter((l) => !drop.has(l.from));
  }
  app.session.doses = app.session.doses.filter((d) => d.productId !== p.id);
  commit('library');
  renderSettingsTab();
}

// ---------- ibogaine form ----------

function openIbogaineForm() {
  const ib: IbogaineTreatment = structuredClone(app.session.ibogaine) ?? {
    flood: { mg: 0, time: toLocalInput(Math.ceil((Date.now() + 14 * DAY) / HOUR) * HOUR) },
    boosters: [],
  };
  const w = () => app.session.patient.weightKg;
  const ibProduct = app.idx.lib.products.find((p) => p.parentCompound === 'ibogaine');
  const noData = !ibProduct || !productHasData(app.idx, ibProduct);
  const doseRow = (d: { mg: number; time: string }, label: string, onRemove?: () => void) => {
    const mgkg = h('span', { class: 'mgkg' });
    const upd = () => (mgkg.textContent = w() > 0 && d.mg > 0 ? `${(d.mg / w()).toFixed(1)} mg/kg` : w() > 0 ? '' : 'set weight in Patient tab for mg/kg');
    upd();
    const t = h('input', { type: 'datetime-local', value: d.time });
    t.addEventListener('input', () => (d.time = t.value));
    return h('div', { class: 'row ib-row' },
      h('span', { class: 'ib-label' }, label),
      field('mg', numberInput(d.mg, (v) => { d.mg = v; upd(); }, { min: '0' }), mgkg),
      field('Time', t),
      onRemove ? h('button', { class: 'icon-btn', type: 'button', title: 'Remove', onclick: onRemove }, '✕') : null);
  };
  const boostersEl = h('div', { class: 'boosters' });
  const renderBoosters = () =>
    boostersEl.replaceChildren(
      ...ib.boosters.map((b, i) => doseRow(b, `Booster ${i + 1}`, () => { ib.boosters.splice(i, 1); renderBoosters(); })),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
        const last = ib.boosters[ib.boosters.length - 1] ?? ib.flood;
        ib.boosters.push({ mg: 0, time: toLocalInput((parseLocal(last.time) || Date.now()) + 6 * HOUR) });
        renderBoosters();
      } }, '+ Add booster'));
  renderBoosters();
  const m = modal('Ibogaine treatment', h('div', { class: 'form-section' },
    h('p', { class: 'field-hint' }, 'The flood dose time is the planned treatment date (bold marker). Projected ibogaine and noribogaine are plotted forward; if CYP2D6 is likely inhibited at that time, the projection uses the poor-metaboliser multiplier.'),
    noData ? h('div', { class: 'warning info' }, 'ℹ Ibogaine has no half-life data in the library yet — only the date marker will be shown.') : null,
    doseRow(ib.flood, 'Flood'),
    boostersEl,
    h('div', { class: 'wizard-foot' },
      app.session.ibogaine ? h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { app.session.ibogaine = null; m.close(); commit('doses'); } }, 'Remove treatment') : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
        if (!Number.isFinite(parseLocal(ib.flood.time))) return toast('Set the flood dose time.');
        app.session.ibogaine = ib;
        m.close();
        commit('doses');
      } }, 'Save'))));
}

// ---------- boot ----------

async function applyDemoSetting() {
  if (import.meta.env.DEV && app.session.settings.demoData) {
    const mod = await import('../tools/demo-drugs.json');
    app.demo = mod.default as unknown as Library;
  } else {
    app.demo = null;
    app.session.settings.demoData = false;
  }
}

async function boot() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}drugs.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    app.base = await res.json();
    const v = validateLibrary(app.base);
    app.libraryErrors = v.errors.slice(0, 20).map((e) => `drugs.json — ${e.id}: ${e.message}`);
    if (v.errors.length > 20) app.libraryErrors.push(`…and ${v.errors.length - 20} more drugs.json errors (run npm run validate).`);
  } catch (e) {
    app.libraryErrors = [`Could not load drugs.json (${(e as Error).message}). Run npm run init-data to create it.`];
  }
  await applyDemoSetting();
  rebuildLibrary();
  initChart();
  commit('library');
  setTab('doses');
}

const showError = (e: unknown) => toast(`Unexpected error: ${(e as Error)?.message ?? String(e)}`, 6000);
window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

boot();
