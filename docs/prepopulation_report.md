# ClearDate prepopulation report

Session date: 2026-10-20 (America/Los_Angeles). Draft preparation only; every entry remains unverified.

## 1. Summary and resume point

Completed one whole-category **draft review pass**: opioids, candidate orders **1-26**, ending at **pentazocine, order 26**. This means each parent, each unique metabolite in its tree, and every route was considered; it does not mean every field has a usable value. **Resume at sedatives / diazepam / order 27**. The remaining eight categories are initialized structure only, not researched or draft-populated.

Library: 443 compounds and 312 products across nine categories. This pass touched 57 unique compounds and 42 products; 21 compounds have nonzero half-life triples, 24 have draft molecular weights, seven formation edges have quantitative estimates, three products have label-based maintenance doses and two have nonzero apparent-half-life overrides. Shared compounds were handled at their first opioid candidate and retained once in the library.

No public/drugs.json existed when work began, so no drugs.before-prepopulate.json backup was needed. Created only public/drugs.json and this requested report. Existing queue, documents and code were not edited. App scaffold files appeared in the shared workspace during this session; this data pass did not author them.

| Category | Candidates in queue | Candidates considered | Unique compounds touched | Products touched |
|---|---:|---:|---:|---:|
| opioids | 26 | 26 | 57 | 42 |
| sedatives | 36 | 0 | 0 | 0 |
| antidepressants | 31 | 0 | 0 | 0 |
| antipsychotics | 16 | 0 | 0 | 0 |
| mood_anticonvulsants | 9 | 0 | 0 | 0 |
| stimulants | 16 | 0 | 0 | 0 |
| psychedelics_dissociatives | 28 | 0 | 0 | 0 |
| cardiovascular | 33 | 0 | 0 | 0 |
| other_interactors | 32 | 0 | 0 | 0 |

Provenance counts below count the **leading tag of each section note**, not each number. A half-life triple is one section, an unfilled section also counts, and one note may describe multiple related values. Product notes are embedded with tags in `source`, because the specified product schema has no `sourceNotes` property; they are reproduced below for review. Compound sourceNotes includes the five specified sections and three additional permitted section notes for molecularWeight, lingeringEffects and nonlinearKinetics.

| Leading provenance tag | Section notes |
|---|---:|
| [checked] | 76 |
| [recall] | 98 |
| [estimate] | 11 |
| [gap] | 439 |

All explicit canonical tag occurrences, including secondary qualifications inside notes: [checked] 76, [recall] 122, [estimate] 11, [gap] 448. `[recall — check CredibleMeds]` is an additional reminder, not counted a second time. A [checked] tag records text actually read in a source page or retrieved source excerpt/abstract; it does not mean all fields on the entry were checked, or that the draft has been clinically verified. Search-abstract-only evidence is identified in the notes.

## 2. Priority review list

All QT weights remain 0. Unassessed QT tiers remain `none`, CYP substrate flags `false`, inhibitor strengths/types `none`, and phenotype multipliers 1. These are schema placeholders, **not evidence of safety, no pathway, or equal clearance**. No strong or mechanism-based CYP2D6 inhibitor has been assigned in this category. In vitro mitragynine/buprenorphine findings were not promoted to clinical inhibitor strengths.

