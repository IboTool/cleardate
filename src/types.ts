// Schema v2.4 for public/drugs.json and for the in-browser session (docs/ClearDate_Spec_v2.md, the
// v2.1 / v2.2 deltas, the structures addendum docs/ClearDate_Structures_Prompt.md, and 2.4: lingering-effects
// origin and CYP2D6 strength evidence). Unknown numbers are `null`, never 0. Safety enums have an explicit "unassessed" value.

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
export const KINETIC_MODES = ['intrinsic', 'formation-limited', 'zero-order', 'not-modelled', 'unknown'] as const;
export const PROVENANCE_TAGS = ['checked', 'recall', 'estimate', 'gap', 'reviewer'] as const;
/** "standard drinks" and "g" are alcohol units; "session" is an exposure session with a duration (no mass). */
export const DOSE_UNITS = ['mg', 'µg', 'g', 'standard drinks', 'µg/h', 'mg/h', 'session'] as const;
export const FORMULATIONS = ['IR', 'ER', 'SR', 'XL', 'XR', 'CR', 'depot', 'patch'] as const;
export const INPUT_TYPES = ['bolus', 'first-order-release', 'zero-order'] as const;
export const DOSE_BASES = ['maintenance', 'single-use', 'per-injection', 'rate'] as const;
export const CLINICAL_RELEVANCE = ['active', 'inactive', 'unknown'] as const;
export const COMPOUND_SECTIONS = [
  'halfLife', 'metabolism', 'relevance', 'molecularWeight', 'identity', 'cyp2d6', 'qt', 'receptors', 'lingeringEffects', 'nonlinearKinetics',
] as const;
export const IDENTITY_CONFIDENCE = ['confirmed', 'probable', 'unconfirmed', 'not-applicable'] as const;
/** What a CYP2D6 inhibitor strength rests on (schema 2.4). `model-estimate` tiers are shown as "predicted". */
export const STRENGTH_BASES = ['clinical-aucr', 'fda-category', 'label', 'model-estimate'] as const;
/** When a lingering-effects duration starts: the compound's clear date, or the last dose (label washouts). */
export const LINGERING_ORIGINS = ['clearance', 'last-dose'] as const;
/** `conversion` applies to prodrug products only (a component with administeredAs or massFactor). */
export const PRODUCT_SECTIONS = ['class', 'aliases', 'components', 'conversion', 'input', 'typicalDose'] as const;

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
export type ClinicalRelevance = (typeof CLINICAL_RELEVANCE)[number];
export type CompoundSection = (typeof COMPOUND_SECTIONS)[number];
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];
export type IdentityConfidence = (typeof IDENTITY_CONFIDENCE)[number];
export type StrengthBasis = (typeof STRENGTH_BASES)[number];
export type LingeringOrigin = (typeof LINGERING_ORIGINS)[number];

/** The evidence behind a CYP2D6 inhibitor strength, so a reviewer can revise it without reconstructing it. */
export interface StrengthEvidence {
  basis: StrengthBasis | null;
  /** Probe substrate of the AUC ratio (e.g. desipramine). */
  probe: string | null;
  /** Inhibitor dose and duration studied (e.g. "20 mg/day for 21 days"). */
  regimen: string | null;
  /** Probe AUC with ÷ without the inhibitor. */
  aucRatio: number | null;
  citation: string | null;
}

/** A PubChem compound considered for an identity that couldn't be confirmed. */
export interface IdentityCandidate {
  cid: number;
  name: string;
  reason: string;
}

/**
 * Chemical identity from PubChem (schema 2.3). `smiles` is PubChem's isomeric SMILES of the neutral
 * parent (non-salt) compound. Unconfirmed identities keep their candidates but no chosen structure.
 */
export interface Identity {
  pubchemCid: number | null;
  smiles: string | null;
  inchiKey: string | null;
  formula: string | null;
  confidence: IdentityConfidence;
  candidates: IdentityCandidate[];
  note: string;
}

/**
 * A published value with its spread. Every number may be null (unknown). Range-only evidence
 * (typical null, min and max set) is allowed for observed-range / cohort-means.
 */
export interface Range {
  typical: number | null;
  min: number | null;
  max: number | null;
  rangeType: RangeType | null;
  /** Coefficient of variation (SD / mean), used when rangeType is "cv". */
  cv: number | null;
}

