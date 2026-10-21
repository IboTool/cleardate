// Edits from worksheet_answers.md (review worksheet answers, 21 Oct 2026), as an explicit table. Pure: no file
// access, so it is unit-tested directly. tools/apply-worksheet-2026-10.ts is the CLI wrapper.
//
// Rules: values are draft (provenance checked / estimate, never reviewer); a section a reviewer has confirmed is
// skipped and reported; reviewedDates and verified are never touched; notes are appended only if the exact text
// isn't already there, so running it twice changes nothing.

import { clone } from '../src/schema';
import type { Compound, CompoundSection, Library, Provenance, StrengthEvidence } from '../src/types';

const TAG = '[worksheet 2026-10-21]';
const FDA_TABLE = 'https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems';
const ESCITALOPRAM_LABEL = 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f4a12048-181e-45ed-a382-f53096d1b689';
const XUE_2018 = 'https://www.mdpi.com/1999-4923/10/1/1/pdf';

export const QT_CALIBRATION_NOTE =
  'No validated common calibration between modeled body amount and QTc effect has been established. Study-specific ' +
  'concentration-response and QT measurements are recorded in source notes. Numerical QT load is unavailable until an ' +
  'exposure model, reference conditions and validation have been agreed; QT/TdP categories remain separate evidence.';

interface Edit {
  id: string;
  section: CompoundSection;
  /** Field changes (applied in place). */
  apply?: (c: Compound) => void;
  /** Appended to sourceNotes[section] with the worksheet tag. */
  note?: string;
  provenance?: Provenance;
}

const ev = (basis: StrengthEvidence['basis'], probe: string | null, regimen: string | null, aucRatio: number | null, citation: string | null): StrengthEvidence =>
  ({ basis, probe, regimen, aucRatio, citation });
const evidence = (e: StrengthEvidence) => (c: Compound) => { c.cyp2d6.strengthEvidence = e; };
const fda = evidence(ev('fda-category', null, null, null, FDA_TABLE));

