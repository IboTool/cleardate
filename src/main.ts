// ClearDate — app entry. Fully client-side: the only fetch is drugs.json from this same static site.

import '@fontsource-variable/inter';
import './styles.css';
import * as echarts from './echarts';
import { buildChartOption, minChartHeight } from './chart';
import { exportPdf, exportPng, download, DISCLAIMER } from './export';
import { ageFrom, fmtDate, fmtDateTime, fmtEvery } from './format';
import { dateTimeInput } from './ui/datetime';
import {
  buildIndex, clearStatusText, combinationText, componentIds, computeScenario, convertUnit, describeIbogaineDose, displayName, expandDose,
  expandIbogaine, findIbogaineProduct, IBOGAINE_KEY, IBOGAINE_KIND_LABEL, isRateUnit, mergeLibraries, missingKinetics, parseLocal, productColors, productDataStatus, productHasData, toLocalInput, toMg, withCustom,
  DAY, HOUR, type LibraryIndex, type ProductResult, type Scenario,
} from './model';
import { primaryCompound, SCHEMA_VERSION } from './schema';
import { buildRecords, ProductSearch } from './search';
import {
  clearStoredSession, emptySession, loadSession, normaliseSession, patientFileName, resolveCustomClashes, saveSession,
} from './state';
import { IBOGAINE_DOSE_KINDS, type CustomDrugs, type DoseEntry, type IbogaineDose, type IbogaineDoseKind, type IbogaineTreatment, type Library, type Product, type Session } from './types';
import { validateLibrary } from './validate';
import { replacementsFor } from '../tools/product-rules';
import { $, append, badge, field, h, modal, numberInput, select, textInput, toast } from './ui/dom';
import { categoryColor, categoryTag, createPicker, productBadges } from './ui/picker';
import { copyLibraryEntry, openWizard } from './ui/wizard';

// ---------- app state ----------

