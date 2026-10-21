# ClearDate — prepopulation supplement B

Date: 2026-10-20. Draft evidence pass; all verification states preserved. Starting backup: backups/drugs.before-supplement-b.json; SHA256 87a5a04bd7679ca9f503985425a162f2563b8ea925b4a0ba2093f3fdf860b443. Existing clinician-list bytes backed up separately. IDs, links, categories and component lists are not edited. Statuses use current app productDataStatus/productTree/effectiveRelevance with drafts included and unknown-as-formation-limited disabled. Computable means structural PK completeness, not clinically safe intake timing.

## Part 1 — Common-intake blockers and ranked residual follow-up

Named blockers were assessed in the requested order. Intrinsic entries based on formed/patient profiles are explicitly estimates, not direct healthy-dose claims. Norbuprenorphine separates healthy acute and maintenance-patient chronic means with unknown onset.1OH-midazolam is formation-limited only because its label explicitly describes faster elimination and parallel decline. No inactive assignment was made to erase a toxic/active blocker.
Important conflicts: B3G older inactive summaries conflict with primary biological activity; free HMA/HMMA cannot take hydrolysed-total PK; IAA is endogenous but also a concentration/renal-dependent uremic solute; HNK direct RR6.67–8.18h does not establish generic aggregate disposition. THC11OH range12–36h is recall, not newly checked numerical data. Cocaine late sensitive-label terminal means5–8h widen earlier short-sampled values.6MAM47min is an intranasal maintenance-patient proxy; H3G3.73–3.88h normal-renal formed profiles are estimated intrinsic surrogates, not documented formation-limited disposition.
Full ranking below includes residuals beyond the explicit table. Additional primary follow-up identifies direct E-10OH-nortriptyline8–9h but generic E/Z identity prevents transfer; demoxepam/desmethylchlordiazepoxide accumulation half-times are not independent terminal values. No link/identity/components changed.

### Product status checkpoint

| Category | Computable before → after | Incomplete before → after | No data before → after |
|---|---:|---:|---:|
| opioids | 23 → 28 | 23 → 18 | 3 → 3 |
| sedatives | 30 → 33 | 11 → 8 | 6 → 6 |
| antidepressants | 25 → 27 | 11 → 9 | 1 → 1 |
| antipsychotics | 21 → 21 | 10 → 10 | 0 → 0 |
| mood_anticonvulsants | 11 → 11 | 4 → 4 | 0 → 0 |
| stimulants | 11 → 14 | 14 → 11 | 2 → 2 |
| psychedelics_dissociatives | 4 → 7 | 23 → 20 | 16 → 16 |
| cardiovascular | 24 → 24 | 24 → 24 | 0 → 0 |
| other_interactors | 30 → 30 | 11 → 11 | 2 → 2 |
| **Overall** | 179 → 195 | 131 → 115 | 30 → 30 |

### Entry changes and evidence


#### 10_hydroxyamitriptyline

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary stable-isotope assay confirms unconjugated/conjugated hydroxymetabolites persist72h but sparse concentrations not enough to infer terminal slope. https://pubmed.ncbi.nlm.nih.gov/376209/

#### 10_hydroxynortriptyline

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Direct racemic E-10OH-NT primary gives8–9h enantiomer half-lives. Queue lacks E/Z identity; cannot assign E isomer to unspecified aggregate without reviewer identity decision. https://pubmed.ncbi.nlm.nih.gov/2731406/

#### 11_oh_thc

- halfLife [recall]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":12,"max":36,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}}. [recall] Supplement B: recalled human Wall1983 terminal plasma range12–36h after THC; primary numerical table not accessible in this session. Provisional recall, not independently dosed11OH elimination; do not confuse acute intoxication duration with terminal phase. https://pubmed.ncbi.nlm.nih.gov/6309462/

#### 1_hydroxymidazolam

- halfLife [checked]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"formation-limited","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [checked] Supplement B: HPRA midazolam SmPC5.2 states metabolite half-life<1h and therefore parent/metabolite decline in parallel after midazolam. Explicit faster metabolite elimination supports formation-limited, normal renal function. Do not transfer to its glucuronide or impaired-renal patients. https://assets.hpra.ie/products/Human/42444/Licence_PA1968-017-003_28112025162925.pdf

#### 2_hydroxydesipramine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Hydroxymetabolite pharmacology not equivalent to inactivity. Direct independent human terminal constant not recovered from targeted study search. https://pubmed.ncbi.nlm.nih.gov/7712660/

#### 4_hydroxyalprazolam

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Label active4OH; lower potency/concentrations do not establish irrelevance. Similar-to-parent wording not a metabolite-specific terminal constant. https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/021434s018lbl.pdf

#### 4_hydroxyamphetamine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: no applicable human plasma terminal estimate for this analyte. Amphetamine enantiomer label half-lives and rhesus/rat hydroxymethamphetamine studies are not metabolite human PK. Need analyte-specific human plasma terminal study or documented formation limitation. https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/208147s000lbl.pdf https://pmc.ncbi.nlm.nih.gov/articles/PMC4244873/

#### 4_hydroxymethamphetamine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: no applicable human plasma terminal estimate for this analyte. Amphetamine enantiomer label half-lives and rhesus/rat hydroxymethamphetamine studies are not metabolite human PK. Need analyte-specific human plasma terminal study or documented formation limitation. https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/208147s000lbl.pdf https://pmc.ncbi.nlm.nih.gov/articles/PMC4244873/

#### 6_monoacetylmorphine

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":0.7833333333333333,"min":0.43333333333333335,"max":1.1666666666666667,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Supplement B: Guessoum2025 intranasal HAT patient terminal geometric mean47min observed26–70. Explicit route/patient formed-profile proxy for lack of recovered healthy direct6MAM data; not intrinsic validation for every heroin route. Heroin absorption and presystemic conversion need review. Rentsch arterial clearance alone cannot yield terminal half-life. https://pmc.ncbi.nlm.nih.gov/articles/PMC12263744/ https://pubmed.ncbi.nlm.nih.gov/40481986/

#### 7_aminoclonazepam

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: No reliable plasma terminal constant recovered; urine marker detection does not quantify kinetics or establish absence of all receptor/toxic activity. 

#### benzoylecgonine

- halfLife [estimate]: values retained {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":7.06,"min":null,"max":null,"rangeType":"cv","cv":0.213},"earlyPhase":null,"steadyState":null}}. [estimate] FDA clinical PK review, study LNT-P6-733, printed report p16 (PDF p93): 4% topical arm formed-metabolite plasma half-life mean 7.06 h, CV21.3%. Intrinsic proxy after parent dosing; urinary 3–6 h not substituted. https://www.accessdata.fda.gov/drugsatfda_docs/nda/2020/209575Orig1s000ClinPharmR.pdf Supplement B tree check: existing human PK retained. BE/EME formed profiles must not be equated with inactive status; cocaethylene requires co-exposure to ethanol (conditional formation not represented by static link).

#### bufotenine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: primary1976 direct IV radiolabel study quantifies urinary products in2volunteers, not recoverable plasma terminal constant; modern5MeO trial often BLQ. Total urinary radioactivity recovery12h is not elimination half-life. https://www.sciencedirect.com/science/article/pii/0024320576904410 https://pubmed.ncbi.nlm.nih.gov/38616411/

#### buprenorphine_3_glucuronide

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B targeted search: no B3G-specific independent human terminal constant or documented formation-limited disposition recovered. NorB-glucuronide formation-limited finding is not B3G; animal activity prevents inactive exclusion. Need human paired formation/elimination model or direct-dose PK. https://pubmed.ncbi.nlm.nih.gov/22037640/
- relevance [checked]: values retained {"clinicalRelevance":"active"}. [checked] Brown2011 primary receptor/animal study confirms biological activity of buprenorphine glucuronides at relevant exposures; contradicts older blanket inactive descriptions. Human effect size unresolved, so no exclusion. https://pubmed.ncbi.nlm.nih.gov/22037640/

#### cocaethylene

- halfLife [checked]: values retained {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":1.68,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}}. [checked] Direct IV single-dose crossover, six healthy male moderate cocaine users; mean 1.68 h. Formation requires concomitant ethanol, not an unconditional fraction of every cocaine dose. https://pubmed.ncbi.nlm.nih.gov/7701044/ Supplement B tree check: existing human PK retained. BE/EME formed profiles must not be equated with inactive status; cocaethylene requires co-exposure to ethanol (conditional formation not represented by static link).

#### cocaine

- halfLife [estimate]: {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":0.6333333333333333,"max":1.07,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":0.6333333333333333,"max":8,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Supplement B wider terminal mean envelope: previous acute cohort means~.63–1.07h versus Goprelto label32h sensitive sampling means5–8h at very low concentrations; short sampling can miss terminal tail. Route/product-transfer estimate; no claim that late trace concentration equals ongoing intoxication. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=0f897764-fe30-090a-e063-6294a90af106

#### codeine_6_glucuronide

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary14healthy single50mgcodeine measures C6G; abstract2.58h is CODEINE. Need separate C6G table/model; do not copy. https://pubmed.ncbi.nlm.nih.gov/1867957/

#### dehydronorketamine

- relevance [gap]: values retained {"clinicalRelevance":"unknown"}. [gap] Supplement B: existing ICU infusion6.9h proxy retained; pharmacological inactivity as anesthetic would not establish all target/toxic inactivity. Need human relevance and healthy independent kinetics; no inactive exclusion solely to resolve a block. https://pubmed.ncbi.nlm.nih.gov/32838982/

#### demoxepam

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary3healthy accumulation half-times21.1/34.2/78.5h under parent dosing are not independent terminal elimination; formation and accumulation remain coupled. https://pubmed.ncbi.nlm.nih.gov/700911/

#### desmethylchlordiazepoxide

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary accumulation half-times9.9–17.7h, not independent single-dose terminal; coupled formation requires model separation. https://pubmed.ncbi.nlm.nih.gov/700911/

#### desmethylcitalopram

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Label steady-state exposure~one-half parent does not establish half-life; independent metabolite PK needed. https://www.accessdata.fda.gov/drugsatfda_docs/label/2017/020822s047lbl.pdf

#### desmethylselegiline

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":3.8,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":{"afterDays":null,"halfLifeHours":{"typical":9.5,"min":null,"max":null,"rangeType":"single-value","cv":null}}}}. [estimate] Supplement B: primary Eldepryl study single-dose N-desmethylselegiline mean3.8h versus multiple-dose9.5h. Formed-profile estimate; repeated onset not established. https://pubmed.ncbi.nlm.nih.gov/11862265/

#### didesmethylcitalopram

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Label steady-state exposure~one-tenth parent is not half-life; low exposure does not exclude QT relevance. https://www.accessdata.fda.gov/drugsatfda_docs/label/2017/020822s047lbl.pdf

#### dmt_n_oxide

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: human DMT-NO often unquantifiable in controlled trials; bioanalytical validation establishes measurement, not a reliable terminal phase. Need quantifiable analyte-specific human plasma terminal study. https://pubmed.ncbi.nlm.nih.gov/36434963/

#### ecgonine_methyl_ester

- halfLife [estimate]: values retained {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":4.3,"min":null,"max":null,"rangeType":"cv","cv":0.182},"earlyPhase":null,"steadyState":null}}. [estimate] FDA clinical PK review, LNT-P6-733, printed p18 (PDF p95): formed-metabolite plasma half-life 4.30 h CV18.2% after 4% topical cocaine. Intrinsic proxy, not urinary rate. https://www.accessdata.fda.gov/drugsatfda_docs/nda/2020/209575Orig1s000ClinPharmR.pdf Supplement B tree check: existing human PK retained. BE/EME formed profiles must not be equated with inactive status; cocaethylene requires co-exposure to ethanol (conditional formation not represented by static link).

#### ethylphenidate

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary human ethanol/MPH study confirms formation; separate EPH terminal numeric table not recovered. MPH half-life or effect duration not substituted; conditional ethanol formation needs model support. https://pubmed.ncbi.nlm.nih.gov/10820132/ https://pubmed.ncbi.nlm.nih.gov/20533759/

#### hma

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: free versus conjugated analyte mismatch remains. Human chiral phaseII study found conjugated species with free phaseI metabolites undetected; no free independent terminal constant. Need split chemical species, not total deconjugated HMMA11.5–13.5h substitution. https://www.sciencedirect.com/science/article/pii/S0090955624102395
- relevance [checked]: {"clinicalRelevance":"unknown"} → {"clinicalRelevance":"active"}. [checked] Supplement B: Forsling2002 isolated rat hypothalamus showed hormone-release activity, including vasopressin, for HMA/HMMA. Preclinical activity retained; human contribution not quantified. Acid-hydrolysed total analyte PK cannot be assigned to unconjugated compound. https://bpspubs.onlinelibrary.wiley.com/doi/10.1038/sj.bjp.0704502

#### hmea

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: primary phaseII study confirms conjugation of HMEA but no applicable free-species human terminal constant. No transfer of HMMA/HMA PK to HMEA. https://www.sciencedirect.com/science/article/abs/pii/S0378427412011137

#### hmma

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: free versus conjugated analyte mismatch remains. Human chiral phaseII study found conjugated species with free phaseI metabolites undetected; no free independent terminal constant. Need split chemical species, not total deconjugated HMMA11.5–13.5h substitution. https://www.sciencedirect.com/science/article/pii/S0090955624102395
- relevance [checked]: {"clinicalRelevance":"unknown"} → {"clinicalRelevance":"active"}. [checked] Supplement B: Forsling2002 isolated rat hypothalamus showed hormone-release activity, including vasopressin, for HMA/HMMA. Preclinical activity retained; human contribution not quantified. Acid-hydrolysed total analyte PK cannot be assigned to unconjugated compound. https://bpspubs.onlinelibrary.wiley.com/doi/10.1038/sj.bjp.0704502

#### hydromorphone_3_glucuronide

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":3.73,"max":3.88,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Supplement B: Lohela2021 normal-renal healthy control phases, HM3G terminal geometric means3.73h after oral/3.88h after IV hydromorphone. Estimated intrinsic surrogate: metabolite terminal is longer than parent3.06/2.42h, supporting slower metabolite elimination rather than demonstrably faster clearance; do not label formation-limited. Still parent-dosed apparent PK, needs direct/model-separated confirmation. Renal impairment can greatly prolong accumulation. https://pmc.ncbi.nlm.nih.gov/articles/PMC8257471/

#### hydroxyalprazolam

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Label active alpha-OH; half-life described only as similar to alprazolam. Not enough for independent numerical range or faster-than-formation assignment. https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/021434s018lbl.pdf

#### hydroxymetoprolol

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Analyte-specific human genotype study identified; numerical independent metabolite terminal table not recovered. Active beta1 effect retained; do not copy parent. https://pubmed.ncbi.nlm.nih.gov/24648255/

#### hydroxynorketamine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: direct RR-HNK healthy geometric cohort means6.67–8.18h; ketamine-formed RR/SS~14h. Queue generic hydroxynorketamine includes unspecified stereoisomers/regioisomers; do not assign one isomer range to all. Structural split/identity confirmation recommended; species-specific PK then usable. https://ascpt.onlinelibrary.wiley.com/doi/10.1002/cpt.3391
- relevance [checked]: {"clinicalRelevance":"unknown"} → {"clinicalRelevance":"active"}. [checked] Supplement B: human direct(2R,6R)-HNK Phase1 assesses CNS gamma/CSF effects; aggregate HNK must not be excluded as inactive. Clinical benefit/magnitude and other stereoisomers unresolved. https://ascpt.onlinelibrary.wiley.com/doi/10.1002/cpt.3391

#### hydroxytriazolam

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Primary predominantly conjugated urinary alpha-HT; parent2.3h not free alpha-HT terminal. Need free versus glucuronide species separation. https://pubmed.ncbi.nlm.nih.gov/6109586/

#### indole_3_acetic_acid

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: endogenous baseline and CKD-dependent protein-bound solute disposition complicate a one-compartment clearance-to-zero model. Need human incremental DMT-derived IAA kinetics, normal renal function and baseline subtraction. https://pubmed.ncbi.nlm.nih.gov/36434963/
- relevance [checked]: {"clinicalRelevance":"unknown"} → {"clinicalRelevance":"active"}. [checked] Supplement B: IAA is endogenous human plasma tryptophan/microbial metabolite, not solely administered DMT-derived. Primary CKD/cell study reports AhR-linked vascular inflammatory activity; normal baseline is not itself toxicity. Retain potential relevance pending excess-above-baseline/renal assessment. https://www.sciencedirect.com/science/article/pii/S1570023222004391 https://pubmed.ncbi.nlm.nih.gov/25145928/

#### n_desmethyldiltiazem

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: healthy single90mg primary includes N-monodesmethyl MA; exact terminal table inaccessible. MA not deacetyl M1 or deacetyl-Ndes M2; do not transfer their longer constants. Need MA numeric independent human kinetics. https://pubmed.ncbi.nlm.nih.gov/8243504/
- relevance [checked]: {"clinicalRelevance":"unknown"} → {"clinicalRelevance":"active"}. [checked] Supplement B: manufacturer Dilzem label assigns N-desmethyldiltiazem~20% parent pharmacological effect; primary CYP3A4 study also quantifies inhibition. No CYP2D6 mechanism inferred. https://labeling.pfizer.com/ShowLabeling.aspx?id=16433 https://pubmed.ncbi.nlm.nih.gov/18854379/

#### norbuprenorphine

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":43.902,"max":44.975,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":{"afterDays":null,"halfLifeHours":{"typical":57,"min":null,"max":null,"rangeType":"single-value","cv":null}}}}. [estimate] Supplement B: sponsor primary healthy naltrexone-blocked single oral RBP-6300 trial, n43/condition, terminal means43.902–44.975h over144h. Estimated transfer of formed-metabolite terminal profile to intrinsic field; no independent IV norB dose, formulation-specific formation may affect slope. https://www.clinicaltrialsregister.eu/ctr-search/trial/2012-002408-42/results Maintenance-patient primary mean57h after36days; reported22–176h individual range in later review is not independently recovered from primary full text. Chronic mean57h entered separately, onset unknown, not36days inferred onset. https://pubmed.ncbi.nlm.nih.gov/9684393/
- relevance [checked]: values retained {"clinicalRelevance":"active"}. [checked] Active opioid metabolite retained; low brain penetration is not absence of respiratory/toxic effect. Primary human maintenance PK does not establish clinical safety threshold. https://pubmed.ncbi.nlm.nih.gov/9684393/

