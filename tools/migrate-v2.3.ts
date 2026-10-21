// One-off, idempotent migration of public/drugs.json from schema 2.2 to 2.3 (docs/ClearDate_Structures_Prompt.md §1).
//
//   npm run migrate-v2.3                       # migrates public/drugs.json in place
//   npm run migrate-v2.3 -- path/to/file.json  # another file
//   npm run migrate-v2.3 -- --dry-run          # print the summary without writing anything
//
// Adds `"identity": null` to every compound. Skips if schemaVersion is already 2.3. Backs the 2.2 file up
// to backups/<name>.v2.2-backup.json (gitignored; never inside public/, which is deployed).

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';
import { migrateLibraryV23 } from './migrate-v23-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? resolve(root, 'public/drugs.json'));

const raw = readFileSync(file, 'utf8');
let result: ReturnType<typeof migrateLibraryV23>;
try {
  result = migrateLibraryV23(JSON.parse(raw));
} catch (e) {
  console.error(`ERROR: ${(e as Error).message}`);
  process.exit(1);
}
const { lib, report, skipped } = result;
if (skipped) {
  console.log(`${file} is already schemaVersion 2.3 — nothing to do.`);
  process.exit(0);
}

const v = validateLibrary(lib);
console.log(`Compounds ${report.compounds}; identity: null added to ${report.identityAdded}.`);
console.log(`Validation after migration: ${v.errors.length} error(s), ${v.warnings.length} warning(s).`);
for (const e of v.errors.slice(0, 40)) console.log(`  ✗ ${e.id}: ${e.message}`);
if (dryRun) process.exit(v.errors.length ? 1 : 0);
if (v.errors.length) {
  console.error('Refusing to write: the migrated library has validation errors.');
  process.exit(1);
}

mkdirSync(resolve(root, 'backups'), { recursive: true });
const backup = resolve(root, 'backups', basename(file).replace(/\.json$/, '') + '.v2.2-backup.json');
if (!existsSync(backup)) writeFileSync(backup, raw, 'utf8');
else if (readFileSync(backup, 'utf8') !== raw) {
  console.error(`ERROR: backup ${backup} differs from the file being migrated — nothing written.`);
  process.exit(1);
}

let text = serializeLibrary(lib);
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
const tmp = `${file}.tmp`;
writeFileSync(tmp, text, 'utf8');
renameSync(tmp, file);
console.log(`Wrote ${file} (v2.2 backup: ${backup}). Next: npm run structures:lookup, then npm run structures:render.`);
