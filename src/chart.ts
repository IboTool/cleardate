// ECharts option builder for the main chart and the tracks underneath it.
// The same builder renders the dark in-app chart and the light, print-friendly export chart.

import * as echarts from './echarts';
import type { EChartsOption, CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, SeriesOption } from 'echarts';
import { fmtAmount, fmtAxis, fmtDateTime } from './format';
import { valueAt } from './pk';
import { DAY, HOUR, IBOGAINE_KIND_LABEL, isIntervalUnit, pmNotQuantified, strongestAt, toMg, type CompoundCurve, type CypInterval, type ProductResult, type QtLane, type Scenario } from './model';
import type { QtTier, Session, Settings } from './types';

export type Theme = 'dark' | 'light';

export interface ChartOpts {
  theme: Theme;
  height: number;
  focusKey: string | null;
  animate: boolean;
  zoom?: { start: number; end: number } | null;
  /** Export renders show every track that is enabled, without interactive controls. */
  forExport?: boolean;
}

const PALETTE = {
  dark: {
    text: '#c7ccd8', dim: '#7d8597', grid: 'rgba(255,255,255,0.06)', axis: 'rgba(255,255,255,0.14)',
    tooltipBg: 'rgba(18,20,28,0.92)', tooltipBorder: 'rgba(255,255,255,0.10)', today: 'rgba(255,255,255,0.35)',
    ibogaine: '#e8c36a', trackBg: 'rgba(255,255,255,0.025)',
  },
  light: {
    text: '#2b2f38', dim: '#6b7280', grid: '#eceef2', axis: '#c9ced8', tooltipBg: '#fff', tooltipBorder: '#ddd',
    today: '#9aa1ad', ibogaine: '#b8860b', trackBg: '#f6f7f9',
  },
};

export const CYP_COLORS = { weak: '#f2c46d', moderate: '#ff9a3c', strong: '#ff5a5f' };
export const CYP_UNASSESSED_LABEL = 'inhibition documented, strength unassessed';
export const QT_COLORS: Record<QtTier, string> = { none: '#6c7a96', unassessed: '#8a8f9c', conditional: '#d7c34a', possible: '#ff9a3c', known: '#ff4d6d' };

const TRACK_H = { cyp: 22, qt: 26, lingering: 26 };
const QT_LANE = 11;
const QT_LOAD_H = 40;

let hatchCache: Record<string, HTMLCanvasElement> = {};
/** Diagonal-stripe fill for "unassessed" QT lanes. */
function hatch(color: string): HTMLCanvasElement | string {
  if (typeof document === 'undefined') return color;
  if (!hatchCache[color]) {
    const c = document.createElement('canvas');
    c.width = c.height = 6;
    const g = c.getContext('2d')!;
    g.strokeStyle = color;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(0, 6);
    g.lineTo(6, 0);
    g.moveTo(-1, 1);
    g.lineTo(1, -1);
    g.moveTo(5, 7);
    g.lineTo(7, 5);
    g.stroke();
    hatchCache[color] = c;
  }
  return hatchCache[color];
}
export function resetHatchCache() {
  hatchCache = {};
}
const TRACK_GAP = 30;

export function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Lighten toward white by t (0..1). Deeper metabolites get progressively lighter. */
export function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const DASHES: number[][] = [[], [7, 4], [4, 4], [2, 4], [1, 4]];

/** Metabolites follow "Show metabolites"; inactive ones also need "Show inactive metabolites". */
export function curveVisible(c: CompoundCurve, s: Settings): boolean {
  return c.depth === 0 || (s.showMetabolites && (!c.inactive || s.showInactiveMetabolites));
}

export function curveColor(r: ProductResult, c: CompoundCurve) {
  return c.depth === 0 ? r.color : lighten(r.color, Math.min(0.6, c.depth * 0.18));
}

/** mg of the most recent discrete dose, or 0 for patches / sessions / no doses (percent mode then falls back to mg). */
const latestDoseMg = (r: ProductResult, s: Session) =>
  (r.latest && !isIntervalUnit(r.latest.unit) ? toMg(r.latest.amount, r.latest.unit, s.settings.standardDrinkGrams) : 0);
const percentMode = (r: ProductResult, s: Session) => s.settings.units === 'percent' && latestDoseMg(r, s) > 0;

/** Products drawn as exposure markers instead of curves: not modelled, or alcohol without body weight. */
export const isExposureOnly = (r: ProductResult) => r.status === 'not-modelled' || r.status === 'needs-weight';

/** Short status shown next to exposure markers. */
export const exposureLabel = (r: ProductResult) => `${r.name} — ${r.status === 'needs-weight' ? 'needs body weight' : 'not modelled'}`;

export function unitLabel(r: ProductResult, c: CompoundCurve, s: Session): string {
  if (c.normalized) return '% of own peak';
  if (percentMode(r, s)) return '% of dose';
  return c.mgFactor === null ? 'parent-mg-eq' : 'mg';
}