export const EDITS: Edit[] = [
  // ---- A3: CYP2D6 strength basis (strongest applicable clinical evidence; model tiers labelled predicted) ----
  {
    id: 'escitalopram', section: 'cyp2d6', provenance: 'checked',
    apply: (c) => { c.cyp2d6.inhibitor = 'moderate'; c.cyp2d6.strengthEvidence = ev('clinical-aucr', 'desipramine', 'escitalopram 20 mg/day for 21 days', 2.0, ESCITALOPRAM_LABEL); },
    note: 'Strength set from the strongest applicable clinical evidence: label §§7, 12.3, escitalopram 20 mg/day for 21 days increased desipramine AUC 100% (ratio 2.00, exactly the moderate threshold) and metoprolol AUC 82% (1.82, weak). Clinical AUCr-derived moderate; FDA examples table lists weak. Both results preserved. ' + ESCITALOPRAM_LABEL,
  },
  {
    id: '4_hydroxypropranolol', section: 'cyp2d6',
    apply: (c) => { c.cyp2d6.inhibitor = 'unassessed'; },
    note: 'Clinical strength set to unassessed: the label describes weak inhibition only in an in-vitro metabolism paragraph, with no probe AUC ratio, so no clinical tier is established. Mechanism-based designation (bioactivation evidence above) kept for separate review; strength and mechanism need different evidence.',
  },
  {
    id: 'hydroxychloroquine', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'metoprolol', 'hydroxychloroquine 400 mg/day for 8 days', 1.65, 'https://pubmed.ncbi.nlm.nih.gov/10848718/')),
    note: 'Somer 2000 randomized crossover, 7 healthy volunteers: metoprolol AUC +65% (ratio 1.65) supports weak at the studied regimen.',
  },
  {
    id: 'mdma', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'dextromethorphan', 'MDMA 1.5 mg/kg single dose (12 women)', 13.64, 'https://bibliography.maps.org/resources/download/8748')),
  },
  {
    id: 'bupropion', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'desipramine', 'bupropion 150 mg twice daily', 5, 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e57451fd-aba5-47d6-9892-ffe2a6021b6f')),
    note: 'Label §12.3: bupropion 150 mg twice daily with desipramine 50 mg increased desipramine AUC about 5-fold; the effect was present at least 7 days after the last bupropion dose. Metabolites contribute.',
  },
  {
    id: 'terbinafine', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'desipramine', null, 5, 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e0b309a5-bebe-c6da-2847-bda21aa488b1')),
    note: 'Label §7.1: desipramine AUC about 5-fold; the interaction was still present at the last observation, four weeks after discontinuation (not proof of recovery at four weeks).',
  },
  {
    id: 'duloxetine', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'desipramine', 'duloxetine 60 mg twice daily', 3, 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ff118c08-2e64-4416-a996-fd9de45d018a')),
    note: 'Label §7.9: duloxetine 60 mg twice daily with desipramine 50 mg increased desipramine AUC 3-fold.',
  },
  {
    id: 'ranolazine', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'metoprolol', 'ranolazine PR 750 mg twice daily at steady state', 1.82, 'https://www.tga.gov.au/sites/default/files/auspar-ranolazine-180220-cer.pdf')),
  },
  {
    id: 'ritonavir', section: 'cyp2d6',
    apply: evidence(ev('clinical-aucr', 'desipramine', 'ritonavir 100 mg twice daily for two weeks (booster dose)', 1.26, 'https://pubmed.ncbi.nlm.nih.gov/16338282/')),
  },
  {
    id: 'hydroxybupropion', section: 'cyp2d6',
    apply: evidence(ev('model-estimate', 'desipramine', 'exposure from bupropion 150 mg twice daily (PBPK, sole-inhibitor counterfactual)', 4.58, XUE_2018)),
    note: 'Predicted moderate. Xue 2018 Table 5: the combined model gives 5.05 and the observed bupropion/desipramine interaction 5.2; the isolated metabolite ratios must not be added.',
  },
  {
    id: 'threohydrobupropion', section: 'cyp2d6',
    apply: evidence(ev('model-estimate', 'desipramine', 'exposure from bupropion 150 mg twice daily (PBPK, sole-inhibitor counterfactual)', 3.47, XUE_2018)),
    note: 'Predicted moderate. Xue 2018 Table 5: the combined model gives 5.05 and the observed bupropion/desipramine interaction 5.2; the isolated metabolite ratios must not be added.',
  },
  {
    id: 'erythrohydrobupropion', section: 'cyp2d6',
    apply: evidence(ev('model-estimate', 'desipramine', 'exposure from bupropion 150 mg twice daily (PBPK, sole-inhibitor counterfactual)', 2.83, XUE_2018)),
    note: 'Predicted moderate. Xue 2018 Table 5: the combined model gives 5.05 and the observed bupropion/desipramine interaction 5.2; the isolated metabolite ratios must not be added.',
  },
  {
    id: 'norfluoxetine', section: 'cyp2d6',
    apply: evidence(ev('model-estimate', 'fully CYP2D6-cleared probe (static model)', 'exposure during fluoxetine treatment', 5.9, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4029899/')),
    note: 'Predicted strong: static-model estimate, not an observed isolated-norfluoxetine AUC ratio. The primary page could not be rechecked in the worksheet pass.',
  },
  { id: 'fluoxetine', section: 'cyp2d6', apply: fda },
  { id: 'paroxetine', section: 'cyp2d6', apply: fda },
  { id: 'sertraline', section: 'cyp2d6', apply: fda },
  { id: 'amiodarone', section: 'cyp2d6', apply: fda },
  { id: 'clobazam', section: 'cyp2d6', apply: fda },
  { id: 'fluvoxamine', section: 'cyp2d6', apply: fda },
  { id: 'cinacalcet', section: 'cyp2d6', apply: fda },
  { id: 'mirabegron', section: 'cyp2d6', apply: fda },
  { id: 'quinidine', section: 'cyp2d6', apply: fda },
  { id: 'dronedarone', section: 'cyp2d6', apply: evidence(ev('label', null, null, null, 'https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=7fa41601-7fb5-4155-8e50-2ae903f0d2d6')) },
  // Strength stays unassessed: only facts missing from the existing notes.
  {
    id: 'desethylamiodarone', section: 'cyp2d6',
    note: 'Ohyama 2000: CYP2D6 inactivation KI 1.3 micromolar, kinact 0.12 per min (competitive Ki 4.5 micromolar). These do not establish a clinical tier.',
  },
  {
    id: 'haloperidol', section: 'cyp2d6',
    note: 'Not present in the FDA examples table retrieved for the worksheet, so an FDA moderate category is not claimed; absence does not establish no inhibition. ' + FDA_TABLE,
  },

  // ---- A7: lingering effects. Label washouts count from the last dose. ----
  {
    id: 'phenelzine', section: 'lingeringEffects', provenance: 'checked',
    apply: (c) => { c.lingeringEffects = { durationDays: 14, origin: 'last-dose', note: 'Label: at least 14 days after stopping phenelzine before starting another antidepressant or buspirone (irreversible MAO inhibition; enzyme resynthesis governs recovery). A labelled interaction interval, not a measured recovery time.' }; },
    note: 'Manufacturer label, Contraindications: at least 14 days after discontinuation before another antidepressant or buspirone. Duration counted from the last dose. https://labeling.pfizer.com/ShowLabeling.aspx?id=921',
  },
  {
    id: 'isocarboxazid', section: 'lingeringEffects', provenance: 'checked',
    apply: (c) => { c.lingeringEffects = { durationDays: 14, origin: 'last-dose', note: 'Marplan label: no SSRIs within 14 days of stopping isocarboxazid, and at least 14 days before bupropion (irreversible MAO inhibition). A labelled interaction interval, not a measured recovery time.' }; },
    note: 'Duration 14 days counted from the last dose (label washout), now that the app supports that origin.',
  },
  {
    id: 'tranylcypromine', section: 'lingeringEffects', provenance: 'checked',
    apply: (c) => { c.lingeringEffects = { durationDays: 7, origin: 'last-dose', note: 'Parnate label (2018) §2.2: at least one week after stopping tranylcypromine, then follow the next drug\'s label for its own required interval; 14 days is a common conservative convention. Irreversible MAO inhibition.' }; },
    note: '2018 Parnate label §2.2: at least one week, then consult the subsequent drug\'s label; not blanket permission to start all interacting drugs after seven days. Confirm the current product and destination-drug labels. https://www.accessdata.fda.gov/drugsatfda_docs/label/2018/012342s064lbl.pdf',
  },
  {
    id: 'selegiline', section: 'lingeringEffects',
    note: 'EMSAM (transdermal) label §4: at least 2 weeks after stopping the patch before contraindicated drugs. Patch-specific; not extrapolated to oral selegiline, and the duration is stored per compound, so it stays null. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b891bd9f-fdb8-4862-89c5-ecdd700398a3',
  },
  {
    id: 'mdma', section: 'lingeringEffects',
    note: 'Duration stays null: the CYP2D6 track already draws the mechanism-based enzyme-recovery tail, so a 10-day band would count the same effect twice. About 90% of baseline activity at 10 days is a study-specific observation, not full recovery.',
  },
  {
    id: 'ibogaine', section: 'lingeringEffects',
    note: 'The 12-day case (PMID 28489458) is a 2017 report, not Knuijver 2024; the time is after exposure, not extra time after clearance.',
  },
  {
    id: 'noribogaine', section: 'lingeringEffects',
    note: 'The 12-day case (PMID 28489458) is a 2017 report, not Knuijver 2024; the time is after exposure, not extra time after clearance.',
  },

  // ---- A4: quantitative QT evidence (categories unchanged; not newly checked against CredibleMeds) ----
  {
    id: 'citalopram', section: 'qt',
    note: 'Quantitative QT (not a category check): mean placebo-corrected QTcNi 8.5 ms at 20 mg and 18.5 ms at 60 mg; 12.6 ms at 40 mg is predicted (upper one-sided 95% bounds 10.8/21.0/14.3 ms). Archived regulatory study report. https://www.accessdata.fda.gov/drugsatfda_docs/label/2017/020822s047lbl.pdf',
  },
  {
    id: 'escitalopram', section: 'qt',
    note: 'Quantitative QT (not a category check): QTcF 4.5 ms at 10 mg and 10.7 ms at 30 mg; 6.6 ms at 20 mg is predicted (upper bounds 6.4/12.7/7.9 ms), multiple-dose healthy volunteers. ' + ESCITALOPRAM_LABEL,
  },
  {
    id: 'ondansetron', section: 'qt',
    note: 'Quantitative QT (not a category check): baseline-adjusted placebo-subtracted QTcF 5.6 ms at 8 mg IV and 19.5 ms at 32 mg IV, 15-minute infusions (upper 95% bounds 7.4/21.8 ms). https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4a62608c-4187-3473-e054-00144ff8d46c',
  },
  {
    id: 'paliperidone', section: 'qt',
    note: 'Quantitative QT (not a category check): placebo-subtracted QTcLD 6.8 ms at 4 mg IR and 12.3 ms at 8 mg IR; 8 mg IR peak exposure exceeded 12 mg ER, so IR milligrams are not an ER reference. Label §5.4.',
  },
  {
    id: 'lofexidine', section: 'qt',
    note: 'Quantitative QT (not a category check): healthy single-dose change in QTcF 14.4/13.6 ms at 1.44/1.8 mg; phase-3 maximum mean prolongation 7.3/9.3 ms at 2.16/2.88 mg/day. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=ed7613f5-ac52-4108-afb7-d92c818d6e3c',
  },

  // ---- A1: ibogaine and noribogaine (no values change) ----
  {
    id: 'ibogaine', section: 'halfLife',
    note: 'Mash 2018 Table 3 individual whole-blood half-lives: 1.1-6.1 h overall (wt/*4 1.8-6.1 h, wt/wt 1.1-3.8 h among quantifiable entries); observed values in a patient subset, not population limits. Glue et al., J Clin Pharmacol 2015;55:680-687, doi:10.1002/jcph.471.',
  },
  {
    id: 'ibogaine', section: 'cyp2d6',
    note: 'Mash 2018 Table 3 has no null/null group (two wt/wt subjects described as ultrarapid), so it cannot supply a poor-metaboliser multiplier. The about twofold exposure in Glue 2015 is ibogaine plus noribogaine, not ibogaine alone; noribogaine exposure was similar between arms. The recalled 2-3x multiplier is not confirmed.',
  },
  {
    id: 'noribogaine', section: 'cyp2d6',
    note: 'Knuijver 2024 supports glucuronidation to noribogaine glucuronide; it does not quantify all clearance routes or establish a CYP2D6-negative result, so substrate stays unassessed.',
  },
];

export interface WorksheetReport {
  changed: { id: string; section: string; field: string; before: string; after: string }[];
  notes: { id: string; section: string }[];
  skippedReviewed: { id: string; section: string }[];
  missing: string[];
  qtCalibrationNote: 'set' | 'unchanged' | 'kept (already set by a reviewer)';
  tieredWithoutBasis: string[];
}

const fmt = (v: unknown) => (v === undefined ? '—' : JSON.stringify(v));

function flatten(o: unknown, prefix: string, out: Record<string, unknown>) {
  if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = o;
  return out;
}
const sectionValue = (c: Compound, s: CompoundSection) =>
  s === 'cyp2d6' ? { cyp2d6: c.cyp2d6 } : s === 'lingeringEffects' ? { lingeringEffects: c.lingeringEffects } : s === 'qt' ? { qt: c.qt } : s === 'halfLife' ? { kinetics: c.kinetics } : {};

export function applyWorksheet(src: Library): { lib: Library; report: WorksheetReport } {
  const lib = clone(src);
  const byId = new Map(lib.compounds.map((c) => [c.id, c]));
  const report: WorksheetReport = { changed: [], notes: [], skippedReviewed: [], missing: [], qtCalibrationNote: 'unchanged', tieredWithoutBasis: [] };
  for (const e of EDITS) {
    const c = byId.get(e.id);
    if (!c) {
      if (!report.missing.includes(e.id)) report.missing.push(e.id);
      continue;
    }
    if (c.provenance[e.section] === 'reviewer') {
      report.skippedReviewed.push({ id: e.id, section: e.section });
      continue;
    }
    const snapshot = () => flatten({ ...sectionValue(c, e.section), [`provenance.${e.section}`]: c.provenance[e.section] ?? null }, '', {});
    const before = snapshot();
    e.apply?.(c);
    if (e.provenance) c.provenance[e.section] = e.provenance;
    const after = snapshot();
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)]))
      if (fmt(before[k]) !== fmt(after[k])) report.changed.push({ id: e.id, section: e.section, field: k, before: fmt(before[k]), after: fmt(after[k]) });
    if (e.note) {
      const text = `${TAG} ${e.note}`;
      const cur = c.sourceNotes[e.section] ?? '';
      if (!cur.includes(text)) {
        c.sourceNotes[e.section] = cur ? `${cur} ${text}` : text;
        report.notes.push({ id: e.id, section: e.section });
      }
    }
  }
  if (lib.qtCalibrationNote?.trim() && lib.qtCalibrationNote !== QT_CALIBRATION_NOTE) report.qtCalibrationNote = 'kept (already set by a reviewer)';
  else if (lib.qtCalibrationNote !== QT_CALIBRATION_NOTE) {
    lib.qtCalibrationNote = QT_CALIBRATION_NOTE;
    report.qtCalibrationNote = 'set';
  }
  report.tieredWithoutBasis = lib.compounds
    .filter((c) => ['weak', 'moderate', 'strong'].includes(c.cyp2d6.inhibitor) && !c.cyp2d6.strengthEvidence?.basis)
    .map((c) => c.id);
  return { lib, report };
}