const app = {
  base: { schemaVersion: SCHEMA_VERSION, categories: [], compounds: [], products: [] } as Library,
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
const chartWrap = h('div', { class: 'chart-wrap glass' }, chartEl, emptyHint);
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
    resolveOrphanDoses();
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
    h('button', { class: 'btn btn-gold', type: 'button', onclick: () => openIbogaineForm() }, '✦ Ibogaine'),
    h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { app.zoom = null; renderChart(false); } }, 'Reset view'),
    h('div', { class: 'btn-group' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportPng(app.scn, app.session, currentZoom()) }, 'PNG'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => exportPdf(app.scn, app.session, app.idx, currentZoom()) }, 'PDF')),
    h('div', { class: 'btn-group' },
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: savePatientFile }, 'Save file'),
      h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => fileInput.click() }, 'Load file')),
    h('a', { class: 'btn btn-ghost', href: 'help.html', title: 'How to use ClearDate' }, h('span', { class: 'help-q', 'aria-hidden': 'true' }, '?'), 'Help'),
    fileInput),
  bannerEl,
  h('main', { class: 'layout' },
    h('aside', { class: 'side glass' }, h('nav', { class: 'tabs' }, ...tabs), sideBody),
    h('section', { class: 'stage' },
      legendEl,
      chartWrap,
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
  chartWrap.style.setProperty('--chart-min', `${minChartHeight(app.scn, app.session) + 6}px`);
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

const dataStatus = (p: Product) => productDataStatus(app.idx, p, S().unknownAsFormationLimited);
const entryBadges = (p: Product, compoundsVerified = true) => productBadges(p, dataStatus(p), compoundsVerified);

/** Short legend form of the clear status. */
function legendClear(r: ProductResult, s: Session['settings']): string {
  if (r.status === 'incomplete') return r.clearAt === null ? 'incomplete' : `≥ ${fmtDate(r.clearAt, s)} (incomplete)`;
  const base = r.clearAt === null ? 'clear: beyond window' : `clear ${fmtDate(r.clearAt, s)}`;
  return r.status === 'assumptions' ? `${base}*` : base;
}

function statusTitle(r: ProductResult): string {
  const lines = [clearStatusText(r, (t) => fmtDateTime(t, S()))];
  if (r.assumptions.length) lines.push('', 'Assumptions:', ...r.assumptions.map((a) => `• ${a}`));
  if (r.excluded.length) lines.push('', 'Excluded from the clear date:', ...r.excluded.map((a) => `• ${a}`));
  if (r.notes.length) lines.push('', ...r.notes.map((a) => `• ${a}`));
  if (r.administered) lines.push('', 'Amounts are on an administered basis (bioavailability not applied).');
  return lines.join('\n');
}

function renderLegend() {
  const scn = app.scn;
  const cats = app.idx.lib.categories;
  const s = S();
  const item = (key: string, name: string, color: string, sub: string, extra: (Node | null)[] = [], title = '') =>
    h('button', {
      type: 'button',
      class: `legend-item ${app.focusKey === key ? 'focused' : ''} ${app.focusKey && app.focusKey !== key ? 'dimmed' : ''}`,
      onclick: () => setFocus(key),
      title: `${title ? title + '\n\n' : ''}${app.focusKey === key ? 'Click again, or Show all, to show every product' : 'Click to highlight this product and its metabolites'}`,
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
      item(IBOGAINE_KEY, ib.name, ib.color, ib.pmAdjusted ? 'CYP2D6 inhibited' : '', [...entryBadges(ib.product, ib.curves.every((c) => c.compound.verified))], statusTitle(ib))));
  for (const cat of cats) {
    const rs = scn.products.filter((r) => !r.isIbogaine && r.product.category === cat.id);
    if (!rs.length) continue;
    groups.push(h('div', { class: 'legend-group' },
      h('span', { class: 'legend-cat', style: `--c:${categoryColor(cat.id)}` }, cat.name),
      ...rs.map((r) => {
        const nonlinear = r.curves.some((c) => c.compound.nonlinearKinetics.flag === 'yes');
        return item(r.key, r.name, r.color, legendClear(r, s),
          [
            nonlinear ? h('span', { class: 'warn-icon', title: r.curves.filter((c) => c.compound.nonlinearKinetics.flag === 'yes').map((c) => `${c.compound.name}: nonlinear kinetics — not modelled. ${c.compound.nonlinearKinetics.note}`).join('\n') }, '⚠') : null,
            ...entryBadges(r.product, r.curves.every((c) => c.compound.verified || c.compound.userEntered)),
          ], statusTitle(r));
      })));
  }
  const hasMetabolites = scn.products.some((r) => r.curves.some((c) => c.depth > 0));
  const hasNormalized = scn.products.some((r) => r.curves.some((c) => c.normalized));
  const hasAssumptions = scn.products.some((r) => r.status !== 'clear');
  const focused = app.focusKey !== null && scn.products.some((r) => r.key === app.focusKey);
  if (groups.length && ((hasMetabolites && s.showMetabolites) || hasAssumptions || focused))
    groups.push(h('span', { class: 'legend-key' },
      hasMetabolites && s.showMetabolites ? [h('span', { class: 'k-solid' }), 'parent', h('span', { class: 'k-dash' }), 'metabolites'] : null,
      s.showBands ? [h('span', { class: 'k-band' }), 'min–max range'] : null,
      hasNormalized ? [h('span', { class: 'k-dot' }), '% of own peak — amount unknown'] : null,
      hasAssumptions ? h('span', null, '* with assumptions · ≥ incomplete (hover for details)') : null,
      focused ? h('button', { type: 'button', class: 'btn btn-sm show-all', title: 'Show every product again (Esc)', onclick: () => setFocus(null) }, '✕ Show all') : null));
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
/** The dose being entered in the open form, kept across re-renders and page visits until it is added or cancelled. */
let formDraft: DoseEntry | null = null;

function openDoseForm(productId: string | null, dose: DoseEntry | null = null) {
  formProduct = productId;
  editing = dose;
  formDraft = null;
  renderDoseForm();
}

const picker = createPicker({
  search: () => app.search,
  products: () => app.idx.lib.products,
  categories: () => app.idx.lib.categories,
  status: dataStatus,
  recents: () => app.session.recents,
  onSelect: (id) => {
    openDoseForm(id);
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
  const unit = p.doseUnit;
  const rate = isRateUnit(unit);
  const depot = p.input.type === 'first-order-release' && p.formulation === 'depot';
  const typical = p.typicalDose.amount !== null ? convertUnit(p.typicalDose.amount, p.typicalDose.unit, unit) : null;
  const d: DoseEntry = formDraft?.productId === p.id
    ? formDraft
    : editing
      ? structuredClone(editing)
      : { id: uid(), productId: p.id, amount: typical ?? 0, unit, kind: 'single', time: defaultTime() };
  formDraft = d;
  if (d.unit !== unit) {
    const v = convertUnit(d.amount, d.unit, unit);
    d.amount = v ?? 0;
    d.unit = unit;
  }
  const defaultDur = p.input.defaultDurationHours ?? 24;
  if (rate) d.durationHours ??= defaultDur;
  else delete d.durationHours;
  d.regimen ??= { every: rate ? defaultDur : 24, unit: 'hours', start: d.time ?? defaultTime(), end: toLocalInput(Date.now()) };

  const hint = h('span', { class: 'mgkg' });
  const updHint = () => {
    const w = app.session.patient.weightKg;
    const combo = combinationText(app.idx, p, d.amount, unit);
    const perKg = !rate && w > 0 && d.amount > 0 ? `${(toMg(d.amount, unit) / w).toFixed(2)} mg/kg` : '';
    hint.textContent = [combo, perKg].filter(Boolean).join(' · ');
  };
  updHint();
  const amount = numberInput(d.amount, (v) => { d.amount = v; updHint(); updRemoved(); }, {
    name: 'amount', min: '0', step: 'any',
    placeholder: typical !== null ? `typical ${+typical.toPrecision(3)} ${unit}${p.typicalDose.basis ? ` (${p.typicalDose.basis})` : ''}` : unit,
  });
  const single = h('div', { class: 'single' });
  const regimen = h('div', { class: 'regimen' });
  const time = dateTimeInput(d.time ?? '', (v) => { d.time = v; updRemoved(); }, S(), { name: 'time' });
  const removed = dateTimeInput('', (v) => {
    const hrs = (parseLocal(v) - parseLocal(d.time)) / HOUR;
    if (hrs > 0) d.durationHours = hrs;
  }, S(), { name: 'removed' });
  const updRemoved = () => {
    const t = parseLocal(d.time);
    removed.value = rate && Number.isFinite(t) ? toLocalInput(t + (d.durationHours ?? defaultDur) * HOUR) : '';
  };
  updRemoved();
  single.append(rate
    ? h('div', { class: 'row' }, field('Applied at', time), field('Removed at', removed))
    : field(depot ? 'Injection date & time' : 'Date & time', time));
  const r = d.regimen!;
  const start = dateTimeInput(r.start, (v) => { r.start = v; updCount(); }, S(), { name: 'start' });
  const end = dateTimeInput(r.end, (v) => { r.end = v; updCount(); }, S(), { name: 'end' });
  const count = h('span', { class: 'field-hint' });
  const updCount = () => {
    const n = expandDose({ ...d, kind: 'regimen' }).length;
    count.textContent = n ? `${n} ${rate ? 'applications' : depot ? 'injections' : 'doses'}` : '';
  };
  append(regimen, [
    h('div', { class: 'row' },
      field(rate ? 'Change every' : 'Every', numberInput(r.every, (v) => { r.every = v; updCount(); }, { min: '0' })),
      field('Unit', select(r.unit, ['hours', 'days'] as const, (v) => { r.unit = v; updCount(); }))),
    rate ? field('Each patch worn for (hours)', numberInput(d.durationHours ?? defaultDur, (v) => { if (v > 0) d.durationHours = v; }, { min: '0' })) : null,
    h('div', { class: 'row' }, field('Start', start), field('End', end)), count]);
  updCount();
  const setKind = (k: DoseEntry['kind']) => {
    d.kind = k;
    single.hidden = k !== 'single';
    regimen.hidden = k !== 'regimen';
    kindBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === k));
  };
  const kindLabels = rate ? ['Single patch', 'Patch changes'] : depot ? ['Single injection', 'Repeated injections'] : ['Single dose', 'Regimen'];
  const kindBtns = (['single', 'regimen'] as const).map((k, i) =>
    h('button', { type: 'button', class: 'seg', dataset: { k }, onclick: () => setKind(k) }, kindLabels[i]));

  const submit = () => {
    if (!(d.amount > 0)) return toast(`Enter ${rate ? 'the rate' : 'an amount'} in ${unit}.`);
    if (d.kind === 'single') {
      if (!Number.isFinite(parseLocal(d.time))) return toast(rate ? 'Enter when the patch was applied.' : 'Enter the date and time of the dose.');
      delete d.regimen;
    } else {
      if (!expandDose(d).length) return toast('Check the regimen: interval > 0 and end after start.');
      delete d.time;
    }
    if (editing) app.session.doses = app.session.doses.map((x) => (x.id === editing!.id ? d : x));
    else app.session.doses.push(d);
    app.session.recents = [p.id, ...app.session.recents.filter((x) => x !== p.id)].slice(0, 8);
    openDoseForm(null);
    commit('doses');
    picker.input.focus();
  };
  // Enter flows amount → date → add.
  amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (d.kind === 'single' ? time : start).focus(); } });
  time.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  const compound = app.idx.compounds.get(primaryCompound(p));
  const status = dataStatus(p);
  const missing = status === 'incomplete' ? productTreeMissing(p) : [];
  const notes: (HTMLElement | null)[] = [
    status === 'incomplete' ? h('div', { class: 'warning info' }, `ℹ Missing kinetics for ${missing.join(', ')} — the clear date will be a lower bound.`) : null,
    p.input.type === 'first-order-release' && p.input.releaseHalfLifeHours === null
      ? h('div', { class: 'warning info' }, 'ℹ Release half-life not in the library yet — simulated as immediate release.') : null,
  ];
  const amountLabel = rate ? `Rate (${unit})` : depot ? `Amount per injection (${unit})` : p.components.length > 1 ? `Amount of ${compound?.name.toLowerCase() ?? 'primary component'} (${unit})` : `Amount (${unit})`;
  doseFormEl.replaceChildren(
    h('div', { class: 'dose-form-head' },
      h('div', null,
        h('div', { class: 'df-name' }, displayName(p), h('span', { class: 'pi-route' }, ' · ', p.route)),
        h('div', { class: 'df-meta' }, categoryTag(app.idx.lib.categories.find((c) => c.id === p.category), true), p.class ? ` ${p.class}` : '', ' ',
          ...entryBadges(p, compound?.verified ?? false))),
      h('button', { class: 'icon-btn', type: 'button', title: 'Cancel', onclick: () => openDoseForm(null) }, '✕')),
    ...notes.filter((n): n is HTMLElement => n !== null),
    h('div', { class: 'segmented' }, ...kindBtns),
    h('div', { class: 'row' }, field(amountLabel, amount, hint)),
    single, regimen,
    h('button', { class: 'btn btn-primary wide', type: 'button', onclick: submit }, editing ? 'Save changes' : 'Add dose'),
  );
  setKind(d.kind);
}

