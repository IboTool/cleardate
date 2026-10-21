// Pure identity matching for `npm run structures:lookup` (docs/ClearDate_Structures_Prompt.md §2).
// Takes PubChem answers already fetched (or recorded fixtures) and decides a confidence; no I/O here.

import type { Compound, Identity, IdentityCandidate } from '../../src/types';

/** One PubChem compound record (property table row plus synonyms). */
export interface PubchemRecord {
  cid: number;
  title: string;
  smiles: string;
  inchiKey: string;
  formula: string;
  molecularWeight: number;
  definedAtomStereo: number;
  undefinedAtomStereo: number;
  definedBondStereo: number;
  undefinedBondStereo: number;
  synonyms: string[];
}

/** What a name query returned: parent CIDs (salts and hydrates already mapped to their parent). */
export interface NameHit {
  query: string;
  cids: number[];
}

export interface MatchInput {
  compound: Compound;
  /** Name queries in the order tried (name variants first, then aliases); empty cids = no match. */
  hits: NameHit[];
  /** For abbreviation names: what each alias resolves to (corroboration). */
  aliasHits?: NameHit[];
  records: Map<number, PubchemRecord>;
}

export interface MatchResult {
  identity: Identity;
  /** The record behind a confirmed/probable identity. */
  record: PubchemRecord | null;
  /** Existing MW that disagrees with PubChem by more than MW_TOLERANCE. */
  mwConflict: { existing: number; pubchem: number; cid: number } | null;
  /** The query that matched, when it wasn't the compound's own name. */
  matchedVia: string | null;
}

export const MW_TOLERANCE = 0.5;
const MAX_CANDIDATES = 8;

/** Always not-applicable, with the reason shown in the Library. */
export const NOT_APPLICABLE: Record<string, string> = {
  kavalactones: 'Mixture of six kavalactones — no single structure.',
  semaglutide: 'Peptide (GLP-1 analogue) — not drawn as a small-molecule structure.',
  tirzepatide: 'Peptide (GIP/GLP-1 dual agonist) — not drawn as a small-molecule structure.',
  apap_glucuronide_sulfate: 'Pooled glucuronide and sulfate conjugates — not one compound.',
  lithium: 'Lithium ion (Li⁺) — a single atom; no structure to draw.',
};
/** Notes that describe the compound itself as a mixture or extract (not just the study material). */
const MIXTURE_NOTE_RE = /\b(?:is|are) an? (?!stereoisomer)(?:\w+ )?(?:mixture|extract)\b|not one molecular species/i;

/** Vague names: no single structure can be inferred from the name alone. */
const VAGUE_IDS = new Set(['clopidogrel_active_thiol_metabolite', 'cvt_2738']);
const VAGUE_NAME_RE = /\bmetabolite\b|^[a-z]{1,4}[- ]?\d{2,}$|^ucb\b/i;
/** Designer drugs: their metabolites are poorly indexed and easily confused with isomers. */
export const DESIGNER_PARENTS = new Set([
  'mdpv', 'mephedrone', 'isotonitazene', 'carfentanil', 'methoxetamine', 'pvp', 'bromazolam', 'flubromazolam',
  'mdmb_4en_pinaca', 'adb_butinaca', '1p_lsd', '2c_b',
]);
/** Generic hydroxylated / nor / desmethyl metabolites: position or isomer often unspecified. */
const GENERIC_METABOLITE_RE = /hydroxy|(^|[^a-z])oh-|^nor|desmethyl|demethyl|desethyl|dealkyl|desalkyl/i;

/** A name that specifies stereochemistry: es-, lev-, levo, dextro, dex, d-, l-, (S), (R), R,R, 6β-, cis/trans, erythro/threo… */
const STEREO_NAME_RE = /^(?:nor|n-desmethyl|desmethyl)?(?:es(?=[ckmoz])|levo|lev(?=[a-z])|dextro|dex(?=[a-z])|[dl]-|\(?[rs]\)?-|\([rs](?:,\s*[rs])*\)|[rs],[rs]|\(?[+-]\)?-|cis-|trans-|erythro|threo)|\d+[αβ]-/i;
/** A name that says racemate. */
const RACEMATE_NAME_RE = /^(?:rac-|\(±\)|\(\+\/-\)|dl-|\(rs\)-|racemic\b)/i;

export const greekToLatin = (s: string) => s
  .replace(/[Δδ]/g, 'delta-').replace(/[Αα]/g, 'alpha-').replace(/[Ββ]/g, 'beta-').replace(/[Γγ]/g, 'gamma-')
  .replace(/[′’]/g, "'").replace(/-{2,}/g, '-');