export function renderWorksheetReport(r: WorksheetReport, date: string): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  return [
    '# Worksheet answers applied (review worksheet, 21 October 2026)',
    '',
    `Generated ${date} by \`npm run apply-worksheet-2026-10\` from \`worksheet_answers.md\`. All values are drafts (provenance \`checked\` or \`estimate\`); no section was marked reviewed and no entry was verified. Source-note additions are tagged \`${TAG}\`.`,
    '',
    '## Field changes',
    '',
    r.changed.length ? '| Compound | Field | Before | After |\n|---|---|---|---|' : 'None.',
    ...r.changed.map((x) => `| \`${x.id}\` | \`${x.field}\` | ${esc(x.before)} | ${esc(x.after)} |`),
    '',
    '## Source notes extended',
    '',
    r.notes.length ? r.notes.map((x) => `\`${x.id}\` (${x.section})`).join(', ') + '.' : 'None (already present).',
    '',
    `## QT calibration note\n\n${r.qtCalibrationNote === 'set' ? 'Set to the worksheet’s suggested text. QT weights and reference amounts stay null.' : r.qtCalibrationNote === 'unchanged' ? 'Already set to the worksheet’s text.' : 'Kept: a reviewer had already written one.'}`,
    '',
    '## Skipped (reviewer-confirmed sections)',
    '',
    r.skippedReviewed.length ? r.skippedReviewed.map((x) => `- \`${x.id}\` ${x.section}`).join('\n') : 'None.',
    ...(r.missing.length ? ['', '## Compounds not found', '', r.missing.map((x) => `\`${x}\``).join(', ')] : []),
    '',
    '## Left for review',
    '',
    `- Tiered inhibitors with no recorded strength basis: ${r.tieredWithoutBasis.length ? r.tieredWithoutBasis.map((x) => `\`${x}\``).join(', ') : 'none'}.`,
    '- `4_hydroxypropranolol`: decide the mechanism-based designation separately from its (now unassessed) strength.',
    '- `hydroxynorketamine`: pick the entity. Raja 2024 gives 6.67–8.18 h (cohort means) for (2R,6R)-HNK only; the generic entry stays unknown.',
    '- `selegiline`: the 2-week EMSAM washout is patch-specific; the duration is per compound, so it stays null.',
    '- CredibleMeds: check the current listing and conditions for every QT category; none was newly verified.',
    '- Ibogaine: obtain the Glue 2015 full-text PK tables before setting a phenotype half-life multiplier.',
    '',
  ].join('\n');
}