function productTreeMissing(p: Product): string[] {
  return missingKinetics(app.idx, p, S().unknownAsFormationLimited);
}

function doseSummary(d: DoseEntry, p: Product | undefined) {
  const s = S();
  const events = expandDose(d, p?.input.defaultDurationHours);
  const combo = p ? combinationText(app.idx, p, d.amount, d.unit) : null;
  const amount = combo ?? `${d.amount} ${d.unit}`;
  if (d.kind === 'single') {
    if (!d.time) return `${amount} · —`;
    const e = events[0];
    return e?.end ? `${amount} · ${fmtDateTime(e.time, s)} → ${fmtDateTime(e.end, s)}` : `${amount} · ${fmtDateTime(parseLocal(d.time), s)}`;
  }
  const r = d.regimen!;
  return `${amount} · ${fmtEvery(r.every, r.unit)} · ${fmtDate(parseLocal(r.start), s)} → ${fmtDate(parseLocal(r.end), s)} (${events.length}×)`;
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
              ...(p ? entryBadges(p) : [badge('not in library', 'warn')])),
            h('div', { class: 'dose-sub' }, doseSummary(d, p)),
            res ? h('div', { class: `dose-clear ${res.status}`, title: statusTitle(res) }, clearStatusText(res, (t) => fmtDateTime(t, S()))) : null),
          h('div', { class: 'dose-actions' },
            h('button', { class: 'icon-btn', type: 'button', title: 'Edit', onclick: () => openDoseForm(d.productId, d) }, '✎'),
            h('button', { class: 'icon-btn', type: 'button', title: 'Delete', onclick: () => {
              app.session.doses = app.session.doses.filter((x) => x.id !== d.id);
              commit('doses');
            } }, '🗑')));
      })));
  }
  const ib = app.session.ibogaine;
  if (ib) {
    const lines = [...ib.doses].sort((a, b) => parseLocal(a.time) - parseLocal(b.time)).map((d) => describeIbogaineDose(d, S()));
    groups.unshift(h('div', { class: 'dose-group' },
      h('div', { class: 'dose-cat', style: '--c:#e8c36a' }, 'Ibogaine'),
      h('div', { class: 'dose-item ib' },
        h('span', { class: 'swatch', style: '--c:#e8c36a' }),
        h('div', { class: 'dose-main' },
          ...lines.map((x, i) => h('div', { class: i ? 'ib-line' : 'ib-line first' },
            h('div', { class: 'dose-name' }, x.what),
            h('div', { class: 'dose-sub' }, x.when)))),
        h('div', { class: 'dose-actions' }, h('button', { class: 'icon-btn', type: 'button', title: 'Edit', onclick: () => openIbogaineForm() }, '✎')))));
  }
  doseListEl.replaceChildren(...(groups.length ? groups : [h('div', { class: 'empty' }, 'No doses entered.')]));
}

