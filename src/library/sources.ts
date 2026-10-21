// Clean citations and provenance labels for the Drug Library view. The raw notes stay untouched;
// these helpers only build the tidy default view.

import { PROVENANCE_TAGS, type Provenance } from '../types';

/** "[checked]", "[recall — check CredibleMeds]", … */
const TAG_RE = /\[\s*(checked|recall|estimate|gap|reviewer)\b[^\]]*\]/gi;
/** "DRAFT — AI-prepopulated, unverified." and similar prefixes on `source`. */
const DRAFT_RE = /^\s*DRAFT\s*[—–-]+\s*(AI[- ]prepopulated,?\s*unverified\.?)?\s*/i;
const URL_RE = /https?:\/\/[^\s<>()"']+/gi;

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  checked: 'checked against source',
  recall: 'from model recall — not yet checked',
  estimate: 'estimate',
  gap: 'no data found',
  reviewer: 'reviewed',
};

export const provenanceOf = (tag: string | null | undefined): Provenance | null =>
  tag && (PROVENANCE_TAGS as readonly string[]).includes(tag) ? (tag as Provenance) : null;

/** Note text without the DRAFT prefix and provenance tags (URLs kept). */
export function cleanNote(text: string): string {
  return text.replace(DRAFT_RE, '').replace(TAG_RE, '').replace(/[ \t]{2,}/g, ' ').trim();
}

export interface Citation {
  label: string;
  url?: string;
}

const pretty = (s: string) => decodeURIComponent(s).replace(/\.(html?|aspx?|cfm|php)$/i, '').replace(/[-_+]+/g, ' ').trim();
const clip = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** A readable label for a cited URL: the source's name plus an identifier or the page name. */
export function citationLabel(url: string, entryName = ''): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  const last = path.split('/').filter(Boolean).at(-1) ?? '';
  let m: RegExpMatchArray | null;
  if (host === 'doi.org' || host === 'dx.doi.org') return `DOI ${decodeURIComponent(path.slice(1))}`;
  if ((m = path.match(/\/doi\/(?:[a-z]+\/)?(10\.\d{4,9}\/.+)$/i))) return `DOI ${decodeURIComponent(m[1])}`;
  if (/pubmed\.ncbi\.nlm\.nih\.gov$/.test(host) && (m = path.match(/\/(\d+)/))) return `PubMed ${m[1]}`;
  if (/ncbi\.nlm\.nih\.gov$/.test(host) && (m = path.match(/(PMC\d+)/i))) return `PubMed Central ${m[1].toUpperCase()}`;
  if (/pubchem\.ncbi\.nlm\.nih\.gov$/.test(host)) return `PubChem${last ? ` — ${pretty(last)}` : ''}`;
  if (/dailymed\.nlm\.nih\.gov$/.test(host)) return `DailyMed — ${entryName ? `${entryName} label` : 'drug label'}`;
  if (/medicines\.org\.uk$/.test(host)) return (m = path.match(/product\/(\d+)/)) ? `emc — SmPC ${m[1]}` : 'electronic medicines compendium';
  if (/ema\.europa\.eu$/.test(host)) return `EMA${last ? ` — ${clip(pretty(last))}` : ''}`;
  if (/crediblemeds\.org$/.test(host)) return 'CredibleMeds';
  if (/drug-interactions\.medicine\.iu\.edu$/.test(host)) return 'Flockhart CYP table';
  if (/fda\.gov$/.test(host)) {
    if (/drug-interactions/i.test(path)) return 'FDA — drug-interaction tables';
    if (/accessdata/.test(host) || /label/i.test(path)) return `FDA — ${entryName ? `${entryName} label` : 'drug label'}`;
    return `FDA${last ? ` — ${clip(pretty(last))}` : ''}`;
  }
  if (/cpicpgx\.org$/.test(host)) return `CPIC${last ? ` — ${clip(pretty(last))}` : ''}`;
  if (/clinpgx\.org$/.test(host)) return 'ClinPGx';
  if (/guidetopharmacology\.org$/.test(host)) return 'IUPHAR/BPS Guide to Pharmacology';
  if (/pdsp\.unc\.edu$/.test(host)) return 'PDSP Ki Database';
  return last ? `${host} — ${clip(pretty(last))}` : host;
}

/** Sources named in prose, without a link. */
const NAMED: [RegExp, string][] = [
  [/\bDailyMed\b/i, 'DailyMed'],
  [/\bBaselt\b/i, 'Baselt, Disposition of Toxic Drugs and Chemicals in Man'],
  [/\bCredibleMeds\b/i, 'CredibleMeds'],
  [/\bFlockhart\b/i, 'Flockhart CYP table'],
  [/\bCPIC\b/, 'CPIC'],
  [/\bClinPGx\b/i, 'ClinPGx'],
  [/\b(IUPHAR|Guide to Pharmacology)\b/i, 'IUPHAR/BPS Guide to Pharmacology'],
  [/\bPDSP\b/, 'PDSP Ki Database'],
  [/\bPubChem\b/i, 'PubChem'],
  [/\bSmPC\b/, 'Summary of Product Characteristics (SmPC)'],
];

/**
 * Cited sources in note texts, deduped (by URL, then by label). Each URL becomes a link with a
 * readable label; named sources without a link are listed after them unless `named` is false
 * (a "no data found" note names sources it did not use).
 */
export function extractCitations(texts: (string | null | undefined)[], entryName = '', named = true): Citation[] {
  const out: Citation[] = [];
  const seenUrl = new Set<string>();
  const seenLabel = new Set<string>();
  for (const raw of texts) {
    for (const found of raw?.match(URL_RE) ?? []) {
      const url = found.replace(/[.,;:]+$/, '');
      const key = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/+$/, '').toLowerCase();
      if (seenUrl.has(key)) continue;
      seenUrl.add(key);
      const label = citationLabel(url, entryName);
      seenLabel.add(label.toLowerCase());
      out.push({ label, url });
    }
  }
  if (!named) return out;
  const prose = texts.map((t) => cleanNote((t ?? '').replace(URL_RE, ' '))).join(' ');
  for (const [re, label] of NAMED) {
    if (!re.test(prose)) continue;
    const l = label.toLowerCase();
    if ([...seenLabel].some((s) => s === l || s.startsWith(`${l} `) || s.startsWith(`${l.split(' ')[0]} —`))) continue;
    seenLabel.add(l);
    out.push({ label });
  }
  return out;
}
