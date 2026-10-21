// Structure drawings (docs/ClearDate_Structures_Prompt.md §3). Offline; runs in prebuild.
//
//   npm run structures:render
//
// Renders public/structures/<id>.svg (dark) and <id>.light.svg (light) for every compound whose
// identity is confirmed or probable, from the SMILES stored in public/drugs.json. Only rewrites files
// whose content changed, and removes SVGs for compounds that no longer qualify.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Library } from '../../src/types';
import { drawable, renderSmiles } from './render-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = resolve(root, 'public/structures');

export const structureFiles = (id: string) => [`${id}.svg`, `${id}.light.svg`];

async function main() {
  const lib = JSON.parse(readFileSync(resolve(root, 'public/drugs.json'), 'utf8')) as Library;
  mkdirSync(OUT, { recursive: true });
  const keep = new Set<string>();
  let written = 0;
  let bytes = 0;
  for (const c of lib.compounds.filter(drawable)) {
    const { dark, light } = await renderSmiles(c.identity!.smiles!);
    const [darkName, lightName] = structureFiles(c.id);
    for (const [name, svg] of [[darkName, dark], [lightName, light]] as const) {
      keep.add(name);
      bytes += Buffer.byteLength(svg);
      const file = resolve(OUT, name);
      if (existsSync(file) && readFileSync(file, 'utf8') === svg) continue;
      writeFileSync(file, svg, 'utf8');
      written++;
    }
  }
  let removed = 0;
  for (const name of readdirSync(OUT)) {
    if (!name.endsWith('.svg') || keep.has(name) || !statSync(resolve(OUT, name)).isFile()) continue;
    unlinkSync(resolve(OUT, name));
    removed++;
  }
  console.log(`Structures: ${keep.size / 2} compounds, ${written} file(s) written, ${removed} orphan(s) removed, ${(bytes / 1024).toFixed(0)} KB total.`);
}

main().catch((e) => {
  console.error(`ERROR: ${(e as Error).message}`);
  process.exit(1);
});
