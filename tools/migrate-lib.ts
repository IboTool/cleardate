// v1 → v2 library migration (docs/ClearDate_Spec_v2.md, "Migration"). Pure: no file access, so
// it is unit-tested directly. tools/migrate-v2.ts is the CLI wrapper.

import { SCHEMA_VERSION } from '../src/schema';
import {
  COMPOUND_SECTIONS, PRODUCT_SECTIONS,
  type Compound, type CompoundSection, type Library, type Product, type Provenance, type Range, type TriState,
} from '../src/types';
import { applyProductRules, type ProductChange } from './product-rules';

/* eslint-disable @typescript-eslint/no-explicit-any */
type V1 = any;

export interface MigrationReport {
  counts: Record<string, number>;
  formationLimited: string[];
  productChanges: ProductChange[];
  /** field → compound ids whose value was changed to "unassessed". */
  unassessed: Record<string, string[]>;
  releaseConverted: string[];
  releaseDropped: string[];
  halfLifeWithoutTypical: string[];
}

const TAG_RE = /^\s*\[\s*(checked|recall|estimate|gap)\b[^\]]*\]/i;
const SEGMENT_RE = /\[\s*(checked|recall|estimate|gap)\b[^\]]*\]\s*([A-Za-z]+)\s*:\s*/gi;
const CONJUGATE_NOTE = 'Auto-assigned by migration: conjugate assumed formation-limited. Review.';

/** Leading provenance tag of a note ("[recall — check CredibleMeds] …" → recall). */
export function parseTag(note: unknown): Provenance | null {
  if (typeof note !== 'string') return null;
  const m = TAG_RE.exec(note);
  return m ? (m[1].toLowerCase() as Provenance) : null;
}

const pos = (v: unknown): number | null => (typeof v === 'number' && v > 0 ? v : null);

function rangeFromV1(hl: V1): Range | null {
  if (!hl) return null;
  const typical = pos(hl.typical), min = pos(hl.min), max = pos(hl.max);
  if (typical === null) return null;
  const single = (min === null || min === typical) && (max === null || max === typical);
  return { typical, min, max, rangeType: single ? 'single-value' : 'observed-range', cv: null };
}

function appendNote(notes: Record<string, string>, key: string, text: string) {
  notes[key] = notes[key] ? `${notes[key]} ${text}` : text;
}

function migrateCompound(c: V1, report: MigrationReport): Compound {
  const { halfLifeHours, ...rest } = c;
  const notes: Record<string, string> = {};
  for (const s of COMPOUND_SECTIONS) notes[s] = typeof c.sourceNotes?.[s] === 'string' ? c.sourceNotes[s] : '';
  for (const [k, v] of Object.entries(c.sourceNotes ?? {})) if (!(k in notes)) notes[k] = String(v);
  const prov = {} as Record<CompoundSection, Provenance | null>;
  for (const s of COMPOUND_SECTIONS) prov[s] = parseTag(notes[s]);
  const bump = (k: string) => (report.counts[k] = (report.counts[k] ?? 0) + 1);

  // Kinetics
  const range = rangeFromV1(halfLifeHours);
  let mode: Compound['kinetics']['mode'] = range ? 'intrinsic' : 'unknown';
  if (!range && (pos(halfLifeHours?.min) || pos(halfLifeHours?.max))) {
    report.halfLifeWithoutTypical.push(c.id);
    appendNote(notes, 'halfLife', `Migration: v1 range ${halfLifeHours.min}–${halfLifeHours.max} h had no typical value, so mode is "unknown". Reviewer: set a typical value.`);
  }
  bump(range ? 'kinetics → intrinsic' : 'kinetics → unknown');
  if (!range && /glucuronide|sulfate/i.test(c.name ?? '')) {
    mode = 'formation-limited';
    prov.halfLife = 'estimate';
    appendNote(notes, 'halfLife', CONJUGATE_NOTE);
    report.formationLimited.push(c.id);
    bump('conjugate → formation-limited');
  }

  // Safety enums: only "gap"/untagged sections become unassessed.
  const assessed = (s: CompoundSection) => prov[s] === 'checked' || prov[s] === 'recall' || prov[s] === 'estimate';
  const mark = (field: string) => {
    (report.unassessed[field] ??= []).push(c.id);
    bump(`${field} → unassessed`);
  };
  const tri = (v: unknown, section: CompoundSection, field: string): TriState => {
    if (v === true) return 'yes';
    if (assessed(section)) return 'no';
    mark(field);
    return 'unassessed';
  };
  const enumVal = <T extends string>(v: T, section: CompoundSection, field: string): T | 'unassessed' => {
    if (v === 'none' && !assessed(section)) {
      mark(field);
      return 'unassessed';
    }
    return v;
  };

  const cyp = c.cyp2d6 ?? {};
  const m = cyp.halfLifeMultiplier;
  const mVals = m ? ['poor', 'intermediate', 'normal', 'ultrarapid'].map((k) => m[k]) : [];
  const multiplier = !m || mVals.every((v) => v === 1 || !(v > 0)) ? null : { poor: m.poor, intermediate: m.intermediate, normal: m.normal, ultrarapid: m.ultrarapid };

  const formedFrom = (c.formedFrom ?? []).map((f: V1) => {
    if (!(f.fraction > 0)) bump('fraction 0 → null');
    return { compound: f.compound, fraction: pos(f.fraction), cyp2d6Multiplier: f.cyp2d6Multiplier ?? null };
  });
  if (!(c.molecularWeight > 0)) bump('molecularWeight 0 → null');
  const receptors = Array.isArray(c.receptors) ? c.receptors : [];

  return {
    ...rest,
    formedFrom,
    molecularWeight: pos(c.molecularWeight),
    kinetics: { mode, halfLifeHours: range, earlyPhase: null, steadyState: null },
    cyp2d6: {
      substrate: tri(cyp.substrate, 'cyp2d6', 'cyp2d6.substrate'),
      halfLifeMultiplier: multiplier,
      inhibitor: enumVal(cyp.inhibitor ?? 'none', 'cyp2d6', 'cyp2d6.inhibitor'),
      inhibitionType: enumVal(cyp.inhibitionType ?? 'none', 'cyp2d6', 'cyp2d6.inhibitionType'),
    },
    qt: { tier: enumVal(c.qt?.tier ?? 'none', 'qt', 'qt.tier'), weight: pos(c.qt?.weight), referenceAmountMg: null },
    receptors,
    receptorsAssessed: receptors.length > 0 || assessed('receptors'),
    lingeringEffects: { durationDays: pos(c.lingeringEffects?.durationDays), note: c.lingeringEffects?.note ?? '' },
    nonlinearKinetics: { flag: tri(c.nonlinearKinetics?.flag, 'nonlinearKinetics', 'nonlinearKinetics.flag'), note: c.nonlinearKinetics?.note ?? '' },
    provenance: prov,
    sourceNotes: notes,
    source: c.source ?? '',
    verified: !!c.verified,
    verifiedDate: c.verifiedDate ?? '',
  } as Compound;
}

