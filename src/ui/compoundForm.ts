// Form sections for one compound. Shared by the custom drug wizard and the local data editor.
// Sections mutate the compound in place and call onChange.

import { INHIBITION_TYPES, INHIBITOR_STRENGTHS, QT_TIERS, RECEPTOR_ACTIONS, type Compound, type HalfLife, type Phenotype } from '../types';
import { field, h, numberInput, select, textInput } from './dom';

export type SectionName = 'basics' | 'halfLife' | 'cyp2d6' | 'qt' | 'receptors' | 'lingering' | 'source';

export interface SectionOpts {
  /** Show a free-text source note under each section (stored in sourceNotes). */
  sourceNotes?: boolean;
  /** Called on every edit. */
  onChange: () => void;
}

const NOTE_KEY: Partial<Record<SectionName, string>> = {
  halfLife: 'halfLife', cyp2d6: 'cyp2d6', qt: 'qt', receptors: 'receptors', lingering: 'lingering',
};

function sourceNote(c: Compound, section: SectionName, o: SectionOpts) {
  const k = NOTE_KEY[section];
  if (!o.sourceNotes || !k) return null;
  const ta = h('textarea', { rows: 2, class: 'source-note', placeholder: 'Source note for this section ([checked] / [recall] / [estimate] / [gap] …)' }, c.sourceNotes[k] ?? '');
  ta.addEventListener('input', () => {
    c.sourceNotes[k] = ta.value;
    o.onChange();
  });
  return field('Source note', ta);
}

/** Half-life inputs with an hours/days unit selector. Values are stored in hours. */
export function halfLifeInputs(hl: HalfLife, onChange: () => void, label = 'Half-life'): HTMLElement {
  let unit: 'hours' | 'days' = hl.typical >= 72 ? 'days' : 'hours';
  const factor = () => (unit === 'days' ? 24 : 1);
  const inputs = (['typical', 'min', 'max'] as const).map((k) => {
    const i = h('input', { type: 'number', step: 'any', min: '0', value: hl[k] ? String(+(hl[k] / factor()).toPrecision(6)) : '' });
    i.addEventListener('input', () => {
      hl[k] = i.value === '' ? 0 : Number(i.value) * factor();
      onChange();
    });
    return { k, i };
  });
  const unitSel = select(unit, [['hours', 'hours'], ['days', 'days']] as const, (u) => {
    unit = u;
    for (const { k, i } of inputs) i.value = hl[k] ? String(+(hl[k] / factor()).toPrecision(6)) : '';
  });
  return h('div', { class: 'hl-row' },
    h('span', { class: 'field-label' }, label),
    h('div', { class: 'row' }, ...inputs.map(({ k, i }) => field(k, i)), field('unit', unitSel)));
}

