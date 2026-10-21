// One-off, idempotent migration of public/drugs.json from schema 2.1 to 2.2 (docs/ClearDate_Spec_v2.2.md §6).
//
//   npm run migrate-v2.2                       # migrates public/drugs.json in place
//   npm run migrate-v2.2 -- path/to/file.json  # another file (report written next to it)
//   npm run migrate-v2.2 -- --dry-run          # print the summary without writing anything
//
// Skips if schemaVersion is already 2.2. Stops without changing anything if a listed id is missing,
// already changed or reviewer-confirmed. Backs the v2.1 file up to backups/<name>.v2.1-backup.json
// (gitignored; never inside public/, which is deployed) and writes docs/migration_v2_2_report.md.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, productDataStatus } from '../src/model';
import { serializeLibrary } from '../src/schema';
import type { Library } from '../src/types';
import { validateLibrary } from '../src/validate';
import { MigrationStop, migrateLibraryV22, renderV22Report, type StatusCounts } from './migrate-v22-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const defaultFile = resolve(root, 'public/drugs.json');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? defaultFile);

/** Product id → status, with the app's status function (formation-limited setting off). */
function statuses(lib: Library): Map<string, string> {
  const idx = buildIndex(lib);
  return new Map(lib.products.map((p) => [p.id, productDataStatus(idx, p, false)]));
}
function counts(s: Map<string, string>): StatusCounts {
  const out: StatusCounts = { ok: 0, incomplete: 0, 'no-data': 0, 'not-modelled': 0 };
  for (const v of s.values()) out[v as keyof StatusCounts]++;
  return out;
}

const raw = readFileSync(file, 'utf8');
let result: ReturnType<typeof migrateLibraryV22>;
try {
  result = migrateLibraryV22(JSON.parse(raw));
} catch (e) {
  console.error(e instanceof MigrationStop ? e.message : `ERROR: ${(e as Error).message}`);
  process.exit(1);
}
const { lib, report, skipped } = result;
if (skipped) {
  console.log(`${file} is already schemaVersion 2.2 — nothing to do.`);
  process.exit(0);
}

const before = statuses(JSON.parse(raw) as Library);
const after = statuses(lib);
report.status = {
  before: counts(before),
  after: counts(after),
  changed: [...after].filter(([id, s]) => before.get(id) !== s).map(([id, s]) => ({ id, before: before.get(id) ?? '—', after: s })),
};

const v = validateLibrary(lib);
console.log(`Compounds ${report.compounds}; products ${report.products}.`);
console.log(`Prodrugs: ${report.prodrugs.map((p) => `${p.id} → ${p.compound} ×${p.massFactor}`).join(', ')}`);
console.log(`Zero-order: ${report.zeroOrder.join(', ')}; standard drinks: ${report.drinkProducts.join(', ')}`);
console.log(`Not modelled: ${report.notModelled.map((x) => x.id).join(', ')}; exposure sessions: ${report.sessionProducts.join(', ')}`);
console.log(`Endogenous: ${report.endogenous.join(', ')}; conditional: ${report.conditional.map((c) => `${c.from} → ${c.compound} (needs ${c.requires})`).join(', ')}`);
const fmt = (c: StatusCounts) => `ok ${c.ok} · incomplete ${c.incomplete} · no data ${c['no-data']} · not modelled ${c['not-modelled']}`;
console.log(`Status before: ${fmt(report.status.before)}`);
console.log(`Status after:  ${fmt(report.status.after)}`);
for (const c of report.status.changed) console.log(`  ${c.id}: ${c.before} → ${c.after}`);
console.log(`Validation after migration: ${v.errors.length} error(s), ${v.warnings.length} warning(s).`);
for (const e of v.errors.slice(0, 40)) console.log(`  ✗ ${e.id}: ${e.message}`);
if (dryRun) process.exit(v.errors.length ? 1 : 0);
if (v.errors.length) {
  console.error('Refusing to write: the migrated library has validation errors.');
  process.exit(1);
}

mkdirSync(resolve(root, 'backups'), { recursive: true });
const backup = resolve(root, 'backups', basename(file).replace(/\.json$/, '') + '.v2.1-backup.json');
if (!existsSync(backup)) writeFileSync(backup, raw, 'utf8');
else console.log(`${backup} already exists; left as is.`);
if (readFileSync(backup, 'utf8') !== raw) {
  console.error(`ERROR: backup ${backup} differs from the file being migrated — nothing written.`);
  process.exit(1);
}

let text = serializeLibrary(lib);
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
const tmp = `${file}.tmp`;
writeFileSync(tmp, text, 'utf8');
renameSync(tmp, file);

const reportPath = file === defaultFile ? resolve(root, 'docs/migration_v2_2_report.md') : file.replace(/\.json$/, '') + '.migration_v2_2_report.md';
writeFileSync(reportPath, renderV22Report(report, new Date().toLocaleDateString('sv-SE'), relative(root, backup).replace(/\\/g, '/')), 'utf8');
console.log(`Wrote ${file} (v2.1 backup: ${backup}) and ${reportPath}.`);
