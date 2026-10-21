# Migration to schema 2.1

Run on 2026-10-20 by `npm run migrate-v2.1` (docs/ClearDate_Spec_v2.1.md §5). The v2 file is kept as `backups/drugs.v2-backup.json`.

## Summary

| Change | Count |
|---|---|
| `schemaVersion` 2 → 2.1 | 1 |
| `clinicalRelevance` added to compounds | 443 |
| … `active` (parent compound) | 212 |
| … `active` (metabolite that is a product's primary component) | 15 |
| … `unknown` (metabolite, not assessed) | 216 |
| `relevance` added to provenance (null) and sourceNotes ("") | 443 |
| `reviewedDates: {}` added | 443 compounds, 340 products |
| CYP2D6 inhibitor reset to `unassessed` | 9 |
| Products removed | 1 |

Library after migration: 443 compounds, 340 products.

## CYP2D6 inhibitor reset

Compounds with `cyp2d6.inhibitor: "none"` whose CYP2D6 note says inhibition was not assessed (regex `inhibit[^.]*?(unassessed|not assessed|pending|not established|unconfirmed)`, case-insensitive). `inhibitor` → `unassessed`; `inhibitionType` `none` → `unassessed`. Note appended: "Inhibitor status reset to unassessed by migration v2.1 (note said not assessed)."

| Compound | inhibitor | inhibitionType |
|---|---|---|
| `buprenorphine` | none → unassessed | none → unassessed |
| `codeine` | none → unassessed | none → unassessed |
| `dextromethorphan` | none → unassessed | none → unassessed |
| `hydrocodone` | none → unassessed | none → unassessed |
| `loperamide` | none → unassessed | none → unassessed |
| `norbuprenorphine` | none → unassessed | none → unassessed |
| `oxycodone` | none → unassessed | none → unassessed |
| `tapentadol` | none → unassessed | none → unassessed |
| `tramadol` | none → unassessed | none → unassessed |

## Products removed

- `baclofen_intrathecal` removed; patient sessions are offered `baclofen_oral` as the replacement, and its `sourceNotes.input` notes that intrathecal dosing is not modelled.

## Clinical relevance

Parents and compounds dosed directly are always treated as active. Every other metabolite starts as `unknown`: it still blocks clear dates when its kinetics are unknown, until a reviewer sets it to `inactive` (or `active`).

**Metabolites set to `active` because a product doses them directly (15):** `7_hydroxymitragynine`, `amphetamine`, `desipramine`, `desvenlafaxine`, `ghb`, `hydromorphone`, `lsd`, `mda`, `morphine`, `noribogaine`, `nortriptyline`, `oxazepam`, `oxymorphone`, `paliperidone`, `temazepam`

<details><summary>Metabolites set to <code>unknown</code> (216)</summary>

`10_hydroxyamitriptyline`, `10_hydroxynortriptyline`, `11_hydroxyyohimbine`, `11_oh_delta8_thc`, `11_oh_thc`, `14_hydroxyclarithromycin`, `1_hydroxymidazolam`, `25_desacetylrifampin`, `2_ene_vpa`, `2_hydroxydesipramine`, `2_hydroxyimipramine`, `2_oxo_3_hydroxy_lsd`, `3_4_5_trimethoxyphenylacetic_acid`, `3_4_catechol_pv`, `3_hydroxyguanfacine`, `3_hydroxyquinidine`, `3_methoxymorphinan`, `4_bromo_2_5_dimethoxyphenylacetic_acid`, `4_ene_vpa`, `4_hiaa`, `4_hydroxyalprazolam`, `4_hydroxyamphetamine`, `4_hydroxyatomoxetine`, `4_hydroxyduloxetine_glucuronide`, `4_hydroxymethamphetamine`, `4_hydroxynebivolol`, `4_hydroxyphenyl_carvedilol`, `4_hydroxypropranolol`, `4_hydroxytamoxifen`, `4_hydroxytolyl_mephedrone`, `4_oh_3_meo_pv`, `5_hydroxyomeprazole`, `5_hydroxypropafenone`, `5_oxozaleplon`, `6_hydroxymelatonin`, `6_monoacetylmorphine`, `6beta_naltrexol`, `7_aminoclonazepam`, `7_cooh_cbd`, `7_hydroxychlorpromazine`, `7_hydroxyfluphenazine`, `7_hydroxywarfarin`, `7_oh_cbd`, `7alpha_thiomethylspironolactone`, `8_hydroxyefavirenz`, `8_hydroxymirtazapine`, `9_o_demethylmitragynine`, `acetaldehyde`, `apap_glucuronide_sulfate`, `benzoylecgonine`, `bufotenine`, `buprenorphine_3_glucuronide`, `canrenone`, `carbamazepine_10_11_epoxide`, `carbon_disulfide`, `cetirizine`, `clopidogrel_active_thiol_metabolite`, `clopidogrel_acyl_glucuronide`, `clozapine_n_oxide`, `cocaethylene`, `codeine_6_glucuronide`, `cotinine`, `cvt_2738`, `dehydroaripiprazole`, `dehydronorketamine`, `delta8_thc_cooh`, `demoxepam`, `desacetyldiltiazem`, `desalkylflurazepam`, `desethylamiodarone`, `desethylhydroxychloroquine`, `desmethylazithromycin`, `desmethylcariprazine`, `desmethylchlordiazepoxide`, `desmethylcitalopram`, `desmethylclomipramine`, `desmethylcyclobenzaprine`, `desmethylselegiline`, `desmethylterbinafine`, `dextrorphan`, `didesmethylcariprazine`, `didesmethylcitalopram`, `diethyldithiocarbamate`, `dihydrodigoxin`, `dm_3411`, `dmt_n_oxide`, `ecgonine_methyl_ester`, `eddp`, `emdp`, `endoxifen`, `erythrohydrobupropion`, `ethylphenidate`, `exp3174`, `fluphenazine_sulfoxide`, `furosemide_glucuronide`, `harmalol`, `harmol`, `hma`, `hmea`, `hmma`, `hpph`, `hydromorphone_3_glucuronide`, `hydroxy_suvorexant`, `hydroxyalprazolam`, `hydroxybupropion`, `hydroxybutorphanol`, `hydroxyetizolam`, `hydroxyitraconazole`, `hydroxymethylmexiletine`, `hydroxymetoprolol`, `hydroxynefazodone`, `hydroxynorketamine`, `hydroxytriazolam`, `id_14283`, `indole_3_acetic_acid`, `lamotrigine_2_n_glucuronide`, `levoamphetamine`, `levomethamphetamine`, `levorphanol_3_glucuronide`, `licarbazepine`, `lorazepam_glucuronide`, `m_cpp`, `mc5`, `mdmb_4en_pinaca_butanoic_acid`, `meprobamate`, `mesoridazine`, `meta_o_dealkylated_flecainide`, `mitragynine_pseudoindoxyl`, `modafinil_acid`, `modafinil_sulfone`, `mono_n_dealkyldisopyramide`, `morphine_3_glucuronide`, `morphine_6_glucuronide`, `muscimol`, `n_acetylprocainamide`, `n_debutyl_dronedarone`, `n_depropylpropafenone`, `n_desethyl_isotonitazene`, `n_desmethylatomoxetine`, `n_desmethylclobazam`, `n_desmethyldiltiazem`, `n_desmethyldiphenhydramine`, `n_desmethyldoxylamine`, `n_desmethylerythromycin`, `n_desmethylloperamide`, `n_desmethylmirtazapine`, `n_desmethylolanzapine`, `n_desmethylpromethazine`, `n_desmethylsertraline`, `n_desmethylsildenafil`, `n_desmethyltamoxifen`, `n_desmethyltramadol`, `n_desmethylzopiclone`, `nalmefene_3_glucuronide`, `naloxone_3_glucuronide`, `napqi`, `nor_lsd`, `norbuprenorphine`, `norcarfentanil`, `norclozapine`, `norcocaine`, `norcodeine`, `nordiazepam`, `nordoxepin`, `norephedrine`, `noresketamine`, `norfentanyl`, `norfluoxetine`, `norhydrocodone`, `noribogaine_glucuronide`, `norketamine`, `normeperidine`, `normephedrone`, `normethoxetamine`, `noroxycodone`, `norquetiapine`, `norverapamil`, `o_desmethyl_lacosamide`, `o_desmethyl_mxe`, `o_desmethylmesembrine`, `o_desmethylmetoprolol`, `o_desmethyltramadol`, `oh_alpha_pvp`, `olanzapine_10_glucuronide`, `omeprazole_sulfone`, `oxazepam_glucuronide`, `oxymorphone_3_glucuronide`, `p88`, `p95`, `p_hydroxyphenobarbital`, `paraxanthine`, `pchp`, `phenylacetic_acid`, `phenylethylidenehydrazine`, `ppc`, `prednisolone`, `promethazine_sulfoxide`, `psilocin`, `psilocin_o_glucuronide`, `pvp_lactam`, `reduced_haloperidol`, `ritalinic_acid`, `s_18982`, `s_desmethylcitalopram`, `salvinorin_b`, `sulforidazine`, `tapentadol_o_glucuronide`, `temazepam_glucuronide`, `thc_cooh`, `theobromine`, `theophylline`, `threohydrobupropion`, `trans_3_hydroxycotinine`, `triazoledione`, `ucb_l057`, `zopiclone_n_oxide`

</details>

<details><summary>Parent compounds set to <code>active</code> (212)</summary>

`1_4_butanediol`, `1p_lsd`, `2c_b`, `5_htp`, `5_meo_dmt`, `acetaminophen`, `adb_butinaca`, `alprazolam`, `amiodarone`, `amitriptyline`, `amlodipine`, `apixaban`, `aripiprazole`, `armodafinil`, `atenolol`, `atomoxetine`, `azithromycin`, `baclofen`, `bisoprolol`, `brexpiprazole`, `bromazolam`, `buprenorphine`, `bupropion`, `butalbital`, `butorphanol`, `caffeine`, `cannabidiol`, `carbamazepine`, `carfentanil`, `cariprazine`, `carisoprodol`, `carvedilol`, `chlordiazepoxide`, `chlorpromazine`, `cinacalcet`, `ciprofloxacin`, `citalopram`, `clarithromycin`, `clobazam`, `clomipramine`, `clonazepam`, `clonidine`, `clopidogrel`, `clorazepate`, `clozapine`, `cocaine`, `codeine`, `cyclobenzaprine`, `delta8_thc`, `delta9_thc`, `dextromethorphan`, `diazepam`, `digoxin`, `diltiazem`, `diphenhydramine`, `disopyramide`, `disulfiram`, `dmt`, `dofetilide`, `domperidone`, `doxepin`, `doxylamine`, `dronedarone`, `duloxetine`, `efavirenz`, `ephedrine`, `erythromycin`, `escitalopram`, `esketamine`, `eszopiclone`, `ethanol`, `etizolam`, `fentanyl`, `flecainide`, `flubromazolam`, `fluconazole`, `fluoxetine`, `fluphenazine`, `flurazepam`, `fluvoxamine`, `furosemide`, `gabapentin`, `gbl`, `guanfacine`, `haloperidol`, `harmaline`, `harmine`, `heroin`, `hydrochlorothiazide`, `hydrocodone`, `hydroxychloroquine`, `hydroxyzine`, `hyperforin`, `ibogaine`, `ibotenic_acid`, `iloperidone`, `imipramine`, `isocarboxazid`, `isotonitazene`, `itraconazole`, `ivabradine`, `kavalactones`, `ketamine`, `ketoconazole`, `l_tryptophan`, `lacosamide`, `lamotrigine`, `levetiracetam`, `levofloxacin`, `levomilnacipran`, `levorphanol`, `lisdexamfetamine`, `lithium`, `lofexidine`, `loperamide`, `lorazepam`, `losartan`, `lurasidone`, `mdea`, `mdma`, `mdmb_4en_pinaca`, `mdpv`, `melatonin`, `meperidine`, `mephedrone`, `mescaline`, `mesembrine`, `methadone`, `methamphetamine`, `methoxetamine`, `methylphenidate`, `metoclopramide`, `metoprolol`, `mexiletine`, `midazolam`, `milnacipran`, `mirabegron`, `mirtazapine`, `mitragynine`, `moclobemide`, `modafinil`, `moxifloxacin`, `nalmefene`, `naloxone`, `naltrexone`, `nebivolol`, `nefazodone`, `nicotine`, `nitrous_oxide`, `olanzapine`, `omeprazole`, `ondansetron`, `oxcarbazepine`, `oxycodone`, `paroxetine`, `pcp`, `pentazocine`, `phenelzine`, `phenibut`, `phenobarbital`, `phentermine`, `phenytoin`, `pimozide`, `prednisone`, `pregabalin`, `procainamide`, `promethazine`, `propafenone`, `propranolol`, `pseudoephedrine`, `psilocybin`, `pvp`, `quetiapine`, `quinidine`, `ranolazine`, `rifampin`, `risperidone`, `ritonavir`, `rivaroxaban`, `salvinorin_a`, `selegiline`, `semaglutide`, `sertraline`, `sildenafil`, `sotalol`, `spironolactone`, `suvorexant`, `tamoxifen`, `tapentadol`, `terbinafine`, `thioridazine`, `tianeptine`, `tirzepatide`, `tizanidine`, `topiramate`, `tramadol`, `tranylcypromine`, `trazodone`, `triazolam`, `valproate`, `varenicline`, `venlafaxine`, `verapamil`, `vilazodone`, `vortioxetine`, `warfarin`, `yohimbine`, `zaleplon`, `ziprasidone`, `zolpidem`, `zopiclone`, `zuranolone`

</details>