export function compoundSection(c: Compound, section: SectionName, o: SectionOpts): HTMLElement {
  const ch = o.onChange;
  switch (section) {
    case 'basics':
      return h('div', { class: 'form-section' },
        field('Name', textInput(c.name, (v) => { c.name = v; ch(); })),
        field('Aliases', textInput(c.aliases.join(', '), (v) => { c.aliases = v.split(',').map((s) => s.trim()).filter(Boolean); ch(); }), 'Comma-separated brand, abbreviation and street names'),
        field('Molecular weight (g/mol, optional)', numberInput(c.molecularWeight, (v) => { c.molecularWeight = v; ch(); }), 'Free base. Needed to show metabolites in mg of the metabolite.'));
    case 'halfLife':
      return h('div', { class: 'form-section' }, halfLifeInputs(c.halfLifeHours, ch, 'Elimination half-life'), sourceNote(c, section, o));
    case 'cyp2d6': {
      const mult = h('div', { class: 'row' }, ...(['poor', 'intermediate', 'normal', 'ultrarapid'] as Phenotype[]).map((p) =>
        field(p, numberInput(c.cyp2d6.halfLifeMultiplier[p], (v) => { c.cyp2d6.halfLifeMultiplier[p] = v > 0 ? v : 1; ch(); }, { min: '0' }))));
      mult.hidden = !c.cyp2d6.substrate;
      const sub = h('input', { type: 'checkbox', checked: c.cyp2d6.substrate });
      sub.addEventListener('change', () => { c.cyp2d6.substrate = sub.checked; mult.hidden = !sub.checked; ch(); });
      return h('div', { class: 'form-section' },
        h('label', { class: 'check' }, sub, 'CYP2D6 substrate (clinically meaningful pathway)'),
        h('div', { class: 'sub' }, h('span', { class: 'field-hint' }, 'Half-life multiplier by phenotype (normal = 1)'), mult),
        h('div', { class: 'row' },
          field('Inhibitor strength', select(c.cyp2d6.inhibitor, INHIBITOR_STRENGTHS, (v) => { c.cyp2d6.inhibitor = v; ch(); })),
          field('Inhibition type', select(c.cyp2d6.inhibitionType, INHIBITION_TYPES, (v) => { c.cyp2d6.inhibitionType = v; ch(); }))),
        sourceNote(c, section, o));
    }
    case 'qt':
      return h('div', { class: 'form-section' },
        h('div', { class: 'row' },
          field('QT tier', select(c.qt.tier, QT_TIERS, (v) => { c.qt.tier = v; ch(); })),
          field('Relative weight', numberInput(c.qt.weight, (v) => { c.qt.weight = Math.max(0, v); ch(); }, { min: '0' }), 'Clinical judgement; 0 = no contribution')),
        sourceNote(c, section, o));
    case 'receptors': {
      const list = h('div', { class: 'receptor-list' });
      const render = () => {
        list.replaceChildren(
          ...c.receptors.map((r, i) =>
            h('div', { class: 'row receptor-row' },
              textInput(r.target, (v) => { r.target = v; ch(); }, { placeholder: 'Target, e.g. mu-opioid, 5-HT2A, SERT' }),
              select(r.action, RECEPTOR_ACTIONS, (v) => { r.action = v; ch(); }),
              h('button', { class: 'icon-btn', type: 'button', title: 'Remove', onclick: () => { c.receptors.splice(i, 1); render(); ch(); } }, '✕'))),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => { c.receptors.push({ target: '', action: 'agonist' }); render(); ch(); } }, '+ Add receptor'),
        );
      };
      render();
      return h('div', { class: 'form-section' }, list, sourceNote(c, section, o));
    }
    case 'lingering': {
      const nl = h('input', { type: 'checkbox', checked: c.nonlinearKinetics.flag });
      nl.addEventListener('change', () => { c.nonlinearKinetics.flag = nl.checked; ch(); });
      return h('div', { class: 'form-section' },
        h('div', { class: 'row' },
          field('Lingering effects (days after clearance)', numberInput(c.lingeringEffects.durationDays, (v) => { c.lingeringEffects.durationDays = Math.max(0, v); ch(); }, { min: '0' })),
          field('Note', textInput(c.lingeringEffects.note, (v) => { c.lingeringEffects.note = v; ch(); }, { placeholder: 'e.g. protracted withdrawal' }))),
        h('label', { class: 'check' }, nl, 'Nonlinear kinetics (warning only — not modelled)'),
        field('Nonlinear note', textInput(c.nonlinearKinetics.note, (v) => { c.nonlinearKinetics.note = v; ch(); })),
        sourceNote(c, section, o));
    }
    case 'source':
      return h('div', { class: 'form-section' },
        field('Source / citation', h('textarea', {
          rows: 3,
          oninput: (e: Event) => { c.source = (e.target as HTMLTextAreaElement).value; ch(); },
        }, c.source)),
        field('URL (optional)', textInput(c.sourceUrl ?? '', (v) => { c.sourceUrl = v; ch(); }, { type: 'url', placeholder: 'https://…' })));
  }
}
