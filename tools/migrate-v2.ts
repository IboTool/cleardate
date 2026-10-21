// One-off, idempotent migration of public/drugs.json from schema v1 to v2.
//
//   npm run migrate-v2                      # migrates public/drugs.json in place
//   npm run migrate-v2 -- path/to/file.json # another file
//   npm run migrate-v2 -- --dry-run         # print the summary without writing anything
//
// Skips if schemaVersion is already 2 or later. Backs the v1 file up to backups/<name>.v1-backup.json
// (gitignored; never inside public/, which is deployed) and writes docs/migration_v2_report.md.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';
import { migrateLibrary, renderReport } from './migrate-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? resolve(root, 'public/drugs.json'));

const raw = readFileSync(file, 'utf8');
const { lib, report, skipped } = migrateLibrary(JSON.parse(raw));
if (skipped) {
  console.log(`${file} is already schemaVersion 2 — nothing to do.`);
  process.exit(0);
}

// Fields that only arrive with migrate-v2.1 / v2.2 / v2.3 aren't errors at this stage.
const V21_ONLY = /schemaVersion must be 2\.\d|clinicalRelevance "undefined"|reviewedDates missing|identity missing/;
const all = validateLibrary(lib);
const v = { ...all, errors: all.errors.filter((e) => !V21_ONLY.test(e.message)) };
console.log(`Compounds ${lib.compounds.length}; products ${report.counts['products in']} → ${lib.products.length}.`);
console.log(`Formation-limited (auto): ${report.formationLimited.length}. Product changes: ${report.productChanges.length}.`);
console.log(`Validation after migration: ${v.errors.length} error(s), ${v.warnings.length} warning(s).`);
for (const e of v.errors.slice(0, 40)) console.log(`  ✗ ${e.id}: ${e.message}`);
if (dryRun) process.exit(v.errors.length ? 1 : 0);

mkdirSync(resolve(root, 'backups'), { recursive: true });
const backup = resolve(root, 'backups', basename(file).replace(/\.json$/, '') + '.v1-backup.json');
if (!existsSync(backup)) writeFileSync(backup, raw, 'utf8');
else console.log(`${backup} already exists; left as is.`);

let text = serializeLibrary(lib);
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
const tmp = `${file}.tmp`;
writeFileSync(tmp, text, 'utf8');
renameSync(tmp, file);

const reportPath = resolve(root, 'docs/migration_v2_report.md');
writeFileSync(reportPath, renderReport(report), 'utf8');
console.log(`Wrote ${file} (v1 backup: ${backup}) and ${reportPath}.`);
console.log('Next: npm run migrate-v2.1');
process.exit(v.errors.length ? 1 : 0);
