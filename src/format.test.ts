import { describe, expect, it } from 'vitest';
import { dateTimePlaceholder, fmtLocalValue, parseLocalText } from './format';

const dmy24 = { dateOrder: 'dmy', hour12: false } as const;
const mdy12 = { dateOrder: 'mdy', hour12: true } as const;

describe('date fields in the user’s format', () => {
  it('formats input values in the chosen date order and clock', () => {
    expect(fmtLocalValue('2026-11-02T09:05', dmy24)).toBe('02/11/2026 09:05');
    expect(fmtLocalValue('2026-11-02T21:05', mdy12)).toBe('11/02/2026 9:05 pm');
    expect(fmtLocalValue('1984-03-15', dmy24, false)).toBe('15/03/1984');
    expect(fmtLocalValue('', dmy24)).toBe('');
  });

  it('parses typed text in the chosen date order', () => {
    expect(parseLocalText('02/11/2026 09:05', dmy24)).toBe('2026-11-02T09:05');
    expect(parseLocalText('11/02/2026 9:05 pm', mdy12)).toBe('2026-11-02T21:05');
    expect(parseLocalText('2.11.2026 9', dmy24)).toBe('2026-11-02T09:00');
    expect(parseLocalText('15-03-1984', dmy24, false)).toBe('1984-03-15');
  });

  it('accepts 24-hour times with the 12-hour setting, am/pm with the 24-hour setting, and ISO dates', () => {
    expect(parseLocalText('11/02/2026 21:05', mdy12)).toBe('2026-11-02T21:05');
    expect(parseLocalText('02/11/2026 12:30 am', dmy24)).toBe('2026-11-02T00:30');
    expect(parseLocalText('2026-11-02T09:05', mdy12)).toBe('2026-11-02T09:05');
  });

  it('round-trips through formatting', () => {
    for (const s of [dmy24, mdy12, { dateOrder: 'dmy', hour12: true } as const])
      for (const v of ['2026-01-31T00:00', '2026-12-01T12:00', '2026-07-04T23:59'])
        expect(parseLocalText(fmtLocalValue(v, s), s)).toBe(v);
  });

  it('rejects impossible or incomplete input, and treats empty as cleared', () => {
    expect(parseLocalText('31/02/2026 09:00', dmy24)).toBeNull();
    expect(parseLocalText('13/02/2026 09:00', mdy12)).toBeNull();
    expect(parseLocalText('02/11/2026', dmy24)).toBeNull();
    expect(parseLocalText('02/11/2026 24:00', dmy24)).toBeNull();
    expect(parseLocalText('02/11/2026 13:00 pm', dmy24)).toBeNull();
    expect(parseLocalText('15/03/1984 10:00', dmy24, false)).toBeNull();
    expect(parseLocalText('  ', dmy24)).toBe('');
  });

  it('shows the format as a placeholder', () => {
    expect(dateTimePlaceholder(dmy24)).toBe('dd/mm/yyyy hh:mm');
    expect(dateTimePlaceholder(mdy12)).toBe('mm/dd/yyyy h:mm am');
    expect(dateTimePlaceholder(mdy12, false)).toBe('mm/dd/yyyy');
  });
});