function renderDosesTab() {
  sideBody.replaceChildren(
    h('div', { class: 'section' }, picker.el, doseFormEl,
      h('div', { class: 'row tight' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => launchWizard('') }, '+ Add custom drug'),
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openIbogaineForm() }, '✦ Ibogaine'))),
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
      formDraft = null;
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
  const dob = dateTimeInput(p.dob, (v) => { p.dob = v; updAge(); ch(); }, S(), { withTime: false, name: 'dob' });
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
        h('span', null, badge('verify', 'warn'), ' Enzyme resynthesis after mechanism-based inhibition. Default 51 h — check the literature.')),
      field('Assumed spread when only one value is known (CV %)', numberInput(Math.round(s.assumedCv * 100), (v) => { if (v > 0 && v < 200) { s.assumedCv = v / 100; view(); } }, { min: '1', max: '199' }),
        'Used for half-lives entered as a single value or with a missing bound. Labelled “assumed spread” wherever it applies.'),
      toggle('Treat unknown metabolites as formation-limited', s.unknownAsFormationLimited, (v) => { s.unknownAsFormationLimited = v; view(); renderDoseForm(); }),
      h('p', { class: 'field-hint' }, 'Off: products with a metabolite of unknown kinetics are marked “Incomplete” and their clear date is a lower bound. On: those metabolites track their parent and the clear date is labelled “with assumptions”.')),
    h('div', { class: 'section form-section' },
      h('h3', null, 'Display'),
      h('div', { class: 'row' },
        field('Y-axis', select(s.yScale, [['linear', 'Linear'], ['log', 'Log']] as const, (v) => { s.yScale = v; view(); })),
        field('Units', select(s.units, [['mg', 'mg amount'], ['percent', '% of dose']] as const, (v) => { s.units = v; view(); }))),
      toggle('Show metabolites', s.showMetabolites, (v) => { s.showMetabolites = v; view(); }),
      toggle('Show inactive metabolites', s.showInactiveMetabolites, (v) => { s.showInactiveMetabolites = v; view(); }),
      h('p', { class: 'field-hint' }, 'Metabolites classed as clinically inactive are drawn fainter and never hold up a clear date.'),
      toggle('Show range bands (min–max half-life)', s.showBands, (v) => { s.showBands = v; view(); }),
      toggle('CYP2D6 inhibition track', s.showCypTrack, (v) => { s.showCypTrack = v; view(); }),
      toggle('QT liability track', s.showQtTrack, (v) => { s.showQtTrack = v; view(); renderSettingsTab(); }),
      qtLoadToggle(),
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
      ? h('div', { class: 'section dev-section' },
          h('h3', null, 'Developer'),
          h('button', { class: 'btn btn-ghost', type: 'button', onclick: async () => { s.demoData = !s.demoData; await applyDemoSetting(); commit('library'); renderSettingsTab(); } },
            s.demoData ? 'Unload demo data' : 'Load demo data'),
          h('p', { class: 'field-hint' }, 'Dev builds only. Fictional compounds for testing the UI; never shipped.'))
      : null,
    h('div', { class: 'section' },
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => {
        if (!confirm('Clear all data in this browser? Patient details, doses, custom drugs and settings will be deleted. This cannot be undone.')) return;
        clearStoredSession();
        sessionStorage.removeItem(UI_KEY);
        formProduct = null;
        editing = null;
        formDraft = null;
        app.session = emptySession();
        app.demo = null;
        rebuildLibrary();
        commit('library');
        setTab('doses');
      } }, 'Clear all data')),
  ]);
}