#### norcocaine

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":2.33,"max":2.49,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Supplement B: Walsh2009 Table2 day1/day4 means2.33/2.49h following175mg oral cocaine x5 hourly in9cocaine users. Repeated-dose formed-profile proxy; not healthy single-dose direct norcocaine. Later than parent day4 2.15h, but formation contributions remain possible. No in-vitro43.2min/108min value transferred. https://www.e-lactancia.org/media/papers/CocainaBF-ExpClinPsy2010.pdf

#### norcodeine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Same primary measures NC, but2.58h is parent; no species-specific terminal constant recovered. https://pubmed.ncbi.nlm.nih.gov/1867957/

#### norhydrocodone

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Human formation/persistence known, retrieved in-vivo activity paper is preclinical; independent applicable human plasma terminal constant not recovered. Urinary8h/detection windows rejected. https://www.sciencedirect.com/science/article/pii/S0022356524288145

#### norverapamil

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Human floating-pellet abstract10.68h refers to parent verapamil, not norverapamil; label confirms pharmacological effect. Need separate norverapamil constant. https://pubmed.ncbi.nlm.nih.gov/11777750/

#### o_desmethylmetoprolol

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Same human genotype assay study; metoprolol elimination is faster than metabolites, but no usable independent numeric constant recovered. https://pubmed.ncbi.nlm.nih.gov/24648255/

#### oxymorphone_3_glucuronide

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B ranked follow-up: Healthy study measures O3G but abstract7.3–9.4h is parent oxymorphone; label90fold AUC is not elimination. Need O3G-specific PK/activity. https://pubmed.ncbi.nlm.nih.gov/15777102/

#### reduced_haloperidol

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: primary direct5mg oral RHAL healthy crossover13men samples7days located, but terminal numerical table not recovered. HAL parent18–60h and decanoate weeks are not RHAL values. Obtain direct-RHAL table/model; back-oxidation also needs coupled model. https://pubmed.ncbi.nlm.nih.gov/8359179/

#### thc_cooh

- relevance [gap]: values retained {"clinicalRelevance":"unknown"}. [gap] Supplement B: psychoactive inactivity alone does not exclude non-CB, toxic or CYP relevance. Direct-IV terminal17.6h unchanged; no detection-window substitution. Need explicit systemic safety relevance review before inactive exclusion. https://pubmed.ncbi.nlm.nih.gov/17410118/

Changed entries: 44; changed-section provenance: {"gap":33,"recall":1,"checked":9,"estimate":8}.

Validation: npm.cmd run validate passed with zero errors after this part. Unknown onset and existing alias warnings are retained and documented.

### Full residual blocker inventory, recomputed after Part 1

