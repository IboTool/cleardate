// SMILES → themed, optimised SVG with RDKit (WebAssembly). Pure apart from the RDKit module;
// the same SMILES and RDKit version always give byte-identical output.

import type { Compound } from '../../src/types';

/** Element roles; each theme maps a role to one colour. */
export type AtomRole = 'c' | 'n' | 'o' | 's' | 'hal' | 'p' | 'other';
export type Theme = Record<AtomRole, string>;

/** Dark (app) theme: text colour for bonds and carbon; heteroatoms from the app's tokens, muted. */
export const DARK: Theme = { c: '#e6e8ee', n: '#7c9cff', o: '#ff8a80', s: '#e8c36a', hal: '#7fd1a8', p: '#f2a65a', other: '#c3a6f2' };
/** Light theme (print/export), from the print palette. */
export const LIGHT: Theme = { c: '#1d2027', n: '#2f55d4', o: '#c0392b', s: '#8a6d1a', hal: '#2e7d4f', p: '#b35c00', other: '#6a4fb0' };

/** Placeholder colours RDKit draws with; swapped for theme colours afterwards. */
const SENTINEL: Record<AtomRole, [number, number, number]> = {
  c: [0, 0, 0], n: [0, 0, 1], o: [1, 0, 0], s: [1, 1, 0], hal: [0, 1, 0], p: [1, 0, 1], other: [0, 1, 1],
};
const hex = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const ROLE_BY_SENTINEL = new Map(Object.entries(SENTINEL).map(([role, rgb]) => [hex(rgb), role as AtomRole]));
const PALETTE: Record<number, [number, number, number]> = {
  [-1]: SENTINEL.other, 1: SENTINEL.c, 6: SENTINEL.c, 7: SENTINEL.n, 8: SENTINEL.o, 16: SENTINEL.s, 15: SENTINEL.p,
  9: SENTINEL.hal, 17: SENTINEL.hal, 35: SENTINEL.hal, 53: SENTINEL.hal,
};

export const BOND_LENGTH = 24;
const MARGIN = 4;

export interface Rdkit {
  version(): string;
  get_mol(smiles: string): RdkitMol | null;
}
interface RdkitMol {
  set_new_coords(useCoordGen: boolean): boolean;
  normalize_depiction(canonicalize: number): number;
  straighten_depiction(): void;
  get_svg_with_highlights(details: string): string;
  delete(): void;
}

let rdkitPromise: Promise<Rdkit> | null = null;
export function loadRdkit(): Promise<Rdkit> {
  rdkitPromise ??= import('@rdkit/rdkit').then((m) => (m.default as unknown as () => Promise<Rdkit>)());
  return rdkitPromise;
}

/** Compounds that get a drawing. */
export const drawable = (c: Compound) =>
  !!c.identity?.smiles && (c.identity.confidence === 'confirmed' || c.identity.confidence === 'probable');

interface Shape { kind: 'stroke' | 'fill'; role: AtomRole; width: number; d: string }

const round = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

/** Compact path data: numbers rounded to 0.1, no redundant spaces. */
function compactPath(d: string): string {
  return d.replace(/,/g, ' ').trim().split(/\s+/).map((t) => (/^[A-Za-z]$/.test(t) ? t : round(Number(t))))
    .join(' ').replace(/ ?([A-Za-z]) ?/g, '$1').replace(/ -/g, '-');
}

function roleOf(colour: string, unknown: Set<string>): AtomRole {
  const role = ROLE_BY_SENTINEL.get(colour.toUpperCase());
  if (!role) unknown.add(colour);
  return role ?? 'other';
}

