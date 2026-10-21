// v2.3 → v2.4 library migration. Pure: no file access, so it is unit-tested directly. tools/migrate-v2.4.ts is
// the CLI wrapper.
//
// Additive only, no behaviour change:
// - every compound's lingeringEffects gains `origin: "clearance"` (what the app has always assumed);
// - every compound's cyp2d6 gains `strengthEvidence` with all fields null (filled by a reviewer or a data script).

import { clone, emptyStrengthEvidence } from '../src/schema';
import type { Library } from '../src/types';

export interface V24Report {
  compounds: number;
  originAdded: number;
  strengthEvidenceAdded: number;
  /** Compounds with a weak / moderate / strong tier that now need a recorded basis. */
  tieredWithoutBasis: string[];
}

/** Migrate a schema-2.3 library to 2.4. A 2.4 library is returned unchanged with `skipped: true` (idempotent). */
export function migrateLibraryV24(src: unknown): { lib: Library; report: V24Report; skipped: boolean } {
  const version = (src as { schemaVersion?: unknown }).schemaVersion;
  const lib = src as Library;
  if (version === 2.4) return { lib, report: { compounds: lib.compounds.length, originAdded: 0, strengthEvidenceAdded: 0, tieredWithoutBasis: [] }, skipped: true };
  if (version !== 2.3) throw new Error(`expected a schemaVersion 2.3 library, found ${String(version)} (run npm run migrate-v2.3 first)`);
  const out = clone(lib);
  let originAdded = 0;
  let strengthEvidenceAdded = 0;
  for (const c of out.compounds) {
    if (c.lingeringEffects.origin === undefined) {
      c.lingeringEffects = { durationDays: c.lingeringEffects.durationDays, origin: 'clearance', note: c.lingeringEffects.note };
      originAdded++;
    }
    if (c.cyp2d6.strengthEvidence === undefined) {
      c.cyp2d6.strengthEvidence = emptyStrengthEvidence();
      strengthEvidenceAdded++;
    }
  }
  (out as { schemaVersion: number }).schemaVersion = 2.4;
  const tieredWithoutBasis = out.compounds
    .filter((c) => ['weak', 'moderate', 'strong'].includes(c.cyp2d6.inhibitor) && !c.cyp2d6.strengthEvidence?.basis)
    .map((c) => c.id);
  return { lib: out, report: { compounds: out.compounds.length, originAdded, strengthEvidenceAdded, tieredWithoutBasis }, skipped: false };
}
