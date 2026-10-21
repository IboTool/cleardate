// Schema v2 for public/drugs.json and for the in-browser session (docs/ClearDate_Spec_v2.md).
// Unknown numbers are `null`, never 0. Safety enums have an explicit "unassessed" value.

export const QT_TIERS = ['unassessed', 'none', 'conditional', 'possible', 'known'] as const;
export const INHIBITOR_STRENGTHS = ['unassessed', 'none', 'weak', 'moderate', 'strong'] as const;
export const INHIBITION_TYPES = ['unassessed', 'none', 'reversible', 'mechanism-based'] as const;
export const TRI_STATES = ['yes', 'no', 'unassessed'] as const;
export const RECEPTOR_ACTIONS = [
  'agonist',
  'antagonist',
  'partial agonist',
  'positive allosteric modulator',
  'inhibitor',
  'modulator',
] as const;
export const PHENOTYPES = ['poor', 'intermediate', 'normal', 'ultrarapid'] as const;
export const RANGE_TYPES = ['observed-range', 'mean-2sd', 'cohort-means', 'cv', 'single-value'] as const;
export const KINETIC_MODES = ['intrinsic', 'formation-limited', 'unknown'] as const;
export const PROVENANCE_TAGS = ['checked', 'recall', 'estimate', 'gap', 'reviewer'] as const;
export const DOSE_UNITS = ['mg', 'µg', 'µg/h', 'mg/h'] as const;
export const FORMULATIONS = ['IR', 'ER', 'SR', 'XL', 'XR', 'CR', 'depot', 'patch'] as const;
export const INPUT_TYPES = ['bolus', 'first-order-release', 'zero-order'] as const;
export const DOSE_BASES = ['maintenance', 'single-use', 'per-injection', 'rate'] as const;
export const COMPOUND_SECTIONS = [
  'halfLife', 'metabolism', 'molecularWeight', 'cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics',
] as const;
export const PRODUCT_SECTIONS = ['class', 'aliases', 'components', 'input', 'typicalDose'] as const;

export type QtTier = (typeof QT_TIERS)[number];
export type InhibitorStrength = (typeof INHIBITOR_STRENGTHS)[number];
export type InhibitionType = (typeof INHIBITION_TYPES)[number];
export type TriState = (typeof TRI_STATES)[number];
export type ReceptorAction = (typeof RECEPTOR_ACTIONS)[number];
export type Phenotype = (typeof PHENOTYPES)[number];
export type PatientPhenotype = Phenotype | 'unknown';
export type RangeType = (typeof RANGE_TYPES)[number];
export type KineticMode = (typeof KINETIC_MODES)[number];
export type Provenance = (typeof PROVENANCE_TAGS)[number];
export type DoseUnit = (typeof DOSE_UNITS)[number];
export type Formulation = (typeof FORMULATIONS)[number];
export type InputType = (typeof INPUT_TYPES)[number];
export type DoseBasis = (typeof DOSE_BASES)[number];
export type CompoundSection = (typeof COMPOUND_SECTIONS)[number];
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];

/** A published value with its spread. Every number may be null (unknown). */
export interface Range {
  typical: number | null;
  min: number | null;
  max: number | null;
  rangeType: RangeType | null;
  /** Coefficient of variation (SD / mean), used when rangeType is "cv". */
  cv: number | null;
}

export type PhenotypeMap = Record<Phenotype, number>;

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface FormedFrom {
  compound: string;
  /** Share of the parent's elimination that forms this compound, 0–1; null = unknown. */
  fraction: number | null;
  /** Per-phenotype multiplier on the fraction (e.g. codeine → morphine). */
  cyp2d6Multiplier: PhenotypeMap | null;
}

export interface Receptor {
  target: string;
  action: ReceptorAction;
}

export interface Kinetics {
  mode: KineticMode;
  /** Terminal (slowest) phase — the one that determines clearance. */
  halfLifeHours: Range | null;
  /** Share of each dose cleared by a faster early phase. */
  earlyPhase: { fraction: number | null; halfLifeHours: Range | null } | null;
  /** Half-life that applies once dosing has run continuously for afterDays. */
  steadyState: { afterDays: number | null; halfLifeHours: Range | null } | null;
}

