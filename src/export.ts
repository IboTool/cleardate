// PDF and PNG export, always rendered in a clean light theme.

import * as echarts from './echarts';
import type { jsPDF as JsPDF } from 'jspdf';
import { buildChartOption } from './chart';
import { ageFrom, fmtDate, fmtDateTime } from './format';
import { expandDose, type LibraryIndex, type Scenario } from './model';
import type { Session } from './types';

export const DISCLAIMER =
  'Reference visualisation only. Not medical advice and not for dosing decisions. Pharmacokinetic values are population estimates and may not reflect this patient. Verify all data independently.';

const PHENO: Record<string, string> = {
  poor: 'Poor metaboliser', intermediate: 'Intermediate metaboliser', normal: 'Normal metaboliser',
  ultrarapid: 'Ultrarapid metaboliser', unknown: 'Unknown (range widened poor → ultrarapid)',
};

function renderChartImage(scn: Scenario, session: Session, zoom: { start: number; end: number } | null, width: number, height: number): string {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;`;
  document.body.append(host);
  const chart = echarts.init(host, null, { renderer: 'canvas', width, height });
  chart.setOption(buildChartOption(scn, session, { theme: 'light', height, focusKey: null, animate: false, zoom, forExport: true }));
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
  chart.dispose();
  host.remove();
  return url;
}

function headerLines(session: Session, now = Date.now()): string[] {
  const p = session.patient;
  const s = session.settings;
  const age = ageFrom(p.dob);
  const weight = p.weightKg > 0 ? (p.weightUnit === 'lb' ? `${(p.weightKg * 2.20462).toFixed(0)} lb` : `${p.weightKg} kg`) : '—';
  return [
    ...(s.demoData ? ['DEMO DATA — fictional compounds, not real pharmacology'] : []),
    `Patient: ${p.name || '—'}   DOB: ${p.dob ? fmtDate(new Date(p.dob).getTime(), s) : '—'}${age !== null ? ` (${age} y)` : ''}   Sex: ${p.sex || '—'}   Weight: ${weight}`,
    `Baseline QTc: ${p.qtcMs > 0 ? `${p.qtcMs} ms (${p.qtcFormula})` : '—'}   CYP2D6: ${PHENO[p.phenotype]}`,
    `Exported: ${fmtDateTime(now, s)}`,
  ];
}

function doseRows(session: Session, idx: LibraryIndex): string[][] {
  const s = session.settings;
  return session.doses.map((d) => {
    const p = idx.products.get(d.productId);
    const flag = p ? (p.userEntered ? ' [user-entered]' : !p.verified ? ' [unverified]' : '') : '';
    const n = expandDose(d).length;
    const when = d.kind === 'single'
      ? d.time ? fmtDateTime(new Date(d.time).getTime(), s) : '—'
      : `every ${d.regimen!.every} ${d.regimen!.unit}, ${fmtDateTime(new Date(d.regimen!.start).getTime(), s)} → ${fmtDateTime(new Date(d.regimen!.end).getTime(), s)} (${n} doses)`;
    return [`${p?.name ?? d.productId}${flag}`, `${d.amountMg} mg`, when];
  });
}

function clearRows(scn: Scenario, session: Session): string[][] {
  const s = session.settings;
  return scn.products.filter((r) => !r.isIbogaine).map((r) => [
    `${r.name}${r.product.userEntered ? ' [user-entered]' : ''}`,
    r.clearAt === null ? 'beyond window' : fmtDateTime(r.clearAt, s),
    r.clearAtMax === null ? 'beyond window' : fmtDateTime(r.clearAtMax, s),
  ]);
}

function warningLines(scn: Scenario): string[] {
  const out = scn.warnings.map((w) => `${w.level === 'danger' ? '!! ' : ''}${w.text}`);
  for (const o of scn.overlaps) out.push(`Receptor overlap at treatment — ${o.target}: ${o.hits.map((h) => `${h.compound} (${h.action})`).join(', ')}`);
  return out;
}

/** jsPDF's built-in fonts are Latin-1 only. */
const latin1 = (s: string) =>
  s.replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=')
    .replace(/≈/g, '~').replace(/✓/g, 'v').replace(/•/g, '-').replace(/Δ/g, 'Delta-').replace(/α/g, 'alpha').replace(/β/g, 'beta').replace(/′/g, "'")
    .replace(/[^\x00-\xff]/g, '?');

export async function exportPdf(scn: Scenario, session: Session, idx: LibraryIndex, zoom: { start: number; end: number } | null) {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDF = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const s = session.settings;
  let y = M;

  const footer = () => {
    doc.setFontSize(7.5);
    doc.setTextColor(110);
    const lines = doc.splitTextToSize(latin1(DISCLAIMER), W - 2 * M);
    doc.text(lines, M, H - 22 - (lines.length - 1) * 9);
  };
  const newPage = () => {
    footer();
    doc.addPage();
    y = M;
  };
  const ensure = (needed: number) => {
    if (y + needed > H - 50) newPage();
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text('ClearDate', M, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  if (s.clinicName) doc.text(latin1(s.clinicName), W - M, y + 6, { align: 'right' });
  y += 22;
  doc.setFontSize(9);
  doc.setTextColor(40);
  for (const l of headerLines(session)) {
    doc.text(latin1(l), M, y);
    y += 12;
  }
  y += 4;

  const imgW = W - 2 * M;
  const imgH = Math.min(H - y - 60, imgW * 0.5);
  const img = renderChartImage(scn, session, zoom, 1600, Math.round(1600 * (imgH / imgW)));
  doc.addImage(img, 'PNG', M, y, imgW, imgH, undefined, 'FAST');
  y += imgH + 8;
  newPage();

  const table = (title: string, head: string[], rows: string[][], widths: number[]) => {
    ensure(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20);
    doc.text(latin1(title), M, y);
    y += 14;
    doc.setFontSize(8.5);
    const drawRow = (cells: string[], bold: boolean) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const split = cells.map((c, i) => doc.splitTextToSize(latin1(c), widths[i] - 6) as string[]);
      const hgt = Math.max(...split.map((x) => x.length)) * 10 + 4;
      ensure(hgt);
      let x = M;
      split.forEach((lines, i) => {
        doc.text(lines, x, y + 8);
        x += widths[i];
      });
      y += hgt;
      doc.setDrawColor(225);
      doc.line(M, y - 2, M + widths.reduce((a, b) => a + b, 0), y - 2);
    };
    drawRow(head, true);
    if (!rows.length) drawRow(['—', ...head.slice(1).map(() => '')], false);
    for (const r of rows) drawRow(r, false);
    y += 10;
  };

  const tw = W - 2 * M;
  table('Doses', ['Product', 'Amount', 'When'], doseRows(session, idx), [tw * 0.38, tw * 0.12, tw * 0.5]);
  if (session.ibogaine) {
    const ib = session.ibogaine;
    table('Planned ibogaine', ['Dose', 'mg', 'Time'], [
      ['Flood', String(ib.flood.mg), ib.flood.time ? fmtDateTime(new Date(ib.flood.time).getTime(), s) : '—'],
      ...ib.boosters.map((b, i) => [`Booster ${i + 1}`, String(b.mg), b.time ? fmtDateTime(new Date(b.time).getTime(), s) : '—']),
    ], [tw * 0.38, tw * 0.12, tw * 0.5]);
  }
  table(`Clear dates (below ${s.clearHalfLives} half-lives ≈ ${(100 * Math.pow(2, -s.clearHalfLives)).toFixed(1)}% of peak, parent and all metabolites)`,
    ['Product', 'Clear (typical)', 'Clear (slowest in range)'], clearRows(scn, session), [tw * 0.4, tw * 0.3, tw * 0.3]);

  ensure(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Warnings', M, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const warnings = warningLines(scn);
  if (!warnings.length) warnings.push('None.');
  for (const w of warnings) {
    const lines = doc.splitTextToSize(latin1(`• ${w}`), tw);
    ensure(lines.length * 10 + 4);
    doc.setTextColor(w.startsWith('!!') ? 180 : 40, 30, 30);
    doc.text(lines, M, y);
    y += lines.length * 10 + 3;
  }
  doc.setTextColor(40);
  footer();
  doc.save(fileBase(session) + '.pdf');
}

export function exportPng(scn: Scenario, session: Session, zoom: { start: number; end: number } | null) {
  const W = 1800, chartH = 1000;
  const img = new Image();
  img.onload = () => {
    const warnings = warningLines(scn).slice(0, 8);
    const H = 150 + chartH + 40 + warnings.length * 26 + 80;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#16181d';
    g.font = '700 34px Inter Variable, Inter, system-ui, sans-serif';
    g.fillText('ClearDate', 40, 56);
    g.font = '400 22px Inter Variable, Inter, system-ui, sans-serif';
    g.textAlign = 'right';
    if (session.settings.clinicName) g.fillText(session.settings.clinicName, W - 40, 56);
    g.textAlign = 'left';
    g.fillStyle = '#333';
    g.font = '400 19px Inter Variable, Inter, system-ui, sans-serif';
    headerLines(session).forEach((l, i) => g.fillText(l, 40, 92 + i * 24));
    g.drawImage(img, 0, 150, W, chartH);
    let y = 150 + chartH + 30;
    g.font = '400 18px Inter Variable, Inter, system-ui, sans-serif';
    for (const w of warnings) {
      g.fillStyle = w.startsWith('!!') ? '#b42318' : '#333';
      g.fillText(`• ${w}`.slice(0, 190), 40, y);
      y += 26;
    }
    g.fillStyle = '#666';
    g.font = '400 16px Inter Variable, Inter, system-ui, sans-serif';
    wrapText(g, DISCLAIMER, 40, H - 50, W - 80, 20);
    c.toBlob((blob) => {
      if (!blob) return;
      download(blob, fileBase(session) + '.png');
    });
  };
  img.src = renderChartImage(scn, session, zoom, W, chartH);
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    if (g.measureText(line + w).width > maxW && line) {
      lines.push(line.trim());
      line = '';
    }
    line += w + ' ';
  }
  lines.push(line.trim());
  lines.forEach((l, i) => g.fillText(l, x, y - (lines.length - 1 - i) * lh));
}

function fileBase(session: Session) {
  const name = (session.patient.name || 'patient').trim().replace(/[^\w\-]+/g, '-') || 'patient';
  const d = new Date();
  return `${name}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-cleardate`;
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
