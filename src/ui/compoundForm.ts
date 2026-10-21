// Form sections for one compound. Shared by the custom drug wizard and the local data editor.
// Sections mutate the compound in place and call onChange with the provenance section that was edited.
// Unknown numbers are null: every numeric field has an "unknown" checkbox.

import { emptyRange, emptyStrengthEvidence, isRangeOnly, rangeTypical, RANGE_TYPE_LABEL, STRENGTH_BASIS_LABEL } from '../schema';
import {
  CLINICAL_RELEVANCE, INHIBITION_TYPES, INHIBITOR_STRENGTHS, KINETIC_MODES, PHENOTYPES, QT_TIERS, RANGE_TYPES, RECEPTOR_ACTIONS, STRENGTH_BASES, TRI_STATES,
  type ClinicalRelevance, type Compound, type CompoundSection, type KineticMode, type PhenotypeMap, type Range, type RangeType, type StrengthBasis,
} from '../types';
import { field, h, select, textInput } from './dom';

export type SectionName = 'basics' | 'kinetics' | 'relevance' | 'cyp2d6' | 'qt' | 'receptors' | 'lingering' | 'source';

export interface SectionOpts {
  /** Show a free-text source note under each section (stored in sourceNotes). */
  sourceNotes?: boolean;
  /** Called on every edit, with the provenance section the edit belongs to (if any). */
  onChange: (section?: CompoundSection) => void;
}

const NOTE_KEY: Partial<Record<SectionName, CompoundSection>> = {
  kinetics: 'halfLife', relevance: 'relevance', cyp2d6: 'cyp2d6', qt: 'qt', receptors: 'receptors', lingering: 'lingeringEffects',
};

/** Basis, probe, regimen, AUC ratio and citation behind an inhibitor strength (schema 2.4). */
function strengthEvidenceFields(cy: Compound['cyp2d6'], ch: () => void): HTMLElement {
  const ev = (cy.strengthEvidence ??= emptyStrengthEvidence());
  const text = (v: string) => (v.trim() ? v : null);
  const ratio = nullableNumber(ev.aucRatio, (v) => { ev.aucRatio = v; ch(); }, { min: '0', step: '0.01' });
  return h('div', null,
    h('div', { class: 'row' },
      field('Strength basis', select<StrengthBasis | ''>(ev.basis ?? '', [['', 'not recorded'], ...STRENGTH_BASES.map((b) => [b, STRENGTH_BASIS_LABEL[b]] as [StrengthBasis, string])],
        (v) => { ev.basis = v || null; ch(); }), 'Model predictions are shown as “predicted moderate” / “predicted strong”.'),
      field('Probe substrate', textInput(ev.probe ?? '', (v) => { ev.probe = text(v); ch(); }, { placeholder: 'e.g. desipramine' })),
      field('Probe AUC ratio', ratio, 'Weak 1.25–<2, moderate 2–<5, strong ≥5')),
    h('div', { class: 'row' },
      field('Inhibitor regimen studied', textInput(ev.regimen ?? '', (v) => { ev.regimen = text(v); ch(); }, { placeholder: 'e.g. 20 mg/day for 21 days' })),
      field('Citation', textInput(ev.citation ?? '', (v) => { ev.citation = text(v); ch(); }, { placeholder: 'URL or reference' }))));
}

const RELEVANCE_LABEL: Record<ClinicalRelevance, string> = {
  active: 'active — counts toward the clear date',
  inactive: 'inactive — plotted faintly, never holds up the clear date',
  unknown: 'unknown — counts until classified',
};

function sourceNote(c: Compound, section: SectionName, o: SectionOpts) {
  const k = NOTE_KEY[section];
  if (!o.sourceNotes || !k) return null;
  const ta = h('textarea', { rows: 2, class: 'source-note', placeholder: 'Source note for this section ([checked] / [recall] / [estimate] / [gap] …)' }, c.sourceNotes[k] ?? '');
  ta.addEventListener('input', () => {
    c.sourceNotes[k] = ta.value;
    o.onChange(k);
  });
  return field('Source note', ta);
}

/**
 * Number input with an "unknown" checkbox. Unknown (or an empty box) is stored as null — never 0.
 * `scale` converts between display and stored units (stored = shown × scale).
 */