/** Split "DRAFT — … [tag] key: text [tag] key: text" into the lead and keyed, tagged notes. */
export function parseProductSource(source: string): { lead: string; notes: Record<string, string>; provenance: Record<string, Provenance> } {
  const notes: Record<string, string> = {};
  const provenance: Record<string, Provenance> = {};
  const matches = [...source.matchAll(SEGMENT_RE)];
  if (!matches.length) return { lead: source, notes, provenance };
  const keyMap: Record<string, string> = { apparentHalfLife: 'input' };
  matches.forEach((mt, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index! : source.length;
    const text = source.slice(mt.index! + mt[0].length, end).trim();
    const key = keyMap[mt[2]] ?? mt[2];
    const tag = mt[1].toLowerCase() as Provenance;
    appendNote(notes, key, `[${tag}] ${text}`);
    provenance[key] ??= tag;
  });
  return { lead: source.slice(0, matches[0].index).trim(), notes, provenance };
}

function migrateProduct(p: V1, compounds: Map<string, V1>, report: MigrationReport): Product {
  const { parentCompound, typicalDoseMg, apparentHalfLifeHours, ...rest } = p;
  const parsed = parseProductSource(p.source ?? '');
  const notes: Record<string, string> = {};
  const prov: Record<string, Provenance | null> = {};
  for (const s of PRODUCT_SECTIONS) {
    notes[s] = parsed.notes[s] ?? '';
    prov[s] = parsed.provenance[s] ?? null;
  }
  for (const [k, v] of Object.entries(parsed.notes)) if (!(k in notes)) notes[k] = v;

  let release: Range | null = null;
  const apparent = rangeFromV1(apparentHalfLifeHours);
  if (apparent) {
    const intrinsic = pos(compounds.get(parentCompound)?.halfLifeHours?.typical);
    if (intrinsic !== null && apparent.typical! > 2 * intrinsic) {
      release = apparent;
      prov.input = 'estimate';
      appendNote(notes, 'input', 'Migrated from v1 apparent half-life; treated as release half-life (flip-flop approximation). Review.');
      report.releaseConverted.push(p.id);
    } else {
      prov.input = 'gap';
      appendNote(
        notes, 'input',
        `v1 apparent half-life ${apparent.typical} h (${apparent.min ?? apparent.typical}–${apparent.max ?? apparent.typical} h) ≈ intrinsic half-life; not converted to a release half-life to avoid double-counting. Review.`,
      );
      report.releaseDropped.push(p.id);
    }
  }

  return {
    ...rest,
    candidateId: parentCompound,
    secondaryCategories: Array.isArray(p.secondaryCategories) ? p.secondaryCategories : [],
    formulation: null,
    components: [{ compound: parentCompound, ratio: 1, saltFactor: null, bioavailability: null }],
    doseUnit: 'mg',
    input: { type: 'bolus', releaseHalfLifeHours: release, defaultDurationHours: null },
    typicalDose: { amount: pos(typicalDoseMg), unit: 'mg', basis: 'maintenance' },
    provenance: prov,
    sourceNotes: notes,
    source: parsed.lead,
    verified: !!p.verified,
    verifiedDate: p.verifiedDate ?? '',
  } as Product;
}

