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

/** A dose amount as entered: "1 standard drink", "2.5 standard drinks", "10 mg". */
export function fmtDoseAmount(v: number, unit: string): string {
  return unit === 'standard drinks' && v === 1 ? '1 standard drink' : `${v} ${unit}`;
}

export function fmtDuration(hours: number): string {
  if (hours < 48) return `${+hours.toFixed(1)} h`;
  return `${+(hours / 24).toFixed(1)} d`;
}

type DateFmt = Pick<Settings, 'dateOrder' | 'hour12'>;

/** A local input value ("YYYY-MM-DDTHH:mm", or "YYYY-MM-DD" without time) in the user's date and time format. */
export function fmtLocalValue(v: string, s: DateFmt, withTime = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v);
  if (!m) return '';
  const ms = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)).getTime();
  return withTime ? fmtDateTime(ms, s) : fmtDate(ms, s);
}

export function dateTimePlaceholder(s: DateFmt, withTime = true): string {
  const date = s.dateOrder === 'dmy' ? 'dd/mm/yyyy' : 'mm/dd/yyyy';
  return withTime ? `${date} ${s.hour12 ? 'h:mm am' : 'hh:mm'}` : date;
}

/**
 * Parse typed text in the user's date order into a local input value.
 * Returns '' for empty text and null when the text isn't a valid date (and time, if required).
 * Accepts / . or - as separators, 24-hour or am/pm times regardless of the time setting, and ISO dates.
 */
export function parseLocalText(text: string, s: DateFmt, withTime = true): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return '';
  let y: number, mo: number, d: number, rest: string;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:t|\s+|$)(.*)$/.exec(t);
  const loc = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:,?\s+|$)(.*)$/.exec(t);
  if (iso) [y, mo, d, rest] = [+iso[1], +iso[2], +iso[3], iso[4]];
  else if (loc) {
    [d, mo] = s.dateOrder === 'dmy' ? [+loc[1], +loc[2]] : [+loc[2], +loc[1]];
    [y, rest] = [+loc[3], loc[4]];
  } else return null;
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  const ymd = `${y}-${p2(mo)}-${p2(d)}`;
  rest = rest.trim();
  if (!withTime) return rest ? null : ymd;
  const tm = /^(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a|p)?$/.exec(rest);
  if (!tm) return null;
  let hh = +tm[1];
  const mm = +(tm[2] ?? 0);
  if (tm[3]) {
    if (hh < 1 || hh > 12) return null;
    hh = (hh % 12) + (tm[3].startsWith('p') ? 12 : 0);
  }
  if (hh > 23 || mm > 59) return null;
  return `${ymd}T${p2(hh)}:${p2(mm)}`;
}

/** "every 12 hours", "every day", "every 3 days". */
export function fmtEvery(every: number, unit: 'hours' | 'days'): string {
  return every === 1 ? `every ${unit === 'days' ? 'day' : 'hour'}` : `every ${every} ${unit}`;
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
