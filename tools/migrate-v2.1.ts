// One-off, idempotent migration of public/drugs.json from schema 2 to 2.1 (docs/ClearDate_Spec_v2.1.md §5).
//
//   npm run migrate-v2.1                       # migrates public/drugs.json in place
//   npm run migrate-v2.1 -- path/to/file.json  # another file
//   npm run migrate-v2.1 -- --dry-run          # print the summary without writing anything
//
// Skips if schemaVersion is already 2.1. Stops without changing anything if the CYP2D6 inhibitor
// reset would hit a different set of compounds than the spec lists. Backs the v2 file up to
// backups/<name>.v2-backup.json (gitignored; never inside public/, which is deployed) and writes
// docs/migration_v2_1_report.md.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';
import { EXPECTED_INHIBITOR_RESETS, InhibitorResetMismatch, migrateLibraryV21, renderV21Report } from './migrate-v21-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? resolve(root, 'public/drugs.json'));

const raw = readFileSync(file, 'utf8');
let result: ReturnType<typeof migrateLibraryV21>;
try {
  result = migrateLibraryV21(JSON.parse(raw), { expectedInhibitorResets: EXPECTED_INHIBITOR_RESETS });
} catch (e) {
  if (e instanceof InhibitorResetMismatch) {
    console.error(e.message);
    console.error(`  Actual hits: ${e.hits.join(', ') || '(none)'}`);
  } else console.error(`ERROR: ${(e as Error).message}`);
  process.exit(1);
}
const { lib, report, skipped } = result;
if (skipped) {
  console.log(`${file} is already schemaVersion 2.1 — nothing to do.`);
  process.exit(0);
}

const v = validateLibrary(lib);
console.log(`Compounds ${report.compounds}; products ${report.products}.`);
console.log(`clinicalRelevance: ${report.relevance.parents.length} parents active, ${report.relevance.dosedMetabolites.length} dosed metabolites active, ${report.relevance.unknown.length} metabolites unknown.`);
console.log(`CYP2D6 inhibitor reset (${report.inhibitorReset.length}): ${report.inhibitorReset.map((x) => x.id).join(', ')}`);
console.log(`Products removed: ${report.productChanges.map((c) => c.oldId).join(', ') || 'none'}`);
console.log(`Validation after migration: ${v.errors.length} error(s), ${v.warnings.length} warning(s).`);
for (const e of v.errors.slice(0, 40)) console.log(`  ✗ ${e.id}: ${e.message}`);
if (dryRun) process.exit(v.errors.length ? 1 : 0);

mkdirSync(resolve(root, 'backups'), { recursive: true });
const backup = resolve(root, 'backups', basename(file).replace(/\.json$/, '') + '.v2-backup.json');
if (!existsSync(backup)) writeFileSync(backup, raw, 'utf8');
else console.log(`${backup} already exists; left as is.`);
if (!existsSync(backup) || readFileSync(backup, 'utf8') !== raw) {
  console.error(`ERROR: backup ${backup} is missing or differs from the file being migrated — nothing written.`);
  process.exit(1);
}

let text = serializeLibrary(lib);
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
const tmp = `${file}.tmp`;
writeFileSync(tmp, text, 'utf8');
renameSync(tmp, file);

const reportPath = resolve(root, 'docs/migration_v2_1_report.md');
writeFileSync(reportPath, renderV21Report(report, new Date().toISOString().slice(0, 10), relative(root, backup).replace(/\\/g, '/')), 'utf8');
console.log(`Wrote ${file} (v2 backup: ${backup}) and ${reportPath}.`);
process.exit(v.errors.length ? 1 : 0);