| ID | Field | Draft value | Tag | Reason |
|---|---|---|---|---|
| buprenorphine | qt.tier | possible | [recall — check CredibleMeds] | Current tier unconfirmed; reviewer-set weight 0. |
| buprenorphine | halfLifeHours | 26 (9-69) h | [checked] | Range exceeds 48 h; phase/cohort selection affects clearance. |
| codeine_6_glucuronide | formedFrom[codeine].fraction | 0.75 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| hydrocodone | halfLifeHours | 3.8 (3.2-4.4) h | [estimate] | Bounds calculated as mean +/- 2 SD; inspect study dispersion and applicability. |
| hydromorphone_3_glucuronide | formedFrom[hydromorphone].fraction | 0.95 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| loperamide | qt.tier | known | [recall — check CredibleMeds] | Current tier unconfirmed; reviewer-set weight 0. |
| methadone | qt.tier | known | [recall — check CredibleMeds] | Current tier unconfirmed; reviewer-set weight 0. |
| methadone | halfLifeHours | 22.2 (8-59) h | [checked] | Range exceeds 48 h; phase/cohort selection affects clearance. |
| morphine | formedFrom[codeine].fraction | 0.075 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| morphine_3_glucuronide | formedFrom[morphine].fraction | 0.5 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| morphine_6_glucuronide | formedFrom[morphine].fraction | 0.15 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| norcodeine | formedFrom[codeine].fraction | 0.1 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| o_desmethyltramadol | halfLifeHours | 7.4 (4.6-10.2) h | [estimate] | Bounds calculated as mean +/- 2 SD; inspect study dispersion and applicability. |
| tapentadol_o_glucuronide | formedFrom[tapentadol].fraction | 0.55 | [estimate] | Dose metabolism or urinary recovery used as a provisional systemic formation branch. |
| tianeptine | halfLifeHours | 2.5 (0.3-4.7) h | [estimate] | Bounds calculated as mean +/- 2 SD; inspect study dispersion and applicability. |
| tramadol | halfLifeHours | 6.3 (3.5-9.1) h | [estimate] | Bounds calculated as mean +/- 2 SD; inspect study dispersion and applicability. |
| buprenorphine_sc_depot_sublocade_brixadi | apparentHalfLifeHours | absent / unresolved | [gap] | Depot identity/representative mean must be resolved; do not fall back to parent kinetics. |
| buprenorphine_transdermal | apparentHalfLifeHours | 26 h (min=max) | [checked] | Patch-removal disposition; continuous delivery not modeled. |
| fentanyl_transdermal | apparentHalfLifeHours | 23.5 h (min=max) | [checked] | Patch-removal disposition; continuous delivery not modeled. |
| naltrexone_im_depot_vivitrol | apparentHalfLifeHours | absent / unresolved | [gap] | Depot identity/representative mean must be resolved; do not fall back to parent kinetics. |
| morphine | halfLifeHours / phenotype applicability | {'typical': 2, 'min': 2, 'max': 15} | [checked] | 2 h effective vs 15 h sampled terminal; model phase conflict. |
| oxymorphone | halfLifeHours / phenotype applicability | {'typical': 0, 'min': 0, 'max': 0} | [gap] | Dose-dependent means and negative mean-minus-2SD; range unresolved. |
| normeperidine | halfLifeHours / phenotype applicability | {'typical': 0, 'min': 0, 'max': 0} | [gap] | Neurotoxic metabolite with reported 15-30 h range but no usable typical. |
| mitragynine | halfLifeHours / phenotype applicability | {'typical': 0, 'min': 0, 'max': 0} | [gap] | Highest cohort mean reaches 67.9 h after repeated kratom leaf dosing; not a generic typical. |
| 7_hydroxymitragynine | halfLifeHours / phenotype applicability | {'typical': 0, 'min': 0, 'max': 0} | [gap] | Leaf-derived formation profile cannot stand for direct concentrated 7-OH products. |
| dextromethorphan | halfLifeHours / phenotype applicability | {'typical': 2.4, 'min': 2.4, 'max': 2.4} | [checked] | PM/EM median half-life ratio about 7.96 observed in research; multiplier still 1 pending label/CPIC evidence. |

## 3. Gaps

Zero fractions must not be interpreted as absence of a metabolite. Most metabolites remain without human half-life data, so downstream clearance cannot yet be modeled completely. Most dose fields remain 0 because a generic route does not define a unique maintenance regimen; rescue and PRN amounts, starting doses, daily maxima and patch rates were not substituted. All illicit/novel/nonprescription recreational products remain dose 0. Molecular weights are neutral/free-base values; actual dose labels may use salt or active-moiety amounts, and must be reconciled before amount conversion.

All lingering-effect durations remain 0/empty, and nonlinear flags false/empty: no defensible quantified duration or systematically assessed flag was established. Opioid withdrawal duration must not be equated to elimination half-life.

### Compounds without a populated half-life

