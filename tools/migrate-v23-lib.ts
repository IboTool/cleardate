// v2.2 → v2.3 library migration (docs/ClearDate_Structures_Prompt.md §1). Pure: no file access, so it is
// unit-tested directly. tools/migrate-v2.3.ts is the CLI wrapper.
//
// Additive only: every compound gains `"identity": null` (filled later by `npm run structures:lookup`).

import { clone } from '../src/schema';
import type { Library } from '../src/types';

export interface V23Report {
  compounds: number;
  identityAdded: number;
}

/** Migrate a schema-2.2 library to 2.3. A 2.3 library is returned unchanged with `skipped: true` (idempotent). */
export function migrateLibraryV23(src: unknown): { lib: Library; report: V23Report; skipped: boolean } {
  const version = (src as { schemaVersion?: unknown }).schemaVersion;
  const lib = src as Library;
  if (version === 2.3) return { lib, report: { compounds: lib.compounds.length, identityAdded: 0 }, skipped: true };
  if (version !== 2.2) throw new Error(`expected a schemaVersion 2.2 library, found ${String(version)} (run npm run migrate-v2.2 first)`);
  const out = clone(lib);
  let identityAdded = 0;
  for (const c of out.compounds)
    if (c.identity === undefined) {
      c.identity = null;
      identityAdded++;
    }
  (out as { schemaVersion: number }).schemaVersion = 2.3;
  return { lib: out, report: { compounds: out.compounds.length, identityAdded }, skipped: false };
}
