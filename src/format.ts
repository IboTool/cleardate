import type { Settings } from './types';

const p2 = (n: number) => String(n).padStart(2, '0');

export function fmtDate(ms: number, s: Pick<Settings, 'dateOrder'>): string {
  const d = new Date(ms);
  const dd = p2(d.getDate()), mm = p2(d.getMonth() + 1), yyyy = d.getFullYear();
  return s.dateOrder === 'dmy' ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
}

export function fmtTime(ms: number, s: Pick<Settings, 'hour12'>): string {
  const d = new Date(ms);
  if (!s.hour12) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  const h = d.getHours() % 12 || 12;
  return `${h}:${p2(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

export const fmtDateTime = (ms: number, s: Pick<Settings, 'dateOrder' | 'hour12'>) => `${fmtDate(ms, s)} ${fmtTime(ms, s)}`;

/** Short axis label: "12 Mar" style independent of locale, honouring day/month order. */
export function fmtAxis(ms: number, s: Pick<Settings, 'dateOrder' | 'hour12'>, withTime: boolean): string {
  const d = new Date(ms);
  const mon = d.toLocaleString('en', { month: 'short' });
  const date = s.dateOrder === 'dmy' ? `${d.getDate()} ${mon}` : `${mon} ${d.getDate()}`;
  return withTime ? `${date}\n${fmtTime(ms, s)}` : date;
}

export function fmtAmount(v: number, unit: string): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  const s = a === 0 ? '0' : a >= 100 ? v.toFixed(0) : a >= 10 ? v.toFixed(1) : a >= 1 ? v.toFixed(2) : a >= 0.01 ? v.toFixed(3) : v.toExponential(1);
  return `${s} ${unit}`;
}

export function fmtDuration(hours: number): string {
  if (hours < 48) return `${+hours.toFixed(1)} h`;
  return `${+(hours / 24).toFixed(1)} d`;
}

export function ageFrom(dob: string, now = Date.now()): number | null {
  if (!dob) return null;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return null;
  const n = new Date(now);
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}