Sorted by products blocked across the entire library. Named intake blockers were followed by targeted high-impact opioid/benzodiazepine/stimulant/antidepressant follow-up. Unresolved prior gaps are carried forward explicitly below; this inventory does not claim every inaccessible primary table was obtained. Parent/no-data entries assigned to Part 2 are handled next. Structural/model exceptions are handled in Part 4.
- 4_hydroxyamphetamine — 7 products; active; [gap] Supplement B: no applicable human plasma terminal estimate for this analyte. Amphetamine enantiomer label half-lives and rhesus/rat hydroxymethamphetamine studies are not metabolite human PK. Need analyte-specific human plasma terminal study or documented formation limitation. https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/208147s000lbl.pdf https://pmc.ncbi.nlm.nih.gov/articles/PMC4244873/
- buprenorphine_3_glucuronide — 7 products; active; [gap] Supplement B targeted search: no B3G-specific independent human terminal constant or documented formation-limited disposition recovered. NorB-glucuronide formation-limited finding is not B3G; animal activity prevents inactive exclusion. Need human paired formation/elimination model or direct-dose PK. https://pubmed.ncbi.nlm.nih.gov/22037640/
- hydroxynorketamine — 5 products; active; [gap] Supplement B: direct RR-HNK healthy geometric cohort means6.67–8.18h; ketamine-formed RR/SS~14h. Queue generic hydroxynorketamine includes unspecified stereoisomers/regioisomers; do not assign one isomer range to all. Structural split/identity confirmation recommended; species-specific PK then usable. https://ascpt.onlinelibrary.wiley.com/doi/10.1002/cpt.3391
- 4_hydroxymethamphetamine — 3 products; unknown; [gap] Supplement B: no applicable human plasma terminal estimate for this analyte. Amphetamine enantiomer label half-lives and rhesus/rat hydroxymethamphetamine studies are not metabolite human PK. Need analyte-specific human plasma terminal study or documented formation limitation. https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/208147s000lbl.pdf https://pmc.ncbi.nlm.nih.gov/articles/PMC4244873/
- bufotenine — 3 products; active; [gap] Supplement B: primary1976 direct IV radiolabel study quantifies urinary products in2volunteers, not recoverable plasma terminal constant; modern5MeO trial often BLQ. Total urinary radioactivity recovery12h is not elimination half-life. https://www.sciencedirect.com/science/article/pii/0024320576904410 https://pubmed.ncbi.nlm.nih.gov/38616411/
- dmt_n_oxide — 3 products; unknown; [gap] Supplement B: human DMT-NO often unquantifiable in controlled trials; bioanalytical validation establishes measurement, not a reliable terminal phase. Need quantifiable analyte-specific human plasma terminal study. https://pubmed.ncbi.nlm.nih.gov/36434963/
- ethylphenidate — 3 products; active; [gap] Supplement B ranked follow-up: Primary human ethanol/MPH study confirms formation; separate EPH terminal numeric table not recovered. MPH half-life or effect duration not substituted; conditional ethanol formation needs model support. https://pubmed.ncbi.nlm.nih.gov/10820132/ https://pubmed.ncbi.nlm.nih.gov/20533759/
- hma — 3 products; active; [gap] Supplement B: free versus conjugated analyte mismatch remains. Human chiral phaseII study found conjugated species with free phaseI metabolites undetected; no free independent terminal constant. Need split chemical species, not total deconjugated HMMA11.5–13.5h substitution. https://www.sciencedirect.com/science/article/pii/S0090955624102395
- hydroxymetoprolol — 3 products; active; [gap] Supplement B ranked follow-up: Analyte-specific human genotype study identified; numerical independent metabolite terminal table not recovered. Active beta1 effect retained; do not copy parent. https://pubmed.ncbi.nlm.nih.gov/24648255/
- indole_3_acetic_acid — 3 products; active; [gap] Supplement B: endogenous baseline and CKD-dependent protein-bound solute disposition complicate a one-compartment clearance-to-zero model. Need human incremental DMT-derived IAA kinetics, normal renal function and baseline subtraction. https://pubmed.ncbi.nlm.nih.gov/36434963/
- n_desmethyldiltiazem — 3 products; active; [gap] Supplement B: healthy single90mg primary includes N-monodesmethyl MA; exact terminal table inaccessible. MA not deacetyl M1 or deacetyl-Ndes M2; do not transfer their longer constants. Need MA numeric independent human kinetics. https://pubmed.ncbi.nlm.nih.gov/8243504/
- norverapamil — 3 products; active; [gap] Supplement B ranked follow-up: Human floating-pellet abstract10.68h refers to parent verapamil, not norverapamil; label confirms pharmacological effect. Need separate norverapamil constant. https://pubmed.ncbi.nlm.nih.gov/11777750/
- o_desmethylmetoprolol — 3 products; unknown; [gap] Supplement B ranked follow-up: Same human genotype assay study; metoprolol elimination is faster than metabolites, but no usable independent numeric constant recovered. https://pubmed.ncbi.nlm.nih.gov/24648255/
- oxymorphone_3_glucuronide — 3 products; unknown; [gap] Supplement B ranked follow-up: Healthy study measures O3G but abstract7.3–9.4h is parent oxymorphone; label90fold AUC is not elimination. Need O3G-specific PK/activity. https://pubmed.ncbi.nlm.nih.gov/15777102/
- reduced_haloperidol — 3 products; active; [gap] Supplement B: primary direct5mg oral RHAL healthy crossover13men samples7days located, but terminal numerical table not recovered. HAL parent18–60h and decanoate weeks are not RHAL values. Obtain direct-RHAL table/model; back-oxidation also needs coupled model. https://pubmed.ncbi.nlm.nih.gov/8359179/
- 10_hydroxynortriptyline — 2 products; active; [gap] Supplement B ranked follow-up: Direct racemic E-10OH-NT primary gives8–9h enantiomer half-lives. Queue lacks E/Z identity; cannot assign E isomer to unspecified aggregate without reviewer identity decision. https://pubmed.ncbi.nlm.nih.gov/2731406/
- 11_oh_delta8_thc — 2 products; active; [gap] 11_oh_delta8_thc: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 2_ene_vpa — 2 products; active; [gap] 2_ene_vpa: category blocker follow-up searched human metabolite PK; no verified applicable terminal value recovered. Parent half-life and metabolite spot concentrations are insufficient. Direct human PK or documented formation limitation would resolve this blocker.
- 2_hydroxydesipramine — 2 products; active; [gap] Supplement B ranked follow-up: Hydroxymetabolite pharmacology not equivalent to inactivity. Direct independent human terminal constant not recovered from targeted study search. https://pubmed.ncbi.nlm.nih.gov/7712660/
- 2_oxo_3_hydroxy_lsd — 2 products; unknown; [gap] 2_oxo_3_hydroxy_lsd: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 3_hydroxyguanfacine — 2 products; unknown; [gap] 3_hydroxyguanfacine: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- 4_ene_vpa — 2 products; active; [gap] 4_ene_vpa: category blocker follow-up searched human metabolite PK; no verified applicable terminal value recovered. Parent half-life and metabolite spot concentrations are insufficient. Direct human PK or documented formation limitation would resolve this blocker.
- 4_hydroxyalprazolam — 2 products; active; [gap] Supplement B ranked follow-up: Label active4OH; lower potency/concentrations do not establish irrelevance. Similar-to-parent wording not a metabolite-specific terminal constant. https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/021434s018lbl.pdf
- 4_hydroxypropranolol — 2 products; active; [gap] 4_hydroxypropranolol: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- 7_hydroxychlorpromazine — 2 products; active; [gap] 7_hydroxychlorpromazine: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- 7_hydroxyfluphenazine — 2 products; active; [gap] 7_hydroxyfluphenazine: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- 7_hydroxymitragynine — 2 products; active; [gap] Huestis 2024 Tables 4: formed 7OH means 1.7-4.7 h single / 2.4-24.7 h after 15 doses (observed 1.0-11.4 / 1.1-71.6 h). Huestis 2026 extract Table 2: means 2.4-6.0 / 2.9-55.0 h; highest repeated-dose range 6.1-109 h. All followed mitragynine-containing products, not isolated 7OH. Formation, nonlinear parent disposition and assay sensitivity may drive terminal slopes; not defensible as a shared intrinsic constant for directly dosed 7OH and formed metabolite. Need direct human 7OH PK or model separation; no automatic formation-limited mode. https://doi.org/10.3390/molecules29050984 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC13313158/
- delta8_thc — 2 products; active; [gap] delta8_thc: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- delta8_thc_cooh — 2 products; unknown; [gap] delta8_thc_cooh: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- desmethylazithromycin — 2 products; unknown; [gap] SmPC confirms microbiological inactivity but not systemic safety/CYP exclusion. Specific metabolite identity/independent plasma PK still needed. https://www.geneesmiddeleninformatiebank.nl/smpc/h110860_smpc_en.pdf
- fluphenazine_sulfoxide — 2 products; active; [gap] fluphenazine_sulfoxide: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- furosemide_glucuronide — 2 products; unknown; [gap] furosemide_glucuronide: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- hpph — 2 products; unknown; [gap] hpph: category blocker follow-up searched human metabolite PK; no verified applicable terminal value recovered. Parent half-life and metabolite spot concentrations are insufficient. Direct human PK or documented formation limitation would resolve this blocker.
- hydroxyalprazolam — 2 products; active; [gap] Supplement B ranked follow-up: Label active alpha-OH; half-life described only as similar to alprazolam. Not enough for independent numerical range or faster-than-formation assignment. https://www.accessdata.fda.gov/drugsatfda_docs/label/2021/021434s018lbl.pdf
- mesembrine — 2 products; active; [gap] Ranked follow-up: Meyer2015 studies rat urine/human-liver preparations, not human dosing PK. Patent animal profiles and porcine permeability cannot supply human plasma half-life. https://pubmed.ncbi.nlm.nih.gov/25240931/
- mitragynine_pseudoindoxyl — 2 products; active; [gap] Supplement A: Kamble et al. human-plasma experiments show formation of potent pseudoindoxyl from 7OH, not in-vivo human terminal PK. Neither incubation disappearance nor animal analgesic duration establishes human half-life. Need human plasma time course with analyte stability controlled and separated formation/clearance. https://pmc.ncbi.nlm.nih.gov/articles/PMC7737207/
- n_depropylpropafenone — 2 products; active; [gap] n_depropylpropafenone: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- n_desmethylerythromycin — 2 products; active; [gap] Primary CYP3A4 inhibition study supplies functional relevance, not human independent PK. Parent1.8/2.6h repeated-dose study does not quantify this metabolite. https://pubmed.ncbi.nlm.nih.gov/18854379/ https://pubmed.ncbi.nlm.nih.gov/915023/
- napqi — 2 products; active; [gap] Follow-up found~1min in model/microsomal context, not defensible human plasma intrinsic constant. Reactive intermediate/overdose-dependent detoxification needs clinical handling; retain unknown kinetics. https://pmc.ncbi.nlm.nih.gov/articles/PMC12823458/
- nor_lsd — 2 products; unknown; [gap] nor_lsd: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- norhydrocodone — 2 products; unknown; [gap] Supplement B ranked follow-up: Human formation/persistence known, retrieved in-vivo activity paper is preclinical; independent applicable human plasma terminal constant not recovered. Urinary8h/detection windows rejected. https://www.sciencedirect.com/science/article/pii/S0022356524288145
- noribogaine_glucuronide — 2 products; unknown; [gap] NIG quantified in human Knuijver 2024 PK study but no directly usable molecule-specific terminal half-life or clearance-faster-than-formation evidence extracted. Peak time is not half-life. Unknown retained; no automatic conjugate-name formation-limited assignment. https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873
- o_desmethylmesembrine — 2 products; unknown; [gap] Ranked follow-up: Meyer2015 studies rat urine/human-liver preparations, not human dosing PK. Patent animal profiles and porcine permeability cannot supply human plasma half-life. https://pubmed.ncbi.nlm.nih.gov/25240931/
- pchp — 2 products; unknown; [gap] pchp: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- ppc — 2 products; unknown; [gap] ppc: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- salvinorin_a — 2 products; active; [gap] salvinorin_a: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- salvinorin_b — 2 products; unknown; [gap] salvinorin_b: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 10_hydroxyamitriptyline — 1 products; active; [gap] Supplement B ranked follow-up: Primary stable-isotope assay confirms unconjugated/conjugated hydroxymetabolites persist72h but sparse concentrations not enough to infer terminal slope. https://pubmed.ncbi.nlm.nih.gov/376209/
- 1p_lsd — 1 products; active; [gap] Two-volunteer primary oral/IV study supports rapid conversion to LSD; 6.4 h terminal value describes FORMED LSD, not unchanged 1P-LSD. No parent constant inferred from detection duration. https://researchonline.ljmu.ac.uk/id/eprint/12928/ Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 25_desacetylrifampin — 1 products; active; [gap] Healthy population model identified, numeric independent terminal constant not extracted. Rifapentine17–23h search hits are another parent/metabolite pair and rejected. https://pubmed.ncbi.nlm.nih.gov/26342028/
- 2_hydroxyimipramine — 1 products; active; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- 3_4_catechol_pv — 1 products; unknown; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- 3_methoxymorphinan — 1 products; unknown; [gap] Supplement A: Need human unconjugated plasma terminal PK, not urinary identification or formation clearance. Earlier evidence: [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- 4_bromo_2_5_dimethoxyphenylacetic_acid — 1 products; unknown; [gap] 4_bromo_2_5_dimethoxyphenylacetic_acid: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 4_hiaa — 1 products; unknown; [gap] 4_hiaa: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- 4_hydroxyduloxetine_glucuronide — 1 products; unknown; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- 4_hydroxynebivolol — 1 products; active; [gap] 4_hydroxynebivolol: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- 4_hydroxyphenyl_carvedilol — 1 products; active; [gap] 4_hydroxyphenyl_carvedilol: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- 4_hydroxytamoxifen — 1 products; active; [gap] Topical4OH studies and vague shorter-than-parent summaries do not supply an applicable systemic independent terminal constant; active retained. https://pubmed.ncbi.nlm.nih.gov/2702659
- 4_hydroxytolyl_mephedrone — 1 products; active; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- 4_oh_3_meo_pv — 1 products; unknown; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- 5_htp — 1 products; active; [gap] Both healthy2.2–7.4h and older IV~6h studies used carbidopa; standalone challenge study confirms major carbidopa effect but standalone numeric terminal not recovered. https://pubmed.ncbi.nlm.nih.gov/6187038/ https://pubmed.ncbi.nlm.nih.gov/311987/ https://pubmed.ncbi.nlm.nih.gov/11910264/
- 6_hydroxymelatonin — 1 products; unknown; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- 7_aminoclonazepam — 1 products; unknown; [gap] Supplement B ranked follow-up: No reliable plasma terminal constant recovered; urine marker detection does not quantify kinetics or establish absence of all receptor/toxic activity. 
- 8_hydroxyefavirenz — 1 products; active; [gap] Neuronal toxicity confirmed; human single-dose independent plasma terminal not established. Parent52–76h not copied. https://pubmed.ncbi.nlm.nih.gov/22984227/
- 8_hydroxymirtazapine — 1 products; unknown; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- 9_o_demethylmitragynine — 1 products; unknown; [gap] Supplement A: Melchert et al. 2024, doi:10.1016/j.cbi.2024.111247, human liver S9 formation experiments do not supply in-vivo human terminal elimination. Need controlled human plasma PK or a validated formation/clearance model; in-vitro formation percentages cannot substitute. https://pmc.ncbi.nlm.nih.gov/articles/PMC11579903/
- acetaldehyde — 1 products; active; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- adb_butinaca — 1 products; active; [gap] adb_butinaca: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- bromazolam — 1 products; active; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- carfentanil — 1 products; active; [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- clopidogrel_acyl_glucuronide — 1 products; active; [gap] Ranked follow-up: EMA8h “main inactive circulating metabolite” describes carboxylic acid, not this CYP2C8-inactivating acyl glucuronide. Do not transfer8h or assume formation-limited conjugation. Need human analyte-specific terminal profile. https://www.ema.europa.eu/en/documents/product-information/clopidogrel-hcs-epar-product-information_en.pdf https://pubmed.ncbi.nlm.nih.gov/24971633/
- clorazepate — 1 products; active; [gap] Supplement A: Need presystemic conversion/input model. Essentially absent circulating parent does not justify zero or a guessed short positive half-life. Earlier evidence: [gap] DailyMed Clinical Pharmacology: rapid presystemic conversion to nordiazepam, essentially no circulating parent. Metabolite 40-50 h is not parent intrinsic clearance. No artificial small positive conversion half-life; parent unknown, prodrug input unresolved. https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=2d592a27-f4cf-008a-e063-6394a90a2629&type=display
- codeine_6_glucuronide — 1 products; active; [gap] Supplement B ranked follow-up: Primary14healthy single50mgcodeine measures C6G; abstract2.58h is CODEINE. Need separate C6G table/model; do not copy. https://pubmed.ncbi.nlm.nih.gov/1867957/
- cvt_2738 — 1 products; unknown; [gap] cvt_2738: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- demoxepam — 1 products; active; [gap] Supplement B ranked follow-up: Primary3healthy accumulation half-times21.1/34.2/78.5h under parent dosing are not independent terminal elimination; formation and accumulation remain coupled. https://pubmed.ncbi.nlm.nih.gov/700911/
- desethylhydroxychloroquine — 1 products; active; [gap] Linked human PBPK study located but independent plasma elimination not extracted. Chloroquine/desethylchloroquine values are different compounds and rejected. https://pmc.ncbi.nlm.nih.gov/articles/PMC10339702/
- desmethylchlordiazepoxide — 1 products; active; [gap] Supplement B ranked follow-up: Primary accumulation half-times9.9–17.7h, not independent single-dose terminal; coupled formation requires model separation. https://pubmed.ncbi.nlm.nih.gov/700911/
- desmethylcitalopram — 1 products; active; [gap] Supplement B ranked follow-up: Label steady-state exposure~one-half parent does not establish half-life; independent metabolite PK needed. https://www.accessdata.fda.gov/drugsatfda_docs/label/2017/020822s047lbl.pdf
- desmethylcyclobenzaprine — 1 products; unknown; [gap] Follow-up primary cyclobenzaprine PK paper gives parent effective18h, not independent N-desmethyl constant. Activity and PK need separate assessment. https://pubmed.ncbi.nlm.nih.gov/11808825/
- didesmethylcitalopram — 1 products; active; [gap] Supplement B ranked follow-up: Label steady-state exposure~one-tenth parent is not half-life; low exposure does not exclude QT relevance. https://www.accessdata.fda.gov/drugsatfda_docs/label/2017/020822s047lbl.pdf
- eddp — 1 products; unknown; [gap] Supplement A: no independent species-specific healthy-adult terminal elimination half-life established. Methadone half-life, urine detection and day-21 EDDP concentration are not metabolite half-life. Need plasma terminal PK with adequate washout separating continuing parent formation. https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/j.1365-2125.2004.02116.x
- emdp — 1 products; unknown; [gap] Supplement A: no independent species-specific healthy-adult terminal elimination half-life established. Methadone half-life, urine detection and day-21 EDDP concentration are not metabolite half-life. Need plasma terminal PK with adequate washout separating continuing parent formation. https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/j.1365-2125.2004.02116.x
- ethanol — 1 products; active; [gap] Supplement A: Concentration-dependent/zero-order human elimination requires compatible nonlinear model; no fabricated first-order constant. Earlier evidence: [gap] Primary human elimination study abstract supports zero-order kinetics at studied concentrations; no concentration-independent half-life for a fixed first-order model. Unknown rather than fabricated equivalent. https://pubmed.ncbi.nlm.nih.gov/6745819/
- flubromazolam — 1 products; active; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- gbl — 1 products; active; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- harmaline — 1 products; active; [gap] harmaline: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- harmalol — 1 products; unknown; [gap] harmalol: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- harmine — 1 products; active; [gap] harmine: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- harmol — 1 products; active; [gap] harmol: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- hmea — 1 products; unknown; [gap] Supplement B: primary phaseII study confirms conjugation of HMEA but no applicable free-species human terminal constant. No transfer of HMMA/HMA PK to HMEA. https://www.sciencedirect.com/science/article/abs/pii/S0378427412011137
- hmma — 1 products; active; [gap] Supplement B: free versus conjugated analyte mismatch remains. Human chiral phaseII study found conjugated species with free phaseI metabolites undetected; no free independent terminal constant. Need split chemical species, not total deconjugated HMMA11.5–13.5h substitution. https://www.sciencedirect.com/science/article/pii/S0090955624102395
- hydroxytriazolam — 1 products; active; [gap] Supplement B ranked follow-up: Primary predominantly conjugated urinary alpha-HT; parent2.3h not free alpha-HT terminal. Need free versus glucuronide species separation. https://pubmed.ncbi.nlm.nih.gov/6109586/
- ibotenic_acid — 1 products; active; [gap] ibotenic_acid: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- id_14283 — 1 products; active; [gap] id_14283: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- isocarboxazid — 1 products; active; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- isotonitazene — 1 products; active; [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- kavalactones — 1 products; active; [gap] Mixture of six kavalactones with differing kinetics; 9 h for kavain cannot represent all kavalactones. Human multi-analyte study confirms heterogeneous exposure and poor quantification of desmethoxyyangonin; split needed before a defensible compound-level constant. https://pubmed.ncbi.nlm.nih.gov/35777607/ Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- l_tryptophan — 1 products; active; [gap] Loading-study kinetics depend on basal endogenous subtraction. Green1985 explicitly discusses half-time calculations including basal levels. No universal standalone excess-plasma half-life confirmed;2h secondary or15.8h old summaries not adopted. https://onlinelibrary.wiley.com/doi/pdfdirect/10.1111/j.1365-2125.1985.tb05070.x
- levorphanol_3_glucuronide — 1 products; unknown; [gap] V2 audit of levorphanol_3_glucuronide: automatic conjugate-name heuristic is insufficient to establish clearance faster than formation in humans, or the simulation assumption of one-tenth of the fastest parent half-life. No compound-specific paired human parent/metabolite clearance evidence confirmed in this pass. Reverted formation-limited to unknown; numeric kinetics null. This does not exclude formation-limited disposition. Renal impairment can materially alter conjugate clearance. Original formedFrom topology preserved.
- mdmb_4en_pinaca — 1 products; active; [gap] mdmb_4en_pinaca: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- mdmb_4en_pinaca_butanoic_acid — 1 products; unknown; [gap] mdmb_4en_pinaca_butanoic_acid: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- mdpv — 1 products; active; [gap] Analytical paper validates human/rat matrices but kinetic examples are preclinical; no healthy human terminal constant established. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- mesoridazine — 1 products; active; [gap] mesoridazine: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- meta_o_dealkylated_flecainide — 1 products; active; [gap] meta_o_dealkylated_flecainide: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- methoxetamine — 1 products; active; [gap] Federal Register/HHS assessment states no controlled clinical plasma PK/half-life characterised; subsequent targeted search did not recover applicable human data. Do not use user-reported3–6 h effect duration as half-life or ketamine analogue kinetics. https://www.govinfo.gov/content/pkg/FR-2021-12-07/pdf/2021-26293.pdf Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- mono_n_dealkyldisopyramide — 1 products; unknown; [gap] mono_n_dealkyldisopyramide: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- muscimol — 1 products; active; [gap] muscimol: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- n_desethyl_isotonitazene — 1 products; active; [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- n_desmethyldiphenhydramine — 1 products; unknown; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- n_desmethyldoxylamine — 1 products; unknown; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- n_desmethylloperamide — 1 products; unknown; [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- n_desmethylmirtazapine — 1 products; active; [gap] Supplement A: Literature mentions 25 h, but no primary healthy-single-dose cohort/dispersion confirmed; poisoning tissue-distribution report does not establish that measurement. Earlier evidence: [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- nitrous_oxide — 1 products; active; [gap] nitrous_oxide: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- norcarfentanil — 1 products; unknown; [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination.
- norclozapine — 1 products; active; [gap] norclozapine: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.
- norcodeine — 1 products; unknown; [gap] Supplement B ranked follow-up: Same primary measures NC, but2.58h is parent; no species-specific terminal constant recovered. https://pubmed.ncbi.nlm.nih.gov/1867957/
- normephedrone — 1 products; active; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- normethoxetamine — 1 products; unknown; [gap] normethoxetamine: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- o_desmethyl_mxe — 1 products; unknown; [gap] o_desmethyl_mxe: no applicable healthy-adult single-dose terminal plasma half-life established in this pass. No parent/metabolite, detection-window or animal value substituted. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- oh_alpha_pvp — 1 products; unknown; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- phenibut — 1 products; active; [gap] No usable healthy-adult terminal mean/median and dispersion retrieved. Unknown kinetics/null is not rapid or absent elimination.
- phenylacetic_acid — 1 products; unknown; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- phenylethylidenehydrazine — 1 products; active; [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- psilocin_o_glucuronide — 1 products; unknown; [gap] V2 audit of psilocin_o_glucuronide: automatic conjugate-name heuristic is insufficient to establish clearance faster than formation in humans, or the simulation assumption of one-tenth of the fastest parent half-life. No compound-specific paired human parent/metabolite clearance evidence confirmed in this pass. Reverted formation-limited to unknown; numeric kinetics null. This does not exclude formation-limited disposition. Renal impairment can materially alter conjugate clearance. Original formedFrom topology preserved. Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- psilocybin — 1 products; active; [gap] Rapid prodrug dephosphorylation; most human published half-lives are PSILOCIN, not unchanged psilocybin. No unchanged-parent plasma terminal constant recovered. Graph needs clinician review rather than copying psilocin kinetics. https://doi.org/10.1016/j.jchromb.2020.122486 Ranked follow-up: no defensible applicable independent human terminal plasma value recovered. Resolve with analyte-specific human PK, documented formation limitation, or evidence establishing irrelevance; no animal/detection/effect-duration substitution.
- pvp — 1 products; active; [gap] Available human study measures urine/oral fluid; 22 h urinary tail is not a plasma constant; rat plasma values not transferred. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- pvp_lactam — 1 products; unknown; [gap] Primary studies establish formation/activity or detection, but no applicable human independent terminal plasma value recovered; neither detection window nor related compound kinetics substituted. Direct human PK or documented formation-limited disposition is needed to resolve this blocker.
- s_18982 — 1 products; active; [gap] s_18982: ranked category follow-up did not recover a defensible species-specific human terminal plasma constant. “Similar to parent”, pooled metabolite6–22h, unknown isomers, urinary recovery and another metabolite8h are insufficient. Direct human PK or documented formation-limited behavior would resolve; do not infer from lower potency.
- s_desmethylcitalopram — 1 products; active; [gap] Supplement A: Need primary S-enantiomer-specific terminal PK, separating single and chronic dosing; racemate mean cannot be copied. Earlier evidence: [gap] No molecule-specific healthy-adult single-dose terminal half-life confirmed; mode remains unknown. No half-life inferred from detection windows, parent clearance, or therapeutic duration.
- sulforidazine — 1 products; active; [gap] sulforidazine: ranked blocker follow-up did not establish an applicable human independent terminal plasma constant. Parent half-life, depot tail and animal kinetics are not defensible substitutes; obtain direct metabolite PK or documented formation-limited behavior. Activity is retained rather than excluded to make status green.

## Part 2 — No-data primary compounds and model exceptions

Priority order completed from concentrated 7OH through ibotenic acid, followed by the mandated notes-only exceptions. No healthy isolated-7OH constant is inferred from formed kratom metabolite slopes (2026 repeated-dose mean reaches 55 h, materially longer than 2024 24.7 h). Harmine/harmaline now use primary human mixture-dosing data and reversible MAO-A notes; no fixed safe interval inferred. Phenibut, bromazolam, flubromazolam and carfentanil values are provisional estimate-tagged serum/whole-blood case proxies, explicitly distinguished from healthy-adult plasma PK. Phenibut 5.3 h is not independently primary-traceable according to WHO and is not assigned. Salvinorin-A uses checked human vaporized-drug terminal means. All unsupported parents and metabolites remain gaps; no topology changes or recreational default amounts were made. Each affected product is listed below with its retained input and linked primary assessment. Psilocybin/1P-LSD conversion, ethanol rates, nitrous functional B12 injury, and endogenous-precursor serotonergic effects are notes only. Isocarboxazid's 14-day labeled interaction interval is not entered as an individually measured enzyme-recovery duration.

### Product status checkpoint

| Category | Computable before → after | Incomplete before → after | No data before → after |
|---|---:|---:|---:|
| opioids | 28 → 29 | 18 → 18 | 3 → 2 |
| sedatives | 33 → 36 | 8 → 8 | 6 → 3 |
| antidepressants | 27 → 27 | 9 → 9 | 1 → 1 |
| antipsychotics | 21 → 21 | 10 → 10 | 0 → 0 |
| mood_anticonvulsants | 11 → 11 | 4 → 4 | 0 → 0 |
| stimulants | 14 → 14 | 11 → 11 | 2 → 2 |
| psychedelics_dissociatives | 7 → 7 | 20 → 24 | 16 → 12 |
| cardiovascular | 24 → 24 | 24 → 24 | 0 → 0 |
| other_interactors | 30 → 30 | 11 → 11 | 2 → 2 |
| **Overall** | 195 → 199 | 115 → 119 | 30 → 22 |

### Entry changes and evidence


#### 11_oh_delta8_thc

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] 2025 within-subject oral delta8/delta9 human trial provides acute whole-blood exposure and effects, with 8 h observation insufficient to confirm a slow terminal plasma phase for this analyte. No applicable independent human terminal constant recovered. Delta8-THCV is a different molecule; delta9 kinetics not copied. https://pubmed.ncbi.nlm.nih.gov/40288059/

#### 1p_lsd

- halfLife [checked]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [checked] Primary 2020 two-volunteer oral/IV study found oral 1P-LSD rapidly converted to LSD (unchanged oral prodrug not detected). Reported LSD elimination is not unchanged 1P-LSD half-life. No numerical parent half-life assigned; active-component mass conversion needs reviewer approval. https://pubmed.ncbi.nlm.nih.gov/32415750/

#### 5_htp

- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":""}} → {"lingeringEffects":{"durationDays":null,"note":"Endogenous serotonin precursor; supplement exposure plus serotonergic medicines can increase serotonergic toxicity risk. Primary sertraline/5HTP case reported serotonin syndrome with rhabdomyolysis; multiple supplements and self-adjusted medication limit causal quantification. No generic post-clearance duration or ibogaine washout inferred. No half-life populated per Supplement B. https://pmc.ncbi.nlm.nih.gov/articles/PMC5580516/"}}. [checked] Endogenous serotonin precursor; supplement exposure plus serotonergic medicines can increase serotonergic toxicity risk. Primary sertraline/5HTP case reported serotonin syndrome with rhabdomyolysis; multiple supplements and self-adjusted medication limit causal quantification. No generic post-clearance duration or ibogaine washout inferred. No half-life populated per Supplement B. https://pmc.ncbi.nlm.nih.gov/articles/PMC5580516/

#### 7_hydroxymitragynine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Supplement B: healthy-human kratom studies measured formed 7OH after mitragynine products, not isolated concentrated 7OH. 2024 reported single-dose cohort means 1.7–4.7 h and repeated-dose 2.4–24.7 h; 2026 Table 2 gives 2.4–6.0 h single and 2.9–55.0 h repeated (highest-dose individual range 6.1–109 h), steady state days 7/9. These apparent slopes can reflect formation, dose, assay sensitivity and parent disposition; no shared intrinsic constant defensibly established for directly dosed and formed 7OH. Retain unknown; reviewer needs direct 7OH human PK or separated formation/elimination model. https://doi.org/10.3390/molecules29050984 https://academic.oup.com/jat/article/50/6/bkag042/8704792

#### adb_butinaca

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] No applicable serial human terminal plasma constant recovered. Human forensic concentrations/analytical detection and in-vitro turnover do not establish in-vivo terminal half-life. ADB-BINACA/ADB-4en-PINACA are different identities from ADB-BUTINACA; no mouse or microsomal value substituted. https://pmc.ncbi.nlm.nih.gov/articles/PMC10458319/

#### bromazolam

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":31,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Provisional toxic-exposure serum proxy: 2025 primary case report, five serum samples over 204 h after encapsulated pure bromazolam overdose, estimated half-life 31 h. Single poisoning case, not healthy-adult terminal mean or population bounds. No detection-window substitution. https://www.sciencedirect.com/science/article/pii/S2665910725000283

#### carfentanil

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":5.7,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Uddayasankar 2018 recreational exposure case: modeled three timed whole-blood samples; carfentanil 5.7 h, norcarfentanil 11.8 h. Single critically ill toxic-exposure patient; provisional whole-blood proxy, not healthy plasma population terminal kinetics. Metabolite relevance not inferred from half-life. https://pubmed.ncbi.nlm.nih.gov/29679387/

#### clorazepate

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] DailyMed clorazepate Clinical Pharmacology: rapid presystemic decarboxylation to nordiazepam; essentially no circulating parent. Reported 40–50 h belongs to nordiazepam, not clorazepate. Parent remains unknown without invented small conversion half-life. Recommend active-component/prodrug mass conversion in Part 4; no graph edits. https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6e9edbfc-1950-4893-9d38-e82b119ddb9a

#### delta8_thc

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] 2025 within-subject oral delta8/delta9 human trial provides acute whole-blood exposure and effects, with 8 h observation insufficient to confirm a slow terminal plasma phase for this analyte. No applicable independent human terminal constant recovered. Delta8-THCV is a different molecule; delta9 kinetics not copied. https://pubmed.ncbi.nlm.nih.gov/40288059/

