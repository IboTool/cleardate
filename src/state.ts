// Session state: defaults, localStorage autosave, patient files.

import type { CustomDrugs, Library, Patient, Session, Settings } from './types';

const KEY = 'cleardate.session.v1';

export const defaultPatient = (): Patient => ({
  name: '', dob: '', sex: '', weightKg: 0, weightUnit: 'kg', phenotype: 'unknown', qtcMs: 0, qtcFormula: 'Fridericia', notes: '',
});

export const defaultSettings = (): Settings => ({
  clearHalfLives: 5.5,
  yScale: 'linear',
  units: 'mg',
  showMetabolites: true,
  showBands: true,
  showCypTrack: true,
  showQtTrack: true,
  showLingeringTrack: true,
  dateOrder: 'dmy',
  hour12: false,
  cypRecoveryHalfLifeHours: 51,
  clinicName: '',
  demoData: false,
});

export const emptySession = (): Session => ({
  version: 1,
  patient: defaultPatient(),
  doses: [],
  ibogaine: null,
  custom: { compounds: [], products: [] },
  settings: defaultSettings(),
  recents: [],
});

/** Fill in any fields missing from an older or hand-edited session. */
export function normaliseSession(raw: Partial<Session>): Session {
  const d = emptySession();
  return {
    version: 1,
    patient: { ...d.patient, ...(raw.patient ?? {}) },
    doses: Array.isArray(raw.doses) ? raw.doses : [],
    ibogaine: raw.ibogaine ?? null,
    custom: {
      compounds: (raw.custom?.compounds ?? []).map((c) => ({ ...c, userEntered: true })),
      products: (raw.custom?.products ?? []).map((p) => ({ ...p, userEntered: true })),
      links: raw.custom?.links ?? [],
    },
    settings: { ...d.settings, ...(raw.settings ?? {}) },
    recents: Array.isArray(raw.recents) ? raw.recents : [],
  };
}

export function loadSession(): Session {
  try {
    const s = localStorage.getItem(KEY);
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
    p.parentCompound = cMap.get(p.parentCompound) ?? p.parentCompound;
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