/** Summed QT load overlay: disabled (with the reason as a tooltip) unless every QT lane is calibrated. */
function qtLoadToggle() {
  const s = S();
  const qt = app.scn?.qt;
  const available = !!qt?.loadAvailable;
  const reason = qt?.loadUnavailableReason || 'Add doses to check availability.';
  const el = toggle('Summed relative QT load overlay', s.showQtLoad && available, (v) => { s.showQtLoad = v; commit('view'); });
  const input = el.querySelector('input')!;
  input.disabled = !available || !s.showQtTrack;
  el.title = available ? 'Qualitative sum of weight × amount / reference amount across QT-relevant compounds. Not a predicted ms change.' : `Unavailable: ${reason}`;
  el.classList.toggle('disabled', input.disabled);
  return el;
}

/** A custom product plus every custom compound in its tree. */
function customBundle(p: Product): CustomDrugs {
  const c = app.session.custom;
  const ids = new Set(componentIds(p));
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
  const otherParents = new Set(c.products.filter((x) => x.id !== p.id).flatMap(componentIds));
  const drop = new Set(b.compounds.map((x) => x.id).filter((id) => !otherParents.has(id)));
  c.products = c.products.filter((x) => x.id !== p.id);
  if (!c.products.some((x) => primaryCompound(x) === primaryCompound(p))) {
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
    doses: [{ id: uid(), kind: 'flood', mg: 0, time: toLocalInput(Math.ceil((Date.now() + 14 * DAY) / HOUR) * HOUR) }],
  };
  const w = () => app.session.patient.weightKg;
  const noData = !productHasData(app.idx, findIbogaineProduct(app.idx));
  const kindOptions = IBOGAINE_DOSE_KINDS.map((k) => [k, IBOGAINE_KIND_LABEL[k]] as [IbogaineDoseKind, string]);
  const doseCard = (d: IbogaineDose) => {
    const mgkg = h('span', { class: 'mgkg' });
    const upd = () => (mgkg.textContent = w() > 0 && d.mg > 0 ? `${(d.mg / w()).toFixed(1)} mg/kg` : w() > 0 ? '' : 'set weight in Patient tab for mg/kg');
    upd();
    const count = h('span', { class: 'field-hint' });
    const updCount = () => {
      const n = d.repeat ? expandIbogaine({ doses: [{ ...d, mg: 1 }] }).length : 0;
      count.textContent = d.repeat ? (n ? `${n} doses` : 'Check the interval and end date') : '';
    };
    const repeatBox = h('div', { class: 'row ib-repeat' });
    const timeField = field('Time', dateTimeInput(d.time, (v) => { d.time = v; updCount(); }, S(), { name: 'time' }));
    const renderRepeat = () => {
      const r = d.repeat;
      repeatBox.hidden = !r;
      timeField.querySelector('.field-label')!.textContent = r ? 'First dose' : 'Time';
      if (!r) return repeatBox.replaceChildren();
      repeatBox.replaceChildren(
        field('Every', numberInput(r.every, (v) => { r.every = v; updCount(); }, { min: '0', name: 'every' })),
        field('Unit', select(r.unit, ['hours', 'days'] as const, (v) => { r.unit = v; updCount(); })),
        field('Until', dateTimeInput(r.until, (v) => { r.until = v; updCount(); }, S(), { name: 'until' }), count));
      updCount();
    };
    const repeatToggle = h('input', { type: 'checkbox', checked: !!d.repeat });
    repeatToggle.addEventListener('change', () => {
      const start = parseLocal(d.time);
      d.repeat = repeatToggle.checked
        ? { every: d.kind === 'microdose' ? 2 : 24, unit: d.kind === 'microdose' ? 'days' : 'hours', until: toLocalInput((Number.isFinite(start) ? start : Date.now()) + 28 * DAY) }
        : null;
      renderRepeat();
    });
    renderRepeat();
    return h('div', { class: 'ib-dose' },
      h('div', { class: 'row ib-row' },
        field('Type', select(d.kind, kindOptions, (v) => { d.kind = v; }, { name: 'kind' })),
        field('mg', numberInput(d.mg, (v) => { d.mg = v; upd(); }, { min: '0', name: 'mg' }), mgkg),
        timeField,
        h('button', { class: 'icon-btn', type: 'button', title: 'Remove this dose', onclick: () => {
          ib.doses = ib.doses.filter((x) => x !== d);
          renderDoses();
        } }, '✕')),
      h('label', { class: 'check ib-repeat-toggle' }, repeatToggle, 'Repeat (e.g. microdosing)'),
      repeatBox);
  };
  const NEXT: Record<IbogaineDoseKind, [IbogaineDoseKind, number]> = {
    test: ['flood', 3], flood: ['booster', 12], booster: ['booster', 12], microdose: ['microdose', 24], other: ['other', 6],
  };
  const dosesEl = h('div', { class: 'ib-doses' });
  const renderDoses = () =>
    dosesEl.replaceChildren(
      ...ib.doses.map(doseCard),
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
        const last = [...ib.doses].sort((a, b) => parseLocal(b.time) - parseLocal(a.time))[0];
        const [kind, gap] = last ? NEXT[last.kind] : (['flood', 0] as const);
        const from = last ? parseLocal(last.repeat?.until ?? last.time) : Math.ceil((Date.now() + 14 * DAY) / HOUR) * HOUR;
        ib.doses.push({ id: uid(), kind, mg: 0, time: toLocalInput((Number.isFinite(from) ? from : Date.now()) + gap * HOUR) });
        renderDoses();
      } }, '+ Add dose'));
  renderDoses();
  const m = modal('Ibogaine', h('div', { class: 'form-section' },
    h('p', { class: 'field-hint' }, 'Enter every ibogaine dose: test doses, flood, boosters or microdoses. The first dose, whatever its type, is the treatment date (bold marker) that clear dates are measured against. Projected ibogaine and noribogaine are plotted forward; if CYP2D6 is likely inhibited at any dose, the projection uses the poor-metaboliser multiplier; where the library has none, the curve is unadjusted and labelled “not quantified”.'),
    noData ? h('div', { class: 'warning info' }, 'ℹ Ibogaine has no half-life data in the library yet — only the dose markers will be shown.') : null,
    dosesEl,
    h('div', { class: 'wizard-foot' },
      app.session.ibogaine ? h('button', { class: 'btn btn-danger', type: 'button', onclick: () => { app.session.ibogaine = null; m.close(); commit('doses'); } }, 'Remove all ibogaine doses') : null,
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
        if (!ib.doses.length) return toast('Add at least one dose, or use Remove all ibogaine doses.');
        for (const [i, d] of ib.doses.entries()) {
          const name = `${IBOGAINE_KIND_LABEL[d.kind]} (row ${i + 1})`;
          if (!(d.mg > 0)) return toast(`${name}: enter the amount in mg.`);
          if (!Number.isFinite(parseLocal(d.time))) return toast(`${name}: enter the date and time.`);
          if (d.repeat && !expandIbogaine({ doses: [d] }).length) return toast(`${name}: check the repeat interval and end date.`);
        }
        ib.doses.sort((a, b) => parseLocal(a.time) - parseLocal(b.time));
        app.session.ibogaine = ib;
        m.close();
        commit('doses');
      } }, 'Save'))));
}

