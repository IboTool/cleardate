// Chemical identities from PubChem (docs/ClearDate_Structures_Prompt.md §2). Dev only; needs network
// (or a warm cache). Never runs in the build or the app.
//
//   npm run structures:lookup                      # every compound
//   npm run structures:lookup -- --id fluoxetine   # one compound (repeat or comma-separate for more)
//   npm run structures:lookup -- --dry-run         # report only, write nothing
//   npm run structures:lookup -- --offline         # use cached responses only
//   npm run structures:lookup -- --append-todo     # also append the review list to user_to_do.md
//
// Writes identities (and molecular weights that are null) into public/drugs.json, the lock file
// tools/structures/pubchem-lock.json and docs/structures_report.md (full runs only). Sections with
// provenance `reviewer` are never changed; verified compounds only ever get their identity written.

import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, serializeLibrary } from '../../src/schema';
import type { Compound, Identity, IdentityConfidence, Library } from '../../src/types';
import { validateLibrary } from '../../src/validate';
import { capStereoSiblings, isAbbreviation, matchIdentity, nameVariants, normName, type MatchResult, type NameHit, type PubchemRecord } from './match';
import { PubChem } from './pubchem';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const DRUGS = resolve(root, 'public/drugs.json');
const LOCK = resolve(here, 'pubchem-lock.json');
const REPORT = resolve(root, 'docs/structures_report.md');
const TODO = resolve(root, 'user_to_do.md');
export const REVIEWER_CID_NOTE = 'CID set by reviewer';

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const ids = args.flatMap((a, i) => (args[i - 1] === '--id' ? a.split(',') : [])).map((s) => s.trim()).filter(Boolean);
const dryRun = flag('--dry-run');
const today = new Date().toISOString().slice(0, 10);

interface LockEntry { title: string; smiles: string; inchiKey: string; formula: string; molecularWeight: number; retrieved: string }
interface Lock { source: string; compounds: Record<string, LockEntry> }

interface Row { c: Compound; res: MatchResult; mwFilled: number | null; skipped?: string }

async function lookupOne(pc: PubChem, c: Compound): Promise<MatchResult> {
  const pinned = c.identity?.note.startsWith(REVIEWER_CID_NOTE) ? c.identity.pubchemCid : null;
  if (pinned) {
    const r = (await pc.records([pinned])).get(pinned);
    if (!r) return { identity: { ...c.identity!, confidence: 'unconfirmed', note: `${REVIEWER_CID_NOTE}; CID ${pinned} not found in PubChem.` }, record: null, mwConflict: null, matchedVia: null };
    const identity: Identity = { pubchemCid: r.cid, smiles: r.smiles, inchiKey: r.inchiKey, formula: r.formula, confidence: 'probable', candidates: [], note: `${REVIEWER_CID_NOTE}; pending confirmation.` };
    return { identity, record: r, mwConflict: null, matchedVia: null };
  }
  const hits: NameHit[] = [];
  for (const q of [...nameVariants(c), ...c.aliases]) {
    const hit = await pc.nameToCids(q);
    hits.push(hit);
    if (hit.cids.length) break;
  }
  const found = hits.find((h) => h.cids.length);
  const aliasHits: NameHit[] = [];
  if (found && isAbbreviation(found.query))
    for (const a of c.aliases) if (normName(a) !== normName(found.query)) aliasHits.push(await pc.nameToCids(a));
  const extra = aliasHits.filter((x) => x.cids.length === 1).map((x) => x.cids[0]);
  const records = await pc.records(found ? [...found.cids.slice(0, 8), ...extra] : []);
  return matchIdentity({ compound: c, hits, records, aliasHits });
}

function apply(c: Compound, res: MatchResult, retrieved: string): number | null {
  const id = res.identity;
  c.identity = id;
  c.provenance.identity = id.confidence === 'unconfirmed' ? 'gap' : 'checked';
  c.sourceNotes.identity = id.pubchemCid && res.record
    ? `PubChem CID ${id.pubchemCid} https://pubchem.ncbi.nlm.nih.gov/compound/${id.pubchemCid} (retrieved ${retrieved})${res.matchedVia ? `; matched via alias “${res.matchedVia}”` : ''}`
    : id.note;
  const r = res.record;
  if (!r || c.verified || c.molecularWeight !== null || c.provenance.molecularWeight === 'reviewer') return null;
  c.molecularWeight = Math.round(r.molecularWeight * 100) / 100;
  c.provenance.molecularWeight = 'checked';
  const prev = c.sourceNotes.molecularWeight?.trim();
  c.sourceNotes.molecularWeight = `PubChem CID ${r.cid}${prev ? `. Earlier note: ${prev}` : ''}`;
  return c.molecularWeight;
}