/** Convert simulated amounts to display units. Normalized curves are % of their own peak. */
export function toDisplay(r: ProductResult, c: CompoundCurve, eq: number, s: Session): number {
  if (c.normalized) return c.peak > 0 ? (eq / c.peak) * 100 : 0;
  if (percentMode(r, s)) return (eq / latestDoseMg(r, s)) * 100;
  return eq * (c.mgFactor ?? 1);
}

/** Tick label next to the clear marker, by status. */
export function clearLabel(r: ProductResult): string {
  return r.status === 'incomplete' ? `≥ ${r.name} (incomplete)` : r.status === 'assumptions' ? `✓ ${r.name}*` : `✓ ${r.name}`;
}

/** Bucketed min/max downsampling for band outlines (keeps the envelope). */
function envelope(times: number[], vals: number[], buckets: number, pick: 'min' | 'max'): [number, number][] {
  if (times.length <= buckets * 2) return times.map((t, i) => [t, vals[i]]);
  const out: [number, number][] = [];
  const size = times.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const a = Math.floor(b * size), z = Math.min(times.length, Math.floor((b + 1) * size));
    let best = a;
    for (let i = a; i < z; i++) if (pick === 'max' ? vals[i] > vals[best] : vals[i] < vals[best]) best = i;
    out.push([times[best], vals[best]]);
  }
  out.push([times[times.length - 1], vals[vals.length - 1]]);
  return out;
}

const MAIN_MIN_H = 140;
const GRID_TOP = 28;
const gridBottom = (forExport?: boolean) => (forExport ? 34 : 64); // room for the slider

/** Tracks stacked under the main grid, with their heights. */
function trackLayout(scn: Scenario, s: Settings) {
  const tracks: ('cyp' | 'qt' | 'qtload' | 'lingering')[] = [];
  if (s.showCypTrack) tracks.push('cyp');
  if (s.showQtTrack) tracks.push('qt');
  if (s.showQtTrack && s.showQtLoad && scn.qt.loadAvailable) tracks.push('qtload');
  if (s.showLingeringTrack) tracks.push('lingering');
  const lanes = laneLayout(scn);
  const qtLanes = scn.qt.lanes.filter((l) => l.depth === 0 || s.showMetabolites);
  const trackHeight = (t: (typeof tracks)[number]) =>
    t === 'lingering' ? Math.max(TRACK_H.lingering, lanes.count * 9 + 6)
    : t === 'qt' ? Math.max(TRACK_H.qt, qtLanes.length * QT_LANE + 6)
    : t === 'qtload' ? QT_LOAD_H
    : TRACK_H[t];
  const tracksTotal = tracks.reduce((acc, t) => acc + trackHeight(t) + TRACK_GAP, 0);
  return { tracks, lanes, qtLanes, trackHeight, tracksTotal };
}

/** Chart height that fits a readable main grid and every enabled track without overlapping the slider. */
export function minChartHeight(scn: Scenario, session: Session, forExport = false): number {
  return GRID_TOP + gridBottom(forExport) + trackLayout(scn, session.settings).tracksTotal + 6 + 220;
}

