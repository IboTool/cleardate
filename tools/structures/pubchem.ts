// Minimal PubChem PUG REST client for the structures lookup: ≤ 5 requests/second, retry with back-off,
// raw responses cached under tools/structures/.cache/ (gitignored) so re-runs are offline and fast.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NameHit, PubchemRecord } from './match';

const BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const MIN_INTERVAL_MS = 220;
const MAX_TRIES = 6;
const PROPS = 'SMILES,InChIKey,MolecularFormula,MolecularWeight,Title,DefinedAtomStereoCount,UndefinedAtomStereoCount,DefinedBondStereoCount,UndefinedBondStereoCount';

type Json = Record<string, any>;

export class PubChem {
  private last = 0;
  requests = 0;
  cacheHits = 0;

  constructor(private cacheDir: string, private offline = false) {
    mkdirSync(cacheDir, { recursive: true });
  }

  /** GET or POST; returns parsed JSON, or null for PubChem "not found". */
  private async call(path: string, body?: string): Promise<Json | null> {
    const key = createHash('sha1').update(`${path}\n${body ?? ''}`).digest('hex');
    const file = resolve(this.cacheDir, `${key}.json`);
    if (existsSync(file)) {
      this.cacheHits++;
      return JSON.parse(readFileSync(file, 'utf8')).response;
    }
    if (this.offline) throw new Error(`offline and not cached: ${path}`);
    for (let attempt = 1; ; attempt++) {
      const wait = this.last + MIN_INTERVAL_MS - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
      this.requests++;
      let res: Response | null = null;
      try {
        res = await fetch(`${BASE}${path}`, body
          ? { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          : undefined);
      } catch {
        /* network error: retry */
      }
      if (res && (res.ok || res.status === 404)) {
        const response = res.ok ? await res.json() : null;
        writeFileSync(file, JSON.stringify({ path, body: body ?? null, response }), 'utf8');
        return response;
      }
      if (res && res.status === 400) throw new Error(`PubChem 400 for ${path}: ${(await res.text()).slice(0, 200)}`);
      if (attempt >= MAX_TRIES) throw new Error(`PubChem failed after ${attempt} tries (${res?.status ?? 'network error'}): ${path}`);
      await sleep(Math.min(30_000, 1000 * 2 ** (attempt - 1)));
    }
  }

  /** Name → parent CIDs (salts and hydrates mapped to the parent). */
  async nameToCids(name: string): Promise<NameHit> {
    const r = await this.call('/compound/name/cids/JSON?cids_type=parent', `name=${encodeURIComponent(name)}`);
    const cids: number[] = (r?.IdentifierList?.CID ?? []).filter((c: number) => c > 0);
    return { query: name, cids: [...new Set(cids)] };
  }

  /** Full records (properties + synonyms) for the given CIDs. */
  async records(cids: number[]): Promise<Map<number, PubchemRecord>> {
    const out = new Map<number, PubchemRecord>();
    if (!cids.length) return out;
    const sorted = [...new Set(cids)].sort((a, b) => a - b);
    const props = await this.call(`/compound/cid/property/${PROPS}/JSON`, `cid=${sorted.join(',')}`);
    const syn = await this.call('/compound/cid/synonyms/JSON', `cid=${sorted.join(',')}`);
    const synonyms = new Map<number, string[]>((syn?.InformationList?.Information ?? []).map((i: Json) => [i.CID, i.Synonym ?? []]));
    for (const p of props?.PropertyTable?.Properties ?? []) {
      out.set(p.CID, {
        cid: p.CID,
        title: p.Title ?? '',
        smiles: p.SMILES ?? p.IsomericSMILES ?? '',
        inchiKey: p.InChIKey ?? '',
        formula: p.MolecularFormula ?? '',
        molecularWeight: Number(p.MolecularWeight),
        definedAtomStereo: p.DefinedAtomStereoCount ?? 0,
        undefinedAtomStereo: p.UndefinedAtomStereoCount ?? 0,
        definedBondStereo: p.DefinedBondStereoCount ?? 0,
        undefinedBondStereo: p.UndefinedBondStereoCount ?? 0,
        synonyms: synonyms.get(p.CID) ?? [],
      });
    }
    return out;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