export function nullableNumber(
  value: number | null,
  onChange: (v: number | null) => void,
  attrs: Record<string, unknown> = {},
  scale = () => 1,
): HTMLElement & { refresh: () => void } {
  const input = h('input', { type: 'number', step: 'any', ...attrs });
  const unk = h('input', { type: 'checkbox', title: 'Unknown — stored as null', checked: value === null });
  let current = value;
  const show = () => {
    input.value = current === null ? '' : String(+(current / scale()).toPrecision(6));
    input.disabled = unk.checked;
  };
  input.addEventListener('input', () => {
    current = input.value === '' ? null : Number(input.value) * scale();
    onChange(current);
  });
  unk.addEventListener('change', () => {
    if (unk.checked && current !== null) {
      current = null;
      onChange(null);
    }
    show();
    if (!unk.checked) input.focus();
  });
  show();
  const el = h('span', { class: 'nullable' }, input, h('label', { class: 'unk' }, unk, 'unknown')) as HTMLElement & { refresh: () => void };
  el.refresh = show;
  return el;
}

/**
 * Range editor: typical / min / max (hours or days), range type and CV. The whole range can be unknown (null).
 * `get`/`set` read and replace the range on its owner.
 */
export function rangeInputs(get: () => Range | null, set: (r: Range | null) => void, onChange: () => void, label = 'Half-life', unitScale = true): HTMLElement {
  const initial = get();
  let unit: 'hours' | 'days' = unitScale && (initial?.typical ?? 0) >= 72 ? 'days' : 'hours';
  const factor = () => (unit === 'days' ? 24 : 1);
  const body = h('div', { class: 'range-body' });
  const unknown = h('input', { type: 'checkbox', checked: initial === null });
  const render = () => {
    const r = get();
    body.hidden = r === null;
    if (!r) return body.replaceChildren();
    const num = (k: 'typical' | 'min' | 'max') => nullableNumber(r[k], (v) => { r[k] = v; onChange(); }, { min: '0' }, factor);
    const nums = (['typical', 'min', 'max'] as const).map((k) => ({ k, el: num(k) }));
    const cv = nullableNumber(r.cv, (v) => { r.cv = v; onChange(); }, { min: '0', step: '0.05', placeholder: 'e.g. 0.3' });
    const rt = select(r.rangeType ?? '', [['', '— range type —'], ...RANGE_TYPES.map((t) => [t, RANGE_TYPE_LABEL[t]] as [string, string])], (v) => {
      r.rangeType = (v || null) as RangeType | null;
      onChange();
    });
    body.replaceChildren(
      h('div', { class: 'row' }, ...nums.map(({ k, el }) => field(k, el)),
        unitScale ? field('unit', select(unit, ['hours', 'days'] as const, (u) => { unit = u; nums.forEach((n) => n.el.refresh()); hint(); })) : null),
      h('div', { class: 'row' }, field('Range type', rt), field('CV (SD/mean)', cv, 'Only for range type "CV"; otherwise the app assumes a spread when a bound is missing.')),
      midpoint,
    );
    hint();
  };
  // Range-only evidence (e.g. a label's "43–60 days"): typical stays unknown and the app uses the geometric midpoint.
  const midpoint = h('div', { class: 'field-hint' });
  const hint = () => {
    const r = get();
    const t = rangeTypical(r);
    const fmt = (v: number) => `${+(v / factor()).toPrecision(3)} ${unit}`;
    midpoint.textContent = !r || r.typical !== null || r.min === null || r.max === null ? ''
      : isRangeOnly(r) ? `Range only — the app uses the geometric midpoint √(min × max) = ${fmt(t!)}, labelled “assumed midpoint of reported range”.`
      : 'Range only: set the range type to “observed range” or “range of cohort means” so the midpoint can be used.';
  };
  body.addEventListener('input', hint);
  body.addEventListener('change', hint);
  unknown.addEventListener('change', () => {
    set(unknown.checked ? null : emptyRange());
    onChange();
    render();
  });
  render();
  return h('div', { class: 'hl-row' },
    h('div', { class: 'hl-head' }, h('span', { class: 'field-label' }, label), h('label', { class: 'unk' }, unknown, 'unknown')),
    body);
}

/**
 * One input per phenotype. A phenotype left unknown is absent from the map (the app assumes ×1 and labels it).
 * Formation multipliers may be 0 (not formed in that phenotype); half-life multipliers must stay > 0.
 */