| ID | Why left empty |
|---|---|
| 3_methoxymorphinan | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| 6_monoacetylmorphine | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| 7_hydroxymitragynine | [gap] Primary study abstract https://pubmed.ncbi.nlm.nih.gov/38474495/ reports highest cohort means 4.7 h single and 24.7 h multiple dosing of kratom leaf. These describe metabolite formation after a mixture, not direct concentrated 7-OH products; no generic typical/range populated. |
| 9_o_demethylmitragynine | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| buprenorphine_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| carfentanil | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| codeine_6_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| dextrorphan | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| eddp | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| emdp | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| hydromorphone_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| isotonitazene | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| levorphanol | [gap] DailyMed levorphanol, Clinical Pharmacology/Pharmacokinetics: IV terminal 11-16 h without a unique mean/median in the reviewed passage; numeric triple remains 0. Candidate route is oral; reviewer must assess route applicability. |
| levorphanol_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| mc5 | [gap] Primary study abstract https://pubmed.ncbi.nlm.nih.gov/2341111/: mean 7.2 +/- 5.7 h; mean minus 2 SD is negative, so cannot encode requested positive bounds without an arbitrary truncation. Another primary study abstract https://pubmed.ncbi.nlm.nih.gov/2096105/ gives healthy control 4.9 +/- 1.7 h (renal patients 14.2 +/- 9.3 h). Numeric triple left 0 pending observed range/full-text reconciliation; renal-patient values not used as healthy bounds. |
| meperidine | [gap] DailyMed Demerol injection 12.3 gives 2-5 h under Elimination and 3-8 h in healthy volunteers under Specific Population/Hepatic Impairment. Wider reported envelope is 2-8 h, but no single mean/median was retrieved; numeric fields remain 0. Do not invent a midpoint. |
| mitragynine | [gap] Primary study abstract https://pubmed.ncbi.nlm.nih.gov/38474495/ reports highest cohort means 43.4 h single dose and 67.9 h multiple dose after dried kratom leaf; these are maxima of cohort means, not a typical value and individual range. Numeric triple left 0 until dose-stratified full-text data can be reconciled. Not generalizable to all leaf/extract preparations. |
| mitragynine_pseudoindoxyl | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| morphine_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| morphine_6_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| n_desethyl_isotonitazene | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| n_desmethylloperamide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| n_desmethyltramadol | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| nalmefene_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| naloxone_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| norbuprenorphine | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| norcarfentanil | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| norcodeine | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| norfentanyl | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| norhydrocodone | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| normeperidine | [gap] DailyMed Demerol injection 12.3 gives 15-30 h without a mean/median; all numeric fields 0 pending a defensible typical value. Neurotoxic metabolite and renal accumulation are priority gaps. |
| noroxycodone | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| oxycodone | [gap] DailyMed oxycodone IR, 12.3 Excretion reports apparent half-life 3.5-4 h but gives no unique mean/median in that passage. All numeric half-lives left 0 rather than inventing a typical midpoint. IR/ER combined route also requires product-specific assessment. |
| oxymorphone | [gap] DailyMed oxymorphone IR 12.3 Table 3 reports single-dose means +/- SD: 5 mg 7.25 +/- 4.40 h, 10 mg 7.78 +/- 3.58 h, 20 mg 9.43 +/- 3.36 h; prose gives 9-11 h. Five-mg mean minus 2 SD is negative. Choosing only the other cohorts would omit that uncertainty. All three numbers left 0 pending observed positive range/full-text reconciliation rather than clipping or inventing a pooled typical. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=dcb5b5d2-7d0a-497a-8f1e-3b96fd43320b&version=17 |
| oxymorphone_3_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |
| tapentadol_o_glucuronide | [gap] No compound-specific terminal elimination half-life in healthy adults retrieved; zero is missing data, not instantaneous elimination. |

### Molecular-weight gaps