/** Case-, Greek- and punctuation-insensitive form used for "exact synonym" comparison. */
export const normName = (s: string) => greekToLatin(s.normalize('NFKC')).toLowerCase().replace(/[\s\-_,'"()[\]]/g, '');

/** Salt and hydrate words (not esters such as decanoate or palmitate — those are different molecules). */
const SALT_RE = /\s+(?:mono|di|tri|hemi|sesqui)?(?:hydrochloride|hydrobromide|sulfate|sulphate|bisulfate|mesylate|besylate|maleate|tartrate|bitartrate|citrate|fumarate|succinate|phosphate|acetate|pamoate|carbonate|bromide|chloride|sodium|potassium|calcium|hydrate|anhydrous)\b/gi;
export const stripSalt = (name: string) => name.replace(SALT_RE, '').trim();

/** Name variants to query, most literal first. Parenthetical suffixes ("Fluoxetine (Prozac)") are dropped. */
export function nameVariants(c: Compound): string[] {
  const base = c.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const latin = greekToLatin(base).replace(/-(?=\s|$)/g, '');
  const out = [base, latin, c.id.replace(/_/g, ' '), latin.replace(/-/g, ' '), latin.replace(/-/g, '')];
  return [...new Set(out.filter(Boolean))];
}

export function notApplicableReason(c: Compound): string | null {
  if (NOT_APPLICABLE[c.id]) return NOT_APPLICABLE[c.id];
  const note = Object.values(c.sourceNotes ?? {}).find((v) => typeof v === 'string' && MIXTURE_NOTE_RE.test(v));
  if (note) return `Not one defined structure: ${note.match(/[^.;]*(?:mixture|extract|molecular species)[^.;]*/i)?.[0].trim() ?? 'mixture or extract'}.`;
  return null;
}

/** Why a compound is a known trap (null if not one). `parents` are the compound's formedFrom ids. */
export function trapReason(c: Compound): string | null {
  if (VAGUE_IDS.has(c.id) || VAGUE_NAME_RE.test(c.name.trim())) return 'vague name — no single structure follows from it';
  if (!c.isMetabolite) return null;
  if (c.formedFrom.some((f) => DESIGNER_PARENTS.has(f.compound))) return 'designer-drug metabolite';
  if (GENERIC_METABOLITE_RE.test(c.name)) return 'generic hydroxy/nor/desmethyl metabolite — position or isomer may be unspecified';
  return null;
}

/**
 * Abbreviations (MDMA, EDDP, 11-OH-THC, 5-MeO-DMT…) collide in PubChem (EDDP is also a pesticide,
 * MDEA a solvent), so they need an alias that resolves to the same record.
 */
export function isAbbreviation(name: string): boolean {
  const letters = name.replace(/[^A-Za-z]/g, '');
  return letters.length > 0 && letters.length <= 8 && (letters.match(/[A-Z]/g) ?? []).length >= 2 && !/[a-z]{3}/.test(letters);
}

export const stereoInName = (name: string) => STEREO_NAME_RE.test(name.trim());
export const racemateInName = (name: string) => RACEMATE_NAME_RE.test(name.trim());

const hasDefinedStereo = (r: PubchemRecord) => r.definedAtomStereo + r.definedBondStereo > 0;
const hasUndefinedStereo = (r: PubchemRecord) => r.undefinedAtomStereo + r.undefinedBondStereo > 0;
const isSingleIsomer = (r: PubchemRecord) => hasDefinedStereo(r) && r.undefinedAtomStereo === 0;

const candidate = (records: Map<number, PubchemRecord>, cid: number, reason: string): IdentityCandidate =>
  ({ cid, name: records.get(cid)?.title ?? '', reason });

const unconfirmed = (note: string, candidates: IdentityCandidate[]): Identity =>
  ({ pubchemCid: null, smiles: null, inchiKey: null, formula: null, confidence: 'unconfirmed', candidates: candidates.slice(0, MAX_CANDIDATES), note });

const assigned = (r: PubchemRecord, confidence: 'confirmed' | 'probable', note: string): Identity =>
  ({ pubchemCid: r.cid, smiles: r.smiles, inchiKey: r.inchiKey, formula: r.formula, confidence, candidates: [], note });

export function matchIdentity({ compound: c, hits, records, aliasHits = [] }: MatchInput): MatchResult {
  const none = { record: null, mwConflict: null, matchedVia: null };
  const na = notApplicableReason(c);
  if (na) return { identity: { pubchemCid: null, smiles: null, inchiKey: null, formula: null, confidence: 'not-applicable', candidates: [], note: na }, ...none };

  const hit = hits.find((x) => x.cids.length);
  if (!hit) return { identity: unconfirmed('No PubChem record found for the name or any alias.', []), ...none };
  const matchedVia = normName(hit.query) === normName(c.name.replace(/\s*\([^)]*\)\s*$/, '')) ? null : hit.query;
  const cids = [...new Set(hit.cids)];

  if (cids.length > 1)
    return { identity: unconfirmed(`“${hit.query}” matches ${cids.length} PubChem records; pick one.`, cids.map((id) => candidate(records, id, 'same name'))), ...none, matchedVia };

  const r = records.get(cids[0]);
  if (!r) return { identity: unconfirmed('PubChem record could not be fetched.', [candidate(records, cids[0], 'record missing')]), ...none, matchedVia };
  const one = (reason: string) => [candidate(records, r.cid, reason)];

  const wanted = new Set([normName(hit.query), normName(stripSalt(hit.query))]);
  const exact = r.synonyms.some((s) => wanted.has(normName(s)));
  if (!exact) return { identity: unconfirmed(`“${hit.query}” is not an exact PubChem synonym of CID ${r.cid}.`, one('fuzzy match')), ...none, matchedVia };

  const mwConflict = c.molecularWeight !== null && Math.abs(c.molecularWeight - r.molecularWeight) > MW_TOLERANCE
    ? { existing: c.molecularWeight, pubchem: r.molecularWeight, cid: r.cid } : null;
  if (mwConflict)
    return { identity: unconfirmed(`Molecular weight conflict: library ${c.molecularWeight}, PubChem ${r.molecularWeight} g/mol.`, one('molecular weight differs')), record: null, mwConflict, matchedVia };

  const name = hit.query;
  if (!matchedVia && isAbbreviation(name)) {
    const singles = aliasHits.filter((x) => x.cids.length === 1);
    const others = [...new Set(singles.map((x) => x.cids[0]).filter((cid) => cid !== r.cid))];
    if (others.length)
      return { identity: unconfirmed(`Abbreviation “${name}” and an alias (${singles.filter((x) => x.cids[0] !== r.cid).map((x) => `“${x.query}”`).join(', ')}) resolve to different PubChem records.`, [candidate(records, r.cid, `abbreviation “${name}”`), ...others.map((cid) => candidate(records, cid, 'alias'))]), ...none, matchedVia };
    if (!singles.length)
      return { identity: unconfirmed(`Abbreviation “${name}” matches CID ${r.cid} (${r.title}), but no alias confirms it — abbreviations collide in PubChem.`, one('abbreviation, uncorroborated')), ...none, matchedVia };
  }
  if (stereoInName(name) && !isSingleIsomer(r))
    return { identity: unconfirmed(`The name specifies a stereoisomer but PubChem CID ${r.cid} ${hasDefinedStereo(r) ? 'leaves some stereocentres undefined' : 'has no defined stereochemistry'}.`, one('stereo conflict')), ...none, matchedVia };
  if (racemateInName(name) && isSingleIsomer(r))
    return { identity: unconfirmed(`The name says racemate but PubChem CID ${r.cid} is a single stereoisomer.`, one('stereo conflict')), ...none, matchedVia };

  const trap = trapReason(c);
  if (trap) {
    if (hasUndefinedStereo(r))
      return { identity: unconfirmed(`Known trap (${trap}) and PubChem CID ${r.cid} leaves stereochemistry undefined.`, one('needs review')), ...none, matchedVia };
    return { identity: assigned(r, 'probable', `Known trap (${trap}); single exact match, pending review.`), record: r, mwConflict: null, matchedVia };
  }

  return { identity: assigned(r, 'confirmed', matchedVia ? `Matched via alias “${matchedVia}”.` : ''), record: r, mwConflict: null, matchedVia };
}

const STEREO_PREFIX_RE = /^(?:es|levo|lev|dextro|dex|[dl]-|\([rs]\)-|[rs]-)(?=[a-z])/i;
/** Library name with any stereo prefix removed ("Escitalopram" → "citalopram"). */
const stereoBase = (name: string) => name.trim().toLowerCase().replace(STEREO_PREFIX_RE, '');

/**
 * Library-wide pass: a confirmed compound that has an enantiomer/racemate sibling in the library
 * (same InChIKey skeleton, or the same name bar a stereo prefix) drops to probable, so the right
 * isomer gets a human look. Mutates and returns the ids it downgraded.
 */
export function capStereoSiblings(compounds: Compound[]): string[] {
  const skeleton = (c: Compound) => c.identity?.inchiKey?.slice(0, 14) ?? null;
  const bySkeleton = new Map<string, Compound[]>();
  for (const c of compounds) {
    const k = skeleton(c);
    if (k) bySkeleton.set(k, [...(bySkeleton.get(k) ?? []), c]);
  }
  const names = new Map(compounds.map((c) => [c.name.trim().toLowerCase(), c]));
  const capped: string[] = [];
  for (const c of compounds) {
    if (c.identity?.confidence !== 'confirmed' || c.provenance.identity === 'reviewer') continue;
    const siblings = new Set((bySkeleton.get(skeleton(c)!) ?? []).filter((x) => x !== c));
    const base = stereoBase(c.name);
    if (base !== c.name.trim().toLowerCase() && names.has(base)) siblings.add(names.get(base)!);
    for (const x of compounds) if (x !== c && stereoBase(x.name) === c.name.trim().toLowerCase() && STEREO_PREFIX_RE.test(x.name.trim())) siblings.add(x);
    if (!siblings.size) continue;
    c.identity = { ...c.identity, confidence: 'probable', note: `Stereoisomer sibling in the library (${[...siblings].map((x) => x.name).sort().join(', ')}) — check this is the right isomer.${c.identity.note ? ` ${c.identity.note}` : ''}` };
    capped.push(c.id);
  }
  return capped;
}