#### delta8_thc_cooh

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] 2025 within-subject oral delta8/delta9 human trial provides acute whole-blood exposure and effects, with 8 h observation insufficient to confirm a slow terminal plasma phase for this analyte. No applicable independent human terminal constant recovered. Delta8-THCV is a different molecule; delta9 kinetics not copied. https://pubmed.ncbi.nlm.nih.gov/40288059/

#### ethanol

- halfLife [estimate]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [estimate] No exponential half-life assigned. Concentration-dependent saturable elimination is approximately zero-order at customary intoxicating blood levels. Primary Jones 1993 healthy fasting study reports low elimination near 9 mg/dL/h. Typical 10–20 mg/dL/h is recalled contextual range, varies with food, drinking history, dose and concentration; reviewer must verify an individual rate. A constant fractional half-life cannot represent a BAC subtraction rate. https://pubmed.ncbi.nlm.nih.gov/8426147/

#### flubromazolam

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":10,"max":20,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Huppertz et al., basic PK self-experiment, one author ingested 0.5 mg; terminal serum half-life estimated 10–20 h. Range-only; no invented midpoint. Small preliminary study, not population bounds; urine detection 6.5/8 days is not half-life. https://pubmed.ncbi.nlm.nih.gov/28378533/

#### gbl

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Human two-volunteer GBL ingestion experiment measured GHB kinetics, not a usable unchanged-GBL terminal constant. Rapid GBL-to-GHB conversion needs a prodrug/input representation. Do not assign GHB half-life, rat GBL <1 min, or analytical acid conversion as human parent clearance. https://pubmed.ncbi.nlm.nih.gov/23733593/

#### harmaline

- halfLife [checked]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":1.95,"max":2.01,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}}. [checked] Riba 2003 Table 4, oral ayahuasca crossover: harmaline terminal plasma means 2.01 (SD .56) and 1.95 (SD .81) h, 15 volunteers in PK analysis. Range of dose-condition means, not individual bounds. Mixture/coadministration data; no transfer of Callaway harmine value. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf
- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":""}} → {"lingeringEffects":{"durationDays":null,"note":"Riba 2003 describes harmine/harmaline as reversible MAO inhibitors, with MAO-A inhibition central to ayahuasca DMT oral activity. Reversible inhibition is exposure-dependent; plasma disappearance alone does not establish an ibogaine interaction interval. No validated patient-specific recovery/washout duration found; duration null, not zero. Do not import the 14-day irreversible-MAOI rule as measured harmala recovery. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf"}}. [checked] Riba 2003 describes harmine/harmaline as reversible MAO inhibitors, with MAO-A inhibition central to ayahuasca DMT oral activity. Reversible inhibition is exposure-dependent; plasma disappearance alone does not establish an ibogaine interaction interval. No validated patient-specific recovery/washout duration found; duration null, not zero. Do not import the 14-day irreversible-MAOI rule as measured harmala recovery. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf

#### harmalol

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Riba 2003 Table 4 reports apparent formed-metabolite plasma slopes (harmol means 1.49–1.64 h; harmalol 30.33–48.64 h from 8 h sampling). Free versus conjugated analyte applicability and independent elimination need resolution, particularly extrapolated long harmalol tail. Not assigned as intrinsic clearance or automatic formation limitation. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf

#### harmine

- halfLife [checked]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":1.9266666666666665,"min":null,"max":null,"rangeType":"cv","cv":0.5198961937716263},"earlyPhase":null,"steadyState":null}}. [checked] Callaway 1999 Table 2, plasma after oral hoasca in healthy experienced users: harmine mean 115.6 min, SD 60.1, n=14. Hours and CV converted arithmetically. Mixture/coadministration evidence, not pure isolated harmine; 2003 Riba study often could not quantify harmine. https://wiki.dmt-nexus.me/w/images/2/26/pharmacokinetics_of_hoasca_in_healthy_humans.pdf
- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":""}} → {"lingeringEffects":{"durationDays":null,"note":"Riba 2003 describes harmine/harmaline as reversible MAO inhibitors, with MAO-A inhibition central to ayahuasca DMT oral activity. Reversible inhibition is exposure-dependent; plasma disappearance alone does not establish an ibogaine interaction interval. No validated patient-specific recovery/washout duration found; duration null, not zero. Do not import the 14-day irreversible-MAOI rule as measured harmala recovery. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf"}}. [checked] Riba 2003 describes harmine/harmaline as reversible MAO inhibitors, with MAO-A inhibition central to ayahuasca DMT oral activity. Reversible inhibition is exposure-dependent; plasma disappearance alone does not establish an ibogaine interaction interval. No validated patient-specific recovery/washout duration found; duration null, not zero. Do not import the 14-day irreversible-MAOI rule as measured harmala recovery. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf

#### harmol

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Riba 2003 Table 4 reports apparent formed-metabolite plasma slopes (harmol means 1.49–1.64 h; harmalol 30.33–48.64 h from 8 h sampling). Free versus conjugated analyte applicability and independent elimination need resolution, particularly extrapolated long harmalol tail. Not assigned as intrinsic clearance or automatic formation limitation. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf

#### ibotenic_acid

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Primary human plasma analytical-method publication establishes measurement, not an applicable serial human terminal PK estimate. Amanita effects and urinary recovery are not half-lives. Active ibotenic acid and muscimol remain represented; no automatic inactive exclusion. https://pubmed.ncbi.nlm.nih.gov/32361630/

#### isocarboxazid

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Marplan label does not establish an applicable healthy unchanged-parent terminal plasma constant; published 1.5–4 h analogue-based suggestions not assigned. Persistent MAO inhibition is represented separately in lingeringEffects. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5
- lingeringEffects [estimate]: {"lingeringEffects":{"durationDays":null,"note":"Irreversible MAO inhibition can outlast plasma drug; enzyme resynthesis governs recovery. No patient-specific recovery duration inferred."}} → {"lingeringEffects":{"durationDays":null,"note":"Irreversible MAO inhibition outlasts circulating drug and requires enzyme resynthesis (mechanistic interpretation). Marplan label prohibits SSRIs within 14 days after discontinuation and gives at least 14 days before bupropion. This is a labeled interaction interval, not a measured individual enzyme-recovery half-life or guaranteed ibogaine-safe date; quantitative recovery duration remains null. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5"}}. [estimate] Irreversible MAO inhibition outlasts circulating drug and requires enzyme resynthesis (mechanistic interpretation). Marplan label prohibits SSRIs within 14 days after discontinuation and gives at least 14 days before bupropion. This is a labeled interaction interval, not a measured individual enzyme-recovery half-life or guaranteed ibogaine-safe date; quantitative recovery duration remains null. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5

#### isotonitazene

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Human forensic metabolism/urine and in-vitro studies establish analytes but no applicable serial human terminal plasma constant recovered. No microsomal, rat, related-nitazene or postmortem value transferred. Potency of parent/metabolites does not establish persistence. https://pubmed.ncbi.nlm.nih.gov/38582802/

#### kavalactones

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Primary healthy-human study quantifies six distinct kavalactones after kava extract; pooled kavalactones is not one molecular species. A kavain half-life cannot represent the mixture. Keep unknown pending reviewer component split/standardized product amounts. https://pubmed.ncbi.nlm.nih.gov/35777607/

#### l_tryptophan

- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":""}} → {"lingeringEffects":{"durationDays":null,"note":"Endogenous amino-acid precursor of serotonin; basal pool, ongoing synthesis and co-medications make a simple excess-dose clearance date inadequate. Marplan label warns against coadministration with tryptophan because of hypertension and related symptoms. No universal serotonergic interaction duration inferred; no half-life populated per Supplement B. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5"}}. [checked] Endogenous amino-acid precursor of serotonin; basal pool, ongoing synthesis and co-medications make a simple excess-dose clearance date inadequate. Marplan label warns against coadministration with tryptophan because of hypertension and related symptoms. No universal serotonergic interaction duration inferred; no half-life populated per Supplement B. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5

#### mdmb_4en_pinaca

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] No applicable serial human terminal plasma constant recovered. Human forensic concentrations/analytical detection and in-vitro turnover do not establish in-vivo terminal half-life. ADB-BINACA/ADB-4en-PINACA are different identities from ADB-BUTINACA; no mouse or microsomal value substituted. https://pmc.ncbi.nlm.nih.gov/articles/PMC10458319/

#### mdpv

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] No applicable serial human terminal plasma constant recovered. Primary preclinical PK uses rats; 1.1 h rat value not transferred. Human observational alpha-PVP study also notes absence of experimental MDPV studies; alpha-PHP is a different molecule. https://pmc.ncbi.nlm.nih.gov/articles/PMC5343766/