/** May be partial: a missing phenotype counts as 1 (normal), labelled as assumed. */
export type PhenotypeMap = Partial<Record<Phenotype, number>>;

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface FormedFrom {
  compound: string;
  /** Share of the parent's elimination that forms this compound, 0–1; null = unknown. */
  fraction: number | null;
  /** Per-phenotype multiplier on the fraction (e.g. codeine → morphine). 0 = not formed. */
  cyp2d6Multiplier: PhenotypeMap | null;
  /** Formed only while this compound is also in the body (e.g. cocaine → cocaethylene needs ethanol). */
  condition?: { requiresCompound: string } | null;
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
  /** mode "zero-order": constant elimination rate per kg body weight (alcohol). */
  zeroOrderRateMgPerKgPerHour?: Range | null;
  /** mode "not-modelled": shown to users instead of a clear date. */
  notModelledReason?: string;
}

export type ProvenanceMap<K extends string> = Partial<Record<K, Provenance | null>>;
/** Section → date (YYYY-MM-DD) it last became reviewed. */
export type ReviewedDates<K extends string> = Partial<Record<K, string>>;

export interface Compound {
  id: string;
  name: string;
  aliases: string[];
  isMetabolite: boolean;
  formedFrom: FormedFrom[];
  /** Parents and directly dosed compounds always count as active, whatever this says. */
  clinicalRelevance: ClinicalRelevance;
  /** Also produced by the body: only the excess over baseline is simulated; unknown kinetics don't block once relevance is reviewed. */
  endogenous?: boolean;
  molecularWeight: number | null;
  /** null = not looked up yet. Written by `npm run structures:lookup`. */
  identity?: Identity | null;
  kinetics: Kinetics;
  cyp2d6: {
    substrate: TriState;
    halfLifeMultiplier: PhenotypeMap | null;
    inhibitor: InhibitorStrength;
    inhibitionType: InhibitionType;
    /** Schema 2.4. Optional only for session custom drugs saved before 2.4. */
    strengthEvidence?: StrengthEvidence;
  };
  qt: { tier: QtTier; weight: number | null; referenceAmountMg: number | null };
  receptors: Receptor[];
  /** false = the list hasn't been researched (an empty list is not "no targets"). */
  receptorsAssessed: boolean;
  /** `origin` (schema 2.4) is optional only for session custom drugs saved before 2.4; missing = "clearance". */
  lingeringEffects: { durationDays: number | null; origin?: LingeringOrigin; note: string };
  nonlinearKinetics: { flag: TriState; note: string };
  provenance: ProvenanceMap<CompoundSection>;
  sourceNotes: Partial<Record<CompoundSection, string>> & Record<string, string>;
  reviewedDates: ReviewedDates<CompoundSection>;
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
  /** Prodrug: the compound actually taken (display only); `compound` is what is modelled. */
  administeredAs?: string | null;
  /** Mass of the modelled compound per unit mass administered (molar conversion), 0 < x ≤ 2. */
  massFactor?: number | null;
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
  reviewedDates: ReviewedDates<ProductSection>;
  source: string;
  verified: boolean;
  verifiedDate: string;
  userEntered?: boolean;
}

export interface Library {
  schemaVersion: 2.4;
  /** The scale QT weights are calibrated on (editor's QT calibration view). */
  qtCalibrationNote?: string;
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
  /** Zero-order input (patch / infusion) or an exposure session: hours from start to end. */
  durationHours?: number;
}

export const IBOGAINE_DOSE_KINDS = ['test', 'flood', 'booster', 'microdose', 'other'] as const;
export type IbogaineDoseKind = (typeof IBOGAINE_DOSE_KINDS)[number];

export interface IbogaineDose {
  id: string;
  kind: IbogaineDoseKind;
  mg: number;
  /** The dose time; for a repeated dose, the first one. ISO local datetime. */
  time: string;
  /** Repeated (e.g. microdosing): every N hours/days from `time` until `until`. */
  repeat?: { every: number; unit: 'hours' | 'days'; until: string } | null;
}

/** Ibogaine doses of any kind. The first dose (by time) is the treatment date everything is measured against. */
export interface IbogaineTreatment {
  doses: IbogaineDose[];
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
  /** Plot metabolites classed `inactive` (fainter). They never count toward the clear date. */
  showInactiveMetabolites: boolean;
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
  /** Grams of ethanol in one standard drink (14 g US; 10 g UK/AU; 8 g UK unit). */
  standardDrinkGrams: number;
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