function parseShapes(svg: string): Shape[] {
  const unknown = new Set<string>();
  const shapes: Shape[] = [];
  for (const m of svg.matchAll(/<path\b([\s\S]*?)\/>/g)) {
    const attrs = m[1];
    const d = attrs.match(/\sd='([^']*)'/)?.[1];
    if (!d) continue;
    const style = attrs.match(/style='([^']*)'/)?.[1] ?? '';
    const fillAttr = attrs.match(/\sfill='(#[0-9A-Fa-f]{6})'/)?.[1];
    const css = Object.fromEntries(style.split(';').filter(Boolean).map((kv) => kv.split(':').map((s) => s.trim())));
    if (css.fill && css.fill !== 'none') shapes.push({ kind: 'fill', role: roleOf(css.fill, unknown), width: 0, d: compactPath(d) });
    else if (css.stroke) shapes.push({ kind: 'stroke', role: roleOf(css.stroke, unknown), width: Number.parseFloat(css['stroke-width'] ?? '1'), d: compactPath(d) });
    else if (fillAttr) shapes.push({ kind: 'fill', role: roleOf(fillAttr, unknown), width: 0, d: compactPath(d) });
  }
  if (unknown.size) throw new Error(`unexpected colours from RDKit: ${[...unknown].join(', ')}`);
  return shapes;
}

function bbox(shapes: Shape[]) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const s of shapes) {
    const nums = s.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const pad = s.kind === 'stroke' ? s.width / 2 : 0;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      x0 = Math.min(x0, nums[i] - pad); x1 = Math.max(x1, nums[i] + pad);
      y0 = Math.min(y0, nums[i + 1] - pad); y1 = Math.max(y1, nums[i + 1] + pad);
    }
  }
  return { x: Math.floor(x0 - MARGIN), y: Math.floor(y0 - MARGIN), w: Math.ceil(x1 - x0 + 2 * MARGIN), h: Math.ceil(y1 - y0 + 2 * MARGIN) };
}

/** Raw geometry for a SMILES (theme-independent). Throws on SMILES RDKit can't parse. */
export function drawShapes(rdkit: Rdkit, smiles: string): Shape[] {
  const mol = rdkit.get_mol(smiles);
  if (!mol) throw new Error(`RDKit could not parse SMILES ${smiles}`);
  try {
    mol.set_new_coords(true);
    mol.normalize_depiction(1);
    mol.straighten_depiction();
    const svg = mol.get_svg_with_highlights(JSON.stringify({
      width: -1, height: -1, fixedBondLength: BOND_LENGTH, padding: 0.05, bondLineWidth: 1.2, scaleBondWidth: false,
      backgroundColour: [0, 0, 0, 0], clearBackground: false, addStereoAnnotation: false, addAtomIndices: false,
      explicitMethyl: false, atomColourPalette: PALETTE, symbolColour: SENTINEL.c, legendColour: SENTINEL.c, annotationColour: SENTINEL.c,
    }));
    return parseShapes(svg);
  } finally {
    mol.delete();
  }
}

/** Themed SVG: paths merged per colour and kind, viewBox fitted to the molecule plus a small margin. */
export function themedSvg(shapes: Shape[], theme: Theme): string {
  const b = bbox(shapes);
  const groups = new Map<string, string[]>();
  for (const s of shapes) {
    const key = `${s.kind}|${s.role}|${s.width}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s.d);
  }
  const body = [...groups.entries()].sort(([a], [b2]) => (a < b2 ? -1 : a > b2 ? 1 : 0)).map(([key, ds]) => {
    const [kind, role, width] = key.split('|');
    const colour = theme[role as AtomRole];
    return kind === 'stroke'
      ? `<path fill="none" stroke="${colour}" stroke-width="${width}" d="${ds.join('')}"/>`
      : `<path fill="${colour}" d="${ds.join('')}"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}" height="${b.h}">${body.join('')}</svg>\n`;
}

export async function renderSmiles(smiles: string): Promise<{ dark: string; light: string }> {
  const shapes = drawShapes(await loadRdkit(), smiles);
  return { dark: themedSvg(shapes, DARK), light: themedSvg(shapes, LIGHT) };
}