// ---------- doses whose product was split or renamed in v2 ----------

function resolveOrphanDoses() {
  const lib = app.idx.lib;
  const oldIds = [...new Set(app.session.doses.filter((d) => !app.idx.products.has(d.productId)).map((d) => d.productId))];
  if (!oldIds.length || !lib.products.length) return;
  const choice = new Map<string, string>();
  const rows = oldIds.map((old) => {
    const options = replacementsFor(old, lib);
    const n = app.session.doses.filter((d) => d.productId === old).length;
    const first = options[0] ?? '__keep';
    choice.set(old, first);
    const opts: [string, string][] = [
      ...options.map((id) => [id, app.idx.products.get(id)?.name ?? id] as [string, string]),
      ['__keep', 'Keep as is (not plotted)'],
      ['__remove', `Remove ${n === 1 ? 'this dose' : `these ${n} doses`}`],
    ];
    return h('div', { class: 'form-section' },
      field(`${old} (${n} dose${n === 1 ? '' : 's'})`, select(first, opts.map((o) => o) as [string, string][], (v) => choice.set(old, v)),
        options.length ? 'This product was split or renamed. Pick the formulation that was taken.' : 'No direct replacement found in the library.'));
  });
  const m = modal('Update doses for changed products', h('div', { class: 'form-section' },
    h('p', { class: 'field-hint' }, 'The drug library was updated: some products were split by formulation (e.g. IR / ER, monthly / 3-monthly depot) or renamed. Choose what each saved dose refers to. Amounts are kept; check the unit afterwards.'),
    ...rows,
    h('div', { class: 'wizard-foot' },
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
        const doses: DoseEntry[] = [];
        for (const d of app.session.doses) {
          const c = choice.get(d.productId);
          if (c === '__remove') continue;
          if (c && c !== '__keep') {
            const p = app.idx.products.get(c)!;
            const amount = convertUnit(d.amount, d.unit, p.doseUnit);
            doses.push({ ...d, productId: c, ...(amount !== null ? { amount, unit: p.doseUnit } : {}) });
          } else doses.push(d);
        }
        app.session.doses = doses;
        m.close();
        commit('doses');
      } }, 'Apply'))));
}