#### mesembrine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Primary metabolism study uses rat urine and pooled human liver preparations, not serial human in-vivo plasma PK. No applicable terminal human constant recovered; animal/patent formulation PK not transferred. Kanna extract also differs from pure mesembrine. https://pubmed.ncbi.nlm.nih.gov/25240931/

#### methoxetamine

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] Primary metabolism work establishes metabolites with in-vitro human liver preparations and forensic specimens, not applicable serial healthy human terminal plasma PK. Effect duration or ketamine half-life not substituted. https://pubmed.ncbi.nlm.nih.gov/24574323/

#### nitrous_oxide

- halfLife [estimate]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [estimate] No numerical half-life assigned: pulmonary elimination by exhalation occurs over minutes, but exposure can oxidize cobalamin and impair methionine synthase much longer. A chemical-clearance curve cannot establish functional B12 recovery. See lingeringEffects and Part 4. https://pubmed.ncbi.nlm.nih.gov/8017644/
- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":"Vitamin B12/methionine-synthase dysfunction and neurological injury may outlast chemical clearance; clinician assessment required."}} → {"lingeringEffects":{"durationDays":null,"note":"Primary perioperative nitrous-oxide study found methionine-synthase recovery incomplete within 7 days in the non-methionine-loaded group. Functional B12 inactivation and neurologic/hematologic injury can persist after exhaled drug is gone; study observation is not a fixed recovery or safe-treatment interval. Duration null; clinician assessment is needed. https://pubmed.ncbi.nlm.nih.gov/8017644/"}}. [checked] Primary perioperative nitrous-oxide study found methionine-synthase recovery incomplete within 7 days in the non-methionine-loaded group. Functional B12 inactivation and neurologic/hematologic injury can persist after exhaled drug is gone; study observation is not a fixed recovery or safe-treatment interval. Duration null; clinician assessment is needed. https://pubmed.ncbi.nlm.nih.gov/8017644/

#### norcarfentanil

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":11.8,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Uddayasankar 2018 recreational exposure case: modeled three timed whole-blood samples; carfentanil 5.7 h, norcarfentanil 11.8 h. Single critically ill toxic-exposure patient; provisional whole-blood proxy, not healthy plasma population terminal kinetics. Metabolite relevance not inferred from half-life. https://pubmed.ncbi.nlm.nih.gov/29679387/

#### phenibut

- halfLife [estimate]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":9.7,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}}. [estimate] Provisional toxic-exposure serum proxy: ACMT 2019 abstract 069, phenibut/mitragynine case with serial serum measurements estimated phenibut first-order half-life 9.7 h. Not a healthy single-dose mean. WHO review repeats 5.3 h after 250 mg but explicitly says Lapin source lacks primary references; not used as a confirmed lower bound. Clinical review needed before generalizing this single case. https://pmc.ncbi.nlm.nih.gov/articles/PMC6441065/ https://cdn.who.int/media/docs/default-source/essential-medicines/unedited--advance-copy-44th-ecdd-critical-review-report_phenibut.pdf

#### psilocybin

- halfLife [checked]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [checked] Hasler 1997 oral/IV human study documents rapid dephosphorylation to psilocin, including after systemic administration. No psilocybin half-life assigned; psilocin kinetics do not represent unchanged prodrug. Reviewer should consider psilocin component with stoichiometric mass conversion. https://pubmed.ncbi.nlm.nih.gov/9204776/

#### pvp

- halfLife [gap]: values retained {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}}. [gap] 2025 naturalistic intranasal alpha-PVP study explicitly could not calculate elimination half-life; measured oral fluid/urine, not terminal plasma. Detection tail and rat PK not substituted. Queue ID pvp retained (alpha-PVP). https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1626692/full

#### salvinorin_a

- halfLife [checked]: {"kinetics":{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}} → {"kinetics":{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":0.8201666666666667,"max":0.8406666666666667,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}}. [checked] Primary 2016 naltrexone/ketanserin crossover study Table 3: placebo+vaporized 1 mg salvinorin-A groups n=11/12, terminal plasma means 50.44 (SD14.79) and 49.21 (SD15.58) min. Hours converted; cohort means envelope, not individual range. Antagonist sessions 56.96/56.24 min not pooled into unmedicated baseline. Buccal absorption may differ. https://pmc.ncbi.nlm.nih.gov/articles/PMC4966277/

#### 1p_lsd_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [checked] Primary 2020 two-volunteer oral/IV study found oral 1P-LSD rapidly converted to LSD (unchanged oral prodrug not detected). Reported LSD elimination is not unchanged 1P-LSD half-life. No numerical parent half-life assigned; active-component mass conversion needs reviewer approval. https://pubmed.ncbi.nlm.nih.gov/32415750/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### 5_htp_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Both healthy2.2–7.4h and older IV~6h studies used carbidopa; standalone challenge study confirms major carbidopa effect but standalone numeric terminal not recovered. https://pubmed.ncbi.nlm.nih.gov/6187038/ https://pubmed.ncbi.nlm.nih.gov/311987/ https://pubmed.ncbi.nlm.nih.gov/11910264/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. https://pubmed.ncbi.nlm.nih.gov/6187038/

#### 7_hydroxymitragynine_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Supplement B: healthy-human kratom studies measured formed 7OH after mitragynine products, not isolated concentrated 7OH. 2024 reported single-dose cohort means 1.7–4.7 h and repeated-dose 2.4–24.7 h; 2026 Table 2 gives 2.4–6.0 h single and 2.9–55.0 h repeated (highest-dose individual range 6.1–109 h), steady state days 7/9. These apparent slopes can reflect formation, dose, assay sensitivity and parent disposition; no shared intrinsic constant defensibly established for directly dosed and formed 7OH. Retain unknown; reviewer needs direct 7OH human PK or separated formation/elimination model. https://doi.org/10.3390/molecules29050984 https://academic.oup.com/jat/article/50/6/bkag042/8704792 Existing product context: [gap] V2 input review: migration bolus representation retained for this generic route. No distinct early-dose fraction or release compartment identified in this pass; no positive claim of instantaneous absorption. Formulation/unit not independently confirmed unless specified in components or prior product notes.

#### adb_butinaca_smoked

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] No applicable serial human terminal plasma constant recovered. Human forensic concentrations/analytical detection and in-vitro turnover do not establish in-vivo terminal half-life. ADB-BINACA/ADB-4en-PINACA are different identities from ADB-BUTINACA; no mouse or microsomal value substituted. https://pmc.ncbi.nlm.nih.gov/articles/PMC10458319/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### bromazolam_illicit

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [estimate] Provisional toxic-exposure serum proxy: 2025 primary case report, five serum samples over 204 h after encapsulated pure bromazolam overdose, estimated half-life 31 h. Single poisoning case, not healthy-adult terminal mean or population bounds. No detection-window substitution. https://www.sciencedirect.com/science/article/pii/S2665910725000283 Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### carfentanil_illicit

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [estimate] Uddayasankar 2018 recreational exposure case: modeled three timed whole-blood samples; carfentanil 5.7 h, norcarfentanil 11.8 h. Single critically ill toxic-exposure patient; provisional whole-blood proxy, not healthy plasma population terminal kinetics. Metabolite relevance not inferred from half-life. https://pubmed.ncbi.nlm.nih.gov/29679387/ Existing product context: [gap] V2 input review: migration bolus representation retained for this generic route. No distinct early-dose fraction or release compartment identified in this pass; no positive claim of instantaneous absorption. Formulation/unit not independently confirmed unless specified in components or prior product notes.

#### clorazepate_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] DailyMed clorazepate Clinical Pharmacology: rapid presystemic decarboxylation to nordiazepam; essentially no circulating parent. Reported 40–50 h belongs to nordiazepam, not clorazepate. Parent remains unknown without invented small conversion half-life. Recommend active-component/prodrug mass conversion in Part 4; no graph edits. https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6e9edbfc-1950-4893-9d38-e82b119ddb9a Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### delta8_thc_edible

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] 2025 within-subject oral delta8/delta9 human trial provides acute whole-blood exposure and effects, with 8 h observation insufficient to confirm a slow terminal plasma phase for this analyte. No applicable independent human terminal constant recovered. Delta8-THCV is a different molecule; delta9 kinetics not copied. https://pubmed.ncbi.nlm.nih.gov/40288059/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### delta8_thc_vaped

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] 2025 within-subject oral delta8/delta9 human trial provides acute whole-blood exposure and effects, with 8 h observation insufficient to confirm a slow terminal plasma phase for this analyte. No applicable independent human terminal constant recovered. Delta8-THCV is a different molecule; delta9 kinetics not copied. https://pubmed.ncbi.nlm.nih.gov/40288059/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### ethanol_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [estimate] No exponential half-life assigned. Concentration-dependent saturable elimination is approximately zero-order at customary intoxicating blood levels. Primary Jones 1993 healthy fasting study reports low elimination near 9 mg/dL/h. Typical 10–20 mg/dL/h is recalled contextual range, varies with food, drinking history, dose and concentration; reviewer must verify an individual rate. A constant fractional half-life cannot represent a BAC subtraction rate. https://pubmed.ncbi.nlm.nih.gov/8426147/ Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### flubromazolam_illicit

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [estimate] Huppertz et al., basic PK self-experiment, one author ingested 0.5 mg; terminal serum half-life estimated 10–20 h. Range-only; no invented midpoint. Small preliminary study, not population bounds; urine detection 6.5/8 days is not half-life. https://pubmed.ncbi.nlm.nih.gov/28378533/ Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### gbl_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Human two-volunteer GBL ingestion experiment measured GHB kinetics, not a usable unchanged-GBL terminal constant. Rapid GBL-to-GHB conversion needs a prodrug/input representation. Do not assign GHB half-life, rat GBL <1 min, or analytical acid conversion as human parent clearance. https://pubmed.ncbi.nlm.nih.gov/23733593/ Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### harmaline_oral

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [checked] Riba 2003 Table 4, oral ayahuasca crossover: harmaline terminal plasma means 2.01 (SD .56) and 1.95 (SD .81) h, 15 volunteers in PK analysis. Range of dose-condition means, not individual bounds. Mixture/coadministration data; no transfer of Callaway harmine value. https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### harmine_oral

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [checked] Callaway 1999 Table 2, plasma after oral hoasca in healthy experienced users: harmine mean 115.6 min, SD 60.1, n=14. Hours and CV converted arithmetically. Mixture/coadministration evidence, not pure isolated harmine; 2003 Riba study often could not quantify harmine. https://wiki.dmt-nexus.me/w/images/2/26/pharmacokinetics_of_hoasca_in_healthy_humans.pdf Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### ibotenic_acid_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Primary human plasma analytical-method publication establishes measurement, not an applicable serial human terminal PK estimate. Amanita effects and urinary recovery are not half-lives. Active ibotenic acid and muscimol remain represented; no automatic inactive exclusion. https://pubmed.ncbi.nlm.nih.gov/32361630/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### isocarboxazid_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Marplan label does not establish an applicable healthy unchanged-parent terminal plasma constant; published 1.5–4 h analogue-based suggestions not assigned. Persistent MAO inhibition is represented separately in lingeringEffects. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=ac387aa0-3f04-4865-a913-db6ed6f4fdc5 Existing product context: [gap] No product-specific quantified release half-life established. Tmax, dosing interval, enteric lag and elimination half-life are not interchangeable with a release constant.

#### isotonitazene_illicit

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Human forensic metabolism/urine and in-vitro studies establish analytes but no applicable serial human terminal plasma constant recovered. No microsomal, rat, related-nitazene or postmortem value transferred. Potency of parent/metabolites does not establish persistence. https://pubmed.ncbi.nlm.nih.gov/38582802/ Existing product context: [gap] V2 input review: migration bolus representation retained for this generic route. No distinct early-dose fraction or release compartment identified in this pass; no positive claim of instantaneous absorption. Formulation/unit not independently confirmed unless specified in components or prior product notes.

#### kavalactones_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Primary healthy-human study quantifies six distinct kavalactones after kava extract; pooled kavalactones is not one molecular species. A kavain half-life cannot represent the mixture. Keep unknown pending reviewer component split/standardized product amounts. https://pubmed.ncbi.nlm.nih.gov/35777607/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### l_tryptophan_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Loading-study kinetics depend on basal endogenous subtraction. Green1985 explicitly discusses half-time calculations including basal levels. No universal standalone excess-plasma half-life confirmed;2h secondary or15.8h old summaries not adopted. https://onlinelibrary.wiley.com/doi/pdfdirect/10.1111/j.1365-2125.1985.tb05070.x Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. https://pubmed.ncbi.nlm.nih.gov/6210561/

#### mdmb_4en_pinaca_smoked

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] No applicable serial human terminal plasma constant recovered. Human forensic concentrations/analytical detection and in-vitro turnover do not establish in-vivo terminal half-life. ADB-BINACA/ADB-4en-PINACA are different identities from ADB-BUTINACA; no mouse or microsomal value substituted. https://pmc.ncbi.nlm.nih.gov/articles/PMC10458319/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### mdpv_illicit

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] No applicable serial human terminal plasma constant recovered. Primary preclinical PK uses rats; 1.1 h rat value not transferred. Human observational alpha-PVP study also notes absence of experimental MDPV studies; alpha-PHP is a different molecule. https://pmc.ncbi.nlm.nih.gov/articles/PMC5343766/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Exact route/formulation must be matched before choosing dose or release parameters.

#### mesembrine_buccal

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Primary metabolism study uses rat urine and pooled human liver preparations, not serial human in-vivo plasma PK. No applicable terminal human constant recovered; animal/patent formulation PK not transferred. Kanna extract also differs from pure mesembrine. https://pubmed.ncbi.nlm.nih.gov/25240931/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### mesembrine_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Primary metabolism study uses rat urine and pooled human liver preparations, not serial human in-vivo plasma PK. No applicable terminal human constant recovered; animal/patent formulation PK not transferred. Kanna extract also differs from pure mesembrine. https://pubmed.ncbi.nlm.nih.gov/25240931/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### methoxetamine_illicit

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] Primary metabolism work establishes metabolites with in-vitro human liver preparations and forensic specimens, not applicable serial healthy human terminal plasma PK. Effect duration or ketamine half-life not substituted. https://pubmed.ncbi.nlm.nih.gov/24574323/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### nitrous_oxide_inhaled

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [estimate] No numerical half-life assigned: pulmonary elimination by exhalation occurs over minutes, but exposure can oxidize cobalamin and impair methionine synthase much longer. A chemical-clearance curve cannot establish functional B12 recovery. See lingeringEffects and Part 4. https://pubmed.ncbi.nlm.nih.gov/8017644/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### phenibut_oral

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [estimate] Provisional toxic-exposure serum proxy: ACMT 2019 abstract 069, phenibut/mitragynine case with serial serum measurements estimated phenibut first-order half-life 9.7 h. Not a healthy single-dose mean. WHO review repeats 5.3 h after 250 mg but explicitly says Lapin source lacks primary references; not used as a confirmed lower bound. Clinical review needed before generalizing this single case. https://pmc.ncbi.nlm.nih.gov/articles/PMC6441065/ https://cdn.who.int/media/docs/default-source/essential-medicines/unedited--advance-copy-44th-ecdd-critical-review-report_phenibut.pdf Existing product context: [gap] Generic migrated route/formulation retained; no quantified independent release constant established. Absorption not asserted instantaneous.

#### psilocybin_oral

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [checked] Hasler 1997 oral/IV human study documents rapid dephosphorylation to psilocin, including after systemic administration. No psilocybin half-life assigned; psilocin kinetics do not represent unchanged prodrug. Reviewer should consider psilocin component with stoichiometric mass conversion. https://pubmed.ncbi.nlm.nih.gov/9204776/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### pvp_illicit

- input [gap]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [gap] Supplement B: current components/input preserved; primary-compound assessment: [gap] 2025 naturalistic intranasal alpha-PVP study explicitly could not calculate elimination half-life; measured oral fluid/urine, not terminal plasma. Detection tail and rat PK not substituted. Queue ID pvp retained (alpha-PVP). https://www.frontiersin.org/journals/pharmacology/articles/10.3389/fphar.2025.1626692/full Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Exact route/formulation must be matched before choosing dose or release parameters.

