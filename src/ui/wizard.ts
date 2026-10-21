// "Add custom drug" wizard. Session-only: entries go into the autosave and patient files,
// never anywhere else. No network lookups of any kind.

import { emptyCompound, emptyProduct, serializeLibrary, slug } from '../schema';
import { validateCustom } from '../validate';
import type { Compound, CustomDrugs, Library, Product } from '../types';
import { compoundSection, halfLifeInputs, type SectionName } from './compoundForm';
import { badge, field, h, modal, numberInput, select, textInput, toast } from './dom';

interface MetNode {
  uid: number;
  kind: 'new' | 'link';
  compound: Compound; // for 'link', the library compound (read-only)
  fraction: number;
  children: MetNode[];
}

const MAX_DEPTH = 3;
const STEPS = ['Basics', 'Half-life', 'Metabolites', 'CYP2D6', 'QT', 'Receptors', 'Lingering & nonlinear', 'Source'];

export interface WizardCtx {
  library: Library;
  custom: CustomDrugs;
  prefillName?: string;
  onSave: (add: CustomDrugs, productId: string) => void;
}

let uidSeq = 1;

export function openWizard(ctx: WizardCtx) {
  const parent: Compound = { ...emptyCompound('', ctx.prefillName ?? ''), userEntered: true };
  const product: Product = { ...emptyProduct('', '', '', 'Oral', ctx.library.categories[0]?.id ?? 'other_interactors'), userEntered: true };
  const roots: MetNode[] = [];
  let step = 0;

  const body = h('div', { class: 'wizard' });
  const m = modal('Add custom drug', body, { wide: true });

  const newCompounds = (): { node: MetNode | null; c: Compound; depth: number }[] => {
    const out: { node: MetNode | null; c: Compound; depth: number }[] = [{ node: null, c: parent, depth: 0 }];
    const walk = (nodes: MetNode[], d: number) => {
      for (const n of nodes) {
        if (n.kind === 'new') out.push({ node: n, c: n.compound, depth: d });
        walk(n.children, d + 1);
      }
    };
    walk(roots, 1);
    return out;
  };

  /** Assemble the custom entries with final IDs. */
  const assemble = (): CustomDrugs => {
    const taken = new Set([...ctx.library.compounds, ...ctx.custom.compounds].map((c) => c.id));
    const uniqueId = (base: string) => {
      let id = base || 'custom_drug';
      if (taken.has(id)) id = `${base}_custom`;
      let n = 2;
      while (taken.has(id)) id = `${base}_custom${n++}`;
      taken.add(id);
      return id;
    };
    const compounds: Compound[] = [];
    const links: NonNullable<CustomDrugs['links']> = [];
    const pId = uniqueId(slug(parent.name));
    compounds.push({ ...structuredClone(parent), id: pId, isMetabolite: false, formedFrom: [], userEntered: true });
    const walk = (nodes: MetNode[], fromId: string) => {
      for (const n of nodes) {
        if (n.kind === 'link') {
          links.push({ compound: n.compound.id, from: fromId, fraction: n.fraction });
          continue;
        }
        const id = uniqueId(slug(n.compound.name));
        compounds.push({
          ...structuredClone(n.compound),
          id,
          isMetabolite: true,
          formedFrom: [{ compound: fromId, fraction: n.fraction }],
          source: parent.source,
          sourceUrl: parent.sourceUrl,
          userEntered: true,
        });
        walk(n.children, id);
      }
    };
    walk(roots, pId);
    const takenP = new Set([...ctx.library.products, ...ctx.custom.products].map((p) => p.id));
    let prodId = `${pId}_${slug(product.route) || 'route'}`;
    while (takenP.has(prodId)) prodId += '_custom';
    const prod: Product = {
      ...structuredClone(product),
      id: prodId,
      parentCompound: pId,
      name: `${parent.name.trim()} (${product.route.trim()})`,
      aliases: [...parent.aliases],
      source: parent.source,
      userEntered: true,
    };
    return { compounds, products: [prod], links };
  };

  const errorsFor = (s: number): string[] => {
    const errs: string[] = [];
    if (s === 0) {
      if (!parent.name.trim()) errs.push('Name is required.');
      if (!product.route.trim()) errs.push('Route is required.');
      if (!(product.typicalDoseMg >= 0)) errs.push('Typical dose must be ≥ 0.');
    }
    const hlErr = (c: Compound) => {
      const { typical, min, max } = c.halfLifeHours;
      const n = c.name || 'compound';
      if (!(typical > 0)) errs.push(`${n}: typical half-life must be positive.`);
      if (min && !(min > 0)) errs.push(`${n}: min half-life must be positive.`);
      if (min && max && !(min <= typical && typical <= max)) errs.push(`${n}: need min ≤ typical ≤ max.`);
      if (!min && max && typical > max) errs.push(`${n}: typical > max.`);
      if (min && !max && min > typical) errs.push(`${n}: min > typical.`);
    };
    if (s === 1) hlErr(parent);
    if (s === 2) {
      const check = (nodes: MetNode[], owner: string) => {
        const sum = nodes.reduce((a, n) => a + (n.fraction || 0), 0);
        if (sum > 1 + 1e-9) errs.push(`Fractions formed from ${owner || 'the parent'} sum to ${sum.toFixed(2)} (must be ≤ 1).`);
        for (const n of nodes) {
          if (!(n.fraction >= 0 && n.fraction <= 1)) errs.push(`${n.compound.name || 'metabolite'}: fraction must be between 0 and 1.`);
          if (n.kind === 'new') {
            if (!n.compound.name.trim()) errs.push('Every metabolite needs a name.');
            hlErr(n.compound);
            check(n.children, n.compound.name);
          }
        }
      };
      check(roots, parent.name);
    }
    if (s === STEPS.length - 1 || s === -1) {
      const v = validateCustom(assemble(), ctx.library);
      errs.push(...v.errors.map((e) => `${e.id}: ${e.message}`));
    }
    return errs;
  };

  const errBox = h('div', { class: 'wizard-errors' });
  const showErrors = (errs: string[]) => errBox.replaceChildren(...errs.map((e) => h('div', null, '⚠ ', e)));

  const perCompound = (section: SectionName) =>
    h('div', { class: 'per-compound' },
      ...newCompounds().map(({ c, depth }) =>
        h('details', { class: 'compound-block', open: depth === 0 },
          h('summary', null, h('span', { style: `padding-left:${depth * 14}px` }, depth ? '↳ ' : '', c.name || '(unnamed)'), depth ? badge('metabolite', 'muted') : null),
          compoundSection(c, section, { onChange: () => {} }))));

  const metTree = (): HTMLElement => {
    const lib = ctx.library.compounds;
    const renderNodes = (nodes: MetNode[], depth: number, ownerName: string): HTMLElement =>
      h('div', { class: 'met-level' },
        ...nodes.map((n, i) =>
          h('div', { class: 'met-node', style: `margin-left:${(depth - 1) * 18}px` },
            h('div', { class: 'met-head' },
              h('span', { class: 'met-depth' }, `L${depth}`),
              n.kind === 'link'
                ? h('span', { class: 'met-link' }, '🔗 ', n.compound.name, ' ', badge('library', 'muted'))
                : textInput(n.compound.name, (v) => { n.compound.name = v; }, { placeholder: 'Metabolite name' }),
              field('Fraction formed', numberInput(n.fraction, (v) => { n.fraction = v; }, { min: '0', max: '1', step: '0.01' })),
              h('button', { class: 'icon-btn', type: 'button', title: 'Remove', onclick: () => { nodes.splice(i, 1); rerender(); } }, '✕')),
            n.kind === 'new'
              ? h('div', { class: 'met-body' },
                  halfLifeInputs(n.compound.halfLifeHours, () => {}),
                  field('Molecular weight (optional)', numberInput(n.compound.molecularWeight, (v) => { n.compound.molecularWeight = v; })),
                  depth < MAX_DEPTH ? renderNodes(n.children, depth + 1, n.compound.name) : h('div', { class: 'field-hint' }, 'Maximum depth (3 levels) reached.'))
              : h('div', { class: 'field-hint' }, 'Its own downstream metabolites come from the library.'))),
        addControls(nodes, depth, ownerName, lib));
    const rerender = () => {
      const fresh = metTree();
      wrap.replaceWith(fresh);
      wrap = fresh;
    };
    const addControls = (nodes: MetNode[], depth: number, ownerName: string, lib: Compound[]) => {
      const linkSel = h('select', null,
        h('option', { value: '' }, 'Link existing library compound…'),
        ...[...lib].sort((a, b) => a.name.localeCompare(b.name)).map((c) => h('option', { value: c.id }, c.name)));
      linkSel.addEventListener('change', () => {
        const c = lib.find((x) => x.id === linkSel.value);
        if (!c) return;
        nodes.push({ uid: uidSeq++, kind: 'link', compound: c, fraction: 0, children: [] });
        rerender();
      });
      return h('div', { class: 'met-add', style: `margin-left:${(depth - 1) * 18}px` },
        h('button', {
          class: 'btn btn-ghost btn-sm', type: 'button',
          onclick: () => {
            nodes.push({ uid: uidSeq++, kind: 'new', compound: { ...emptyCompound('', ''), isMetabolite: true, userEntered: true }, fraction: 0, children: [] });
            rerender();
          },
        }, `+ Add metabolite of ${ownerName || 'parent'}`),
        linkSel);
    };
    let wrap: HTMLElement = h('div', { class: 'met-tree' }, renderNodes(roots, 1, parent.name));
    return wrap;
  };

  const stepBody = (): HTMLElement => {
    switch (step) {
      case 0:
        return h('div', { class: 'form-section' },
          field('Name', textInput(parent.name, (v) => { parent.name = v; }, { autofocus: true })),
          field('Aliases', textInput(parent.aliases.join(', '), (v) => { parent.aliases = v.split(',').map((x) => x.trim()).filter(Boolean); }), 'Brand, abbreviation and street names, comma-separated'),
          h('div', { class: 'row' },
            field('Route', textInput(product.route, (v) => { product.route = v; }, { placeholder: 'Oral, IV, SC depot…' })),
            field('Category', select(product.category, ctx.library.categories.map((c) => [c.id, c.name] as [string, string]), (v) => { product.category = v; }))),
          h('div', { class: 'row' },
            field('Class', textInput(product.class, (v) => { product.class = v; }, { placeholder: 'e.g. opioid agonist' })),
            field('Typical dose (mg)', numberInput(product.typicalDoseMg, (v) => { product.typicalDoseMg = v; }, { min: '0' }))),
          field('Molecular weight (optional)', numberInput(parent.molecularWeight, (v) => { parent.molecularWeight = v; })));
      case 1: {
        const depot = h('div', { class: 'sub' },
          h('p', { class: 'field-hint' }, 'Depot or extended-release? Enter the release-limited apparent half-life here instead; it overrides the compound value for this product.'),
          halfLifeInputs((product.apparentHalfLifeHours ??= { typical: 0, min: 0, max: 0 }), () => {}, 'Apparent half-life (optional)'));
        return h('div', { class: 'form-section' }, halfLifeInputs(parent.halfLifeHours, () => {}, `${parent.name || 'Parent'} half-life`), depot);
      }
      case 2:
        return h('div', null,
          h('p', { class: 'field-hint' }, 'Build the metabolite tree (up to three levels). Fraction = share of the source compound’s elimination that forms this metabolite; fractions from one compound must sum to ≤ 1.'),
          metTree());
      case 3: return perCompound('cyp2d6');
      case 4: return perCompound('qt');
      case 5: return perCompound('receptors');
      case 6: return perCompound('lingering');
      default:
        return h('div', null, compoundSection(parent, 'source', { onChange: () => {} }),
          h('p', { class: 'field-hint' }, 'The citation applies to every compound created in this wizard.'));
    }
  };

  const finish = () => {
    if (product.apparentHalfLifeHours && !(product.apparentHalfLifeHours.typical > 0)) delete product.apparentHalfLifeHours;
    const errs = errorsFor(-1);
    if (errs.length) return showErrors(errs);
    const add = assemble();
    ctx.onSave(add, add.products[0].id);
    m.close();
    toast(`Added ${parent.name} (user-entered)`);
  };

  const render = () => {
    body.replaceChildren(
      h('ol', { class: 'wizard-steps' }, ...STEPS.map((s, i) => h('li', { class: i === step ? 'active' : i < step ? 'done' : '' }, s))),
      h('div', { class: 'wizard-body' }, stepBody()),
      errBox,
      h('div', { class: 'wizard-foot' },
        h('button', { class: 'btn btn-ghost', type: 'button', disabled: step === 0, onclick: () => { step--; showErrors([]); render(); } }, 'Back'),
        h('span', { class: 'spacer' }),
        step === STEPS.length - 1
          ? [
              h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => {
                const errs = errorsFor(-1);
                if (errs.length) return showErrors(errs);
                copyLibraryEntry(assemble(), ctx.library);
              } }, 'Copy as library entry'),
              h('button', { class: 'btn btn-primary', type: 'button', onclick: finish }, 'Add drug'),
            ]
          : h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
              const errs = errorsFor(step);
              showErrors(errs);
              if (!errs.length) { step++; render(); }
            } }, 'Next')),
    );
  };
  render();
}

