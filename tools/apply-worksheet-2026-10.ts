// Applies worksheet_answers.md (review worksheet, 21 Oct 2026) to drugs.json. Idempotent.
//
//   npm run apply-worksheet-2026-10                       # public/drugs.json, writes docs/worksheet_2026-10_report.md
//   npm run apply-worksheet-2026-10 -- path/to/file.json  # another file (the report is printed, not written)
//   npm run apply-worksheet-2026-10 -- --dry-run          # print the report without writing anything
//
// The edit table and its rules are in tools/worksheet-2026-10-lib.ts.

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, serializeLibrary } from '../src/schema';
import { validateLibrary } from '../src/validate';
import { applyWorksheet, renderWorksheetReport } from './worksheet-2026-10-lib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const defaultFile = resolve(root, 'public/drugs.json');
const file = resolve(args.find((a) => !a.startsWith('--')) ?? defaultFile);

const raw = readFileSync(file, 'utf8');
const src = JSON.parse(raw);
if (src.schemaVersion !== SCHEMA_VERSION) {
  console.error(`ERROR: expected schemaVersion ${SCHEMA_VERSION}, found ${src.schemaVersion} (run npm run migrate-v2.4 first)`);
  process.exit(1);
}
const { lib, report } = applyWorksheet(src);
const md = renderWorksheetReport(report, new Date().toISOString().slice(0, 10));
const v = validateLibrary(lib);
console.log(`Field changes ${report.changed.length}; notes extended ${report.notes.length}; skipped (reviewed) ${report.skippedReviewed.length}; missing ${report.missing.length}; QT calibration note ${report.qtCalibrationNote}.`);
console.log(`Validation: ${v.errors.length} error(s), ${v.warnings.length} warning(s).`);
for (const e of v.errors.slice(0, 40)) console.log(`  ✗ ${e.id}: ${e.message}`);
if (v.errors.length) {
  console.error('Refusing to write: the result has validation errors.');
  process.exit(1);
}
if (dryRun || file !== defaultFile) console.log('\n' + md);
if (dryRun) process.exit(0);

let text = serializeLibrary(lib);
if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
if (text === raw) {
  console.log(`${file} already has every worksheet edit — nothing written.`);
  process.exit(0);
}
writeFileSync(`${file}.tmp`, text, 'utf8');
renameSync(`${file}.tmp`, file);
if (file === defaultFile) writeFileSync(resolve(root, 'docs/worksheet_2026-10_report.md'), md, 'utf8');
console.log(`Wrote ${file}${file === defaultFile ? ' and docs/worksheet_2026-10_report.md' : ''}.`);
