// ECharts option builder for the main chart and the tracks underneath it.
// The same builder renders the dark in-app chart and the light, print-friendly export chart.

import * as echarts from './echarts';
import type { EChartsOption, CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, SeriesOption } from 'echarts';
import { fmtAmount, fmtAxis, fmtDateTime } from './format';
import { valueAt } from './pk';
import { DAY, strongestAt, type CompoundCurve, type ProductResult, type Scenario } from './model';
import type { QtTier, Session } from './types';

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
export const QT_COLORS: Record<QtTier, string> = { none: '#6c7a96', conditional: '#d7c34a', possible: '#ff9a3c', known: '#ff4d6d' };

const TRACK_H = { cyp: 22, qt: 64, lingering: 26 };
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

export function curveColor(r: ProductResult, c: CompoundCurve) {
  return c.depth === 0 ? r.color : lighten(r.color, Math.min(0.6, c.depth * 0.18));
}

export function unitLabel(c: CompoundCurve, s: Session): string {
  if (s.settings.units === 'percent') return '% of dose';
  return c.mgFactor === null ? 'parent-mg-eq' : 'mg';
}

/** Convert parent-mg-equivalents to display units. */
export function toDisplay(r: ProductResult, c: CompoundCurve, eq: number, s: Session): number {
  if (s.settings.units === 'percent') return r.latestDoseMg > 0 ? (eq / r.latestDoseMg) * 100 : 0;
  return eq * (c.mgFactor ?? 1);
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

export function buildChartOption(scn: Scenario, session: Session, o: ChartOpts): EChartsOption {
  const s = session.settings;
  const P = PALETTE[o.theme];
  const dark = o.theme === 'dark';
  const log = s.yScale === 'log';

  // ---- layout: tracks stacked under the main grid ----
  const tracks: ('cyp' | 'qt' | 'lingering')[] = [];
  if (s.showCypTrack) tracks.push('cyp');
  if (s.showQtTrack) tracks.push('qt');
  if (s.showLingeringTrack) tracks.push('lingering');
  const lanes = laneLayout(scn);
  const trackHeight = (t: (typeof tracks)[number]) => (t === 'lingering' ? Math.max(TRACK_H.lingering, lanes.count * 9 + 6) : TRACK_H[t]);
  const top = 28;
  const bottom = o.forExport ? 34 : 64; // room for the slider
  const tracksTotal = tracks.reduce((acc, t) => acc + trackHeight(t) + TRACK_GAP, 0);
  const mainH = Math.max(140, o.height - top - bottom - tracksTotal - 6);
  const left = 64, right = 22;
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

  const visibleCurves = (r: ProductResult) => r.curves.filter((c) => c.depth === 0 || s.showMetabolites);
  let maxDisplay = 0;
  for (const r of scn.products) for (const c of visibleCurves(r)) maxDisplay = Math.max(maxDisplay, toDisplay(r, c, Math.max(...c.runs.max.amounts), session));
  const logFloor = Math.max(maxDisplay * 1e-4, 1e-6);

  const yAxes: EChartsOption['yAxis'] = [
    {
      type: log ? 'log' : 'value',
      gridIndex: 0,
      min: log ? logFloor : 0,
      name: s.units === 'percent' ? '% of most recent dose' : 'Amount remaining (mg)',
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
      max: t === 'qt' ? undefined : 1,
      show: t === 'qt',
      splitNumber: 2,
      axisLabel: { color: P.dim, fontSize: 9, formatter: (v: number) => `${+v.toPrecision(2)}` },
      splitLine: { show: false },
    })),
  ];

  const dim = (key: string) => o.focusKey !== null && o.focusKey !== key;
  const series: SeriesOption[] = [];
  const fade = (base: number, key: string) => (dim(key) ? base * 0.15 : base);

  // ---- main curves ----
  for (const r of scn.products) {
    for (const c of visibleCurves(r)) {
      const color = curveColor(r, c);
      const conv = (eq: number) => {
        const v = toDisplay(r, c, eq, session);
        return log && v < logFloor ? null : v;
      };
      if (s.showBands) {
        const upper = envelope(c.runs.max.times, c.runs.max.amounts, 1200, 'max').map(([t, v]) => [t, conv(v) ?? logFloor]);
        const lower = envelope(c.runs.min.times, c.runs.min.amounts, 1200, 'min').map(([t, v]) => [t, conv(v) ?? logFloor]);
        const poly = [...upper, ...lower.reverse()];
        series.push({
          type: 'custom',
          id: `band:${c.key}`,
          xAxisIndex: 0,
          yAxisIndex: 0,
          silent: true,
          clip: true,
          z: 1,
          data: [[poly[0][0], poly[0][1]]],
          encode: { x: 0, y: 1 },
          renderItem: (_p: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) => ({
            type: 'polygon',
            shape: { points: poly.map((pt) => api.coord(pt)) },
            style: { fill: hexToRgba(color, fade(c.depth === 0 ? 0.13 : 0.08, r.key)) },
          }),
          tooltip: { show: false },
        } as SeriesOption);
      }
      const data = c.runs.typical.times.map((t, i) => [t, conv(c.runs.typical.amounts[i])]);
      const isParent = c.depth === 0;
      series.push({
        type: 'line',
        id: `line:${c.key}`,
        name: `${r.name} · ${c.compound.name}`,
        xAxisIndex: 0,
        yAxisIndex: 0,
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
          width: isParent ? 2.2 : 1.5,
          type: DASHES[Math.min(c.depth, DASHES.length - 1)] as never,
          opacity: fade(1, r.key),
          shadowBlur: dark && isParent && !dim(r.key) ? 12 : 0,
          shadowColor: hexToRgba(color, 0.7),
        },
        areaStyle: isParent && !log
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
  for (const t of scn.ibogaineDoseTimes) if (t !== scn.ibogaineAt) markers.push({ t, kind: 'booster' });
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
              style: { text: 'Ibogaine', fill: P.ibogaine, font: '600 11px Inter Variable, Inter, system-ui, sans-serif' },
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
        return {
          type: 'group',
          children: [
            { type: 'line', shape: { x1: x, y1: yb, x2: x, y2: yb - 16 }, style: { stroke: r.color, lineWidth: 2, opacity: op } },
            { type: 'circle', shape: { cx: x, cy: yb - 18, r: 3 }, style: { fill: r.color, opacity: op } },
            { type: 'text', x: x + 4, y: yb - 30 - (p.dataIndex % 3) * 11, style: { text: `✓ ${r.name}`, fill: r.color, font: '10px Inter Variable, Inter, system-ui, sans-serif', opacity: op } },
          ],
        } as never;
      },
    } as SeriesOption);

  // ---- tracks ----
  const titles: unknown[] = [];
  tracks.forEach((t, i) => {
    const gi = i + 1;
    const g = grids[gi];
    const label =
      t === 'cyp' ? 'CYP2D6 inhibition' : t === 'qt' ? 'Relative QT load — qualitative, not predicted ms' : 'Lingering effects after clearance';
    titles.push({ type: 'text', left, top: g.top - 15, style: { text: label, fill: P.dim, font: '10.5px Inter Variable, Inter, system-ui, sans-serif' } });
    if (t === 'qt' && session.patient.qtcMs > 0)
      titles.push({
        type: 'text', right, top: g.top - 15,
        style: { text: `Baseline QTc ${session.patient.qtcMs} ms (${session.patient.qtcFormula})`, fill: P.text, font: '600 10.5px Inter Variable, Inter, system-ui, sans-serif', align: 'right' },
      });

    if (t === 'cyp') {
      const ivs = scn.cyp;
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
          return {
            type: 'rect',
            shape: { x: a[0], y: b[1], width: Math.max(1, b[0] - a[0]), height: a[1] - b[1], r: 3 },
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
      const tiers: QtTier[] = ['none', 'conditional', 'possible', 'known'];
      for (const tier of tiers) {
        // Points belong to their tier's series; boundary points are duplicated so segments join.
        const data: (number | null)[][] = scn.qt.map((q, k) => {
          const mine = q.tier === tier;
          const nextMine = scn.qt[k + 1]?.tier === tier;
          const prevMine = scn.qt[k - 1]?.tier === tier;
          return [q.t, mine || nextMine || prevMine ? q.load : null];
        });
        if (!scn.qt.some((q) => q.tier === tier)) continue;
        const col = QT_COLORS[tier];
        series.push({
          type: 'line',
          id: `qt:${tier}`,
          name: `QT (${tier})`,
          xAxisIndex: gi,
          yAxisIndex: gi,
          data,
          showSymbol: false,
          connectNulls: false,
          animationDuration: o.animate ? 1400 : 0,
          lineStyle: { color: col, width: 1.6 },
          areaStyle: { color: hexToRgba(col, 0.22) },
          emphasis: { disabled: true },
          silent: true,
        } as SeriesOption);
      }
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
    for (const c of r.curves) {
      if (c.depth > 0 && !s.showMetabolites) continue;
      const eq = valueAt(c.runs.typical.times, c.runs.typical.amounts, t);
      if (!(eq > 0) || t < c.runs.typical.times[0]) continue;
      const v = toDisplay(r, c, eq, session);
      if (v < 1e-6) continue;
      const col = curveColor(r, c);
      const indent = c.depth > 0 ? `padding-left:${c.depth * 10}px;opacity:.85` : 'font-weight:600';
      const unit = unitLabel(c, session);
      rows.push(
        `<div style="display:flex;justify-content:space-between;gap:14px;${indent}"><span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${col};margin-right:6px"></span>${c.depth === 0 ? r.name : c.compound.name}</span><span style="font-variant-numeric:tabular-nums">${fmtAmount(v, unit === '% of dose' ? '%' : unit)}</span></div>`,
      );
    }
  }
  const cyp = strongestAt(scn.cyp, t);
  const qt = scn.qt.length ? nearestQt(scn, t) : null;
  const lingering = scn.lingering.filter((b) => t >= b.start && t <= b.end);
  const foot: string[] = [];
  foot.push(
    cyp
      ? `<div><b style="color:${CYP_COLORS[cyp.strength]}">CYP2D6 inhibited</b> — ${cyp.strength}${cyp.tail ? ', enzyme recovering' : ''} (${cyp.compound})</div>`
      : '<div style="opacity:.7">CYP2D6 not inhibited</div>',
  );
  if (qt) foot.push(`<div>Relative QT load: <b>${qt.load.toFixed(2)}</b> <span style="opacity:.7">(${qt.tier}, qualitative)</span></div>`);
  for (const b of lingering) foot.push(`<div style="opacity:.85">Lingering — ${b.compound}: ${b.note || 'effects may persist'}</div>`);
  return `<div style="font-size:12px;min-width:220px"><div style="opacity:.7;margin-bottom:6px">${fmtDateTime(t, s)}</div>${rows.join('') || '<div style="opacity:.6">Nothing above zero</div>'}<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(127,127,127,.25);display:grid;gap:3px">${foot.join('')}</div></div>`;
}

function nearestQt(scn: Scenario, t: number) {
  let lo = 0, hi = scn.qt.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (scn.qt[m].t <= t) lo = m;
    else hi = m;
  }
  return Math.abs(scn.qt[lo].t - t) < Math.abs(scn.qt[hi].t - t) ? scn.qt[lo] : scn.qt[hi];
}
