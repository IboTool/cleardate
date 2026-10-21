import { describe, expect, it } from 'vitest';
import { emptyCompound, SCHEMA_VERSION, serializeLibrary } from '../src/schema';
import type { Compound, Library } from '../src/types';
import { validateLibrary } from '../src/validate';
import { applyWorksheet, EDITS, QT_CALIBRATION_NOTE, renderWorksheetReport } from './worksheet-2026-10-lib';

const compound = (id: string, extra: Partial<Compound> = {}): Compound => ({ ...emptyCompound(id, id), clinicalRelevance: 'active', ...extra });
const fixture = (): Library => ({
  schemaVersion: SCHEMA_VERSION,
  categories: [{ id: 'x', name: 'X', order: 1 }],
  compounds: [...new Set(EDITS.map((e) => e.id))].map((id) => compound(id)),
  products: [],
});

describe('worksheet 2026-10 edits', () => {
  const src = fixture();
  src.compounds.find((c) => c.id === 'escitalopram')!.cyp2d6 = { ...emptyCompound('x', 'x').cyp2d6, inhibitor: 'weak', inhibitionType: 'reversible' };
  src.compounds.find((c) => c.id === 'escitalopram')!.provenance.cyp2d6 = 'recall';
  const { lib, report } = applyWorksheet(src);
  const c = (id: string) => lib.compounds.find((x) => x.id === id)!;

  it('sets escitalopram to moderate from its clinical AUC ratio, as a checked draft', () => {
    expect(c('escitalopram').cyp2d6).toMatchObject({ inhibitor: 'moderate', strengthEvidence: { basis: 'clinical-aucr', probe: 'desipramine', aucRatio: 2 } });
    expect(c('escitalopram').provenance.cyp2d6).toBe('checked');
    expect(c('escitalopram').sourceNotes.cyp2d6).toMatch(/^\[worksheet 2026-10-21\] .*metoprolol AUC 82% \(1\.82, weak\).*FDA examples table lists weak/);
    expect(report.changed).toContainEqual({ id: 'escitalopram', section: 'cyp2d6', field: 'provenance.cyp2d6', before: '"recall"', after: '"checked"' });
  });

  it('enters the MAOI label washouts as last-dose durations and sets the QT calibration note', () => {
    expect(c('phenelzine').lingeringEffects).toMatchObject({ durationDays: 14, origin: 'last-dose' });
    expect(c('tranylcypromine').lingeringEffects).toMatchObject({ durationDays: 7, origin: 'last-dose' });
    expect(c('selegiline').lingeringEffects.durationDays).toBeNull();
    expect(lib.qtCalibrationNote).toBe(QT_CALIBRATION_NOTE);
  });

  it('never marks anything reviewed or verified', () => {
    for (const x of lib.compounds) {
      expect(Object.values(x.provenance)).not.toContain('reviewer');
      expect(x.reviewedDates).toEqual({});
      expect(x.verified).toBe(false);
    }
    expect(validateLibrary(lib).errors).toEqual([]);
  });

  it('is idempotent', () => {
    const again = applyWorksheet(lib);
    expect(again.report.changed).toEqual([]);
    expect(again.report.notes).toEqual([]);
    expect(serializeLibrary(again.lib)).toBe(serializeLibrary(lib));
  });

  it('skips reviewer-confirmed sections and reports them', () => {
    const s = fixture();
    const esc = s.compounds.find((x) => x.id === 'escitalopram')!;
    esc.provenance.cyp2d6 = 'reviewer';
    const r = applyWorksheet(s);
    expect(r.lib.compounds.find((x) => x.id === 'escitalopram')!.cyp2d6.inhibitor).toBe('unassessed');
    expect(r.report.skippedReviewed).toContainEqual({ id: 'escitalopram', section: 'cyp2d6' });
    expect(renderWorksheetReport(r.report, '2026-10-21')).toMatch(/## Skipped \(reviewer-confirmed sections\)\n\n- `escitalopram` cyp2d6/);
  });
});