#### salvinorin_a_buccal

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [checked] Primary 2016 naltrexone/ketanserin crossover study Table 3: placebo+vaporized 1 mg salvinorin-A groups n=11/12, terminal plasma means 50.44 (SD14.79) and 49.21 (SD15.58) min. Hours converted; cohort means envelope, not individual range. Antagonist sessions 56.96/56.24 min not pooled into unmedicated baseline. Buccal absorption may differ. https://pmc.ncbi.nlm.nih.gov/articles/PMC4966277/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

#### salvinorin_a_smoked

- input [estimate]: values retained {"input":{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null},"formulation":null,"doseUnit":"mg"}. [estimate] Supplement B: current components/input preserved; primary-compound assessment: [checked] Primary 2016 naltrexone/ketanserin crossover study Table 3: placebo+vaporized 1 mg salvinorin-A groups n=11/12, terminal plasma means 50.44 (SD14.79) and 49.21 (SD15.58) min. Hours converted; cohort means envelope, not individual range. Antagonist sessions 56.96/56.24 min not pooled into unmedicated baseline. Buccal absorption may differ. https://pmc.ncbi.nlm.nih.gov/articles/PMC4966277/ Existing product context: [gap] Migrated route/formulation/input retained pending the exact product label. No release constant inferred from Tmax, dosing interval or parent elimination. Generic identity does not establish a licensed formulation or usual maintenance dose; recreational/herbal products remain reviewer to set.

Changed entries: 62; changed-section provenance: {"gap":40,"checked":10,"estimate":16}.

Validation: npm.cmd run validate passed with zero errors after this part. Unknown onset and existing alias warnings are retained and documented.

## Part 3 — CYP2D6 strength, mechanism and metabolite persistence

Priority assessments were completed in the requested order. Clinical tiers: MDMA unassessed → strong from dextromethorphan AUC0-inf ratio397/29.1=13.64 (AUC0-8 ratio9.18), and ranolazine unassessed → weak from metoprolol AUC1.82 in the TGA primary clinical evaluation. These are checked clinical data, not in-vitro tiers. No new model-derived tier was assigned: accessible joint parent/metabolite models did not justify an isolated metabolite AUCr. Haloperidol now has a documented reversible mechanism. DEA (MBI), 3HQ and desmethylterbinafine (reversible) retain positive-unclassified strength with specific persistence and source notes. Chlorpromazine/fluphenazine/promethazine and additional sweep positives now have supported reversible mechanisms. Thioridazine substrate ratio retained; new mechanism evidence does not independently revalidate that older ratio.

The whole-library sourceNotes.cyp2d6 sweep separated substrate evidence, boilerplate absence-of-evidence and explicit positive inhibition. Additional mechanisms resolved: amphetamine, methamphetamine, MDA, loperamide (noncompetitive is reversible), mitragynine and metoclopramide. Risperidone's existing clinically supported none was retained despite in-vitro inhibition; a positive binding assay does not override clinical negative evidence. Remaining positive/identity-limited unknown-mechanism items: codeine, 7OH, 4-hydroxyamphetamine, 4-hydroxymethamphetamine, norephedrine and oxycodone; no species-specific mechanism or clinical tier confirmed. Ranolazine now has a clinical tier but mechanism remains unassessed; this generates one intentional validator warning. CVT-2738 is RS-94287, not the label's O-demethyl RS-88390/CVT-2514 inhibitor; that untracked metabolite requires structural review. MDMA metabolite MDA competitive inhibition is assessed separately; HMMA/HMA/HMEA free inhibitor kinetics remain unresolved, not none. EDDP/EMDP, phenothiazine metabolites and N-debutyldronedarone contributions remain unresolved rather than copied from parent.

Conflicts: methadone maintenance metabolic ratios and a single codeine concentration cannot set an AUC tier; newer2.71-fold result is S-methadone, not racemic methadone. In-vitro ranolazine moderate wording differs from clinical1.82-fold weak tier. Current app already plots documented unclassified mechanisms as hatched at-least-weak intervals; older notes saying these are wholly omitted are superseded. Missing kinetics/unknown mechanism still limits representation. All clinical strength classification remains draft; no Ki/IC50-only tiers assigned. Validation: zero errors,22 warnings (prior21 plus ranolazine strength with unassessed mechanism).

### Product status checkpoint

| Category | Computable before → after | Incomplete before → after | No data before → after |
|---|---:|---:|---:|
| opioids | 29 → 29 | 18 → 18 | 2 → 2 |
| sedatives | 36 → 36 | 8 → 8 | 3 → 3 |
| antidepressants | 27 → 27 | 9 → 9 | 1 → 1 |
| antipsychotics | 21 → 21 | 10 → 10 | 0 → 0 |
| mood_anticonvulsants | 11 → 11 | 4 → 4 | 0 → 0 |
| stimulants | 14 → 14 | 11 → 11 | 2 → 2 |
| psychedelics_dissociatives | 7 → 7 | 24 → 24 | 12 → 12 |
| cardiovascular | 24 → 24 | 24 → 24 | 0 → 0 |
| other_interactors | 30 → 30 | 11 → 11 | 2 → 2 |
| **Overall** | 199 → 199 | 119 → 119 | 22 → 22 |

### Entry changes and evidence


#### 3_hydroxyquinidine

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Ching1995 primary: 3HQ and other quinidine metabolites inhibit CYP2D6 (collective Ki.43–2.3micromolar vs quinidine.027). Feick2023 PBPK includes 3HQ interaction potential alongside quinidine; retrieved results do not isolate a metabolite-only sensitive-probe AUCr. Parent strong tier or joint simulation cannot set isolated3HQ strength. Remains positive reversible/unassessed; persistence~12h retained. https://pubmed.ncbi.nlm.nih.gov/7575645/ https://ascpt.onlinelibrary.wiley.com/doi/full/10.1002/psp4.12981

#### 4_hydroxyamphetamine

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] Supplement B sweep: inhibition signal found, but retrieved species-specific kinetic evidence insufficient to set reversible versus mechanism-based inhibition confidently; clinical sensitive-probe AUCr also missing. Remain unassessed with explicit positive/identity-limited evidence, not none. [gap] Label reports minor CYP2D6 inhibition by one or more metabolites without species attribution or clinical strength; this species cannot be assigned a strength or a negative. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f92497b5-baea-4760-b615-45a0b6184402

#### 4_hydroxymethamphetamine

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] Supplement B sweep: inhibition signal found, but retrieved species-specific kinetic evidence insufficient to set reversible versus mechanism-based inhibition confidently; clinical sensitive-probe AUCr also missing. Remain unassessed with explicit positive/identity-limited evidence, not none. [gap] 4_hydroxymethamphetamine: substrate, clinical inhibitor strength, mechanism and phenotype half-life ratios not established. No none/no inference from absence in FDA examples or substrate status.

#### 7_hydroxymitragynine

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] Supplement B sweep: inhibition signal found, but retrieved species-specific kinetic evidence insufficient to set reversible versus mechanism-based inhibition confidently; clinical sensitive-probe AUCr also missing. Remain unassessed with explicit positive/identity-limited evidence, not none. [gap] Supplement A inhibitor assessment for 7_hydroxymitragynine: FDA example table checked; no species-specific clinical strength or mechanistic classification established in this pass. Absence from the examples is not a negative study. Inhibition status/type retained unless explicit evidence below; no class-wide none assignment. https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems Earlier section evidence (may concern substrate rather than inhibition): [gap] No clinical FDA CYP2D6 inhibitor strength or phenotype ratio confirmed. In vitro inhibition must not be promoted to a clinical strength. Substrate false/inhibitor none are unassessed defaults; multipliers 1: no phenotype data. CYP3A4-mediated 7-OH formation described in primary study abstract https://pubmed.ncbi.nlm.nih.gov/38481700/, not a quantitative formation branch.

#### amphetamine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Wu1997 human-microsome primary study describes competitive inhibition; amphetamine Ki26.5 micromolar. Reversible mechanism supported, not an FDA clinical strength tier. MDA must not inherit MDMA mechanism-based status; other tested substrates differ. Species-specific clinical inhibitor AUCr and metabolite contributions unresolved. Existing context: [checked] Label CYP2D6 forms 4-hydroxyamphetamine. Minor in-vitro inhibition by parent and metabolites, clinical strength/mechanism not elucidated; not translated into FDA weak or none. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f92497b5-baea-4760-b615-45a0b6184402 https://pubmed.ncbi.nlm.nih.gov/9264312/

#### chlorpromazine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin1999 primary human-liver microsomes: all tested antipsychotics competitively inhibit CYP2D6-mediated dextromethorphan O-demethylation; chlorpromazine Ki6.4 micromolar. Reversible mechanism supported; no clinical sensitive-substrate AUCr or label/FDA tier recovered for this species. Strength stays unassessed; in-vitro potency does not define clinical weak/moderate/strong. Metabolite strength/independent persistence cannot be inferred from parent. Prior substrate/phenotype context retained: [gap] chlorpromazine: substrate, clinical inhibitor strength, mechanism and phenotype half-life ratios not established. No none/no inference from absence in FDA examples or substrate status. https://pubmed.ncbi.nlm.nih.gov/10460810/

#### clozapine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin1999 primary human-liver microsomes: all tested antipsychotics competitively inhibit CYP2D6-mediated dextromethorphan O-demethylation; clozapine Ki39 micromolar. Reversible mechanism supported; no clinical sensitive-substrate AUCr or label/FDA tier recovered for this species. Strength stays unassessed; in-vitro potency does not define clinical weak/moderate/strong. Metabolite strength/independent persistence cannot be inferred from parent. Prior substrate/phenotype context retained: [checked] Label CYP1A2/2D6/3A4 substrate; smoking/cessation and inhibitors matter; no phenotype half-life map or formal inhibitor tier. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0fa59238-f0a6-4d00-9d8d-df2a43718fc1 https://pubmed.ncbi.nlm.nih.gov/10460810/

#### codeine

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] Supplement B sweep: inhibition signal found, but retrieved species-specific kinetic evidence insufficient to set reversible versus mechanism-based inhibition confidently; clinical sensitive-probe AUCr also missing. Remain unassessed with explicit positive/identity-limited evidence, not none. [gap] Primary Wu et al. paper describes codeine CYP2D6 inhibition in vitro (Ki 230 micromolar with dextromethorphan), with no effect on desipramine hydroxylation in a cited assay. Assay dependence and no isolated clinical strength prevent none/weak assignment; unassessed strength/type retained. https://onlinelibrary.wiley.com/doi/pdfdirect/10.1111/j.1365-2125.1993.tb05666.x

#### cvt_2738

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] TGA clinical evaluation identifies CVT-2738 as RS-94287 (distinct from O-demethyl RS-88390/CVT-2514). Assay reported no significant CYP2D6 effect by tested parent/metabolites; US label reports an O-demethyl inhibitor signal. Identity and assay context prevent assigning label O-demethyl inhibition or a blanket clinical negative to CVT-2738. Clinical tier/mechanism remain unassessed; do not truncate or extend based on mistaken metabolite identity. https://www.tga.gov.au/sites/default/files/auspar-ranolazine-180220-cer.pdf

#### desethylamiodarone

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"mechanism-based"}}. [checked] Ohyama2000 documents both competitive CYP2D6 inhibition and time-dependent inactivation by desethylamiodarone. Retain MBI; in-vitro Ki4.5 micromolar is not clinical strength. Parent+metabolite clinical/PBPK effects are not an isolated-metabolite sensitive-probe AUCr; no defensible species-specific tier recovered. Mean formed apparent persistence36days (14–75) retained; inhibitor track must include metabolite and enzyme recovery. https://bpspubs.onlinelibrary.wiley.com/doi/10.1046/j.1365-2125.2000.00134.x

#### desmethylterbinafine

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Pade/Wahlstrom2026 primary PBPK abstract and supplement: desmethylterbinafine inhibits CYP2D6; modeled reversible Ki,u .0006micromolar, formed terminal profile follows parent tissue redistribution. Model validates joint parent/metabolite interaction, but accessible supplement does not give a defensible isolated-DMT clinical or counterfactual AUCr tier. Do not derive class solely from Ki or joint response; strength remains unassessed, represented at least weak by current app. Persistence may be weeks. https://link.springer.com/article/10.1208/s12248-026-01288-x https://media.springernature.com/original/springer-static/esm/art:10.1208%2Fs12248-026-01288-x/MediaObjects/12248_2026_1288_MOESM1_ESM.pdf

#### fluphenazine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin1999 primary human-liver microsomes: all tested antipsychotics competitively inhibit CYP2D6-mediated dextromethorphan O-demethylation; fluphenazine Ki9.4 micromolar. Reversible mechanism supported; no clinical sensitive-substrate AUCr or label/FDA tier recovered for this species. Strength stays unassessed; in-vitro potency does not define clinical weak/moderate/strong. Metabolite strength/independent persistence cannot be inferred from parent. Prior substrate/phenotype context retained: [gap] fluphenazine: substrate, clinical inhibitor strength, mechanism and phenotype half-life ratios not established. No none/no inference from absence in FDA examples or substrate status. https://pubmed.ncbi.nlm.nih.gov/10460810/

#### haloperidol

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin 2001 primary human-microsomal study: competitive CYP2D6 inhibition by haloperidol (Ki .89 micromolar) and reduced haloperidol (.24 micromolar); 1999 assay reports different parent Ki7.2, confirming assay dependence. Reversible mechanism supported, but no sensitive-probe clinical AUCr or FDA tier recovered; strength remains unassessed, not none. Reduced metabolite is separately assessed and may contribute; its independent human terminal value remains unknown. Current app shows documented unclassified inhibitors as hatched at-least-weak when exposure is computable. CYP2D6/3A4 substrate evidence retained. https://pubmed.ncbi.nlm.nih.gov/11167668/ https://pubmed.ncbi.nlm.nih.gov/10460810/

#### loperamide

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"no","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"no","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Primary2017 human-liver microsome study reports NONcompetitive CYP2D6 inhibition, Ki5.9micromolar. Noncompetitive kinetics is reversible inhibition, not mechanism-based inactivation. No clinical sensitive-probe AUCr class established at therapeutic/overdose exposure; strength remains unassessed. Metabolite contribution unresolved. https://www.jstage.jst.go.jp/article/bpb/40/10/40_b17-00118/_html/-char/en

#### mda

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Wu1997 human-microsome primary study describes competitive inhibition; mda Ki1.8 micromolar. Reversible mechanism supported, not an FDA clinical strength tier. MDA must not inherit MDMA mechanism-based status; other tested substrates differ. Species-specific clinical inhibitor AUCr and metabolite contributions unresolved. Existing context: [gap] Explicit MDMA-family metabolite inhibitor audit: no defensible species-specific clinical CYP2D6 strength established. MDMA mechanism-based inhibition cannot be assigned to this metabolite by analogy. HMMA/HMA hydrolyzed-total PK does not establish free inhibitor persistence. MDA formed-profile half-life ~10.5–12.5 h. https://pubmed.ncbi.nlm.nih.gov/15328252/ https://pubmed.ncbi.nlm.nih.gov/18520604/ https://pubmed.ncbi.nlm.nih.gov/9264312/

