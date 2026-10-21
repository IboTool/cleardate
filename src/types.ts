// Schema for public/drugs.json and for the in-browser session.

export const QT_TIERS = ['none', 'conditional', 'possible', 'known'] as const;
export const INHIBITOR_STRENGTHS = ['none', 'weak', 'moderate', 'strong'] as const;
export const INHIBITION_TYPES = ['none', 'reversible', 'mechanism-based'] as const;
export const RECEPTOR_ACTIONS = [
  'agonist',
  'antagonist',
  'partial agonist',
  'positive allosteric modulator',
  'inhibitor',
  'modulator',
] as const;
export const PHENOTYPES = ['poor', 'intermediate', 'normal', 'ultrarapid'] as const;

export type QtTier = (typeof QT_TIERS)[number];
export type InhibitorStrength = (typeof INHIBITOR_STRENGTHS)[number];
export type InhibitionType = (typeof INHIBITION_TYPES)[number];
export type ReceptorAction = (typeof RECEPTOR_ACTIONS)[number];
export type Phenotype = (typeof PHENOTYPES)[number];
export type PatientPhenotype = Phenotype | 'unknown';

export interface HalfLife {
  typical: number;
  min: number;
  max: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface FormedFrom {
  compound: string;
  fraction: number;
}

export interface Receptor {
  target: string;
  action: ReceptorAction;
}

export interface Compound {
  id: string;
  name: string;
  aliases: string[];
  isMetabolite: boolean;
  formedFrom: FormedFrom[];
  molecularWeight: number;
  halfLifeHours: HalfLife;
  cyp2d6: {
    substrate: boolean;
    halfLifeMultiplier: Record<Phenotype, number>;
    inhibitor: InhibitorStrength;
    inhibitionType: InhibitionType;
  };
  qt: { tier: QtTier; weight: number };
  receptors: Receptor[];
  lingeringEffects: { durationDays: number; note: string };
  nonlinearKinetics: { flag: boolean; note: string };
  source: string;
  sourceNotes: {
    halfLife: string;
    metabolism: string;
    cyp2d6: string;
    qt: string;
    receptors: string;
    [k: string]: string;
  };
  verified: boolean;
  verifiedDate: string;
  /** Session-only marker for wizard entries. Never written to drugs.json. */
  userEntered?: boolean;
  sourceUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  class: string;
  parentCompound: string;
  route: string;
  apparentHalfLifeHours?: HalfLife;
  typicalDoseMg: number;
  source: string;
  verified: boolean;
  verifiedDate: string;
  userEntered?: boolean;
}

export interface Library {
  categories: Category[];
  compounds: Compound[];
  products: Product[];
}

// ---------- session ----------

export interface Regimen {
  every: number;
  unit: 'hours' | 'days';
  start: string; // ISO local datetime "YYYY-MM-DDTHH:mm"
  end: string;
}

export interface DoseEntry {
  id: string;
  productId: string;
  amountMg: number;
  kind: 'single' | 'regimen';
  time?: string; // for single doses
  regimen?: Regimen;
}

export interface IbogaineDose {
  mg: number;
  time: string;
}

export interface IbogaineTreatment {
  flood: IbogaineDose;
  boosters: IbogaineDose[];
}

export interface Patient {
  name: string;
  dob: string;
  sex: '' | 'female' | 'male' | 'other';
  weightKg: number;
  weightUnit: 'kg' | 'lb';
  phenotype: PatientPhenotype;
  qtcMs: number;
  qtcFormula: 'Bazett' | 'Fridericia';
  notes: string;
}

export interface Settings {
  clearHalfLives: number;
  yScale: 'linear' | 'log';
  units: 'mg' | 'percent';
  showMetabolites: boolean;
  showBands: boolean;
  showCypTrack: boolean;
  showQtTrack: boolean;
  showLingeringTrack: boolean;
  dateOrder: 'dmy' | 'mdy';
  hour12: boolean;
  cypRecoveryHalfLifeHours: number;
  clinicName: string;
  demoData: boolean;
}

export interface CustomDrugs {
  compounds: Compound[];
  products: Product[];
  /** Custom compounds that form an existing library metabolite (e.g. a new benzo → oxazepam). */
  links?: { compound: string; from: string; fraction: number }[];
}

export interface Session {
  version: 1;
  patient: Patient;
  doses: DoseEntry[];
  ibogaine: IbogaineTreatment | null;
  custom: CustomDrugs;
  settings: Settings;
  recents: string[];
}