export function emptyReport(): MigrationReport {
  return { counts: {}, formationLimited: [], productChanges: [], unassessed: {}, releaseConverted: [], releaseDropped: [], halfLifeWithoutTypical: [] };
}

/** Migrate a v1 library. A v2 library is returned unchanged with `skipped: true` (idempotent). */
export function migrateLibrary(input: V1): { lib: Library; report: MigrationReport; skipped: boolean } {
  const report = emptyReport();
  if (input?.schemaVersion === SCHEMA_VERSION) return { lib: input as Library, report, skipped: true };
  const v1Compounds = new Map<string, V1>((input.compounds ?? []).map((c: V1) => [c.id, c]));
  const { categories, compounds, products, ...extra } = input;
  const lib: Library = {
    ...extra,
    schemaVersion: SCHEMA_VERSION,
    categories: (categories ?? []).map((c: V1) => ({ ...c })),
    compounds: (compounds ?? []).map((c: V1) => migrateCompound(c, report)),
    products: (products ?? []).map((p: V1) => migrateProduct(p, v1Compounds, report)),
  };
  report.productChanges = applyProductRules(lib, { annotate: true });
  report.counts['products in'] = (products ?? []).length;
  report.counts['products out'] = lib.products.length;
  return { lib, report, skipped: false };
}

const KNOWN_REVIEW_ITEMS = [
  'Morphine: early vs terminal phase — the v1 range (2–15 h) mixes the ~2 h effective phase and the ~15 h terminal phase. Use `kinetics.earlyPhase`.',
  'Methadone: acute vs steady-state half-life — use `kinetics.steadyState`.',
  'Buprenorphine: formulation-specific half-lives (sublingual, buccal, transdermal, depots) — set release half-lives per product.',
  'Oxymorphone and MC5 ranges: mean − 2SD went negative; candidates for `rangeType: "cv"`.',
  'Meperidine/normeperidine and oxycodone: half-life ranges without a defensible typical value.',
  'Kratom compounds (mitragynine, 7-hydroxymitragynine): sparse human PK; check every value.',
];

export function renderReport(report: MigrationReport, date = new Date().toISOString().slice(0, 10)): string {
  const L: string[] = [];
  L.push('# Migration to schema v2', '', `Run on ${date} by \`npm run migrate-v2\`. The v1 file is kept as \`public/drugs.v1-backup.json\`.`, '');
  L.push('## Counts', '', '| Transform | Count |', '|---|---|');
  for (const [k, v] of Object.entries(report.counts).sort()) L.push(`| ${k} | ${v} |`);
  L.push('', '## Auto-assigned formation-limited compounds (review each)', '');
  L.push(report.formationLimited.length ? report.formationLimited.map((id) => `- \`${id}\``).join('\n') : '_None._');
  L.push('', '## Products split, merged or renamed', '', '| Change | Old id | New ids |', '|---|---|---|');
  for (const c of report.productChanges) L.push(`| ${c.kind} | ${c.oldId ? `\`${c.oldId}\`` : '—'} | ${c.newIds.map((i) => `\`${i}\``).join(', ')} |`);
  L.push('', '## Apparent half-lives (v1 product overrides)', '');
  L.push(`- Converted to a release half-life: ${report.releaseConverted.map((i) => `\`${i}\``).join(', ') || 'none'}`);
  L.push(`- Dropped (≈ intrinsic half-life, value kept in \`sourceNotes.input\`): ${report.releaseDropped.map((i) => `\`${i}\``).join(', ') || 'none'}`);
  if (report.halfLifeWithoutTypical.length)
    L.push('', '## Half-life ranges without a typical value (mode set to unknown)', '', report.halfLifeWithoutTypical.map((id) => `- \`${id}\``).join('\n'));
  L.push('', '## Safety fields changed to "unassessed"', '', 'Only where the section had provenance `gap` or no tag. Values in `checked`/`recall`/`estimate` sections keep `none` and map `false` → `no`.', '');
  for (const [field, ids] of Object.entries(report.unassessed).sort())
    L.push(`<details><summary><code>${field}</code> — ${ids.length}</summary>\n\n${ids.map((i) => `\`${i}\``).join(', ')}\n\n</details>\n`);
  L.push('', '## Known items for review (from the opioid pass)', '', ...KNOWN_REVIEW_ITEMS.map((t) => `- ${t}`), '');
  return L.join('\n');
}