function lockEntry(r: PubchemRecord, prev: LockEntry | undefined): LockEntry {
  const e = { title: r.title, smiles: r.smiles, inchiKey: r.inchiKey, formula: r.formula, molecularWeight: r.molecularWeight };
  const same = prev && Object.entries(e).every(([k, v]) => prev[k as keyof LockEntry] === v);
  return { ...e, retrieved: same ? prev.retrieved : today };
}

const cand = (id: Identity) => id.candidates.length
  ? id.candidates.map((x) => `CID ${x.cid}${x.name ? ` (${x.name})` : ''} — ${x.reason}`).join('; ')
  : 'none';

function report(rows: Row[]): string {
  const by = (k: IdentityConfidence) => rows.filter((r) => !r.skipped && r.res.identity.confidence === k);
  const filled = rows.map((r) => r.c).filter((c) => c.molecularWeight !== null && c.sourceNotes.molecularWeight?.startsWith('PubChem CID'));
  const L: string[] = [
    '# Chemical structures report',
    '',
    `Generated by \`npm run structures:lookup\` on ${today} from PubChem PUG REST. Regenerated on every full run; do not edit by hand.`,
    '',
    '## Counts by confidence',
    '',
    '| Confidence | Compounds |',
    '|---|---|',
    ...(['confirmed', 'probable', 'unconfirmed', 'not-applicable'] as const).map((k) => `| ${k} | ${by(k).length} |`),
    ...(rows.some((r) => r.skipped) ? [`| skipped (reviewer) | ${rows.filter((r) => r.skipped).length} |`] : []),
    '',
    '## Unconfirmed (no drawing until a reviewer picks the CID)',
    '',
    ...by('unconfirmed').map((r) => `- \`${r.c.id}\` ${r.c.name}: ${r.res.identity.note} Candidates: ${cand(r.res.identity)}.`),
    '',
    '## Probable (drawn, labelled pending review)',
    '',
    ...by('probable').map((r) => `- \`${r.c.id}\` ${r.c.name} → CID ${r.res.identity.pubchemCid} (${r.res.record?.title ?? ''}): ${r.res.identity.note}`),
    '',
    '## Molecular weights filled from PubChem',
    '',
    ...(filled.length ? filled.map((c) => `- \`${c.id}\`: ${c.molecularWeight} g/mol (${(c.sourceNotes.molecularWeight ?? '').split('.')[0]})`) : ['None.']),
    '',
    '## Molecular weight conflicts (not overwritten)',
    '',
    ...(rows.some((r) => r.res.mwConflict) ? rows.filter((r) => r.res.mwConflict).map((r) => `- \`${r.c.id}\`: library ${r.res.mwConflict!.existing}, PubChem CID ${r.res.mwConflict!.cid} ${r.res.mwConflict!.pubchem} g/mol`) : ['None.']),
    '',
    '## Not applicable',
    '',
    ...by('not-applicable').map((r) => `- \`${r.c.id}\` ${r.c.name}: ${r.res.identity.note}`),
    '',
  ];
  return L.join('\n');
}

function todo(rows: Row[]): string {
  const pick = (k: IdentityConfidence) => rows.filter((r) => !r.skipped && r.res.identity.confidence === k);
  return [
    '',
    `## Structure identities to confirm ${today}`,
    '',
    'Open each in the editor’s Chemical identity section: Confirm, or set the right PubChem CID and run `npm run structures:lookup -- --id <id>`. Details in docs/structures_report.md.',
    '',
    '### Unconfirmed (not drawn)',
    '',
    ...pick('unconfirmed').map((r) => `- [ ] \`${r.c.id}\` ${r.c.name} — ${r.res.identity.note}${r.res.identity.candidates.length ? ` Candidates: ${r.res.identity.candidates.map((x) => x.cid).join(', ')}.` : ''}`),
    '',
    '### Probable (drawn, pending review)',
    '',
    ...pick('probable').map((r) => `- [ ] \`${r.c.id}\` ${r.c.name} → CID ${r.res.identity.pubchemCid}`),
    '',
  ].join('\n');
}