export type ProvenanceMap<K extends string> = Partial<Record<K, Provenance | null>>;

export interface Compound {
  id: string;
  name: string;
  aliases: string[];
  isMetabolite: boolean;
  formedFrom: FormedFrom[];
  molecularWeight: number | null;
  kinetics: Kinetics;
  cyp2d6: {
    substrate: TriState;
    halfLifeMultiplier: PhenotypeMap | null;
    inhibitor: InhibitorStrength;
    inhibitionType: InhibitionType;
  };
  qt: { tier: QtTier; weight: number | null; referenceAmountMg: number | null };
  receptors: Receptor[];
  /** false = the list hasn't been researched (an empty list is not "no targets"). */
  receptorsAssessed: boolean;
  lingeringEffects: { durationDays: number | null; note: string };
  nonlinearKinetics: { flag: TriState; note: string };
  provenance: ProvenanceMap<CompoundSection>;
  sourceNotes: Partial<Record<CompoundSection, string>> & Record<string, string>;
  source: string;
  verified: boolean;
  verifiedDate: string;
  /** Session-only marker for wizard entries. Never written to drugs.json. */
  userEntered?: boolean;
  sourceUrl?: string;
}

export interface Component {
  compound: string;
  ratio: number;
  /** Labelled salt mass → free base (e.g. 0.89). null = already free base / not assessed. */
  saltFactor: number | null;
  /** Fraction reaching the body by this route (0–1). null = not applied. */
  bioavailability: number | null;
}

export interface ProductInput {
  type: InputType;
  /** Release compartment half-life (depots, ER forms, skin depot after patch removal). */
  releaseHalfLifeHours: Range | null;
  /** Default wear / infusion time for zero-order input. */
  defaultDurationHours: number | null;
}

export interface Product {
  id: string;
  /** The tools/candidates.json candidate this product belongs to. */
  candidateId: string;
  name: string;
  aliases: string[];
  category: string;
  secondaryCategories: string[];
  class: string;
  route: string;
  formulation: Formulation | null;
  /** First component is the primary one; the dose amount refers to it. */
  components: Component[];
  doseUnit: DoseUnit;
  input: ProductInput;
  typicalDose: { amount: number | null; unit: DoseUnit; basis: DoseBasis };
  provenance: ProvenanceMap<ProductSection>;
  sourceNotes: Partial<Record<ProductSection, string>> & Record<string, string>;
  source: string;
  verified: boolean;
  verifiedDate: string;
  userEntered?: boolean;
}

export interface Library {
  schemaVersion: 2;
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
  /** In `unit` (the product's doseUnit). For rate units this is the rate. */
  amount: number;
  unit: DoseUnit;
  kind: 'single' | 'regimen';
  time?: string; // single doses; for patches the application time
  regimen?: Regimen;
  /** Zero-order input (patch / infusion): hours from application to removal. */
  durationHours?: number;
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
  /** Summed relative QT load overlay (only available when every lane is calibrated). */
  showQtLoad: boolean;
  showLingeringTrack: boolean;
  dateOrder: 'dmy' | 'mdy';
  hour12: boolean;
  cypRecoveryHalfLifeHours: number;
  /** CV applied to single-value ranges ("assumed spread"). */
  assumedCv: number;
  /** Simulate `unknown` compounds as formation-limited (labelled as an assumption). */
  unknownAsFormationLimited: boolean;
  clinicName: string;
  demoData: boolean;
}

export interface CustomDrugs {
  compounds: Compound[];
  products: Product[];
  /** Custom compounds that form an existing library metabolite (e.g. a new benzo → oxazepam). */
  links?: { compound: string; from: string; fraction: number | null }[];
}

export interface Session {
  version: 2;
  patient: Patient;
  doses: DoseEntry[];
  ibogaine: IbogaineTreatment | null;
  custom: CustomDrugs;
  settings: Settings;
  recents: string[];
}