export function phenotypeInputs(m: PhenotypeMap, allowZero: boolean, onChange: () => void): HTMLElement[] {
  return PHENOTYPES.map((p) => field(p, nullableNumber(m[p] ?? null, (v) => {
    if (v === null) delete m[p];
    else if (v > 0 || (allowZero && v === 0)) m[p] = v;
    else return;
    onChange();
  }, { min: '0' })));
}

function phenotypeMap(get: () => PhenotypeMap | null, set: (m: PhenotypeMap | null) => void, onChange: () => void, label: string): HTMLElement {
  const unknown = h('input', { type: 'checkbox', checked: get() === null });
  const row = h('div', { class: 'row' });
  const render = () => {
    const m = get();
    row.hidden = m === null;
    row.replaceChildren(...(m ? phenotypeInputs(m, false, onChange) : []));
  };
  unknown.addEventListener('change', () => {
    set(unknown.checked ? null : { poor: 1, intermediate: 1, normal: 1, ultrarapid: 1 });
    onChange();
    render();
  });
  render();
  return h('div', { class: 'sub' }, h('div', { class: 'hl-head' }, h('span', { class: 'field-hint' }, label), h('label', { class: 'unk' }, unknown, 'unknown')), row);
}

export const MODE_LABEL: Record<KineticMode, string> = {
  intrinsic: 'intrinsic (own half-life)',
  'formation-limited': 'formation-limited (tracks parent)',
  'zero-order': 'zero-order (fixed mg/kg/h, e.g. alcohol)',
  'not-modelled': 'not modelled (exposure only)',
  unknown: 'unknown',
};

/** Kinetics editor: mode, terminal half-life, optional early phase and steady-state half-life. */
export function kineticsInputs(c: Compound, onChange: () => void): HTMLElement {
  const k = c.kinetics;
  const body = h('div');
  const render = () => {
    const parts: HTMLElement[] = [];
    if (k.mode === 'intrinsic') {
      parts.push(rangeInputs(() => k.halfLifeHours, (r) => (k.halfLifeHours = r), onChange, 'Terminal elimination half-life'));
      const early = h('input', { type: 'checkbox', checked: k.earlyPhase !== null });
      early.addEventListener('change', () => { k.earlyPhase = early.checked ? { fraction: null, halfLifeHours: emptyRange() } : null; onChange(); render(); });
      parts.push(h('label', { class: 'check' }, early, 'Two-phase: a faster early phase clears part of each dose'));
      if (k.earlyPhase) {
        const ep = k.earlyPhase;
        parts.push(h('div', { class: 'sub' },
          field('Fraction cleared by the early phase (0–1)', nullableNumber(ep.fraction, (v) => { ep.fraction = v; onChange(); }, { min: '0', max: '1', step: '0.05' })),
          rangeInputs(() => ep.halfLifeHours, (r) => (ep.halfLifeHours = r), onChange, 'Early-phase half-life')));
      }
      const ss = h('input', { type: 'checkbox', checked: k.steadyState !== null });
      ss.addEventListener('change', () => { k.steadyState = ss.checked ? { afterDays: null, halfLifeHours: emptyRange() } : null; onChange(); render(); });
      parts.push(h('label', { class: 'check' }, ss, 'Different half-life at steady state (chronic dosing)'));
      if (k.steadyState) {
        const st = k.steadyState;
        parts.push(h('div', { class: 'sub' },
          field('Applies after continuous dosing for (days)', nullableNumber(st.afterDays, (v) => { st.afterDays = v; onChange(); }, { min: '0' })),
          rangeInputs(() => st.halfLifeHours, (r) => (st.halfLifeHours = r), onChange, 'Steady-state half-life')));
      }
    } else if (k.mode === 'formation-limited') {
      parts.push(h('p', { class: 'field-hint' }, 'Tracks its parent(s): eliminated much faster than it forms, so no half-life is needed. Simulated with one-tenth of the fastest parent’s half-life and labelled “formation-limited”. Needs at least one parent.'));
    } else if (k.mode === 'zero-order') {
      parts.push(rangeInputs(() => k.zeroOrderRateMgPerKgPerHour ?? null, (r) => (k.zeroOrderRateMgPerKgPerHour = r), onChange, 'Elimination rate (mg/kg/h)', false));
      parts.push(h('p', { class: 'field-hint' }, 'Saturable elimination at a fixed rate × body weight (alcohol). Without a body weight the product isn’t simulated. The minimum curve uses the fastest rate and the maximum the slowest.'));
    } else if (k.mode === 'not-modelled') {
      parts.push(field('Why it isn’t modelled', textInput(k.notModelledReason ?? '', (v) => { k.notModelledReason = v; onChange(); }, { placeholder: 'e.g. exhaled within minutes; the relevant effect is B12 inactivation' }),
        'Shown wherever a clear date would be. Exposures are drawn as markers and the lingering-effects band still applies.'));
    } else {
      parts.push(h('p', { class: 'field-hint' }, 'Kinetics unknown. Products containing this compound show an “Incomplete” clear date (unless the “treat unknown metabolites as formation-limited” setting is on).'));
    }
    body.replaceChildren(...parts);
  };
  render();
  return h('div', null,
    field('Kinetic mode', select(k.mode, KINETIC_MODES.map((m) => [m, MODE_LABEL[m]] as [string, string]),
      (v) => {
        k.mode = v as typeof k.mode;
        if (k.mode !== 'intrinsic') { k.halfLifeHours = null; k.earlyPhase = null; k.steadyState = null; }
        else k.halfLifeHours ??= emptyRange();
        if (k.mode === 'zero-order') k.zeroOrderRateMgPerKgPerHour ??= emptyRange();
        else delete k.zeroOrderRateMgPerKgPerHour;
        if (k.mode === 'not-modelled') k.notModelledReason ??= '';
        else delete k.notModelledReason;
        onChange();
        render();
      })),
    body);
}