export function buildChartOption(scn: Scenario, session: Session, o: ChartOpts): EChartsOption {
  const s = session.settings;
  const P = PALETTE[o.theme];
  const dark = o.theme === 'dark';
  const log = s.yScale === 'log';

  // ---- layout: tracks stacked under the main grid ----
  const { tracks, lanes, qtLanes, trackHeight, tracksTotal } = trackLayout(scn, s);
  const top = GRID_TOP;
  const bottom = gridBottom(o.forExport);
  const mainH = Math.max(MAIN_MIN_H, o.height - top - bottom - tracksTotal - 6);
  const left = 64;
  const right = scn.products.some((r) => r.curves.some((c) => c.normalized && curveVisible(c, s))) ? 52 : 22;
  const grids: { top: number; height: number }[] = [{ top, height: mainH }];
  let y = top + mainH + TRACK_GAP;
  for (const t of tracks) {
    grids.push({ top: y, height: trackHeight(t) });
    y += trackHeight(t) + TRACK_GAP;
  }

  // ---- x extent ----
  const dataEnd = Math.max(scn.axisEnd, ...scn.products.flatMap((p) => p.curves.map((c) => c.runs.max.times[c.runs.max.times.length - 1] ?? 0)));
  const xMin = Math.min(scn.axisStart, scn.now) - 3 * DAY;
  const xMax = Math.max(dataEnd, scn.axisEnd) + 30 * DAY;
  const zoom = o.zoom ?? { start: scn.axisStart, end: scn.axisEnd };
  const spanDays = (zoom.end - zoom.start) / DAY;

  const xAxes = grids.map((_, i) => ({
    type: 'time' as const,
    gridIndex: i,
    min: xMin,
    max: xMax,
    axisLine: { lineStyle: { color: P.axis } },
    axisTick: { show: i === grids.length - 1 },
    splitLine: { show: true, lineStyle: { color: P.grid } },
    axisLabel: {
      show: i === grids.length - 1,
      color: P.dim,
      hideOverlap: true,
      formatter: (v: number) => fmtAxis(v, s, spanDays < 4),
    },
  }));

  const visibleCurves = (r: ProductResult) => r.curves.filter((c) => curveVisible(c, s));
  let maxDisplay = 0;
  for (const r of scn.products)
    for (const c of visibleCurves(r)) if (!c.normalized) maxDisplay = Math.max(maxDisplay, toDisplay(r, c, Math.max(...c.runs.max.amounts), session));
  const logFloor = Math.max(maxDisplay * 1e-4, 1e-6);
  const anyNormalized = scn.products.some((r) => visibleCurves(r).some((c) => c.normalized));
  const anyAdministered = scn.products.some((r) => r.administered);
  const relAxis = tracks.length + 1; // y-axis index of the "% of own peak" axis on the main grid

  const yAxes: EChartsOption['yAxis'] = [
    {
      type: log ? 'log' : 'value',
      gridIndex: 0,
      min: log ? logFloor : 0,
      name: (s.units === 'percent' ? '% of most recent dose' : 'Amount remaining (mg)') + (anyAdministered ? ' · administered basis*' : ''),
      nameLocation: 'middle',
      nameGap: 48,
      nameTextStyle: { color: P.dim, fontSize: 11 },
      axisLabel: { color: P.dim, formatter: (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : `${+v.toPrecision(3)}`) },
      splitLine: { lineStyle: { color: P.grid } },
      axisLine: { show: false },
    },
    ...tracks.map((t, i) => ({
      type: 'value' as const,
      gridIndex: i + 1,
      min: 0,
      max: t === 'qtload' ? undefined : 1,
      show: t === 'qtload',
      splitNumber: 2,
      axisLabel: { color: P.dim, fontSize: 9, formatter: (v: number) => `${+v.toPrecision(2)}` },
      splitLine: { show: false },
    })),
    {
      type: 'value',
      gridIndex: 0,
      min: 0,
      max: 105,
      show: anyNormalized,
      position: 'right',
      name: anyNormalized ? '% of own peak (timing only)' : '',
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: { color: P.dim, fontSize: 10 },
      axisLabel: { color: P.dim, fontSize: 9, formatter: (v: number) => (v <= 100 ? `${v}` : '') },
      splitLine: { show: false },
      axisLine: { show: false },
    },
  ];

  const dim = (key: string) => o.focusKey !== null && o.focusKey !== key;
  const series: SeriesOption[] = [];
  const fade = (base: number, key: string) => (dim(key) ? base * 0.15 : base);

  // ---- main curves ----
  for (const r of scn.products) {
    for (const c of visibleCurves(r)) {
      const color = curveColor(r, c);
      const yi = c.normalized ? relAxis : 0;
      const floor = c.normalized ? 0 : logFloor;
      const conv = (eq: number) => {
        const v = toDisplay(r, c, eq, session);
        return log && !c.normalized && v < logFloor ? null : v;
      };
      if (s.showBands) {
        const upper = envelope(c.runs.max.times, c.runs.max.amounts, 1200, 'max').map(([t, v]) => [t, conv(v) ?? floor]);
        const lower = envelope(c.runs.min.times, c.runs.min.amounts, 1200, 'min').map(([t, v]) => [t, conv(v) ?? floor]);
        const poly = [...upper, ...lower.reverse()];
        series.push({
          type: 'custom',
          id: `band:${c.key}`,
          xAxisIndex: 0,
          yAxisIndex: yi,
          silent: true,
          clip: true,
          z: 1,
          data: [[poly[0][0], poly[0][1]]],
          encode: { x: 0, y: 1 },
          renderItem: (_p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => ({
            type: 'polygon',
            shape: { points: poly.map((pt) => api.coord(pt)) },
            style: { fill: hexToRgba(color, fade(c.depth === 0 ? 0.13 : c.inactive ? 0.04 : 0.08, r.key)) },
          }),
          tooltip: { show: false },
        } as SeriesOption);
      }
      const data = c.runs.typical.times.map((t, i) => [t, conv(c.runs.typical.amounts[i])]);
      const isParent = c.depth === 0;
      series.push({
        type: 'line',
        id: `line:${c.key}`,
        name: `${r.name} · ${c.compound.name}${c.normalized ? ' (% of own peak)' : ''}${c.inactive ? ' (inactive)' : ''}`,
        xAxisIndex: 0,
        yAxisIndex: yi,
        data,
        showSymbol: false,
        symbol: 'none',
        sampling: 'lttb',
        connectNulls: false,
        z: isParent ? 4 : 3,
        animationDuration: o.animate ? 1400 : 0,
        animationEasing: 'cubicOut',
        lineStyle: {
          color,
          width: isParent ? 2.2 : c.inactive ? 1 : 1.5,
          type: (c.normalized ? [3, 3] : DASHES[Math.min(c.depth, DASHES.length - 1)]) as never,
          opacity: fade(c.inactive ? 0.4 : 1, r.key),
          shadowBlur: dark && isParent && !dim(r.key) ? 12 : 0,
          shadowColor: hexToRgba(color, 0.7),
        },
        areaStyle: isParent && !log && !c.normalized
          ? {
              opacity: fade(1, r.key),
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: hexToRgba(color, dark ? 0.28 : 0.18) },
                { offset: 1, color: hexToRgba(color, 0) },
              ]),
            }
          : undefined,
        emphasis: { disabled: true },
        triggerLineEvent: true,
        tooltip: { show: true },
      } as SeriesOption);
    }
  }

  // ---- vertical markers (today, ibogaine) and clear ticks, drawn in every grid ----
  type Marker = { t: number; kind: 'today' | 'ibogaine' | 'booster' };
  const markers: Marker[] = [{ t: scn.now, kind: 'today' }];
  if (scn.ibogaineAt !== null) markers.push({ t: scn.ibogaineAt, kind: 'ibogaine' });
  for (const t of new Set(scn.ibogaineEvents.map((e) => e.time))) if (t !== scn.ibogaineAt) markers.push({ t, kind: 'booster' });
  const firstKind = scn.ibogaineEvents[0]?.kind;
  const ibLabel = firstKind && firstKind !== 'flood' ? `Ibogaine · ${IBOGAINE_KIND_LABEL[firstKind].toLowerCase()}` : 'Ibogaine';
  grids.forEach((_, gi) => {
    series.push({
      type: 'custom',
      id: `markers:${gi}`,
      xAxisIndex: gi,
      yAxisIndex: gi,
      silent: true,
      clip: true,
      z: 10,
      data: markers.map((m) => [m.t, 0]),
      encode: { x: 0 },
      animation: false,
      renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
        const m = markers[p.dataIndex];
        const cs = p.coordSys as unknown as { x: number; y: number; width: number; height: number };
        const x = api.coord([m.t, log && gi === 0 ? logFloor : 0])[0];
        const children: unknown[] = [];
        if (m.kind === 'ibogaine') {
          children.push({
            type: 'line',
            shape: { x1: x, y1: cs.y, x2: x, y2: cs.y + cs.height },
            style: { stroke: P.ibogaine, lineWidth: 2.5, shadowBlur: dark ? 16 : 0, shadowColor: hexToRgba('#e8c36a', 0.9) },
          });
          if (gi === 0)
            children.push({
              type: 'text',
              x: x + 6,
              y: cs.y + 4,
              style: { text: ibLabel, fill: P.ibogaine, font: '600 11px Inter Variable, Inter, system-ui, sans-serif' },
            });
        } else if (m.kind === 'booster') {
          children.push({ type: 'line', shape: { x1: x, y1: cs.y, x2: x, y2: cs.y + cs.height }, style: { stroke: hexToRgba('#e8c36a', 0.5), lineWidth: 1, lineDash: [3, 3] } });
        } else {
          children.push({ type: 'line', shape: { x1: x, y1: cs.y, x2: x, y2: cs.y + cs.height }, style: { stroke: P.today, lineWidth: 1, lineDash: [2, 4] } });
          if (gi === 0) children.push({ type: 'text', x: x + 4, y: cs.y + 4, style: { text: 'Today', fill: P.dim, font: '10px Inter Variable, Inter, system-ui, sans-serif' } });
        }
        return { type: 'group', children } as never;
      },
    } as SeriesOption);
  });

  // Per-product "clear" ticks at the bottom of the main grid.
  const ticks = scn.products.filter((r) => !r.isIbogaine && r.clearAt !== null).map((r) => ({ t: r.clearAt!, r }));
  if (ticks.length)
    series.push({
      type: 'custom',
      id: 'clear-ticks',
      xAxisIndex: 0,
      yAxisIndex: 0,
      silent: true,
      clip: true,
      z: 11,
      animation: false,
      data: ticks.map((k) => [k.t, 0]),
      encode: { x: 0 },
      renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
        const { t, r } = ticks[p.dataIndex];
        const cs = p.coordSys as unknown as { y: number; height: number };
        const x = api.coord([t, log ? logFloor : 0])[0];
        const yb = cs.y + cs.height;
        const op = dim(r.key) ? 0.2 : 1;
        const incomplete = r.status === 'incomplete';
        return {
          type: 'group',
          children: [
            { type: 'line', shape: { x1: x, y1: yb, x2: x, y2: yb - 16 }, style: { stroke: r.color, lineWidth: 2, opacity: op, lineDash: incomplete ? [2, 2] : undefined } },
            incomplete
              ? { type: 'circle', shape: { cx: x, cy: yb - 18, r: 3 }, style: { fill: 'transparent', stroke: r.color, lineWidth: 1.4, opacity: op } }
              : { type: 'circle', shape: { cx: x, cy: yb - 18, r: 3 }, style: { fill: r.color, opacity: op } },
            { type: 'text', x: x + 4, y: yb - 30 - (p.dataIndex % 3) * 11, style: { text: clearLabel(r), fill: r.color, font: '10px Inter Variable, Inter, system-ui, sans-serif', opacity: op } },
          ],
        } as never;
      },
    } as SeriesOption);

  // Exposure markers for products without a curve: a tick per dose, a bar across each session / application.
  const exposures = scn.products.filter(isExposureOnly).flatMap((r, row) => r.doses.map((d, i) => ({ r, d, row, first: i === 0 })));
  if (exposures.length)
    series.push({
      type: 'custom',
      id: 'exposures',
      xAxisIndex: 0,
      yAxisIndex: 0,
      silent: true,
      clip: true,
      z: 11,
      animation: false,
      data: exposures.map((x) => [x.d.time, x.d.end ?? x.d.time]),
      encode: { x: [0, 1] },
      renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
        const { r, d, row, first } = exposures[p.dataIndex];
        const cs = p.coordSys as unknown as { y: number; height: number };
        const a = api.coord([d.time, log ? logFloor : 0])[0];
        const z = d.end !== undefined ? api.coord([d.end, log ? logFloor : 0])[0] : a;
        const y = cs.y + cs.height - 40 - row * 16;
        const op = dim(r.key) ? 0.2 : 1;
        const children: unknown[] = d.end !== undefined
          ? [{ type: 'rect', shape: { x: a, y: y - 4, width: Math.max(3, z - a), height: 8, r: 2 }, style: { fill: hexToRgba(r.color, 0.8 * op), stroke: r.color, lineWidth: 1, opacity: op } }]
          : [
              { type: 'line', shape: { x1: a, y1: y - 7, x2: a, y2: y + 7 }, style: { stroke: r.color, lineWidth: 2.5, opacity: op } },
              { type: 'circle', shape: { cx: a, cy: y - 7, r: 2.5 }, style: { fill: r.color, opacity: op } },
            ];
        if (first) children.push({ type: 'text', x: Math.max(a, z) + 6, y: y - 6, style: { text: exposureLabel(r), fill: r.color, font: '10px Inter Variable, Inter, system-ui, sans-serif', opacity: op } });
        return { type: 'group', children } as never;
      },
    } as SeriesOption);

  // ---- tracks ----
  const titles: unknown[] = [];
  tracks.forEach((t, i) => {
    const gi = i + 1;
    const g = grids[gi];
    const qtNote = s.showQtLoad && !scn.qt.loadAvailable ? ' · summed load unavailable (not calibrated)' : '';
    const label =
      t === 'cyp' ? `CYP2D6 inhibition${scn.cyp.some((iv) => iv.strengthUnassessed) ? ` — hatched = ${CYP_UNASSESSED_LABEL}` : ''}`
      : t === 'qt' ? `QT liability by compound — qualitative, hatched = unassessed${qtNote}`
      : t === 'qtload' ? 'Summed relative QT load — qualitative, not predicted ms'
      : 'Lingering effects after clearance';
    titles.push({ type: 'text', left, top: g.top - 15, style: { text: label, fill: P.dim, font: '10.5px Inter Variable, Inter, system-ui, sans-serif' } });
    if (t === 'qt' && session.patient.qtcMs > 0)
      titles.push({
        type: 'text', right, top: g.top - 15,
        style: { text: `Baseline QTc ${session.patient.qtcMs} ms (${session.patient.qtcFormula})`, fill: P.text, font: '600 10.5px Inter Variable, Inter, system-ui, sans-serif', align: 'right' },
      });

    if (t === 'cyp') {
      // Unassessed-strength bands are drawn last, in the lower part of the track, so they stay visible over a known inhibitor.
      const ivs = [...scn.cyp].sort((a, b) => Number(a.strengthUnassessed) - Number(b.strengthUnassessed));
      series.push({
        type: 'custom',
        id: 'cyp',
        xAxisIndex: gi,
        yAxisIndex: gi,
        clip: true,
        silent: true,
        data: ivs.map((iv) => [iv.start, iv.end]),
        encode: { x: [0, 1] },
        renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
          const iv = ivs[p.dataIndex];
          const a = api.coord([iv.start, 0]);
          const b = api.coord([iv.end, 1]);
          const col = CYP_COLORS[iv.strength];
          const op = dim(iv.productKey) ? 0.25 : 1;
          const width = Math.max(1, b[0] - a[0]);
          if (iv.strengthUnassessed) {
            const hh = Math.round((a[1] - b[1]) * 0.45);
            const shape = { x: a[0], y: a[1] - hh, width, height: hh, r: 2 };
            return {
              type: 'group',
              children: [
                { type: 'rect', shape, style: { fill: P.tooltipBg, opacity: op } },
                { type: 'rect', shape, style: { fill: { image: hatch(col), repeat: 'repeat' }, opacity: (iv.tail ? 0.5 : 1) * op } },
              ],
            } as never;
          }
          return {
            type: 'rect',
            shape: { x: a[0], y: b[1], width, height: a[1] - b[1], r: 3 },
            style: {
              fill: iv.tail
                ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: hexToRgba(col, 0.5 * op) }, { offset: 1, color: hexToRgba(col, 0) }])
                : hexToRgba(col, 0.75 * op),
            },
          } as never;
        },
      } as SeriesOption);
      if (!ivs.length)
        titles.push({ type: 'text', left: left + 150, top: g.top - 15, style: { text: '— none', fill: P.dim, font: '10.5px Inter Variable, Inter, system-ui, sans-serif' } });
    }

    if (t === 'qt') {
      // One lane per QT-relevant compound; opacity follows the compound's fraction of its own peak.
      const segs = qtLanes.flatMap((l, lane) => l.segments.map((sg) => ({ l, lane, sg })));
      series.push({
        type: 'custom',
        id: 'qt-lanes',
        xAxisIndex: gi,
        yAxisIndex: gi,
        clip: true,
        silent: true,
        data: segs.map((x) => [x.sg[0], x.sg[1]]),
        encode: { x: [0, 1] },
        renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
          const { l, lane, sg } = segs[p.dataIndex];
          const cs = p.coordSys as unknown as { y: number };
          const a = api.coord([sg[0], 0])[0];
          const z = api.coord([sg[1], 0])[0];
          const op = (dim(l.productKey) ? 0.25 : 1) * (0.25 + 0.75 * sg[2]);
          const col = QT_COLORS[l.tier];
          return {
            type: 'rect',
            shape: { x: a, y: cs.y + 3 + lane * QT_LANE, width: Math.max(1, z - a), height: QT_LANE - 3 },
            style: l.tier === 'unassessed' ? { fill: { image: hatch(col), repeat: 'repeat' } as never, opacity: op } : { fill: hexToRgba(col, 0.85 * op) },
          } as never;
        },
      } as SeriesOption);
      qtLanes.forEach((l, lane) =>
        titles.push({
          type: 'text', left: 2, top: g.top + 3 + lane * QT_LANE,
          style: { text: shortName(l), fill: QT_COLORS[l.tier], font: '9px Inter Variable, Inter, system-ui, sans-serif', width: left - 6, overflow: 'truncate' },
        }),
      );
      if (!qtLanes.length)
        titles.push({ type: 'text', left: left + 8, top: g.top + 6, style: { text: 'No QT-relevant compounds in this regimen', fill: P.dim, font: '10px Inter Variable, Inter, system-ui, sans-serif' } });
    }

    if (t === 'qtload') {
      series.push({
        type: 'line',
        id: 'qt-load',
        name: 'Summed QT load',
        xAxisIndex: gi,
        yAxisIndex: gi,
        data: scn.qt.load.map((q) => [q.t, q.load]),
        showSymbol: false,
        animationDuration: o.animate ? 1400 : 0,
        lineStyle: { color: QT_COLORS.possible, width: 1.6 },
        areaStyle: { color: hexToRgba(QT_COLORS.possible, 0.2) },
        emphasis: { disabled: true },
        silent: true,
      } as SeriesOption);
    }

    if (t === 'lingering') {
      const bands = scn.lingering;
      series.push({
        type: 'custom',
        id: 'lingering',
        xAxisIndex: gi,
        yAxisIndex: gi,
        clip: true,
        silent: true,
        data: bands.map((b) => [b.start, b.end]),
        encode: { x: [0, 1] },
        renderItem: (p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => {
          const b = bands[p.dataIndex];
          const r = scn.products.find((x) => x.key === b.productKey);
          const col = r?.color ?? '#999';
          const lane = lanes.lane.get(p.dataIndex) ?? 0;
          const cs = p.coordSys as unknown as { y: number; height: number };
          const a = api.coord([b.start, 0])[0];
          const z = api.coord([b.end, 0])[0];
          const op = dim(b.productKey) ? 0.25 : 1;
          return {
            type: 'rect',
            shape: { x: a, y: cs.y + 3 + lane * 9, width: Math.max(1, z - a), height: 7, r: 3.5 },
            style: {
              fill: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: hexToRgba(col, 0.45 * op) },
                { offset: 1, color: hexToRgba(col, 0.04 * op) },
              ]),
            },
          } as never;
        },
      } as SeriesOption);
    }
  });

  return {
    backgroundColor: dark ? 'transparent' : '#ffffff',
    animation: o.animate,
    textStyle: { fontFamily: 'Inter Variable, Inter, system-ui, sans-serif', color: P.text },
    grid: grids.map((g) => ({ left, right, top: g.top, height: g.height, containLabel: false })),
    xAxis: xAxes,
    yAxis: yAxes,
    graphic: titles as never,
    axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: P.axis } },
    tooltip: o.forExport
      ? { show: false }
      : {
          trigger: 'axis',
          axisPointer: { type: 'cross', label: { show: false }, crossStyle: { color: P.axis } },
          backgroundColor: P.tooltipBg,
          borderColor: P.tooltipBorder,
          textStyle: { color: P.text, fontSize: 12 },
          extraCssText: 'backdrop-filter: blur(10px); border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.35);',
          confine: true,
          formatter: (params: unknown) => tooltipHtml(scn, session, (params as { axisValue: number }[])[0]?.axisValue),
        },
    dataZoom: o.forExport
      ? [{ type: 'inside', xAxisIndex: grids.map((_, i) => i), startValue: zoom.start, endValue: zoom.end, filterMode: 'none' }]
      : [
          { type: 'inside', xAxisIndex: grids.map((_, i) => i), startValue: zoom.start, endValue: zoom.end, filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true },
          {
            type: 'slider', xAxisIndex: grids.map((_, i) => i), startValue: zoom.start, endValue: zoom.end, filterMode: 'none',
            bottom: 12, height: 22, borderColor: 'transparent', backgroundColor: 'rgba(255,255,255,0.03)',
            fillerColor: 'rgba(124,156,255,0.14)', handleStyle: { color: '#7c9cff', borderColor: '#7c9cff' },
            moveHandleStyle: { color: 'rgba(124,156,255,0.5)' }, textStyle: { color: P.dim, fontSize: 10 },
            dataBackground: { lineStyle: { color: 'rgba(255,255,255,0.15)' }, areaStyle: { color: 'rgba(255,255,255,0.04)' } },
            labelFormatter: (v: number) => fmtAxis(v, s, false),
          },
        ],
    series,
  };
}