#### mdma

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"mechanism-based"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"strong","inhibitionType":"mechanism-based"}}. [checked] Yubero-Lahoz 2011 primary human study Table II: 12 healthy CYP2D6 extensive-metabolizer women, MDMA 1.5 mg/kg before dextromethorphan30mg. Dextromethorphan mean AUC0-inf29.1→397.0 (ratio13.64), AUC0-8 15.8→145.1 (ratio9.18); both exceed5, supporting clinical strong tier under Supplement B rule. Mechanism-based CYP2D6 inactivation retained. Recovery half-time36.6±22.9h in women, prior men27.6±25.1h; around90% activity by10days, not fully baseline. This is enzyme recovery, not MDMA elimination or universal safe interval. MDA reversible inhibition separately documented; HMMA/HMA free inhibitor persistence unresolved. https://bibliography.maps.org/resources/download/8748 https://pubmed.ncbi.nlm.nih.gov/21456632/
- lingeringEffects [checked]: {"lingeringEffects":{"durationDays":null,"note":"CYP2D6 enzyme recovery after mechanism-based inactivation is distinct from plasma MDMA/metabolite clearance. Clinical recovery interval requires review."}} → {"lingeringEffects":{"durationDays":null,"note":"Mechanism-based CYP2D6 inhibition can outlast MDMA in plasma; human probe study showed approximately90% recovery by10days with residual suppression. Patient-specific duration unknown."}}. [checked] Human dextromethorphan-probe study after single MDMA showed persistent CYP2D6 suppression: mean recovery half-time36.6 h women/27.6 h prior men, approximately90% activity at10days and incomplete full recovery. No fixed individual duration assigned; not an ibogaine-safe interval. https://pubmed.ncbi.nlm.nih.gov/21456632/

#### methadone

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Wu1993 primary human/microsomal data support competitive inhibition; clinical methadone-maintenance probe metabolic-ratio changes demonstrate inhibition but are not sensitive-substrate AUCr. Gelston2012 codeine concentration increase is one time point with UGT co-inhibition, not CYP2D6-specific AUC. New esmethadone study reports dextromethorphan AUC2.71-fold at75mg S-methadone, but isolated S-enantiomer is not racemic methadone. No transferable racemate clinical tier recovered; remain positive reversible/unassessed strength, shown at least weak by current app. EDDP/EMDP contributions and terminal PK remain unresolved. Modern disposition emphasizes CYP2B6; no phenotype half-life map inferred. https://pubmed.ncbi.nlm.nih.gov/8448065/ https://pmc.ncbi.nlm.nih.gov/articles/PMC3403206/ https://pubmed.ncbi.nlm.nih.gov/38010591/

#### methamphetamine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Wu1997 human-microsome primary study describes competitive inhibition; methamphetamine Ki25 micromolar. Reversible mechanism supported, not an FDA clinical strength tier. MDA must not inherit MDMA mechanism-based status; other tested substrates differ. Species-specific clinical inhibitor AUCr and metabolite contributions unresolved. Existing context: [gap] methamphetamine: substrate, clinical inhibitor strength, mechanism and phenotype half-life ratios not established. No none/no inference from absence in FDA examples or substrate status. https://pubmed.ncbi.nlm.nih.gov/9264312/

#### metoclopramide

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Livezey2014 primary human-liver/recombinant study explicitly establishes reversible CYP2D6 inhibition and no inactivation in time/concentration experiments. Ki13.8micromolar does not establish a clinical tier. Existing CYP2D6 substrate yes retained; no phenotype half-life map inferred. https://pubmed.ncbi.nlm.nih.gov/24010633/

#### mitragynine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Primary kratom experiments document competitive CYP2D6 inhibition (Ki~1.1–1.17micromolar); older assay noncompetitive, both reversible. CYP3A time-dependent inhibition must not be copied to CYP2D6. Clinical low-dose kratom results are product/dose-specific and do not establish concentrated/chronic mitragynine strength; no isolated clinical tier assigned. 7OH inhibitor signal is in vitro; free terminal persistence and mechanism remain unresolved; other metabolites unclassified. https://pmc.ncbi.nlm.nih.gov/articles/PMC7745086/ https://pmc.ncbi.nlm.nih.gov/articles/PMC7902086/

#### norephedrine

- cyp2d6 [gap]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}}. [gap] Supplement B sweep: inhibition signal found, but retrieved species-specific kinetic evidence insufficient to set reversible versus mechanism-based inhibition confidently; clinical sensitive-probe AUCr also missing. Remain unassessed with explicit positive/identity-limited evidence, not none. [gap] Label reports minor CYP2D6 inhibition by one or more metabolites without species attribution or clinical strength; this species cannot be assigned a strength or a negative. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f92497b5-baea-4760-b615-45a0b6184402

#### promethazine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Primary Nakamura1996 supports CYP2D6 metabolism; classic-H1-antagonist primary inhibition study describes mixed inhibition by promethazine, a reversible kinetic mechanism. Other human-microsome work reports concentration-dependent inhibition; no clinical probe AUCr tier recovered. Metabolite inhibition cannot be inferred from parent or absence of H1 activity; remains unresolved. https://pubmed.ncbi.nlm.nih.gov/8946477/ https://www.sciencedirect.com/science/article/pii/S0090955624039850 https://pubmed.ncbi.nlm.nih.gov/11936702/

#### ranolazine

- cyp2d6 [checked]: {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}} → {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"weak","inhibitionType":"unassessed"}}. [checked] TGA clinical evaluation2018 p31, studyCVT-301-24: ranolazine PR750mg twice daily at steady state increased metoprolol AUC0-inf1.82-fold, Cmax1.48-fold in healthy subjects. Clinical AUCr supports weak1.25–<2 tier. FDA label in-vitro moderate wording is not the clinical tier. CYP2D6 inhibition mechanism not resolved by retrieved clinical data; CYP3A competitive mechanism not copied to2D6. O-demethyl metabolite separately implicated in label; CVT-2738 identity is RS-94287, not that metabolite. https://www.tga.gov.au/sites/default/files/auspar-ranolazine-180220-cer.pdf

#### reduced_haloperidol

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin 2001: competitive CYP2D6 inhibitor, Ki .24 micromolar for racemic reduced haloperidol versus .89 parent; stereoisomers differ. Clinical contribution plausible at patient exposure, but potency is not clinical FDA strength and no isolated probe AUCr recovered. Strength remains unassessed; independent terminal PK still missing, so duration cannot be assumed equal to parent. https://pubmed.ncbi.nlm.nih.gov/11167668/

#### thioridazine

- cyp2d6 [checked]: values retained {"cyp2d6":{"substrate":"yes","halfLifeMultiplier":{"poor":2},"inhibitor":"unassessed","inhibitionType":"reversible"}}. [checked] Shin1999 primary human-liver microsomes: all tested antipsychotics competitively inhibit CYP2D6-mediated dextromethorphan O-demethylation; thioridazine Ki1.4 micromolar. Reversible mechanism supported; no clinical sensitive-substrate AUCr or label/FDA tier recovered for this species. Strength stays unassessed; in-vitro potency does not define clinical weak/moderate/strong. Metabolite strength/independent persistence cannot be inferred from parent. Prior substrate/phenotype context retained: [estimate] Primary phenotype study PMID2007317: PM half-life twice rapid; poor2 entered. Human debrisoquine phenoconversion PMID11802093 demonstrates inhibition reversible on withdrawal; strength tier not established by sensitive-probe AUCr. Metabolite inhibitor strength unresolved, not none. https://pubmed.ncbi.nlm.nih.gov/2007317/ ; https://pubmed.ncbi.nlm.nih.gov/11802093/ https://pubmed.ncbi.nlm.nih.gov/10460810/

Changed entries: 25; changed-section provenance: {"checked":20,"gap":6}.

Validation: npm.cmd run validate passed with zero errors after this part. Unknown onset and existing alias warnings are retained and documented.

## Part 4 — Structural recommendations (report only)

No library or app changes in this part. All recommendations below require clinician/schema review before implementation. Molecular ratios are calculated one-mole conversion factors, not bioavailability, purity, clinical equivalence or validated dose recommendations. All new components/links/product splits are recommendations only; the final library is identical to the Part3 snapshot.

### Product status checkpoint

| Category | Computable before → after | Incomplete before → after | No data before → after |
|---|---:|---:|---:|
| opioids | 29 → 29 | 18 → 18 | 2 → 2 |
| sedatives | 36 → 36 | 8 → 8 | 3 → 3 |
| antidepressants | 27 → 27 | 9 → 9 | 1 → 1 |
| antipsychotics | 21 → 21 | 10 → 10 | 0 → 0 |
| mood_anticonvulsants | 11 → 11 | 4 → 4 | 0 → 0 |
| stimulants | 14 → 14 | 11 → 11 | 2 → 2 |
| psychedelics_dissociatives | 7 → 7 | 24 → 24 | 12 → 12 |
| cardiovascular | 24 → 24 | 24 → 24 | 0 → 0 |
| other_interactors | 30 → 30 | 11 → 11 | 2 → 2 |
| **Overall** | 199 → 199 | 119 → 119 | 22 → 22 |

### Entry changes and evidence


Changed entries: 0; changed-section provenance: {}.

Validation: npm.cmd run validate passed with zero errors after this part. Unknown onset and existing alias warnings are retained and documented.

### Specific structural proposals — none implemented

| Entry | Problem/evidence | Proposed reviewer change | Sources |
|---|---|---|---|
| psilocybin_oral | Unchanged prodrug has no usable plasma half-life; rapid human oral/IV dephosphorylation yields psilocin. | Replace the administered component with psilocin, ratio1, provisional active-mass factor204.27/284.25≈0.7186 (confirm dose convention and conversion completeness). Preserve psilocin downstream metabolites, avoid adding a second psilocin formation dose, and keep bioavailability separate. Prefer an explicit prodrug conversion field if saltFactor is restricted to salts. | https://pubmed.ncbi.nlm.nih.gov/9204776/ https://pubchem.ncbi.nlm.nih.gov/compound/Psilocybin https://pubchem.ncbi.nlm.nih.gov/compound/Psilocin |
| 1p_lsd_oral | Two-subject human study supports rapid oral conversion to LSD; assigning LSD terminal half-life to unchanged 1P-LSD would mislabel the species. | Components → lsd, ratio1, free-compound factor323.4/379.5≈0.8522. Confirm hemitartrate versus free-base reported dose; salt stoichiometry requires a separate factor. Retain LSD downstream pathways and avoid duplicate LSD formation. Confirm microgram input convention; do not infer purity or bioavailability. | https://pubmed.ncbi.nlm.nih.gov/32415750/ https://pubchem.ncbi.nlm.nih.gov/compound/1P-LSD https://pubchem.ncbi.nlm.nih.gov/compound/Lysergic-acid-diethylamide |
| clorazepate_oral | Label describes presystemic nordiazepam conversion and essentially absent circulating clorazepate. | Components → nordiazepam, ratio1; if entered dose is labeled clorazepate dipotassium mass, provisional factor270.71/408.92≈0.6620. Confirm label strength basis and full presystemic conversion. Preserve nordiazepam → oxazepam pathways without double formation; no invented short clorazepate elimination constant. | https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=69451c35-dd9a-4690-8d5e-4dcfa8837620 https://pubchem.ncbi.nlm.nih.gov/compound/Nordazepam |
| ethanol_oral | Saturable concentration elimination is approximately zero-order over usual intoxicating concentrations; exponential fractional elimination and arbitrary half-life give the wrong behavior. | Add an ethanol-specific saturable/zero-order concentration model with grams ethanol, absorption interval, distribution/body-water assumptions and measured BAC where available. Show rate uncertainty rather than a generic clear date. Current notes document rate context; do not convert mg/dL/h directly to mg/h without volume. No molecular-mass conversion needed for pure ethanol. | https://pubmed.ncbi.nlm.nih.gov/8426147/ |
| nitrous_oxide_inhaled | Gas leaves through lungs within minutes, while functional cobalamin/methionine-synthase injury can persist after exposure. | Separate pulmonary exposure/clearance from persistent B12-related toxicity/clinical recovery. Capture exposure concentration and duration/repetition rather than an unvalidated swallowed-mg dose. Require clinician review of functional recovery; no fixed safe date, no molecular-mass factor. | https://pubmed.ncbi.nlm.nih.gov/8017644/ |
| gbl_oral | Human GBL dosing experiment measures formed GHB; unchanged-GBL half-life cannot be copied from GHB. | Use an explicit rapid-conversion input to ghb, with one-mole stoichiometry and free-acid equivalent factor104.10/86.09≈1.2092, conditional on complete conversion. Hydrolysis adds water, so factor exceeds1; do not force it into a saltFactor field capped at1. Confirm density/purity for mL input and account for GHB nonlinear kinetics separately. | https://pubmed.ncbi.nlm.nih.gov/23733593/ https://pubchem.ncbi.nlm.nih.gov/compound/Gamma-Butyrolactone https://pubchem.ncbi.nlm.nih.gov/compound/gamma-Hydroxybutyrate |
| 7_hydroxymitragynine and kratom products | Shared compound represents directly dosed concentrated7OH and metabolically formed7OH. Human kratom terminal slopes combine formation and elimination and vary by dose/chronicity. | Retain chemical identity but add route/source-specific PK context or separate administered-input and formed-metabolite parameters. Seek direct human concentrated7OH PK. Record measured mitragynine/7OH product content instead of treating leaf powder/extract as interchangeable pure compounds. No universal conversion or formation fraction established. | https://doi.org/10.3390/molecules29050984 https://academic.oup.com/jat/article/50/6/bkag042/8704792 |
| kavalactones_oral | Current aggregate is a mixture of six molecular species; one intrinsic half-life is scientifically unsupported. | Split into kavain, dihydrokavain, methysticin, dihydromethysticin, yangonin and desmethoxyyangonin compounds/components when the product's measured composition is available. Use product-specific mass ratios and analyte-specific PK; no generic composition or MW factor inferred. | https://pubmed.ncbi.nlm.nih.gov/35777607/ |
| hydroxynorketamine; ketamine/esketamine products | Generic HNK combines regio-/stereoisomers; direct(2R,6R) human6.67–8.18h and formed(2R,6R)/(2S,6S)≈14h cannot simply be pooled as one molecular kinetic constant. | Create analyte-specific HNK identities and parent/isomer-specific formation branches where supported. Separate racemate ketamine from S-esketamine pathways and retain dose/source distinctions. Isomer MWs are equal; fractional formation is not thereby known. Do not resolve aggregate by copying the directly administered RR constant. | https://ascpt.onlinelibrary.wiley.com/doi/10.1002/cpt.3391 |
| hmma/hma/hmea and harmol/harmalol | Free analytes and hydrolyzed-total conjugated assays can describe different kinetic entities; limited sampling can make extrapolated terminal tails unreliable. | Audit assay species and represent free metabolites and individual conjugates separately only when identity/data permit. Do not enter hydrolyzed-total slopes as free inhibitor clearance or create conjugate fraction from urinary detection. Confirm HMEA identity for MDEA. No generic MW factor or systemic formation fraction established. | https://www.sciencedirect.com/science/article/pii/S0090955624102395 https://ddd.uab.cat/pub/tesis/2003/tdx-0701104-165104/jr2de6.pdf |
| indole_3_acetic_acid; 5_htp; l_tryptophan | Endogenous baseline and ongoing production are incompatible with treating all measured analyte as a decaying exogenous bolus. IAA has vascular/AhR relevance in elevated/uremic contexts. | Add baseline-aware excess-exposure handling and clinical relevance by context; retain uncertain entries until reviewer confirms how basal endogenous species should participate in clear status. Keep serotonergic precursor interactions separate from a fixed chemical washout. No universal mass conversion or baseline concentration inferred. | https://pubmed.ncbi.nlm.nih.gov/25145928/ https://pmc.ncbi.nlm.nih.gov/articles/PMC5580516/ |
| cocaine and methylphenidate trees | Cocaethylene and ethylphenidate formation is conditional on ethanol co-exposure; unconditional metabolite traversal can overstate exposure/blockers. | Add conditional ethanol-dependent formation branches/products and retain parent-specific stereochemistry. Confirm exposure timing and measured fractions; do not assign a blanket formation ratio. Current topology deliberately preserved. | https://pubmed.ncbi.nlm.nih.gov/7701044/ https://pubmed.ncbi.nlm.nih.gov/10820132/ https://pubmed.ncbi.nlm.nih.gov/20533759/ (primary links recovered in Part1; no new quantitative fractions established). |
| ranolazine metabolites | TGA identifies O-demethyl RS-88390/CVT-2514 separately from tracked CVT-2738/RS-94287; label inhibition evidence must not be assigned to the wrong species. | Add correctly identified O-demethyl ranolazine metabolite with supported parent link, PK and inhibitor assessment when available; preserve CVT-2738 identity. Request assay/label reconciliation before any clinical strength assignment or exclusion. No formation ratio/MW conversion established here. | https://www.tga.gov.au/sites/default/files/auspar-ranolazine-180220-cer.pdf |
| mesembrine oral/buccal products | Kanna extracts contain multiple alkaloids and cannot generally be treated as a known mass of pure mesembrine. | Distinguish pure mesembrine from standardized Sceletium extract products and add measured alkaloid component ratios only when known. Do not use extract dose as pure-mesembrine dose or borrow animal/patent half-lives. | https://pubmed.ncbi.nlm.nih.gov/25240931/ |
| 10_hydroxynortriptyline and reduced_haloperidol | Generic metabolite IDs can conceal stereoisomer differences: direct E-10OHNT8–9h does not establish pooledE/Z PK; reduced-haloperidol CYP inhibition is stereoselective. | Split E/Z-10OHNT and R/S-reduced-haloperidol when corresponding human PK and formation data are available, or explicitly retain aggregate gaps pending review. Equal molecular weight does not justify equal clearance/formation. No component changes in this pass. | https://pubmed.ncbi.nlm.nih.gov/2731406/ https://pubmed.ncbi.nlm.nih.gov/11167668/ |