3_methoxymorphinan, 6_monoacetylmorphine, 6beta_naltrexol, 9_o_demethylmitragynine, buprenorphine_3_glucuronide, carfentanil, codeine_6_glucuronide, dextrorphan, eddp, emdp, hydromorphone_3_glucuronide, hydroxybutorphanol, isotonitazene, levorphanol_3_glucuronide, mc5, mitragynine_pseudoindoxyl, morphine_3_glucuronide, morphine_6_glucuronide, n_desethyl_isotonitazene, n_desmethylloperamide, n_desmethyltramadol, nalmefene_3_glucuronide, naloxone_3_glucuronide, norbuprenorphine, norcarfentanil, norcodeine, norfentanyl, norhydrocodone, normeperidine, noroxycodone, o_desmethyltramadol, oxymorphone_3_glucuronide, tapentadol_o_glucuronide. Free-base identity or value not confirmed; no salt mass substituted.

### All unquantified incoming links

| Child ID | Incoming parents retained at fraction 0 (unknown) |
|---|---|
| 3_methoxymorphinan | dextromethorphan |
| 6_monoacetylmorphine | heroin |
| 6beta_naltrexol | naltrexone |
| 7_hydroxymitragynine | mitragynine |
| 9_o_demethylmitragynine | mitragynine |
| buprenorphine_3_glucuronide | buprenorphine |
| dextrorphan | dextromethorphan |
| eddp | methadone |
| emdp | methadone |
| hydromorphone | hydrocodone |
| hydroxybutorphanol | butorphanol |
| levorphanol_3_glucuronide | levorphanol |
| mc5 | tianeptine |
| mitragynine_pseudoindoxyl | 7_hydroxymitragynine |
| morphine | 6_monoacetylmorphine |
| n_desethyl_isotonitazene | isotonitazene |
| n_desmethylloperamide | loperamide |
| n_desmethyltramadol | tramadol |
| nalmefene_3_glucuronide | nalmefene |
| naloxone_3_glucuronide | naloxone |
| norbuprenorphine | buprenorphine |
| norcarfentanil | carfentanil |
| norfentanyl | fentanyl |
| norhydrocodone | hydrocodone |
| normeperidine | meperidine |
| noroxycodone | oxycodone |
| o_desmethyltramadol | tramadol |
| oxymorphone | oxycodone |
| oxymorphone_3_glucuronide | oxymorphone |

### Product notes and sources

Values below are section-level notes embedded in each product source, so there are no extra product schema keys.

#### 7_hydroxymitragynine_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### buprenorphine_buccal

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] DailyMed Belbuca 12.3: multiple-dose mean 27.6 +/- 11.2 h. Recorded for review, not assumed to prove release-limited elimination; no apparent override entered. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=bc2b7a3d-72cf-497c-95b0-ba2b71f63c64

#### buprenorphine_sc_depot_sublocade_brixadi

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: Sublocade, weekly Brixadi and monthly Brixadi are combined in one candidate route and have different regimens; no defensible shared dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Checked DailyMed 12.3: Sublocade 43-60 days (1032-1440 h), Brixadi weekly 3-5 days (72-120 h), Brixadi monthly 19-26 days (456-624 h). Different products, not a population range; no blended override entered. Must resolve product identity before plotting depot. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6189fb21-9432-45f8-8481-0bfaf3ccde95 ; https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5d8a8fd0-8619-422a-a664-d1d2e8970f48

#### buprenorphine_sublingual

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [checked] DailyMed buprenorphine sublingual label, Dosage and Administration: recommended target 16 mg once daily (buprenorphine moiety); adult OUD maintenance context. Review salt-versus-moiety dosing basis before mg conversion. https://dailymed.nlm.nih.gov/dailymed/downloadpdffile.cfm?setId=248524c6-4c8b-a450-e063-6394a90a81ef
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### buprenorphine_transdermal

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; patch label uses micrograms/hour and individualized titration, not one mg bolus. Total patch content must not be treated as delivered dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [checked] DailyMed Butrans 12.3: apparent terminal half-life approximately 26 h after patch removal; single value all three equal. Concentrations first decrease about 50% within 10-24 h. Post-removal value does not model continuous on-patch input. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=794aa355-66de-41b8-aedf-f2c40f6bc664