const shortName = (l: QtLane) => (l.compound.length > 11 ? `${l.compound.slice(0, 10)}…` : l.compound);

function laneLayout(scn: Scenario) {
  // Greedy lane assignment so overlapping lingering bands don't sit on top of each other.
  const lane = new Map<number, number>();
  const ends: number[] = [];
  scn.lingering
    .map((b, i) => ({ b, i }))
    .sort((x, y) => x.b.start - y.b.start)
    .forEach(({ b, i }) => {
      let l = ends.findIndex((e) => e <= b.start);
      if (l < 0) {
        l = ends.length;
        ends.push(0);
      }
      ends[l] = b.end;
      lane.set(i, l);
    });
  return { lane, count: Math.max(1, ends.length) };
}

function tooltipHtml(scn: Scenario, session: Session, t: number | undefined): string {
  if (t === undefined) return '';
  const s = session.settings;
  const rows: string[] = [];
  for (const r of scn.products) {
    const start = rows.length;
    for (const c of r.curves) {
      if (!curveVisible(c, s)) continue;
      const eq = valueAt(c.runs.typical.times, c.runs.typical.amounts, t);
      if (!(eq > 0) || t < c.runs.typical.times[0]) continue;
      const v = toDisplay(r, c, eq, session);
      if (v < 1e-6) continue;
      const col = curveColor(r, c);
      const indent = c.depth > 0 ? `padding-left:${c.depth * 10}px;opacity:${c.inactive ? '.55' : '.85'}` : 'font-weight:600';
      const unit = unitLabel(r, c, session);
      const shown = c.normalized ? `${v.toFixed(0)}% of peak` : fmtAmount(v, unit === '% of dose' ? '%' : unit);
      const prodrug = c.depth === 0 ? r.prodrug?.find((x) => x.modelledAs === c.compound.name) : undefined;
      const tags = [
        prodrug ? `administered as ${prodrug.administeredAs}, modelled as ${prodrug.modelledAs}` : '',
        c.inactive ? 'inactive — not in clear date' : '',
        c.normalized ? 'amount unknown — timing only' : c.formationLimited ? 'formation-limited' : '',
        c.notes.some((n) => /formed because .* was also taken/.test(n)) ? c.notes.find((n) => /formed because/.test(n))!.replace(/^[^:]*: /, '') : '',
        c.compound.endogenous ? 'endogenous — excess over baseline only' : '',
      ].filter(Boolean);
      const pmCaveat = r.pmUnquantified?.includes(c.compound.name)
        ? ` <span style="color:#ffb74d;font-weight:400">· poor-metaboliser effect ${pmNotQuantified([c.compound.name])}</span>`
        : '';
      const tag = tags.map((x) => ` <span style="opacity:.6;font-weight:400">· ${x}</span>`).join('') + pmCaveat;
      rows.push(
        `<div style="display:flex;justify-content:space-between;gap:14px;${indent}"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:6px"></span>${c.depth === 0 ? r.name : c.compound.name}${tag}</span><span style="font-variant-numeric:tabular-nums">${shown}</span></div>`,
      );
    }
    const present = rows.length > start;
    if (r.assumptions.length && present) {
      const list = r.assumptions.slice(0, 3).join('; ') + (r.assumptions.length > 3 ? `; +${r.assumptions.length - 3} more` : '');
      rows.push(`<div style="opacity:.6;font-size:11px;max-width:340px;white-space:normal;margin:1px 0 4px 14px">Assumptions: ${list}</div>`);
    }
    if ((r.excluded.length || r.notes.length) && present)
      rows.push(`<div style="opacity:.6;font-size:11px;max-width:340px;white-space:normal;margin:1px 0 4px 14px">${[...r.excluded, ...r.notes].join('; ')}</div>`);
    if (r.status === 'incomplete' && present)
      rows.push(`<div style="opacity:.75;font-size:11px;margin:0 0 4px 14px;color:#ffb74d">Incomplete — no kinetics for ${r.missing.join(', ')}</div>`);
    if (isExposureOnly(r)) {
      // During an exposure (or within an hour of a tick) and while its lingering band lasts.
      const exposed = r.doses.some((d) => t >= d.time - HOUR && t <= (d.end ?? d.time + HOUR));
      const lingeringHere = scn.lingering.some((b) => b.productKey === r.key && t >= b.start && t <= b.end);
      if (exposed || lingeringHere)
        rows.push(
          `<div style="display:flex;gap:6px;font-weight:600"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${r.color};margin-top:4px"></span>${r.name}${exposed ? ' <span style="opacity:.6;font-weight:400">· exposure</span>' : ''}</div>` +
            `<div style="opacity:.75;font-size:11px;max-width:340px;white-space:normal;margin:0 0 4px 14px">${r.status === 'needs-weight' ? 'Needs body weight — alcohol elimination scales with weight' : `Not modelled — ${r.notModelledReason}`}</div>`,
        );
    }
  }
  const cyp = strongestAt(scn.cyp, t);
  const cypStrength = (iv: CypInterval) => (iv.strengthUnassessed ? `${CYP_UNASSESSED_LABEL} (counted as at least weak)` : iv.label);
  const otherUnassessed = [...new Set(scn.cyp
    .filter((iv) => iv.strengthUnassessed && iv !== cyp && iv.compound !== cyp?.compound && t >= iv.start && t <= iv.end)
    .map((iv) => iv.compound))];
  const qtHere = scn.qt.lanes.filter((l) => l.segments.some((sg) => t >= sg[0] && t <= sg[1]));
  const qt = scn.qt.loadAvailable && s.showQtLoad && scn.qt.load.length ? nearestQt(scn, t) : null;
  const lingering = scn.lingering.filter((b) => t >= b.start && t <= b.end);
  const foot: string[] = [];
  foot.push(
    cyp
      ? `<div><b style="color:${CYP_COLORS[cyp.strength]}">CYP2D6 inhibited</b> — ${cypStrength(cyp)}${cyp.tail ? ', enzyme recovering' : ''} (${cyp.compound})</div>`
      : '<div style="opacity:.7">CYP2D6 not inhibited</div>',
  );
  if (otherUnassessed.length) foot.push(`<div style="opacity:.85">Also: ${CYP_UNASSESSED_LABEL} — ${otherUnassessed.join(', ')}</div>`);
  if (qtHere.length)
    foot.push(`<div>QT liability present: ${qtHere.map((l) => `<b style="color:${QT_COLORS[l.tier]}">${l.compound}</b> <span style="opacity:.7">(${l.tier})</span>`).join(', ')}</div>`);
  if (qt) foot.push(`<div>Summed relative QT load: <b>${qt.load.toFixed(2)}</b> <span style="opacity:.7">(qualitative)</span></div>`);
  for (const b of lingering)
    foot.push(`<div style="opacity:.85">Lingering — ${b.compound}${b.origin === 'last-dose' ? ` (${b.days} days after last dose, label washout)` : ''}: ${b.note || 'effects may persist'}</div>`);
  return `<div style="font-size:12px;min-width:220px"><div style="opacity:.7;margin-bottom:6px">${fmtDateTime(t, s)}</div>${rows.join('') || '<div style="opacity:.6">Nothing above zero</div>'}<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25);display:grid;gap:3px">${foot.join('')}</div></div>`;
}

function nearestQt(scn: Scenario, t: number) {
  const q = scn.qt.load;
  let lo = 0, hi = q.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (q[m].t <= t) lo = m;
    else hi = m;
  }
  return Math.abs(q[lo].t - t) < Math.abs(q[hi].t - t) ? q[lo] : q[hi];
}