// ---------- view state across page visits (e.g. to the help page and back) ----------

const UI_KEY = 'cleardate.ui';

interface UiState {
  tab: typeof app.tab;
  zoom: typeof app.zoom;
  focusKey: string | null;
  formProduct: string | null;
  editingId: string | null;
  draft: DoseEntry | null;
  sideScroll: number;
}

function saveUiState() {
  const ui: UiState = {
    tab: app.tab, zoom: app.zoom, focusKey: app.focusKey,
    formProduct, editingId: editing?.id ?? null, draft: formDraft, sideScroll: sideBody.scrollTop,
  };
  try {
    sessionStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* storage disabled: the session itself is still in localStorage */
  }
}

function restoreUiState() {
  let ui: Partial<UiState>;
  try {
    ui = JSON.parse(sessionStorage.getItem(UI_KEY) ?? '{}');
  } catch {
    return;
  }
  if (ui.formProduct && app.idx.products.has(ui.formProduct)) {
    formProduct = ui.formProduct;
    editing = app.session.doses.find((d) => d.id === ui.editingId) ?? null;
    formDraft = ui.draft ?? null;
  }
  app.zoom = ui.zoom ?? null;
  app.focusKey = ui.focusKey && app.scn.products.some((r) => r.key === ui.focusKey) ? ui.focusKey : null;
  setTab(ui.tab ?? 'doses');
  renderChart(false);
  renderLegend();
  if (ui.sideScroll) requestAnimationFrame(() => (sideBody.scrollTop = ui.sideScroll!));
}

window.addEventListener('pagehide', saveUiState);
document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLElement | null;
  if (e.key !== 'Escape' || !app.focusKey || document.querySelector('.modal') || el?.closest('input, select, textarea')) return;
  setFocus(null);
});

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
  restoreUiState();
  resolveOrphanDoses();
}

const showError = (e: unknown) => toast(`Unexpected error: ${(e as Error)?.message ?? String(e)}`, 6000);
window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

boot();