async function main() {
  const raw = readFileSync(DRUGS, 'utf8');
  const lib = JSON.parse(raw) as Library;
  if (lib.schemaVersion !== SCHEMA_VERSION) throw new Error(`expected schemaVersion ${SCHEMA_VERSION}, found ${lib.schemaVersion} (run the migrations first)`);
  const byId = new Map(lib.compounds.map((c) => [c.id, c]));
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length) throw new Error(`no compound with id ${unknown.join(', ')}`);
  const targets = ids.length ? ids.map((id) => byId.get(id)!) : lib.compounds;

  const pc = new PubChem(resolve(here, '.cache'), flag('--offline'));
  const lock: Lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, 'utf8')) : { source: 'PubChem PUG REST (https://pubchem.ncbi.nlm.nih.gov)', compounds: {} };
  const rows: Row[] = [];
  let n = 0;
  for (const c of targets) {
    n++;
    if (c.provenance.identity === 'reviewer') {
      rows.push({ c, res: { identity: c.identity!, record: null, mwConflict: null, matchedVia: null }, mwFilled: null, skipped: 'reviewer' });
      continue;
    }
    const res = await lookupOne(pc, c);
    const prev = res.record ? lock.compounds[res.record.cid] : undefined;
    const entry = res.record ? lockEntry(res.record, prev) : null;
    const mwFilled = apply(c, res, entry?.retrieved ?? today);
    if (res.record && entry) lock.compounds[res.record.cid] = entry;
    rows.push({ c, res, mwFilled });
    if (ids.length || n % 25 === 0) console.log(`${n}/${targets.length} ${c.id}: ${res.identity.confidence}${res.identity.pubchemCid ? ` (CID ${res.identity.pubchemCid})` : ''}${ids.length && res.identity.note ? ` — ${res.identity.note}` : ''}`);
  }

  const capped = capStereoSiblings(lib.compounds);
  for (const r of rows) r.res.identity = r.c.identity!;
  if (capped.length) console.log(`Stereoisomer siblings, held at probable: ${capped.join(', ')}`);

  // Keep only CIDs still used by a drawn identity, sorted for clean diffs.
  const used = new Set(lib.compounds.filter((c) => c.identity?.confidence === 'confirmed' || c.identity?.confidence === 'probable').map((c) => c.identity!.pubchemCid));
  lock.compounds = Object.fromEntries(Object.entries(lock.compounds).filter(([cid]) => used.has(Number(cid))).sort(([a], [b]) => Number(a) - Number(b)));

  const count = (k: IdentityConfidence) => rows.filter((r) => !r.skipped && r.res.identity.confidence === k).length;
  console.log(`\nconfirmed ${count('confirmed')} · probable ${count('probable')} · unconfirmed ${count('unconfirmed')} · not-applicable ${count('not-applicable')}${rows.some((r) => r.skipped) ? ` · skipped (reviewer) ${rows.filter((r) => r.skipped).length}` : ''}`);
  console.log(`MW filled ${rows.filter((r) => r.mwFilled !== null).length} · MW conflicts ${rows.filter((r) => r.res.mwConflict).length} · PubChem requests ${pc.requests} (cached ${pc.cacheHits})`);

  const v = validateLibrary(lib);
  if (v.errors.length) {
    for (const e of v.errors.slice(0, 30)) console.error(`  ✗ ${e.id}: ${e.message}`);
    throw new Error('Refusing to write: validation errors.');
  }
  if (dryRun) return;
  let text = serializeLibrary(lib);
  if (raw.includes('\r\n')) text = text.replace(/\n/g, '\r\n');
  writeFileSync(`${DRUGS}.tmp`, text, 'utf8');
  renameSync(`${DRUGS}.tmp`, DRUGS);
  writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  if (!ids.length) writeFileSync(REPORT, report(rows), 'utf8');
  if (flag('--append-todo')) appendFileSync(TODO, todo(rows), 'utf8');
  console.log(`Wrote ${DRUGS}, ${LOCK}${ids.length ? '' : `, ${REPORT}`}. Next: npm run structures:render.`);
}

main().catch((e) => {
  console.error(`ERROR: ${(e as Error).message}`);
  process.exit(1);
});
