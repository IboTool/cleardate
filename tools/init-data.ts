// One-off: build the initial public/drugs.json from tools/candidates.json.
// Structure only — every pharmacokinetic, CYP, QT and receptor value is left at its empty default.
//
//   npm run init-data                 # refuses to overwrite an existing drugs.json
//   npm run init-data -- --force      # overwrite
//   npm run init-data -- --out x.json # write somewhere else (e.g. to diff against the live file)

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildInitialLibrary, type CandidatesFile } from './init-lib';
import { serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? resolve(args[outIdx + 1]) : resolve(root, 'public/drugs.json');

if (existsSync(out) && !force) {
  console.error(`${out} already exists. Re-run with --force to overwrite it (your data would be lost).`);
  process.exit(1);
}

const candidates = JSON.parse(readFileSync(resolve(root, 'tools/candidates.json'), 'utf8')) as CandidatesFile;
const lib = buildInitialLibrary(candidates);
const result = validateLibrary(lib);
if (result.errors.length) {
  for (const e of result.errors) console.error(`  ${e.id}: ${e.message}`);
  console.error('Refusing to write: the generated library has errors.');
  process.exit(1);
}
const tmp = `${out}.tmp`;
writeFileSync(tmp, serializeLibrary(lib), 'utf8');
renameSync(tmp, out);
console.log(`Wrote ${out}: ${lib.categories.length} categories, ${lib.compounds.length} compounds, ${lib.products.length} products.`);
