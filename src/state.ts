// Session state: defaults, localStorage autosave, patient files, v1 → v2 session migration.

import { migrateLibrary } from '../tools/migrate-lib';
import type { CustomDrugs, DoseEntry, DoseUnit, Library, Patient, Session, Settings } from './types';

const KEY = 'cleardate.session.v2';
const KEY_V1 = 'cleardate.session.v1';

export const defaultPatient = (): Patient => ({
  name: '', dob: '', sex: '', weightKg: 0, weightUnit: 'kg', phenotype: 'unknown', qtcMs: 0, qtcFormula: 'Fridericia', notes: '',
});

export const defaultSettings = (): Settings => ({
  clearHalfLives: 5.5,
  yScale: 'linear',
  units: 'mg',
  showMetabolites: true,
  showInactiveMetabolites: false,
  showBands: true,
  showCypTrack: true,
  showQtTrack: true,
  showQtLoad: false,
  showLingeringTrack: true,
  dateOrder: 'dmy',
  hour12: false,
  cypRecoveryHalfLifeHours: 51,
  assumedCv: 0.3,
  unknownAsFormationLimited: false,
  standardDrinkGrams: 14,
  clinicName: '',
  demoData: false,
});

export const emptySession = (): Session => ({
  version: 2,
  patient: defaultPatient(),
  doses: [],
  ibogaine: null,
  custom: { compounds: [], products: [], links: [] },
  settings: defaultSettings(),
  recents: [],
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Migrate a v1 session (amountMg doses, v1 custom drugs) to v2. */
export function migrateSessionV1(raw: any): any {
  const doses: DoseEntry[] = (Array.isArray(raw.doses) ? raw.doses : []).map((d: any) => {
    const { amountMg, ...rest } = d;
    return { ...rest, amount: typeof d.amount === 'number' ? d.amount : Number(amountMg) || 0, unit: (d.unit as DoseUnit) ?? 'mg' };
  });
  let custom = raw.custom ?? { compounds: [], products: [] };
  if ((custom.compounds?.length || custom.products?.length) && custom.compounds?.some((c: any) => 'halfLifeHours' in c)) {
    const { lib } = migrateLibrary({ categories: [], compounds: custom.compounds ?? [], products: custom.products ?? [] });
    custom = { compounds: lib.compounds, products: lib.products, links: custom.links };
  }
  const links = (custom.links ?? []).map((l: any) => ({ ...l, fraction: l.fraction > 0 ? l.fraction : null }));
  return { ...raw, version: 2, doses, custom: { ...custom, links } };
}

/** Fill in any fields missing from an older or hand-edited session; migrates v1 sessions. */
export function normaliseSession(input: Partial<Session> | Record<string, unknown>): Session {
  const raw = ((input as { version?: number }).version === 2 ? input : migrateSessionV1(input)) as Partial<Session>;
  const d = emptySession();
  return {
    version: 2,
    patient: { ...d.patient, ...(raw.patient ?? {}) },
    doses: Array.isArray(raw.doses) ? raw.doses.map((x) => ({ ...x, unit: x.unit ?? 'mg' })) : [],
    ibogaine: Array.isArray(raw.ibogaine?.doses) && raw.ibogaine.doses.length ? raw.ibogaine : null,
    custom: {
      compounds: (raw.custom?.compounds ?? []).map((c) => ({
        ...c,
        clinicalRelevance: c.clinicalRelevance ?? (c.isMetabolite ? 'unknown' : 'active'),
        reviewedDates: c.reviewedDates ?? {},
        userEntered: true,
      })),
      products: (raw.custom?.products ?? []).map((p) => ({ ...p, reviewedDates: p.reviewedDates ?? {}, userEntered: true })),
      links: raw.custom?.links ?? [],
    },
    settings: { ...d.settings, ...(raw.settings ?? {}) },
    recents: Array.isArray(raw.recents) ? raw.recents : [],
  };
}

export function loadSession(): Session {
  try {
    const s = localStorage.getItem(KEY) ?? localStorage.getItem(KEY_V1);
    if (s) return normaliseSession(JSON.parse(s));
  } catch {
    /* corrupted storage: start fresh */
  }
  return emptySession();
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled — nothing else we can do offline */
  }
}

export function clearStoredSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(KEY_V1);
}

export function patientFileName(s: Session): string {
  const name = (s.patient.name || 'patient').trim().replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '') || 'patient';
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${name}-${date}.cleardate.json`;
}

/**
 * Merge custom drugs from a loaded file. A custom ID that clashes with a library ID is renamed
 * (both are kept), and every reference to it inside the custom set and the doses is updated.
 */
export function resolveCustomClashes(session: Session, library: Library): { session: Session; renamed: [string, string][] } {
  const compoundIds = new Set(library.compounds.map((c) => c.id));
  const productIds = new Set(library.products.map((p) => p.id));
  const renamed: [string, string][] = [];
  const unique = (id: string, taken: Set<string>) => {
    let n = 1;
    let next = `${id}_custom`;
    while (taken.has(next)) next = `${id}_custom${++n}`;
    return next;
  };
  const custom: CustomDrugs = structuredClone(session.custom);
  const cMap = new Map<string, string>();
  const takenC = new Set([...compoundIds, ...custom.compounds.map((c) => c.id)]);
  for (const c of custom.compounds)
    if (compoundIds.has(c.id)) {
      const next = unique(c.id, takenC);
      takenC.add(next);
      cMap.set(c.id, next);
      renamed.push([c.id, next]);
      c.id = next;
    }
  for (const c of custom.compounds) c.formedFrom = c.formedFrom.map((f) => ({ ...f, compound: cMap.get(f.compound) ?? f.compound }));
  custom.links = (custom.links ?? []).map((l) => ({ ...l, from: cMap.get(l.from) ?? l.from }));
  const pMap = new Map<string, string>();
  const takenP = new Set([...productIds, ...custom.products.map((p) => p.id)]);
  for (const p of custom.products) {
    p.components = p.components.map((c) => ({ ...c, compound: cMap.get(c.compound) ?? c.compound }));
    if (cMap.has(p.candidateId)) p.candidateId = cMap.get(p.candidateId)!;
    if (productIds.has(p.id)) {
      const next = unique(p.id, takenP);
      takenP.add(next);
      pMap.set(p.id, next);
      renamed.push([p.id, next]);
      p.id = next;
    }
  }
  // Doses referring to a renamed custom product follow it.
  const doses = session.doses.map((d) => (pMap.has(d.productId) ? { ...d, productId: pMap.get(d.productId)! } : d));
  return { session: { ...session, custom, doses }, renamed };
}