/** Valid drugs.json JSON for pasting into the shared library. */
export function libraryEntryJson(add: CustomDrugs, library: Library): string {
  const compounds = add.compounds.map((c) => ({ ...c, source: c.sourceUrl ? `${c.source} ${c.sourceUrl}`.trim() : c.source }));
  // Linked library metabolites gain a formedFrom entry; include their updated full entry.
  for (const l of add.links ?? []) {
    const base = library.compounds.find((c) => c.id === l.compound);
    if (base) compounds.push({ ...base, isMetabolite: true, formedFrom: [...base.formedFrom, { compound: l.from, fraction: l.fraction }] });
  }
  const lib = JSON.parse(serializeLibrary({ categories: [], compounds, products: add.products }));
  delete lib.categories;
  return JSON.stringify(lib, null, 2);
}

export function copyLibraryEntry(add: CustomDrugs, library: Library) {
  const json = libraryEntryJson(add, library);
  const ta = h('textarea', { class: 'code', rows: 18, readonly: true }, json);
  const linked = (add.links ?? []).map((l) => l.compound);
  modal('Copy as library entry', h('div', null,
    h('p', { class: 'field-hint' }, 'Paste the compounds and products into public/drugs.json (or use the local editor), then run npm run validate.',
      linked.length ? ` Linked library compounds (${linked.join(', ')}) are included with the new formedFrom link — replace their existing entries.` : ''),
    ta,
    h('div', { class: 'wizard-foot' }, h('span', { class: 'spacer' }),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(json); toast('Copied to clipboard'); }
        catch { ta.select(); document.execCommand('copy'); toast('Copied'); }
      } }, 'Copy'))), { wide: true });
}
