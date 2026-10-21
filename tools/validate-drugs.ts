// npm run validate — checks public/drugs.json. Runs as `prebuild`, so a broken file never deploys.
// Exit code 1 on errors; warnings and progress are informational.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateLibrary, type Issue } from '../src/validate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = resolve(root, process.argv[2] ?? 'public/drugs.json');

let lib: unknown;
try {
  lib = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`ERROR: cannot read ${file}: ${(e as Error).message}`);
  console.error('If it does not exist yet, run `npm run init-data`.');
  process.exit(1);
}

const { errors, warnings, progress } = validateLibrary(lib as never);

// Everything in public/ is deployed, so backups and copies of the library must live elsewhere.
for (const name of readdirSync(resolve(root, 'public')))
  if (/^drugs.*\.json$/i.test(name) && name !== 'drugs.json')
    errors.push({ id: '(public)', message: `public/${name} would be published with the site; move it to backups/ (gitignored)` });
const color = process.stdout.isTTY;
const red = (s: string) => (color ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s: string) => (color ? `\x1b[33m${s}\x1b[0m` : s);
const green = (s: string) => (color ? `\x1b[32m${s}\x1b[0m` : s);

const list = (title: string, items: Issue[], paint: (s: string) => string, limit = 200) => {
  console.log(paint(`\n${title} (${items.length})`));
  for (const i of items.slice(0, limit)) console.log(`  ${i.id}: ${i.message}`);
  if (items.length > limit) console.log(`  … and ${items.length - limit} more`);
};

console.log(`Validating ${file}`);
list('Errors', errors, red);
list('Warnings', warnings, yellow, 60);

console.log(green('\nProgress'));
console.log(
  `  Compounds: ${progress.compoundsVerified} / ${progress.compounds} verified · ${progress.compoundsStarted} with data · ` +
    `Products: ${progress.productsVerified} / ${progress.products} verified`,
);
const w = Math.max(0, ...progress.categories.map((c) => c.name.length));
for (const c of progress.categories)
  console.log(
    `  ${c.name.padEnd(w)}  ${String(c.productsVerified).padStart(3)} / ${String(c.products).padEnd(3)} verified` +
      `  (${c.productsStarted} started, ${c.products - c.productsStarted} not started)`,
  );
const fmt = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ');
console.log(`\n  Section provenance: ${fmt(progress.provenance)}`);
console.log(`  Compounds by kinetics mode: ${fmt(progress.modes)}`);
console.log('  Unassessed safety fields (compounds used by each category):');
for (const c of progress.categories)
  console.log(`    ${c.name.padEnd(w)}  QT ${c.unassessed.qt} · CYP2D6 ${c.unassessed.cyp2d6} · receptors ${c.unassessed.receptors} · nonlinear ${c.unassessed.nonlinear}`);

if (errors.length) {
  console.log(red(`\n✗ ${errors.length} error(s). Fix these before building.`));
  process.exit(1);
}
console.log(green(`\n✓ No errors.`));