#### butorphanol_in

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### butorphanol_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### carfentanil_illicit

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### codeine_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### dextromethorphan_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### fentanyl_buccal

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### fentanyl_illicit

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### fentanyl_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### fentanyl_transdermal

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; patch dosing is a rate in micrograms/hour, not a single mg maintenance bolus.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [checked] DailyMed fentanyl transdermal system 12.3 Specific Populations: healthy adults age 18-45 mean half-life 23.5 h after 72-hour application, compared with elderly mean 34.4 h (excluded from healthy-younger-adult reference). Only a cohort mean, no individual range in reviewed passage; all three equal 23.5. Label also reports 20-27 h for average 50% decline after patch removal; that range of averages is not an observed individual range. On-patch continuous input not represented by instantaneous dosing. https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=e15a7e9b-8025-49dd-9a6d-bafcccf1959f

#### heroin_intranasal

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### heroin_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### heroin_smoked

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### hydrocodone_oral_ir_er

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Combined IR/ER route retained unchanged; distinct formulation kinetics cannot be represented by one override. No midpoint or blended apparent half-life entered.

#### hydromorphone_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### hydromorphone_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### isotonitazene_illicit

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### levorphanol_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### loperamide_oral_incl_high_dose_misuse

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: combined therapeutic oral and high-dose-misuse route has no single meaningful maintenance dose; no misuse dose populated.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### meperidine_im_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### meperidine_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### methadone_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] DailyMed methadone, 2.7: common OUD maintenance range 80-120 mg/day. No unique usual dose provided; 0 retained rather than inventing a midpoint. Analgesia dosing differs. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6da7501b-b881-4bc7-891a-74214a00a3ac
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### mitragynine_oral_leaf_extract

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### morphine_iv

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### morphine_oral_ir_er

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Combined IR/ER route retained unchanged; distinct formulation kinetics cannot be represented by one override. No midpoint or blended apparent half-life entered.

#### nalmefene_in

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; rescue antagonist has no usual maintenance dose. Label rescue-device amount is not a maintenance dose; combined routes and combination products need separate review.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### nalmefene_iv_im

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; rescue antagonist has no usual maintenance dose. Label rescue-device amount is not a maintenance dose; combined routes and combination products need separate review.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### naloxone_in

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; rescue antagonist has no usual maintenance dose. Label rescue-device amount is not a maintenance dose; combined routes and combination products need separate review.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### naloxone_iv_im

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; rescue antagonist has no usual maintenance dose. Label rescue-device amount is not a maintenance dose; combined routes and combination products need separate review.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### naloxone_sl_with_buprenorphine

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; rescue antagonist has no usual maintenance dose. Label rescue-device amount is not a maintenance dose; combined routes and combination products need separate review.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### naltrexone_im_depot_vivitrol

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [checked] DailyMed Vivitrol, 2: 380 mg IM every 4 weeks or once monthly; per injection, not per day. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=cd11c435-b0f0-4bb9-ae78-60f101f3703f
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] DailyMed Vivitrol 12.3: 5-10 days (120-240 h), polymer-erosion dependent; no unique mean/median provided. Override deliberately left absent, because arbitrary midpoint would violate the requested typical definition. This product must not inherit oral 4 h as a valid depot simulation. Reviewer must select a representative value from product PK data.

#### naltrexone_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [checked] DailyMed naltrexone tablet, Dosage and Administration/Treatment of Alcoholism: 50 mg once daily for most patients. Labeled tablet dose basis must be reviewed against free-base MW. https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=57e8b767-54c2-dfa3-e063-6394a90ae6c2
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### oxycodone_oral_ir_er

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Combined IR/ER route retained unchanged; distinct formulation kinetics cannot be represented by one override. No midpoint or blended apparent half-life entered.

#### oxymorphone_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### pentazocine_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### tapentadol_oral_ir_er

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Combined IR/ER route retained unchanged; distinct formulation kinetics cannot be represented by one override. No midpoint or blended apparent half-life entered.

#### tianeptine_oral

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set; nonprescription recreational, illicit or novel-product dose intentionally 0. No prescription combination dose mapped to this generic product.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] No release-limited override entered for this route; absence is not confirmation that the intrinsic parent value applies to every formulation.