### Clinician decisions handed off

- Review all new provisional kinetics before using them for intake decisions: norbuprenorphine44–45h healthy formed profile versus57h maintenance; H3G3.73–3.88h formed-profile surrogate; norcocaine2.33–2.49h after repeated oral cocaine; heroin6MAM47min intranasal transfer; cocaine terminal5–8h sensitive-assay tail; desmethylselegiline3.8h single versus9.5h repeated with unknown onset. Full values, limits and sources are in the Supplement B report.
- Confirm/retrieve the primary11OH-THC12–36h range: retained as recall, not newly checked numerical evidence. Reassess THCCOOH relevance beyond psychoactive inactivity and direct-dose/formed-profile transfer.
- Review phenibut9.7h toxic co-exposure serum estimate (the widely repeated healthy5.3h lacks traceable primary references per WHO), bromazolam31h overdose estimate, flubromazolam10–20h n1 self-experiment, and carfentanil5.7h/norcarfentanil11.8h three-whole-blood-sample case. Approve, replace or withhold these proxies; no recreational default dose was set.
- Review harmine115.6min and harmaline1.95–2.01h human ayahuasca-mixture PK transfer to isolated oral products; establish clinically appropriate reversible MAO-A interaction assessment before ibogaine. Quantitative washout remains unspecified. Harmol/harmalol free versus conjugated profiles need resolution.
- Set isocarboxazid recovery guidance clinically: irreversible MAO inhibition outlasts plasma. Labeled14-day SSRI/bupropion interaction interval is documented, not a measured universal recovery or ibogaine-safe date.
- Review active relevance retained/established for buprenorphine3glucuronide, HMA/HMMA preclinical functional effects, HNK, elevated/uremic endogenous IAA and N-desmethyldiltiazem. Pharmacological inactivity alone cannot exclude toxic/QT/CYP effects. No metabolite was made inactive just to improve status.
- Resolve remaining high-impact blocker evidence, ranked in the report: buprenorphine3glucuronide;4OHamphetamine/methamphetamine; free HMA/HMMA/HMEA; DMT-N-oxide/IAA and bufotenine; aggregate HNK/DHNK; reduced haloperidol; N-desmethyldiltiazem. Obtain analyte-specific human PK, documented formation limitation, or defensible irrelevance rather than substituting urinary detection windows.
- Review salvinorin-A terminal plasma49.21–50.44min vaporized-drug cohort means and their transfer to buccal exposure. Salvinorin-B relevance/PK still limits product completeness.
- Confirm MDMA clinical strong CYP2D6 tier (dextromethorphan AUC0-inf13.64-fold) and enzyme recovery evidence (~90% by10days, incomplete full baseline); generic app recovery tails are not individual measured recovery. MDA has reversible inhibition evidence; HMMA/HMA/HMEA inhibitor contribution and free persistence remain unresolved.
- Classify positive-unclassified CYP2D6 inhibition without deriving strength from Ki: haloperidol/reduced haloperidol; methadone/EDDP/EMDP; DEA;3HQ; desmethylterbinafine; chlorpromazine/fluphenazine/thioridazine/promethazine and their metabolites; clozapine; amphetamine/methamphetamine/MDA; loperamide; mitragynine; metoclopramide. Source notes distinguish supported mechanisms from unclassified clinical strength.
- Review remaining positive/identity-limited CYP2D6 mechanisms: codeine, oxycodone,7OH,4OHamphetamine,4OHmethamphetamine and norephedrine. Unassessed is not a negative. Sensitive-probe clinical AUC or supported isolated-metabolite PBPK counterfactuals are needed for tiers.
- Confirm ranolazine clinical weak tier from metoprolol AUC1.82-fold at750mg twice daily; its CYP2D6 mechanism remains unknown. Reconcile US-label in-vitro moderate language with TGA assay and clinical results, and identify the O-demethyl inhibitor separately from CVT-2738.
- No new estimate-tier inhibitors were assigned in Supplement B. Existing estimate-tagged tiers still needing clinician review: norfluoxetine strong; hydroxybupropion/threohydrobupropion/erythrohydrobupropion moderate; cinacalcet moderate (mechanism estimate); hydroxychloroquine weak; ritonavir weak (dose-specific). Do not treat a parent/metabolite joint AUCr as an isolated-metabolite tier.
- Retained gaps need evidence, not imputation: isolated7OH, isotonitazene, delta8THC and metabolites, mesembrine, MXE, alpha-PVP/MDPV, synthetic cannabinoids and ibotenic acid. Human-case concentrations, rat/microsomal turnover and effect durations are insufficient terminal PK.
- Retain separate clinician assessment for nitrous functional B12 injury, endogenous5HTP/tryptophan serotonergic interactions, MAO inhibition, withdrawal and renal impairment. Computable PK status is not a safe-treatment recommendation. QT calibration weights/reference doses remain reviewer-set.

## Final before/after summary and checks

All four parts completed in order. Status functions use the same current app logic on the immutable starting backup and final library, with draft entries included and unknown-as-formation-limited disabled. Counts denote PK completeness only.

| Category | Computable before → after | Incomplete before → after | No data before → after |
|---|---:|---:|---:|
| opioids | 23 → 29 | 23 → 18 | 3 → 2 |
| sedatives | 30 → 36 | 11 → 8 | 6 → 3 |
| antidepressants | 25 → 27 | 11 → 9 | 1 → 1 |
| antipsychotics | 21 → 21 | 10 → 10 | 0 → 0 |
| mood_anticonvulsants | 11 → 11 | 4 → 4 | 0 → 0 |
| stimulants | 11 → 14 | 14 → 11 | 2 → 2 |
| psychedelics_dissociatives | 4 → 7 | 23 → 24 | 16 → 12 |
| cardiovascular | 24 → 24 | 24 → 24 | 0 → 0 |
| other_interactors | 30 → 30 | 11 → 11 | 2 → 2 |
| **Overall** | 179 → 199 | 131 → 119 | 30 → 22 |

Touched 97 compounds and 30 products. Final changed-section provenance: {"gap": 79, "recall": 1, "checked": 39, "estimate": 24}. No new estimate-tier inhibitor classifications; existing estimate-tier review items are explicitly handed off.

Validation passed after Parts1,2,3,4: zero errors. Final22 warnings =19 baseline plus norbuprenorphine/desmethylselegiline unknown steady-state onsets and ranolazine clinical inhibitor strength with unknown mechanism. These unresolved uncertainties were retained deliberately. No app code/spec/candidate changes; no clinical safety thresholds or QT weights assigned.

Integrity audit passed: compound/product IDs and sort order; candidate IDs/categories/secondary categories; all formedFrom links and values; all product components and values; verification states/dates; reviewer sections; QT calibration fields; no numerical kinetics for six mandated exceptions; Part4 library identical to Part3 snapshot; original backup hash; existing clinician-list byte prefix. Audit artifacts: backups/supplement-b-integrity-audit.json; backups/supplement-b-status-audit.json; per-part snapshots and status checkpoints.

Clinician handoff appended under exactly one new heading, `## From supplement B 2026-10-20`, in user_to_do.md. Existing content is preserved byte-for-byte. Fifteen decision groups and fifteen specific structural proposals were appended.

### Final residual blocking compounds, ranked by affected products

These remaining gaps are not claimed resolved. Numeric proxies are separately labeled in the entry-change inventory. Resolve unknowns using appropriate human analyte-specific PK, documented formation limitation, or defensible irrelevance. Prodrug/mixture/endogenous/model exceptions require the structural decisions above.

| Compound | Products blocked | Relevance | Kinetics |
|---|---:|---|---|
| 4_hydroxyamphetamine | 7 | active | unknown |
| buprenorphine_3_glucuronide | 7 | active | unknown |
| hydroxynorketamine | 5 | active | unknown |
| 4_hydroxymethamphetamine | 3 | unknown | unknown |
| bufotenine | 3 | active | unknown |
| dmt_n_oxide | 3 | unknown | unknown |
| ethylphenidate | 3 | active | unknown |
| hma | 3 | active | unknown |
| hydroxymetoprolol | 3 | active | unknown |
| indole_3_acetic_acid | 3 | active | unknown |
| n_desmethyldiltiazem | 3 | active | unknown |
| norverapamil | 3 | active | unknown |
| o_desmethylmetoprolol | 3 | unknown | unknown |
| oxymorphone_3_glucuronide | 3 | unknown | unknown |
| reduced_haloperidol | 3 | active | unknown |
| 10_hydroxynortriptyline | 2 | active | unknown |
| 11_oh_delta8_thc | 2 | active | unknown |
| 2_ene_vpa | 2 | active | unknown |
| 2_hydroxydesipramine | 2 | active | unknown |
| 2_oxo_3_hydroxy_lsd | 2 | unknown | unknown |
| 3_hydroxyguanfacine | 2 | unknown | unknown |
| 4_ene_vpa | 2 | active | unknown |
| 4_hydroxyalprazolam | 2 | active | unknown |
| 4_hydroxypropranolol | 2 | active | unknown |
| 7_hydroxychlorpromazine | 2 | active | unknown |
| 7_hydroxyfluphenazine | 2 | active | unknown |
| 7_hydroxymitragynine | 2 | active | unknown |
| delta8_thc | 2 | active | unknown |
| delta8_thc_cooh | 2 | unknown | unknown |
| desmethylazithromycin | 2 | unknown | unknown |
| fluphenazine_sulfoxide | 2 | active | unknown |
| furosemide_glucuronide | 2 | unknown | unknown |
| hpph | 2 | unknown | unknown |
| hydroxyalprazolam | 2 | active | unknown |
| mesembrine | 2 | active | unknown |
| mitragynine_pseudoindoxyl | 2 | active | unknown |
| n_depropylpropafenone | 2 | active | unknown |
| n_desmethylerythromycin | 2 | active | unknown |
| napqi | 2 | active | unknown |
| nor_lsd | 2 | unknown | unknown |
| norhydrocodone | 2 | unknown | unknown |
| noribogaine_glucuronide | 2 | unknown | unknown |
| o_desmethylmesembrine | 2 | unknown | unknown |
| pchp | 2 | unknown | unknown |
| ppc | 2 | unknown | unknown |
| salvinorin_b | 2 | unknown | unknown |
| 10_hydroxyamitriptyline | 1 | active | unknown |
| 1p_lsd | 1 | active | unknown |
| 25_desacetylrifampin | 1 | active | unknown |
| 2_hydroxyimipramine | 1 | active | unknown |
| 3_4_catechol_pv | 1 | unknown | unknown |
| 3_methoxymorphinan | 1 | unknown | unknown |
| 4_bromo_2_5_dimethoxyphenylacetic_acid | 1 | unknown | unknown |
| 4_hiaa | 1 | unknown | unknown |
| 4_hydroxyduloxetine_glucuronide | 1 | unknown | unknown |
| 4_hydroxynebivolol | 1 | active | unknown |
| 4_hydroxyphenyl_carvedilol | 1 | active | unknown |
| 4_hydroxytamoxifen | 1 | active | unknown |
| 4_hydroxytolyl_mephedrone | 1 | active | unknown |
| 4_oh_3_meo_pv | 1 | unknown | unknown |
| 5_htp | 1 | active | unknown |
| 6_hydroxymelatonin | 1 | unknown | unknown |
| 7_aminoclonazepam | 1 | unknown | unknown |
| 8_hydroxyefavirenz | 1 | active | unknown |
| 8_hydroxymirtazapine | 1 | unknown | unknown |
| 9_o_demethylmitragynine | 1 | unknown | unknown |
| acetaldehyde | 1 | active | unknown |
| adb_butinaca | 1 | active | unknown |
| clopidogrel_acyl_glucuronide | 1 | active | unknown |
| clorazepate | 1 | active | unknown |
| codeine_6_glucuronide | 1 | active | unknown |
| cvt_2738 | 1 | unknown | unknown |
| demoxepam | 1 | active | unknown |
| desethylhydroxychloroquine | 1 | active | unknown |
| desmethylchlordiazepoxide | 1 | active | unknown |
| desmethylcitalopram | 1 | active | unknown |
| desmethylcyclobenzaprine | 1 | unknown | unknown |
| didesmethylcitalopram | 1 | active | unknown |
| eddp | 1 | unknown | unknown |
| emdp | 1 | unknown | unknown |
| ethanol | 1 | active | unknown |
| gbl | 1 | active | unknown |
| harmalol | 1 | unknown | unknown |
| harmol | 1 | active | unknown |
| hmea | 1 | unknown | unknown |
| hmma | 1 | active | unknown |
| hydroxytriazolam | 1 | active | unknown |
| ibotenic_acid | 1 | active | unknown |
| id_14283 | 1 | active | unknown |
| isocarboxazid | 1 | active | unknown |
| isotonitazene | 1 | active | unknown |
| kavalactones | 1 | active | unknown |
| l_tryptophan | 1 | active | unknown |
| levorphanol_3_glucuronide | 1 | unknown | unknown |
| mdmb_4en_pinaca | 1 | active | unknown |
| mdmb_4en_pinaca_butanoic_acid | 1 | unknown | unknown |
| mdpv | 1 | active | unknown |
| mesoridazine | 1 | active | unknown |
| meta_o_dealkylated_flecainide | 1 | active | unknown |
| methoxetamine | 1 | active | unknown |
| mono_n_dealkyldisopyramide | 1 | unknown | unknown |
| muscimol | 1 | active | unknown |
| n_desethyl_isotonitazene | 1 | active | unknown |
| n_desmethyldiphenhydramine | 1 | unknown | unknown |
| n_desmethyldoxylamine | 1 | unknown | unknown |
| n_desmethylloperamide | 1 | unknown | unknown |
| n_desmethylmirtazapine | 1 | active | unknown |
| nitrous_oxide | 1 | active | unknown |
| norclozapine | 1 | active | unknown |
| norcodeine | 1 | unknown | unknown |
| normephedrone | 1 | active | unknown |
| normethoxetamine | 1 | unknown | unknown |
| o_desmethyl_mxe | 1 | unknown | unknown |
| oh_alpha_pvp | 1 | unknown | unknown |
| phenylacetic_acid | 1 | unknown | unknown |
| phenylethylidenehydrazine | 1 | active | unknown |
| psilocin_o_glucuronide | 1 | unknown | unknown |
| psilocybin | 1 | active | unknown |
| pvp | 1 | active | unknown |
| pvp_lactam | 1 | unknown | unknown |
| s_18982 | 1 | active | unknown |
| s_desmethylcitalopram | 1 | active | unknown |
| sulforidazine | 1 | active | unknown |