function endogenousToggle(c: Compound, onChange: () => void): HTMLElement {
  const box = h('input', { type: 'checkbox', checked: !!c.endogenous });
  box.addEventListener('change', () => {
    if (box.checked) c.endogenous = true;
    else delete c.endogenous;
    onChange();
  });
  return h('div', null,
    h('label', { class: 'check' }, box, 'Endogenous — also produced by the body'),
    h('p', { class: 'field-hint' }, 'With unknown kinetics and a reviewer-confirmed relevance, it shows as “endogenous — excess over baseline not modelled” and never holds up the clear date.'));
}

export function compoundSection(c: Compound, section: SectionName, o: SectionOpts): HTMLElement {
  const ch = o.onChange;
  switch (section) {
    case 'basics':
      return h('div', { class: 'form-section' },
        field('Name', textInput(c.name, (v) => { c.name = v; ch(); })),
        field('Aliases', textInput(c.aliases.join(', '), (v) => { c.aliases = v.split(',').map((s) => s.trim()).filter(Boolean); ch(); }), 'Comma-separated brand, abbreviation and street names'),
        field('Molecular weight (g/mol)', nullableNumber(c.molecularWeight, (v) => { c.molecularWeight = v; ch('molecularWeight'); }, { min: '0' }),
          'Free base. Needed to show metabolites in mg of the metabolite.'));
    case 'kinetics':
      return h('div', { class: 'form-section' }, kineticsInputs(c, () => ch('halfLife')), sourceNote(c, section, o));
    case 'relevance':
      return h('div', { class: 'form-section' },
        c.isMetabolite
          ? field('Clinical relevance', select(c.clinicalRelevance, CLINICAL_RELEVANCE.map((r) => [r, RELEVANCE_LABEL[r]] as [string, string]), (v) => { c.clinicalRelevance = v as ClinicalRelevance; ch('relevance'); }),
              'Does this metabolite contribute pharmacological activity, toxicity or a withdrawal-relevant effect at the amounts formed? A metabolite that a product doses directly is always treated as active.')
          : h('p', { class: 'field-hint' }, 'Parent compound — always treated as active.'),
        c.isMetabolite ? endogenousToggle(c, () => ch('halfLife')) : null,
        sourceNote(c, section, o));
    case 'cyp2d6': {
      const cy = c.cyp2d6;
      const mult = phenotypeMap(() => cy.halfLifeMultiplier, (m) => (cy.halfLifeMultiplier = m), () => ch('cyp2d6'), 'Half-life multiplier by phenotype (normal = 1)');
      mult.hidden = cy.substrate !== 'yes';
      return h('div', { class: 'form-section' },
        field('CYP2D6 substrate (clinically meaningful pathway)', select(cy.substrate, TRI_STATES, (v) => {
          cy.substrate = v;
          mult.hidden = v !== 'yes';
          ch('cyp2d6');
        })),
        mult,
        h('div', { class: 'row' },
          field('Inhibitor strength', select(cy.inhibitor, INHIBITOR_STRENGTHS, (v) => { cy.inhibitor = v; ch('cyp2d6'); })),
          field('Inhibition type', select(cy.inhibitionType, INHIBITION_TYPES, (v) => { cy.inhibitionType = v; ch('cyp2d6'); }))),
        strengthEvidenceFields(cy, () => ch('cyp2d6')),
        sourceNote(c, section, o));
    }
    case 'qt':
      return h('div', { class: 'form-section' },
        h('div', { class: 'row' },
          field('QT tier', select(c.qt.tier, QT_TIERS, (v) => { c.qt.tier = v; ch('qt'); })),
          field('Relative weight', nullableNumber(c.qt.weight, (v) => { c.qt.weight = v; ch('qt'); }, { min: '0' }), 'Clinical judgement'),
          field('Reference amount (mg in body)', nullableNumber(c.qt.referenceAmountMg, (v) => { c.qt.referenceAmountMg = v; ch('qt'); }, { min: '0' }),
            'Body amount at which this compound contributes its full weight. Needed for the summed QT load.')),
        sourceNote(c, section, o));
    case 'receptors': {
      const list = h('div', { class: 'receptor-list' });
      const assessed = h('input', { type: 'checkbox', checked: c.receptorsAssessed });
      assessed.addEventListener('change', () => { c.receptorsAssessed = assessed.checked; ch('receptors'); });
      const render = () => {
        list.replaceChildren(
          ...c.receptors.map((r, i) =>
            h('div', { class: 'row receptor-row' },
              textInput(r.target, (v) => { r.target = v; ch('receptors'); }, { placeholder: 'Target, e.g. mu-opioid, 5-HT2A, SERT' }),
              select(r.action, RECEPTOR_ACTIONS, (v) => { r.action = v; ch('receptors'); }),
              h('button', { class: 'icon-btn', type: 'button', title: 'Remove', onclick: () => { c.receptors.splice(i, 1); render(); ch('receptors'); } }, '✕'))),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => {
            c.receptors.push({ target: '', action: 'agonist' });
            c.receptorsAssessed = assessed.checked = true;
            render();
            ch('receptors');
          } }, '+ Add receptor'),
        );
      };
      render();
      return h('div', { class: 'form-section' },
        h('label', { class: 'check' }, assessed, 'Receptor targets assessed (an empty assessed list means “no relevant targets”)'),
        list, sourceNote(c, section, o));
    }
    case 'lingering':
      return h('div', { class: 'form-section' },
        h('div', { class: 'row' },
          field('Lingering effects: duration (days)', nullableNumber(c.lingeringEffects.durationDays, (v) => { c.lingeringEffects.durationDays = v; ch('lingeringEffects'); }, { min: '0' })),
          field('Counted from', select(c.lingeringEffects.origin ?? 'clearance', [['clearance', 'clearance (effect outlasts the drug)'], ['last-dose', 'last dose (label washout)']],
            (v) => { c.lingeringEffects.origin = v; ch('lingeringEffects'); }),
          'A “last dose” washout never adds days after clearance: the band ends at last dose + duration.'),
          field('Note', textInput(c.lingeringEffects.note, (v) => { c.lingeringEffects.note = v; ch('lingeringEffects'); }, { placeholder: 'e.g. protracted withdrawal' }))),
        h('div', { class: 'row' },
          field('Nonlinear kinetics (warning only — not modelled)', select(c.nonlinearKinetics.flag, TRI_STATES, (v) => { c.nonlinearKinetics.flag = v; ch('nonlinearKinetics'); })),
          field('Nonlinear note', textInput(c.nonlinearKinetics.note, (v) => { c.nonlinearKinetics.note = v; ch('nonlinearKinetics'); }))),
        sourceNote(c, section, o));
    case 'source':
      return h('div', { class: 'form-section' },
        field('Source / citation', h('textarea', {
          rows: 3,
          oninput: (e: Event) => { c.source = (e.target as HTMLTextAreaElement).value; ch(); },
        }, c.source)),
        field('URL (optional)', textInput(c.sourceUrl ?? '', (v) => { c.sourceUrl = v; ch(); }, { type: 'url', placeholder: 'https://…' })));
  }
}