#### tramadol_oral_ir_er

- **class:** [recall] Short pharmacological class from standard pharmacology; verify target efficacy and formulation.
- **typicalDose:** [gap] Reviewer to set: no single usual adult maintenance dose established for this generic route. Do not substitute an initiation dose, PRN dose or maximum daily dose.
- **aliases:** [checked] Original aliases copied unchanged from tools/candidates.json. Brand/formulation specificity is unreviewed; alias presence does not establish interchangeability.
- **apparentHalfLife:** [gap] Combined IR/ER route retained unchanged; distinct formulation kinetics cannot be represented by one override. No midpoint or blended apparent half-life entered.

## 4. Conflicts and source limitations

- **Methadone:** [DailyMed label, 12.3](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=6da7501b-b881-4bc7-891a-74214a00a3ac) gives multiple-dose 8-59 h. [Primary acute/chronic study abstract](https://pubmed.ncbi.nlm.nih.gov/1149368/) gives chronic 22.2 h versus acute phases 14.3 and 54.8 h. Draft selects chronic 22.2 within 8-59, explicitly not a pooled healthy-adult mean. [Healthy-subject study](https://pubmed.ncbi.nlm.nih.gov/9354306/) reports estimated terminal 33-46 h and warns of sampling duration. Reviewer must resolve phase and population.

- **Buprenorphine:** [Healthy-volunteer study under naltrexone block](https://pubmed.ncbi.nlm.nih.gov/14563545/) reports approximately 26 h (9-69); [SL label](https://dailymed.nlm.nih.gov/dailymed/downloadpdffile.cfm?setId=248524c6-4c8b-a450-e063-6394a90a81ef) gives means 31-35 h. Wider 9-69 retained; candidate has multiple delivery forms with distinct profiles. [Belbuca label](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=bc2b7a3d-72cf-497c-95b0-ba2b71f63c64) gives multiple-dose 27.6 +/- 11.2 h, recorded but not assumed release-limited.

- **Morphine:** [Label Excretion](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=67b3273e-af71-4dac-8e49-8bc134d4c591) gives effective terminal 2 h versus longer-sampled terminal about 15 h. Wider 2-15 envelope retained with 2 h as the explicitly effective estimate; reviewer must decide which phase the model should use.

- **Oxymorphone:** [Label 12.3 Table 3](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=dcb5b5d2-7d0a-497a-8f1e-3b96fd43320b&version=17) gives 7.25 +/- 4.40, 7.78 +/- 3.58 and 9.43 +/- 3.36 h across dose cohorts, while prose gives 9-11 h. A mean-minus-2SD bound is negative in one cohort. Numeric triple remains 0 instead of inventing a clipped wider range.

- **Meperidine:** [Demerol 12.3](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b31d1308-28c3-43f4-e0a6-2f3ed76b8975) states 2-5 h, then 3-8 h in healthy volunteers under hepatic impairment. Envelope 2-8 recorded in note, no unique typical retrieved, so triple 0. Normeperidine 15-30 h also lacks a retrieved mean.

- **Fentanyl:** [Injection label 12.3](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=1ed25b2c-334e-4021-ada1-3396f07630dc) gives 219 min (3.65 h); [patch label 12.3](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=e15a7e9b-8025-49dd-9a6d-bafcccf1959f) describes IV-infusion comparator about 7 h (3-12). Wider IV envelope 3-12 retained with injection typical 3.65, explicitly a cross-protocol envelope. Patch young-adult mean 23.5 h is used only on transdermal product; elderly 34.4 h excluded. Average patch-removal decline 20-27 h is not an individual range.

- **MC5:** [Healthy-volunteer crossover abstract](https://pubmed.ncbi.nlm.nih.gov/2341111/) gives 7.2 +/- 5.7 h, while [renal study healthy controls](https://pubmed.ncbi.nlm.nih.gov/2096105/) give 4.9 +/- 1.7 h; renal-patient 14.2 +/- 9.3 h excluded from healthy reference. Requested mean-minus-2SD is negative in first study; no fabricated positive truncation used. Triple remains 0.

- **Kratom:** [Primary single/multiple-dose leaf study abstract](https://pubmed.ncbi.nlm.nih.gov/38474495/) gives highest cohort means, not generic typical values: mitragynine 43.4/67.9 h and 7-OH 4.7/24.7 h. These are dose/formation context differences, not one subject range. All kratom compound triples remain 0 pending full cohort review.

- **Hydrocodone:** [Label PK](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=82b7fd34-02ac-434a-be38-a1f0ec4f3e50) states 3.8 +/- 0.3 h in five adult men; treating dispersion as SD is an explicit estimate that needs confirmation from the original study.

## 5. Structure concerns (unchanged)

- **Combined depot route:** buprenorphine_sc_depot_sublocade_brixadi mixes Sublocade, weekly Brixadi and monthly Brixadi. Their product labels give different apparent-half-life ranges and regimens. No shared dose or blended override was entered. Reviewer should authorize separate product identities before using this route.

- **Combined oral IR/ER routes:** morphine, hydrocodone, oxycodone, tramadol and tapentadol do not specify individual release forms. IR compound references were not silently presented as ER product PK.

- **Combination products represented as one parent:** naloxone SL with buprenorphine is one naloxone product, while buprenorphine aliases include Suboxone. Pentazocine oral uses a pentazocine/naloxone label but tracks one parent. Hydrocodone/codeine/oxycodone aliases also include combination brands. Aliases and parent links retained; these entries cannot automatically add both active ingredients.

- **Buprenorphine metabolite coverage:** candidate includes norbuprenorphine and buprenorphine-3-glucuronide but no norbuprenorphine glucuronide. Possible omission; do not imply that all active downstream species are represented.

- **Methadone -> EMDP:** both EDDP and EMDP are direct children in the queue. EMDP pathway relationships should be checked in a primary metabolic scheme before entering fractions; no topology change or assumed sequential conversion made.

- **Dextromethorphan downstream products:** queue contains dextrorphan and 3-methoxymorphinan but not their further shared demethylated/conjugated products. The primary CYP2D6/CYP3A metabolism study [abstract](https://pubmed.ncbi.nlm.nih.gov/8220439/) describes multiple demethylated products; coverage may be incomplete.

- **Kratom leaf/extract vs isolated alkaloids:** mitragynine leaf/extract route is a mixture represented as one compound; 7-OH products may contain 7-OH directly, while its leaf PK can be formation limited. Pseudoindoxyl link and human in-vivo relevance need review; not changed.

- **Categories:** dextromethorphan and tianeptine are placed under opioids by the provided queue. Dextromethorphan is an antitussive/dissociative and tianeptine an atypical antidepressant with opioid activity; category placement may be intentional for intake workflow. Preserved unchanged.

- **Shared active metabolites:** morphine, hydromorphone and oxymorphone are also administered drugs; identities and incoming edges remain shared. CYP2D6 changes formation of active products, which cannot be represented solely by scaling a parent elimination half-life.

## 6. Validation

After completing the opioid category, an independent in-memory validation passed: JSON syntax, specified required fields/types, permitted enums, original IDs/names/aliases, exact candidate category and route mapping, all 443 original link structures, existing references, no cycles, no duplicates, sorted compound/product IDs, finite numeric values, positive filled half-life triples, min <= typical <= max, all outgoing fraction sums <=1 (maximum 0.95), all QT weights 0, every verified false and every verifiedDate empty, draft source prefixes and section provenance tags. All 312 route products were reconciled to the queue.

`npm run validate` was attempted after a package manifest appeared in the shared workspace. It failed with ERR_MODULE_NOT_FOUND because tools/validate-drugs.ts did not exist at that time. This was missing project tooling, not a reported dataset validation failure. No code was added or changed to work around it. The independent checks above do not certify pharmacology, validate current CredibleMeds tiers, or remove the listed gaps.

Next session: start **sedatives, diazepam, candidate order 27**; preserve and review the opioid drafts and shared compounds, and back up the existing library before continuing.
