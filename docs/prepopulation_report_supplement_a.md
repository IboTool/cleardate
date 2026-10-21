# ClearDate prepopulation — Supplement A
Draft evidence pass, 20 October 2026. Parts 1, 2 and 3 were performed in that order. All data remain unverified; no reviewer sections or verification dates were changed. “Computable” below means structural kinetics availability in the app, **not** a clinical clearance recommendation, adequate cardiac screening, or completion of pharmacologist review.
Baseline: `backups/drugs.before-supplement-a.json` (created before Part 1; not overwritten). Machine-readable product statuses, reachable blocker/product associations and audit scope are in `backups/supplement-a-audit.json`. The historical v2.1 report remains unchanged.
## 1. Before / after product status
Counts use the actual `buildIndex` and `productDataStatus(idx, product, false)` exports from `src/model.ts`, with the library’s default relevance rules. Unknown kinetics are not treated as formation-limited. Primary-component absence gives “No data yet”; otherwise any required missing kinetics gives “Incomplete”. No-data and incomplete are mutually exclusive. A usable range can have a null typical value.
| Category | Computable before | after | Incomplete before | after | No data before | after |
| --- | --- | --- | --- | --- | --- | --- |
| Opioids & OUD treatments | 12 | 23 | 28 | 23 | 9 | 3 |
| Benzodiazepines & sedatives | 21 | 30 | 11 | 11 | 15 | 6 |
| Antidepressants | 25 | 25 | 10 | 11 | 2 | 1 |
| Antipsychotics | 0 | 0 | 0 | 0 | 31 | 31 |
| Mood stabilisers & anticonvulsants | 0 | 0 | 0 | 0 | 15 | 15 |
| Stimulants | 0 | 0 | 0 | 0 | 27 | 27 |
| Psychedelics, entactogens & dissociatives | 0 | 0 | 0 | 2 | 43 | 41 |
| Cardiovascular | 0 | 0 | 0 | 0 | 48 | 48 |
| Antimicrobials, antiemetics & other interactors | 0 | 0 | 0 | 0 | 43 | 43 |
| **Overall (340)** | 58 | 78 | 49 | 47 | 233 | 215 |


After Parts 1–2: **58 computable / 51 Incomplete / 231 No data yet**. After Part 3: **78 / 47 / 215**. Two investigational products move from no-data to incomplete; they remain blocked by noribogaine glucuronide. Kratom leaf moves from no-data to incomplete; its metabolite gaps remain.
<details><summary>Every product whose status changed</summary>

| Product ID | Before | After |
| --- | --- | --- |
| `"1_4_butanediol_oral"` | no-data | ok |
| `"chlordiazepoxide_oral"` | no-data | incomplete |
| `"clobazam_oral"` | no-data | ok |
| `"clonazepam_oral"` | no-data | incomplete |
| `"desipramine_oral"` | no-data | incomplete |
| `"ghb_oral"` | no-data | ok |
| `"ibogaine_oral_flood_booster"` | no-data | incomplete |
| `"levorphanol_oral"` | no-data | incomplete |
| `"meperidine_im_iv"` | no-data | ok |
| `"meperidine_oral"` | no-data | ok |
| `"mitragynine_oral_leaf_extract"` | no-data | incomplete |
| `"morphine_iv"` | incomplete | ok |
| `"morphine_oral_er"` | incomplete | ok |
| `"morphine_oral_ir"` | incomplete | ok |
| `"naloxone_in"` | incomplete | ok |
| `"naloxone_iv_im"` | incomplete | ok |
| `"noribogaine_oral"` | no-data | incomplete |
| `"oxycodone_oral_er"` | no-data | incomplete |
| `"oxycodone_oral_ir"` | no-data | incomplete |
| `"phenobarbital_iv"` | incomplete | ok |
| `"phenobarbital_oral"` | incomplete | ok |
| `"promethazine_im"` | no-data | ok |
| `"promethazine_oral"` | no-data | ok |
| `"promethazine_rectal"` | no-data | ok |
| `"suvorexant_oral"` | incomplete | ok |
| `"tapentadol_oral_er"` | incomplete | ok |
| `"tapentadol_oral_ir"` | incomplete | ok |
| `"tramadol_oral_er"` | incomplete | ok |
| `"tramadol_oral_ir"` | incomplete | ok |
| `"triazolam_oral"` | no-data | incomplete |


</details>

## 2. Part 1 — ibogaine, noribogaine and glucuronide
All requested compound sections and both matching products were assessed. The tables record entire field objects so that null subfields remain visible. `checked` means the named passage/value was read, including primary abstracts/label excerpts; `estimate` identifies an inference or mixed-source envelope; `recall` requires source checking; `gap` is unresolved. An empty list or null is not a negative finding. Full contextual evidence is in the matching `sourceNotes` in the library.
### ibogaine
| Field | Value (hours unless named otherwise) | Tag | Source |
| --- | --- | --- | --- |
| `"kinetics"` | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":1.6,"max":6,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC5996271/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25651476/) |
| `"formedFrom"` | `[]` | checked | [source 1](https://dmd.aspetjournals.org/article/S0090-9556%2824%2904019-4/fulltext) |
| `"clinicalRelevance"` | `"active"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254) |
| `"molecularWeight"` | `310.4` | checked | [source 1](https://pubchem.ncbi.nlm.nih.gov/compound/Ibogaine) |
| `"cyp2d6"` | `{"substrate":"yes","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://dmd.aspetjournals.org/article/S0090-9556%2824%2904019-4/fulltext), [source 3](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"qt"` | `{"tier":"known","weight":null,"referenceAmountMg":null}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/26329675/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC3853361/), [source 3](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"receptors"` | `[{"target":"SERT","action":"inhibitor"},{"target":"hERG (Kv11.1)","action":"inhibitor"}]` | checked | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC6750207/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/) |
| `"receptorsAssessed"` | `true` | checked | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC6750207/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/) |
| `"lingeringEffects"` | `{"durationDays":null,"note":"QT effects can outlast acute experience; no fixed extra duration added to modeled parent/metabolite clearance."}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/28489458/) |
| `"nonlinearKinetics"` | `{"flag":"unassessed","note":""}` | gap | Evidence gap / see discussion |


### noribogaine
| Field | Value (hours unless named otherwise) | Tag | Source |
| --- | --- | --- | --- |
| `"kinetics"` | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":24,"max":49,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25279818/), [source 2](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254) |
| `"formedFrom"` | `[{"compound":"ibogaine","fraction":null,"cyp2d6Multiplier":null}]` | gap | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/) |
| `"clinicalRelevance"` | `"active"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254) |
| `"molecularWeight"` | `296.4` | checked | [source 1](https://pubchem.ncbi.nlm.nih.gov/compound/Noribogaine) |
| `"cyp2d6"` | `{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}` | gap | Evidence gap / see discussion |
| `"qt"` | `{"tier":"possible","weight":null,"referenceAmountMg":null}` | checked | [source 1](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/) |
| `"receptors"` | `[{"target":"SERT","action":"inhibitor"},{"target":"hERG (Kv11.1)","action":"inhibitor"}]` | checked | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC6750207/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/) |
| `"receptorsAssessed"` | `true` | checked | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC6750207/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/) |
| `"lingeringEffects"` | `{"durationDays":null,"note":"QT effects can outlast acute experience; no fixed extra duration added to modeled parent/metabolite clearance."}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/28489458/) |
| `"nonlinearKinetics"` | `{"flag":"no","note":"Single-dose AUC/Cmax approximately proportional over tested 3-60 mg healthy and 60-180 mg patient ranges; chronic dosing unknown."}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25279818/), [source 2](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254) |


### noribogaine_glucuronide
| Field | Value (hours unless named otherwise) | Tag | Source |
| --- | --- | --- | --- |
| `"kinetics"` | `{"mode":"unknown","halfLifeHours":null,"earlyPhase":null,"steadyState":null}` | gap | [source 1](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"formedFrom"` | `[{"compound":"noribogaine","fraction":null,"cyp2d6Multiplier":null}]` | checked | [source 1](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"clinicalRelevance"` | `"unknown"` | gap | [source 1](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"molecularWeight"` | `null` | gap | Evidence gap / see discussion |
| `"cyp2d6"` | `{"substrate":"unassessed","halfLifeMultiplier":null,"inhibitor":"unassessed","inhibitionType":"unassessed"}` | gap | Evidence gap / see discussion |
| `"qt"` | `{"tier":"unassessed","weight":null,"referenceAmountMg":null}` | gap | Evidence gap / see discussion |
| `"receptors"` | `[]` | gap | Evidence gap / see discussion |
| `"receptorsAssessed"` | `false` | gap | Evidence gap / see discussion |
| `"lingeringEffects"` | `{"durationDays":null,"note":""}` | gap | Evidence gap / see discussion |
| `"nonlinearKinetics"` | `{"flag":"unassessed","note":""}` | gap | Evidence gap / see discussion |


Ibogaine’s **1.6–6 h** range is a provisional envelope of patient-cohort means from [Mash 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5996271/), tagged estimate because it is not a verified healthy-adult baseline. Noribogaine’s healthy single-dose cohort means are **28–49 h**; the stored **24–49 h** envelope also includes patient single-dose means of 24–30 h. No early fraction, separate chronic phase or fixed switch day was invented. [Glue 2015](https://pubmed.ncbi.nlm.nih.gov/25279818/), [Glue 2016](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254).
The healthy CYP2D6/paroxetine experiment reports **10.2 h** ibogaine half-life under inhibition and altered combined exposure. Its accessible primary abstract does not provide a matched uninhibited half-life sufficient for a defensible phenotype ratio. Knuijver’s activity-score clearance model is not itself a half-life multiplier. Thus `halfLifeMultiplier`, ibogaine→noribogaine phenotype formation multipliers and formation fractions remain null. Microsomal percentages are not human systemic formation fractions. [Glue CYP2D6 study](https://pubmed.ncbi.nlm.nih.gov/25651476/), [Knuijver 2024](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873).
### QT evidence for reviewer calibration
| Compound | In-vitro evidence | Human evidence / interpretation |
| --- | --- | --- |
| Ibogaine | hERG IC50 3.9 ± 0.3 µM; [primary channel study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3853361/). | Knuijver 2024 model: maximum QTc increase 67.9 ms, EC50 0.195 µM, imprecise concentration estimate (RSE 64.1%). Human TdP cases support the draft known-risk tier; this does not claim a live CredibleMeds listing. |
| Noribogaine | hERG IC50 approximately 3 µM; [primary cardiomyocyte/channel study](https://pmc.ncbi.nlm.nih.gov/articles/PMC5334404/). | Glue 2016 concentration–QTc slope 0.17 ms/(ng/mL); largest mean increases 16, 28 and 42 ms at 60, 120 and 180 mg. Draft possible-risk tier. Knuijver’s short observation window does not negate this separately dosed evidence. |
| Noribogaine glucuronide | No molecule-specific hERG result established. | No human concentration–QTc relationship established; tier unassessed, relevance unknown. |


Sources: [Knuijver 2024](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873), [Glue 2016](https://accp1.onlinelibrary.wiley.com/doi/10.1002/cpdd.254), [Hildyard human TdP case](https://pubmed.ncbi.nlm.nih.gov/26329675/). Prolonged QT in a [toxicokinetic case](https://pubmed.ncbi.nlm.nih.gov/28489458/) persisted up to 12 days; this is recorded as context, not a universal post-clearance duration. QT weights/reference doses stay null. Receptor entries identify supported main targets rather than a complete binding panel.
### Products
#### ibogaine_oral_flood_booster
| Field | Value | Tag | Source / limitation |
| --- | --- | --- | --- |
| `"class"` | `"Investigational iboga alkaloid"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"aliases"` | `["iboga","Tabernanthe iboga"]` | checked | Candidate queue identity; aliases are not dose equivalence. |
| `"components"` | `[{"compound":"ibogaine","ratio":1,"saltFactor":null,"bioavailability":null}]` | gap | Generic base/HCl/extract and absolute F unresolved; membership and ratio preserved. |
| `"doseUnit"` | `"mg"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"formulation"` | `null` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"input"` | `{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"typicalDose"` | `{"amount":null,"unit":"mg","basis":"maintenance"}` | gap | Reviewer to set; study doses are not maintenance recommendations. |


#### noribogaine_oral
| Field | Value | Tag | Source / limitation |
| --- | --- | --- | --- |
| `"class"` | `"Investigational iboga alkaloid"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"aliases"` | `[]` | checked | Candidate queue identity; aliases are not dose equivalence. |
| `"components"` | `[{"compound":"noribogaine","ratio":1,"saltFactor":null,"bioavailability":null}]` | gap | Generic base/HCl/extract and absolute F unresolved; membership and ratio preserved. |
| `"doseUnit"` | `"mg"` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"formulation"` | `null` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"input"` | `{"type":"bolus","releaseHalfLifeHours":null,"defaultDurationHours":null}` | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/25651476/), [source 2](https://pubmed.ncbi.nlm.nih.gov/25279818/) |
| `"typicalDose"` | `{"amount":null,"unit":"mg","basis":"maintenance"}` | gap | Reviewer to set; study doses are not maintenance recommendations. |


Oral bolus is a model approximation; it does not imply instantaneous absorption. The generic entries cannot identify base versus hydrochloride or extract composition, so no salt/F guess was made. The carried `typicalDose.basis: maintenance` metadata does not create a recommended maintenance regimen: amount is null for both.
## 3. Part 2 — CYP2D6 inhibitor audit
The first five requested compounds were assessed first, followed by every eligible compound reachable from products in opioids, sedatives and antidepressants. **163 compounds** had an unassessed strength or mechanism at baseline. The FDA examples table was consulted; absence from it was never treated as “none”. Existing substrate fields and phenotype half-life maps were not changed by Part 2. [FDA interaction examples](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems).
### Every changed strength or mechanism
| Compound | Inhibitor old → new | Mechanism old → new | Tag | Evidence |
| --- | --- | --- | --- | --- |
| `"bupropion"` | strong → strong | unassessed → reversible | checked | [source 1](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13095643/) |
| `"clobazam"` | weak → weak | unassessed → reversible | recall | [source 1](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems) |
| `"desvenlafaxine"` | unassessed → none | unassessed → none | checked | [source 1](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=9f74708c-6f6a-46cf-8c79-87a25c2bb6f8) |
| `"erythrohydrobupropion"` | unassessed → moderate | unassessed → reversible | estimate | [source 1](https://www.mdpi.com/1999-4923/10/1/1/pdf), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13095643/) |
| `"escitalopram"` | weak → weak | unassessed → reversible | recall | [source 1](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems) |
| `"eszopiclone"` | unassessed → none | unassessed → none | checked | [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=52ab8ee9-a04d-4e27-b0f4-eb050f144715) |
| `"fluvoxamine"` | weak → weak | unassessed → reversible | recall | [source 1](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems) |
| `"hydrocodone"` | unassessed → none | unassessed → none | checked | [source 1](https://www.accessdata.fda.gov/drugsatfda_docs/nda/2014/206627Orig1s000ClinPharmR.pdf) |
| `"hydroxybupropion"` | unassessed → moderate | unassessed → reversible | estimate | [source 1](https://www.mdpi.com/1999-4923/10/1/1/pdf), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13095643/) |
| `"methadone"` | unassessed → unassessed | unassessed → reversible | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/8448065/), [source 2](https://pubmed.ncbi.nlm.nih.gov/22092298/) |
| `"milnacipran"` | unassessed → none | unassessed → none | checked | [source 1](https://pubmed.ncbi.nlm.nih.gov/19608694/) |
| `"naltrexone"` | unassessed → none | unassessed → none | checked | [source 1](https://www.accessdata.fda.gov/drugsatfda_docs/nda/2014/206627Orig1s000ClinPharmR.pdf) |
| `"norfluoxetine"` | unassessed → strong | reversible → reversible | estimate | [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4029899/) |
| `"sertraline"` | weak → weak | unassessed → reversible | recall | [source 1](https://www.sciencedirect.com/science/article/pii/S0022356525386222), [source 2](https://www.fda.gov/drugs/drug-interactions-labeling/healthcare-professionals-fdas-examples-drugs-interact-cyp-enzymes-and-transporter-systems) |
| `"threohydrobupropion"` | unassessed → moderate | unassessed → reversible | estimate | [source 1](https://www.mdpi.com/1999-4923/10/1/1/pdf), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13095643/) |
| `"vilazodone"` | unassessed → none | unassessed → none | checked | [source 1](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=c3e167cd-7f56-45eb-80df-a60fa1392e57) |
| `"vortioxetine"` | unassessed → none | unassessed → none | checked | [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=cb1e9df4-dd74-4073-9d78-bb55593dd000&version=21) |


**Strength-estimate limits:** norfluoxetine’s strong tier is model-derived: the primary static inhibition parameters for R/S species sum to an estimated sensitive-probe AUCr of 5.9. The three bupropion metabolite tiers use isolated-contribution PBPK predictions (hydroxy 4.58, threo 3.47, erythro 2.83). These meet numerical tier thresholds in those models; they are **not FDA classifications from isolated-metabolite clinical DDI trials** and are tagged estimate. [Sager 2014](https://pmc.ncbi.nlm.nih.gov/articles/PMC4029899/), [Xue 2018, Table 5](https://www.mdpi.com/1999-4923/10/1/1/pdf).
Methadone has positive human/in-vitro inhibition evidence and a competitive reversible mechanism, but no confirmed sensitive-probe AUCr supporting a weak/moderate/strong tier. Strength therefore remains unassessed. This is an important unresolved inhibition-track limitation, not evidence of absent inhibition. [Wu 1993](https://pubmed.ncbi.nlm.nih.gov/8448065/), [human phenotyping study](https://pubmed.ncbi.nlm.nih.gov/22092298/).
Bupropion’s reversible mechanism is supported by competitive inhibition work; CYP downregulation does not equal mechanism-based enzyme inactivation. No CYP2D6 mechanism-based assignment was borrowed from another enzyme’s time dependence. Four weak-inhibitor mechanism entries remain tagged recall. Negative classifications retain study/label exposure limits: notably desvenlafaxine ≤100 mg/day; higher doses can affect CYP2D6 substrates. [Primary bupropion/metabolite study](https://pmc.ncbi.nlm.nih.gov/articles/PMC13095643/).
### Strong / moderate parents and persistence
| Parent | Metabolites / inhibitor contribution | Persisting kinetic evidence (hours) |
| --- | --- | --- |
| Fluoxetine — strong | Norfluoxetine active and inhibiting; strong model estimate. | Parent acute 24–72, chronic 96–144; norfluoxetine mean 206.4, range 96–384. Its tail can outlast parent for weeks. |
| Bupropion — strong | Hydroxy-, threohydro- and erythrohydrobupropion inhibit CYP2D6; each moderate model estimate. | Means 20, 37 and 33; existing provisional mean±2SD ranges 10–30, 11–63, 13–53. Metabolite inhibition can outlast parent mean 21. |
| Paroxetine — strong | No separately queued stable metabolite shown here to carry clinically material inhibition; contribution not assumed zero. | Parent acute cohort means 15–20; chronic mean 21 (CV 0.32). Mechanism-based recovery may outlast plasma; no numeric recovery period established. |
| Duloxetine — moderate | Queued 4-hydroxyduloxetine glucuronide contribution remains unresolved; parent inhibition does not classify conjugate. | Parent mean 12, range 8–17; conjugate kinetics and contribution unknown. |


These parent notes were explicitly updated in `sourceNotes.cyp2d6`; the metabolite half-lives above were carried from the existing draft, not re-estimated in Part 2. The bupropion and norfluoxetine tail estimates retain their earlier single-dose/chronic/formed-metabolite limitations.
<details><summary>All 163 required assessments, including unchanged unresolved values</summary>

| Compound | Strength old → new | Mechanism old → new | Tag |
| --- | --- | --- | --- |
| `"10_hydroxyamitriptyline"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"10_hydroxynortriptyline"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"1_4_butanediol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"1_hydroxymidazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"2_hydroxydesipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"2_hydroxyimipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"3_methoxymorphinan"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"4_hydroxyalprazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"4_hydroxyduloxetine_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"5_oxozaleplon"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"6_hydroxymelatonin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"6_monoacetylmorphine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"6beta_naltrexol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"7_aminoclonazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"7_hydroxymitragynine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"8_hydroxymirtazapine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"9_o_demethylmitragynine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"acetaldehyde"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"alprazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"amitriptyline"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"baclofen"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"bromazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"buprenorphine_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"bupropion"` | strong → strong | unassessed → reversible | checked |
| `"butalbital"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"butorphanol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"carfentanil"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"carisoprodol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"cetirizine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"chlordiazepoxide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"citalopram"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"clobazam"` | weak → weak | unassessed → reversible | recall |
| `"clomipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"clonazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"clorazepate"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"codeine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"codeine_6_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"demoxepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desalkylflurazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desmethylchlordiazepoxide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desmethylcitalopram"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desmethylclomipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"desvenlafaxine"` | unassessed → none | unassessed → none | checked |
| `"dextrorphan"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"diazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"didesmethylcitalopram"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"diphenhydramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"doxylamine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"eddp"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"emdp"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"erythrohydrobupropion"` | unassessed → moderate | unassessed → reversible | estimate |
| `"escitalopram"` | weak → weak | unassessed → reversible | recall |
| `"eszopiclone"` | unassessed → none | unassessed → none | checked |
| `"ethanol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"etizolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"fentanyl"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"flubromazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"flurazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"fluvoxamine"` | weak → weak | unassessed → reversible | recall |
| `"gabapentin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"gbl"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"ghb"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"heroin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydrocodone"` | unassessed → none | unassessed → none | checked |
| `"hydromorphone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydromorphone_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxy_suvorexant"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxyalprazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxybupropion"` | unassessed → moderate | unassessed → reversible | estimate |
| `"hydroxybutorphanol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxyetizolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxynefazodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxytriazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hydroxyzine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"hyperforin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"imipramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"isocarboxazid"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"isotonitazene"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"levoamphetamine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"levomethamphetamine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"levomilnacipran"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"levorphanol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"levorphanol_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"loperamide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"lorazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"lorazepam_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"m_cpp"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"mc5"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"melatonin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"meperidine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"meprobamate"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"methadone"` | unassessed → unassessed | unassessed → reversible | checked |
| `"midazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"milnacipran"` | unassessed → none | unassessed → none | checked |
| `"mirtazapine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"mitragynine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"mitragynine_pseudoindoxyl"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"moclobemide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"morphine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"morphine_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"morphine_6_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desethyl_isotonitazene"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylclobazam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethyldiphenhydramine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethyldoxylamine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylloperamide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylmirtazapine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylpromethazine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylsertraline"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethyltramadol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"n_desmethylzopiclone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"nalmefene"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"nalmefene_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"naloxone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"naloxone_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"naltrexone"` | unassessed → none | unassessed → none | checked |
| `"nefazodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"norcarfentanil"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"norcodeine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"nordiazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"nordoxepin"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"norfentanyl"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"norfluoxetine"` | unassessed → strong | reversible → reversible | estimate |
| `"norhydrocodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"normeperidine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"noroxycodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"nortriptyline"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"o_desmethyltramadol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"oxazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"oxazepam_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"oxycodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"oxymorphone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"oxymorphone_3_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"p_hydroxyphenobarbital"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"pentazocine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"phenelzine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"phenibut"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"phenobarbital"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"phenylacetic_acid"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"phenylethylidenehydrazine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"promethazine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"promethazine_sulfoxide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"s_desmethylcitalopram"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"sertraline"` | weak → weak | unassessed → reversible | recall |
| `"tapentadol_o_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"temazepam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"temazepam_glucuronide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"threohydrobupropion"` | unassessed → moderate | unassessed → reversible | estimate |
| `"tianeptine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"tramadol"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"tranylcypromine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"trazodone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"triazolam"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"triazoledione"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"venlafaxine"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"vilazodone"` | unassessed → none | unassessed → none | checked |
| `"vortioxetine"` | unassessed → none | unassessed → none | checked |
| `"zaleplon"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"zolpidem"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"zopiclone"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"zopiclone_n_oxide"` | unassessed → unassessed | unassessed → unassessed | gap |
| `"zuranolone"` | unassessed → unassessed | unassessed → unassessed | gap |


</details>

Codeine, oxycodone, tramadol and loperamide retain unassessed strength: being a CYP2D6 substrate does not establish inhibition; a microsomal Ki alone does not determine clinical strength. Hydrocodone and naltrexone have explicit negative tested-concentration evidence. Unchanged unresolved assessments carry a compound-specific gap note rather than a class-wide “none”.

## 4. Part 3 — recomputed blockers and dispositions
Reachability was computed with `productTree(idx, componentIds(product))`. Each product counts once for each reachable compound with effective relevance other than inactive, no intrinsic usable range, and mode other than formation-limited. Directly dosed compounds use the app’s effective-active rule. This inventory includes blockers hidden below an upstream unknown; those still matter once the upstream gap is filled. Counts are potential product associations, not additive numbers of newly computable products.
The whole-library inventory before Part 3 contains **342 compounds**. **79** occur in the completed-category trees plus the two treatment compounds; those form the targeted evidence pass below, ordered by affected products. The other **263** are in the as-yet-unpopulated category queue. They are explicitly included in the global remaining-blocker appendix rather than silently omitted or populated from recall. This supplement does not constitute completion of those future categories. The appendix distinguishes their unfilled primary data from a newly discovered metabolite gap in an otherwise populated tree.
The supplied list omitted additional relevant nodes, including parent range-only gaps, promethazine and its metabolites, oxymorphone glucuronide, antidepressant hydroxymetabolites, EDDP/EMDP and noribogaine glucuronide. All 79 targeted nodes are itemized below. Baseline status counts use the byte-exact snapshot; before-Part-3 reachability is reconstructed from it plus Part 1’s three compound records, because Part 2 changes no kinetics/relevance. The machine audit preserves all product associations.
**27 targeted blocks resolved** (20 intrinsic kinetic profiles, 7 inactive-relevance exclusions); **52 targeted compounds still block products**. Changing buprenorphine glucuronide relevance to active improves evidence quality but intentionally does not resolve its kinetic gap. No new formation-limited assignment was made.
| Compound | Products before → remaining | Disposition | Value | Tag | Reason / evidence needed / source |
| --- | --- | --- | --- | --- | --- |
| `"buprenorphine_3_glucuronide"` | 7 → 7 | unresolved | mode unknown; numeric half-lives null | gap | Preclinical binding/effects support active relevance, not inactivity. No B3G-specific intrinsic PK; formation limitation shown for a different conjugate cannot be transferred. Need independent human B3G PK or joint model. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC3663890/), [source 2](https://www.isaponline.org/application/files/6315/0938/1416/06_ISAP_Kharasch.pdf) |
| `"morphine_3_glucuronide"` | 7 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":1.66,"min":0.72,"max":2.6,"rangeType":"mean-2sd","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Direct IV metabolite in nine healthy adults; normal renal function. Bounds mean±2SD, not observed extrema. [source 1](https://pubmed.ncbi.nlm.nih.gov/11745739/) |
| `"morphine_6_glucuronide"` | 7 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":1.7,"min":0.3,"max":3.1,"rangeType":"mean-2sd","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Direct IV metabolite in ten healthy adults; normal renal function. Earlier 2.05 h (SD 1.2) estimate overlaps substantially; reference normal-function study selected. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC1874271/), [source 2](https://pubmed.ncbi.nlm.nih.gov/1997044/) |
| `"norbuprenorphine"` | 7 → 7 | unresolved | mode unknown; numeric half-lives null | gap | Direct-IV conference abstract lacks a terminal constant; the Huestis table half-lives belong to parent. Need complete direct-dose terminal model/data. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC3663890/), [source 2](https://www.isaponline.org/application/files/6315/0938/1416/06_ISAP_Kharasch.pdf) |
| `"hydromorphone_3_glucuronide"` | 4 → 4 | unresolved | mode unknown; numeric half-lives null | gap | Control apparent HM3G means 3.73/3.88 h after oral/IV parent. Conjugate formation is not separated. Need direct clearance/joint model; no automatic formation-limited shortcut. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC8257471/) |
| `"1_hydroxymidazolam"` | 3 → 3 | unresolved | mode unknown; numeric half-lives null | gap | Formed metabolite and parent terminal slopes are similar. Need direct-dose elimination or explicit formation-limited model; three-hour apparent slope not entered as intrinsic. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC9095771/) |
| `"6_monoacetylmorphine"` | 3 → 3 | unresolved | mode unknown; numeric half-lives null | gap | Available intranasal patient apparent 47 min differs in route/population; IV abstract does not give a usable 6-MAM constant. Need compatible human terminal/formation model. [source 1](https://pubmed.ncbi.nlm.nih.gov/11557911/), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC12263744/) |
| `"ghb"` | 3 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":0.5,"max":1,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Label range-only; pharmaceutical sodium oxybate proxy for moiety. Nonlinear dose dependence remains flagged. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5dcf9a5c-312b-420b-82f3-42177d8f9ee4) |
| `"n_desmethylpromethazine"` | 3 → 0 | inactive relevance | inactive; kinetics unknown | checked | FDA label explicitly describes inactive promethazine metabolites; no contrary signal established. [source 1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/008306Orig1s036lbl.pdf) |
| `"naloxone_3_glucuronide"` | 3 → 0 | inactive relevance | inactive; kinetics unknown | checked | EMA Nyxoid assessment explicitly calls major conjugate inactive; no name-only clearance assumption. [source 1](https://www.ema.europa.eu/en/documents/assessment-report/nyxoid-epar-public-assessment-report_en.pdf) |
| `"oxymorphone_3_glucuronide"` | 3 → 3 | unresolved | mode unknown; numeric half-lives null | gap | Label says metabolite activity not evaluated; abundance is not inactive relevance or clearance. Need human conjugate PK or explicit inactivity evidence. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=557e9610-62d7-42bf-90c1-44215bd8c1f8) |
| `"promethazine"` | 3 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":4,"max":19,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Mixed-source 4–19 h envelope spans SmPC, FDA and healthy primary study. No pooled typical; tagged estimate. [source 1](https://www.medicines.org.uk/emc/product/15888/smpc), [source 2](https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/008306Orig1s036lbl.pdf) |
| `"promethazine_sulfoxide"` | 3 → 0 | inactive relevance | inactive; kinetics unknown | checked | FDA label explicitly describes inactive promethazine sulfoxides. [source 1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/008306Orig1s036lbl.pdf) |
| `"10_hydroxynortriptyline"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Need human E/Z-specific terminal PK and phenotype/formation separation; aggregate isomer identity unresolved.  |
| `"2_hydroxydesipramine"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Need human hydroxymetabolite terminal PK, not parent desipramine clearance.  |
| `"4_hydroxyalprazolam"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Label only says similar to parent and lower potency; no independent numeric terminal range. Need metabolite PK or formation model. [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=b3c55877-2538-4892-bdb1-d618c643d29c) |
| `"7_hydroxymitragynine"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Observed after leaf/extract dosing, including long repeated-dose tails; not a direct 7OH intrinsic constant. Need direct human 7OH PK or joint formation/clearance model. [source 1](https://doi.org/10.3390/molecules29050984), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13313158/) |
| `"desipramine"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":20,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Healthy-subject primary analysis reports mean terminal 20 h; no half-life SD invented. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC2950987/) |
| `"desmethylselegiline"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Oral means 3.8 h single / 9.5 h multiple are not reconciled with pooled patch statement. Need species/route-specific profile and chronic distinction. [source 1](https://pubmed.ncbi.nlm.nih.gov/11862265/), [source 2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b891bd9f-fdb8-4862-89c5-ecdd700398a3) |
| `"hydroxyalprazolam"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Qualitative similar-to-parent statement is not a numeric half-life; weak contribution is not inactivity. Need compound-specific PK. [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=b3c55877-2538-4892-bdb1-d618c643d29c) |
| `"levoamphetamine"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":17.7,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Oral-selegiline formed nonconjugate mean 17.7 h; provisional intrinsic transfer, patch applicability unresolved. [source 1](https://pdf.hres.ca/dpd_pm/00008417.PDF) |
| `"levomethamphetamine"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":20.5,"min":null,"max":null,"rangeType":"single-value","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Oral-selegiline formed nonconjugate mean 20.5 h; provisional intrinsic transfer, patch applicability unresolved. [source 1](https://pdf.hres.ca/dpd_pm/00008417.PDF) |
| `"meperidine"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":2,"max":8,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Wider label envelope 2–8 h across conflicting passages; no midpoint. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b31d1308-28c3-43f4-e0a6-2f3ed76b8975) |
| `"mitragynine_pseudoindoxyl"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Human plasma formation/potent receptor activity does not establish in-vivo elimination. Need stable-analyte human terminal PK/model. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC7737207/) |
| `"n_desmethyltramadol"` | 2 → 0 | inactive relevance | inactive; kinetics unknown | checked | Human primary PK paper explicitly calls NDT inactive; no contrary signal established. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC9050769/) |
| `"norhydrocodone"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | ER-parent study can confound metabolite tail with input; primary preclinical activity argues against blanket inactivity. Need human IR/direct or separated terminal PK. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4307648/), [source 2](https://www.sciencedirect.com/science/article/pii/S0022356524288145) |
| `"noribogaine_glucuronide"` | 2 → 2 | unresolved | mode unknown; numeric half-lives null | gap | Human detection/Tmax confirms formation, not elimination rate or inactivity. Need independent/joint human kinetics or validated inactivity assessment. [source 1](https://journals.sagepub.com/doi/pdf/10.1177/02698811241237873) |
| `"normeperidine"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":15,"max":30,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Own nonconjugate terminal label range, longer than parent; renal accumulation remains important. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=b31d1308-28c3-43f4-e0a6-2f3ed76b8975) |
| `"noroxycodone"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":5.82,"min":3.36,"max":8.28,"rangeType":"mean-2sd","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Human formed-metabolite tail longer than parent; provisional intrinsic transfer, mean±2SD. [source 1](https://www.hodsdon.com/wiki/uploads/Main/16678548.pdf) |
| `"oxycodone"` | 2 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":3.5,"min":1.84,"max":5.16,"rangeType":"mean-2sd","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Single 15 mg IR, sixteen healthy subjects; intrinsic parent mean±2SD. ER release still product-specific. [source 1](https://www.hodsdon.com/wiki/uploads/Main/16678548.pdf) |
| `"p_hydroxyphenobarbital"` | 2 → 0 | inactive relevance | inactive; kinetics unknown | checked | Australian product information explicitly calls this metabolite inactive. [source 1](https://www.safetyandquality.gov.au/medicine-finder/phenobarb) |
| `"tapentadol_o_glucuronide"` | 2 → 0 | inactive relevance | inactive; kinetics unknown | checked | FDA review specifically calls conjugate inactive, beyond merely absent analgesic contribution. [source 1](https://www.accessdata.fda.gov/drugsatfda_docs/nda/2008/022304s000_ClinPharmR.pdf) |
| `"1_4_butanediol"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":0.655,"min":null,"max":null,"rangeType":"cv","cv":0.27989821882951654},"earlyPhase":null,"steadyState":null}` | checked | Eight healthy adults at 25 mg/kg; 39.3 min mean, 11 min SD. CV conversion; not overdose/alcohol-coingestion kinetics. [source 1](https://pubmed.ncbi.nlm.nih.gov/17192771/) |
| `"10_hydroxyamitriptyline"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human E/Z-specific metabolite terminal PK; parent value and mouse PK are not transferable.  |
| `"2_hydroxyimipramine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human species-specific terminal PK; cannot copy imipramine/desipramine.  |
| `"3_methoxymorphinan"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need unconjugated plasma terminal PK. Urinary identification/formation clearance is insufficient.  |
| `"4_hydroxyduloxetine_glucuronide"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | No significant contribution to efficacy is weaker than global inactivity. Need exact-conjugate human PK or explicit inactivity without other relevance.  |
| `"6_hydroxymelatonin"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need plasma aglycone PK distinct from sulfate/urinary marker and parent.  |
| `"7_aminoclonazepam"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need plasma terminal kinetics; urine detection window is not half-life.  |
| `"8_hydroxymirtazapine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need species-specific human terminal PK and relevance; aggregate unconjugated-metabolite activity does not identify this species.  |
| `"9_o_demethylmitragynine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Human S9/in-vitro formation does not measure in-vivo elimination. Need human plasma terminal PK or validated joint model. [source 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC11579903/) |
| `"acetaldehyde"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need concentration-, genotype- and input-dependent human model; endogenous/formed species cannot receive a guessed first-order constant.  |
| `"bromazolam"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need controlled/adequately characterized human terminal plasma PK, not forensic detection intervals.  |
| `"carfentanil"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human mass-dose terminal kinetics; radiotracer occupancy or animal constants are not generic elimination.  |
| `"chlordiazepoxide"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":6,"max":48,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | estimate | Widened conflicting label envelope 6–48 h. Primary terminal mean 9.39 lies within; no point invented. [source 1](https://assets.hpra.ie/products/Human/26289/Licence_PA23355-032-002_07022025164555.pdf), [source 2](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=54d76424-7fab-c000-e063-6294a90af43e) |
| `"clobazam"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":36,"max":42,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Estimated mean range from label, not individual limits. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2166ea46-28ff-f492-e063-6394a90a4a45) |
| `"clonazepam"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":30,"max":40,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Label typical elimination range; no midpoint. [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=6be64dc3-3748-477c-8800-2c2175309c73) |
| `"clorazepate"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Presystemic conversion leaves little circulating parent. Need conversion/input model; no zero or guessed tiny half-life. [source 1](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=2d592a27-f4cf-008a-e063-6394a90a2629&type=display) |
| `"codeine_6_glucuronide"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Formed-conjugate apparent half-lives around three hours are not independently separated elimination. Need direct dosing/joint formation model or documented formation limitation. [source 1](https://link.springer.com/article/10.1186/1472-6904-2-2) |
| `"demoxepam"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Reported 21–78 h values describe accumulation. Need elimination separated from formation; not copied to single-dose intrinsic field. [source 1](https://pubmed.ncbi.nlm.nih.gov/700911/), [source 2](https://assets.hpra.ie/products/Human/26289/Licence_PA23355-032-002_07022025164555.pdf) |
| `"desmethylchlordiazepoxide"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Reported 10–18 h values describe accumulation. Need separated single-dose terminal disposition. [source 1](https://pubmed.ncbi.nlm.nih.gov/700911/), [source 2](https://assets.hpra.ie/products/Human/26289/Licence_PA23355-032-002_07022025164555.pdf) |
| `"desmethylcitalopram"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need full primary terminal metabolite data and enantiomer/single-versus-chronic reconciliation; secondary mean not entered.  |
| `"dextrorphan"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":3.4,"max":5.6,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | checked | SmPC named active species range. Earlier conjugated-analyte study not treated as interchangeable free-species PK. [source 1](https://assets.hpra.ie/products/Human/16825/Licence_PA23490-010-001_28032024154337.pdf), [source 2](https://www.sciencedirect.com/science/article/pii/0378517383900923) |
| `"didesmethylcitalopram"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need primary terminal PK with adequate washout and chronic distinction; secondary 108 h claim not promoted to checked.  |
| `"eddp"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Relevance held unknown by instruction. No independent terminal PK established; need human metabolite washout/joint model and reviewer relevance decision. [source 1](https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/j.1365-2125.2004.02116.x) |
| `"emdp"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Relevance held unknown by instruction. Need human terminal metabolite PK; EDDP human QT association is not EMDP evidence. [source 1](https://bpspubs.onlinelibrary.wiley.com/doi/10.1111/j.1365-2125.2004.02116.x) |
| `"ethanol"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Zero-order/concentration-dependent elimination needs a compatible nonlinear model, not an invented first-order half-life. [source 1](https://pubmed.ncbi.nlm.nih.gov/6745819/) |
| `"flubromazolam"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need defensible human terminal PK with known dose/timing; overdose persistence is not a healthy reference constant.  |
| `"gbl"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human GBL kinetics separated from conversion to GHB; GHB half-life not copied.  |
| `"hydroxy_suvorexant"` | 1 → 0 | inactive relevance | inactive; kinetics unknown | checked | Label says major hydroxy metabolite not expected pharmacologically active; reviewer confirmation warranted. [source 1](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=e5b72731-1acb-45b7-9c13-290ad12d3951) |
| `"hydroxytriazolam"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Resolve 1-/4-hydroxy identity and human unconjugated/conjugate formation-disposition before assigning one constant.  |
| `"isocarboxazid"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need primary human single-dose terminal PK distinct from irreversible MAO recovery duration.  |
| `"isotonitazene"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need adequately characterized human terminal plasma kinetics; forensic presence and potency are not clearance.  |
| `"levorphanol"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":11,"max":16,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":null}` | checked | IV compound terminal range; oral input/F assessment separate. [source 1](https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=levorphanol) |
| `"levorphanol_3_glucuronide"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need conjugate-specific human elimination or documented formation limitation; parent terminal range does not apply.  |
| `"mitragynine"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":1.5,"max":84.5,"rangeType":"observed-range","cv":null},"earlyPhase":null,"steadyState":{"halfLifeHours":{"typical":null,"min":2.4,"max":99.6,"rangeType":"observed-range","cv":null},"afterDays":null}}` | estimate | Widened healthy leaf/tea/extract envelope; single versus repeated-dose profiles kept separate; dose and assay effects make one generic constant provisional. [source 1](https://doi.org/10.3390/molecules29050984), [source 2](https://pmc.ncbi.nlm.nih.gov/articles/PMC8950611/) |
| `"n_desethyl_isotonitazene"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need active metabolite-specific human PK; no parent/analog nitazene transfer.  |
| `"n_desmethylclobazam"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":71,"max":82,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Label estimated mean range; formed active nonconjugate with longer tail than parent. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2166ea46-28ff-f492-e063-6394a90a4a45) |
| `"n_desmethyldiphenhydramine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human metabolite terminal PK; parent age-dependent range is not this species.  |
| `"n_desmethyldoxylamine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human terminal PK or explicit inactivity without other relevance; parent values not substituted.  |
| `"n_desmethylloperamide"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human metabolite kinetics and toxic/CYP/transporter relevance; low CNS exposure alone does not justify inactivity.  |
| `"n_desmethylmirtazapine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need original healthy-single-dose basis/dispersion for reported 25 h value; poisoning tissue distribution is not that measurement.  |
| `"norcarfentanil"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human metabolite PK or substantiated inactivity without other relevance; urine detection is not clearance.  |
| `"norcodeine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Label opioid inactivity wording is not complete toxic/QT/CYP assessment. Need stronger inactivity basis or human metabolite kinetics.  |
| `"phenibut"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need accessible primary human terminal PK; secondary 5.3 h claims not promoted to checked.  |
| `"phenylacetic_acid"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human precursor/input-specific terminal kinetics and relevance; endogenous level/urinary recovery is not half-life.  |
| `"phenylethylidenehydrazine"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need human terminal PK plus irreversible-MAO effect separation; parent duration not proxy.  |
| `"s_desmethylcitalopram"` | 1 → 1 | unresolved | mode unknown; numeric half-lives null | gap | Need S-enantiomer primary terminal PK, with single/chronic distinction; racemate mean cannot be copied.  |
| `"triazolam"` | 1 → 0 | intrinsic | `{"mode":"intrinsic","halfLifeHours":{"typical":null,"min":1.5,"max":5.5,"rangeType":"cohort-means","cv":null},"earlyPhase":null,"steadyState":null}` | checked | Label range of reported mean elimination half-lives, not individual extrema. [source 1](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=5add318e-11b9-42f8-b052-0d8cebb32fcf) |


### Kratom reconciliation
Mitragynine now has usable range-only kinetics. The four leaf-cohort single-dose means (8.5–43.4 h) are not individual limits; the actual single-dose envelope is 1.5–84.5 h. The repeated-dose envelope is 2.4–99.6 h. The 2026 extract study’s corresponding longest-dose ranges lie inside these envelopes, while its formed 7OH repeated-dose tail reaches 109 h. One shared 7OH node also serves direct-dose products: leaf-derived apparent PK cannot establish its intrinsic elimination. Both remaining kratom derivatives stay unresolved; human-plasma formation is not whole-body elimination. [2024 primary Tables 3–4](https://doi.org/10.3390/molecules29050984), [2026 primary Tables 1–2](https://pmc.ncbi.nlm.nih.gov/articles/PMC13313158/).
### Global remaining blockers, including the future category queue
There are **315 unique reachable blockers** across all 340 products after this pass: 52 targeted compounds above and 263 nodes in future categories. The list below is exhaustive under the stated reachability criterion. A “No data yet” product can have several of these; counts must not be summed to infer product totals. T = targeted unresolved node with the compound-specific evidence requirement above. Q = unpopulated future-category node; no applicable checked kinetic/inactivity evidence was established in this targeted pass. Q parents need primary healthy-adult terminal data; Q metabolites need species-specific human elimination, documented formation limitation, or explicit inactive relevance with no toxic/QT/CYP signal. These are retained as gaps, not guessed negative findings.
| Remaining compound | Affected products | Audit disposition / what resolves it |
| --- | --- | --- |
| `"norephedrine"` | 9 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxyamphetamine"` | 7 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"amphetamine"` | 7 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"buprenorphine_3_glucuronide"` | 7 | T — Preclinical binding/effects support active relevance, not inactivity. No B3G-specific intrinsic PK; formation limitation shown for a different conjugate cannot be transferred. Need independent human B3G PK or joint model. |
| `"norbuprenorphine"` | 7 | T — Direct-IV conference abstract lacks a terminal constant; the Huestis table half-lives belong to parent. Need complete direct-dose terminal model/data. |
| `"paliperidone"` | 6 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"dehydronorketamine"` | 5 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydroxynorketamine"` | 5 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ketamine"` | 5 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"norketamine"` | 5 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"aripiprazole"` | 4 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"cotinine"` | 4 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"dehydroaripiprazole"` | 4 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydromorphone_3_glucuronide"` | 4 | T — Control apparent HM3G means 3.73/3.88 h after oral/IV parent. Conjugate formation is not separated. Need direct clearance/joint model; no automatic formation-limited shortcut. |
| `"nicotine"` | 4 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"trans_3_hydroxycotinine"` | 4 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"1_hydroxymidazolam"` | 3 | T — Formed metabolite and parent terminal slopes are similar. Need direct-dose elimination or explicit formation-limited model; three-hour apparent slope not entered as intrinsic. |
| `"11_oh_thc"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxymethamphetamine"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"5_meo_dmt"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"6_monoacetylmorphine"` | 3 | T — Available intranasal patient apparent 47 min differs in route/population; IV abstract does not give a usable 6-MAM constant. Need compatible human terminal/formation model. |
| `"benzoylecgonine"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"bufotenine"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"cocaethylene"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"cocaine"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"delta9_thc"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"desacetyldiltiazem"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"diltiazem"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"dmt"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"dmt_n_oxide"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ecgonine_methyl_ester"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ethylphenidate"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"haloperidol"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"hma"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydroxymetoprolol"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"indole_3_acetic_acid"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"mda"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"methamphetamine"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"methylphenidate"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"metoprolol"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"n_desmethyldiltiazem"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_desmethylolanzapine"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"norcocaine"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"norverapamil"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"o_desmethylmetoprolol"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"olanzapine"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"olanzapine_10_glucuronide"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"oxymorphone_3_glucuronide"` | 3 | T — Label says metabolite activity not evaluated; abundance is not inactive relevance or clearance. Need human conjugate PK or explicit inactivity evidence. |
| `"reduced_haloperidol"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ritalinic_acid"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"thc_cooh"` | 3 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"verapamil"` | 3 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"10_hydroxynortriptyline"` | 2 | T — Need human E/Z-specific terminal PK and phenotype/formation separation; aggregate isomer identity unresolved. |
| `"11_oh_delta8_thc"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"2_ene_vpa"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"2_hydroxydesipramine"` | 2 | T — Need human hydroxymetabolite terminal PK, not parent desipramine clearance. |
| `"2_oxo_3_hydroxy_lsd"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"3_hydroxyguanfacine"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_ene_vpa"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxyalprazolam"` | 2 | T — Label only says similar to parent and lower potency; no independent numeric terminal range. Need metabolite PK or formation model. |
| `"4_hydroxypropranolol"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"5_hydroxypropafenone"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"7_cooh_cbd"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"7_hydroxychlorpromazine"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"7_hydroxyfluphenazine"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"7_hydroxymitragynine"` | 2 | T — Observed after leaf/extract dosing, including long repeated-dose tails; not a direct 7OH intrinsic constant. Need direct human 7OH PK or joint formation/clearance model. |
| `"7_oh_cbd"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"acetaminophen"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"amiodarone"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"apap_glucuronide_sulfate"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"azithromycin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"cannabidiol"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"carbamazepine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"carbamazepine_10_11_epoxide"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"chlorpromazine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ciprofloxacin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"clonidine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"delta8_thc"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"delta8_thc_cooh"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desethylamiodarone"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desmethylazithromycin"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desmethylselegiline"` | 2 | T — Oral means 3.8 h single / 9.5 h multiple are not reconciled with pooled patch statement. Need species/route-specific profile and chronic distinction. |
| `"digoxin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"dihydrodigoxin"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"erythromycin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"fluconazole"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"fluphenazine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"fluphenazine_sulfoxide"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"furosemide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"furosemide_glucuronide"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"guanfacine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"hpph"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydroxyalprazolam"` | 2 | T — Qualitative similar-to-parent statement is not a numeric half-life; weak contribution is not inactivity. Need compound-specific PK. |
| `"lacosamide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"levetiracetam"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"levofloxacin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lithium"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lsd"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"mesembrine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"metoclopramide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mitragynine_pseudoindoxyl"` | 2 | T — Human plasma formation/potent receptor activity does not establish in-vivo elimination. Need stable-analyte human terminal PK/model. |
| `"modafinil_acid"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"modafinil_sulfone"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"moxifloxacin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"n_acetylprocainamide"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_depropylpropafenone"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_desmethylerythromycin"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"napqi"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"nor_lsd"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"norhydrocodone"` | 2 | T — ER-parent study can confound metabolite tail with input; primary preclinical activity argues against blanket inactivity. Need human IR/direct or separated terminal PK. |
| `"noribogaine_glucuronide"` | 2 | T — Human detection/Tmax confirms formation, not elimination rate or inactivity. Need independent/joint human kinetics or validated inactivity assessment. |
| `"norquetiapine"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"o_desmethyl_lacosamide"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"o_desmethylmesembrine"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ondansetron"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"pchp"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"pcp"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"phenytoin"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ppc"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"procainamide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"propafenone"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"propranolol"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"quetiapine"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"risperidone"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"salvinorin_a"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"salvinorin_b"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"semaglutide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"sotalol"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"tirzepatide"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ucb_l057"` | 2 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"valproate"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ziprasidone"` | 2 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"10_hydroxyamitriptyline"` | 1 | T — Need human E/Z-specific metabolite terminal PK; parent value and mouse PK are not transferable. |
| `"11_hydroxyyohimbine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"14_hydroxyclarithromycin"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"1p_lsd"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"2_hydroxyimipramine"` | 1 | T — Need human species-specific terminal PK; cannot copy imipramine/desipramine. |
| `"25_desacetylrifampin"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"2c_b"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"3_4_5_trimethoxyphenylacetic_acid"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"3_4_catechol_pv"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"3_hydroxyquinidine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"3_methoxymorphinan"` | 1 | T — Need unconjugated plasma terminal PK. Urinary identification/formation clearance is insufficient. |
| `"4_bromo_2_5_dimethoxyphenylacetic_acid"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hiaa"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxyatomoxetine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxyduloxetine_glucuronide"` | 1 | T — No significant contribution to efficacy is weaker than global inactivity. Need exact-conjugate human PK or explicit inactivity without other relevance. |
| `"4_hydroxynebivolol"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxyphenyl_carvedilol"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxytamoxifen"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_hydroxytolyl_mephedrone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"4_oh_3_meo_pv"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"5_htp"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"5_hydroxyomeprazole"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"6_hydroxymelatonin"` | 1 | T — Need plasma aglycone PK distinct from sulfate/urinary marker and parent. |
| `"7_aminoclonazepam"` | 1 | T — Need plasma terminal kinetics; urine detection window is not half-life. |
| `"7_hydroxywarfarin"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"7alpha_thiomethylspironolactone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"8_hydroxyefavirenz"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"8_hydroxymirtazapine"` | 1 | T — Need species-specific human terminal PK and relevance; aggregate unconjugated-metabolite activity does not identify this species. |
| `"9_o_demethylmitragynine"` | 1 | T — Human S9/in-vitro formation does not measure in-vivo elimination. Need human plasma terminal PK or validated joint model. |
| `"acetaldehyde"` | 1 | T — Need concentration-, genotype- and input-dependent human model; endogenous/formed species cannot receive a guessed first-order constant. |
| `"adb_butinaca"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"amlodipine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"apixaban"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"armodafinil"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"atenolol"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"atomoxetine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"bisoprolol"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"brexpiprazole"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"bromazolam"` | 1 | T — Need controlled/adequately characterized human terminal plasma PK, not forensic detection intervals. |
| `"caffeine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"canrenone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"carbon_disulfide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"carfentanil"` | 1 | T — Need human mass-dose terminal kinetics; radiotracer occupancy or animal constants are not generic elimination. |
| `"cariprazine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"carvedilol"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"cinacalcet"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"clarithromycin"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"clopidogrel"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"clopidogrel_active_thiol_metabolite"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"clopidogrel_acyl_glucuronide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"clorazepate"` | 1 | T — Presystemic conversion leaves little circulating parent. Need conversion/input model; no zero or guessed tiny half-life. |
| `"clozapine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"clozapine_n_oxide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"codeine_6_glucuronide"` | 1 | T — Formed-conjugate apparent half-lives around three hours are not independently separated elimination. Need direct dosing/joint formation model or documented formation limitation. |
| `"cvt_2738"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"cyclobenzaprine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"demoxepam"` | 1 | T — Reported 21–78 h values describe accumulation. Need elimination separated from formation; not copied to single-dose intrinsic field. |
| `"desethylhydroxychloroquine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desmethylcariprazine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desmethylchlordiazepoxide"` | 1 | T — Reported 10–18 h values describe accumulation. Need separated single-dose terminal disposition. |
| `"desmethylcitalopram"` | 1 | T — Need full primary terminal metabolite data and enantiomer/single-versus-chronic reconciliation; secondary mean not entered. |
| `"desmethylcyclobenzaprine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"desmethylterbinafine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"didesmethylcariprazine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"didesmethylcitalopram"` | 1 | T — Need primary terminal PK with adequate washout and chronic distinction; secondary 108 h claim not promoted to checked. |
| `"diethyldithiocarbamate"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"disopyramide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"disulfiram"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"dm_3411"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"dofetilide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"domperidone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"dronedarone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"eddp"` | 1 | T — Relevance held unknown by instruction. No independent terminal PK established; need human metabolite washout/joint model and reviewer relevance decision. |
| `"efavirenz"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"emdp"` | 1 | T — Relevance held unknown by instruction. Need human terminal metabolite PK; EDDP human QT association is not EMDP evidence. |
| `"endoxifen"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"ephedrine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ethanol"` | 1 | T — Zero-order/concentration-dependent elimination needs a compatible nonlinear model, not an invented first-order half-life. |
| `"exp3174"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"flecainide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"flubromazolam"` | 1 | T — Need defensible human terminal PK with known dose/timing; overdose persistence is not a healthy reference constant. |
| `"gbl"` | 1 | T — Need human GBL kinetics separated from conversion to GHB; GHB half-life not copied. |
| `"harmaline"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"harmalol"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"harmine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"harmol"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hmea"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hmma"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydrochlorothiazide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"hydroxychloroquine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"hydroxyitraconazole"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydroxymethylmexiletine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"hydroxytriazolam"` | 1 | T — Resolve 1-/4-hydroxy identity and human unconjugated/conjugate formation-disposition before assigning one constant. |
| `"ibotenic_acid"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"id_14283"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"iloperidone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"isocarboxazid"` | 1 | T — Need primary human single-dose terminal PK distinct from irreversible MAO recovery duration. |
| `"isotonitazene"` | 1 | T — Need adequately characterized human terminal plasma kinetics; forensic presence and potency are not clearance. |
| `"itraconazole"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ivabradine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"kavalactones"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ketoconazole"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"l_tryptophan"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lamotrigine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lamotrigine_2_n_glucuronide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"levorphanol_3_glucuronide"` | 1 | T — Need conjugate-specific human elimination or documented formation limitation; parent terminal range does not apply. |
| `"licarbazepine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"lisdexamfetamine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lofexidine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"losartan"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"lurasidone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mdea"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mdma"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mdmb_4en_pinaca"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mdmb_4en_pinaca_butanoic_acid"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"mdpv"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mephedrone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mescaline"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mesoridazine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"meta_o_dealkylated_flecainide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"methoxetamine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mexiletine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mirabegron"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"modafinil"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"mono_n_dealkyldisopyramide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"muscimol"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_debutyl_dronedarone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_desethyl_isotonitazene"` | 1 | T — Need active metabolite-specific human PK; no parent/analog nitazene transfer. |
| `"n_desmethylatomoxetine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_desmethyldiphenhydramine"` | 1 | T — Need human metabolite terminal PK; parent age-dependent range is not this species. |
| `"n_desmethyldoxylamine"` | 1 | T — Need human terminal PK or explicit inactivity without other relevance; parent values not substituted. |
| `"n_desmethylloperamide"` | 1 | T — Need human metabolite kinetics and toxic/CYP/transporter relevance; low CNS exposure alone does not justify inactivity. |
| `"n_desmethylmirtazapine"` | 1 | T — Need original healthy-single-dose basis/dispersion for reported 25 h value; poisoning tissue distribution is not that measurement. |
| `"n_desmethylsildenafil"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"n_desmethyltamoxifen"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"nebivolol"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"nitrous_oxide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"norcarfentanil"` | 1 | T — Need human metabolite PK or substantiated inactivity without other relevance; urine detection is not clearance. |
| `"norclozapine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"norcodeine"` | 1 | T — Label opioid inactivity wording is not complete toxic/QT/CYP assessment. Need stronger inactivity basis or human metabolite kinetics. |
| `"normephedrone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"normethoxetamine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"o_desmethyl_mxe"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"oh_alpha_pvp"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"omeprazole"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"omeprazole_sulfone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"oxcarbazepine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"p88"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"p95"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"paraxanthine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"phenibut"` | 1 | T — Need accessible primary human terminal PK; secondary 5.3 h claims not promoted to checked. |
| `"phentermine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"phenylacetic_acid"` | 1 | T — Need human precursor/input-specific terminal kinetics and relevance; endogenous level/urinary recovery is not half-life. |
| `"phenylethylidenehydrazine"` | 1 | T — Need human terminal PK plus irreversible-MAO effect separation; parent duration not proxy. |
| `"pimozide"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"prednisolone"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"prednisone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"pseudoephedrine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"psilocin"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"psilocin_o_glucuronide"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"psilocybin"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"pvp"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"pvp_lactam"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"quinidine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ranolazine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"rifampin"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"ritonavir"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"rivaroxaban"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"s_18982"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"s_desmethylcitalopram"` | 1 | T — Need S-enantiomer primary terminal PK, with single/chronic distinction; racemate mean cannot be copied. |
| `"sildenafil"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"spironolactone"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"sulforidazine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"tamoxifen"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"terbinafine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"theobromine"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"theophylline"` | 1 | Q — Human metabolite terminal PK / formation model or explicit inactive relevance. |
| `"thioridazine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"tizanidine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"topiramate"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"varenicline"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"warfarin"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |
| `"yohimbine"` | 1 | Q — Primary human terminal kinetics; product input must also be assessed in queue. |


## 5. EDDP / EMDP — reviewer evidence summary
Both retain **clinicalRelevance: unknown** exactly as in the backup. Their numeric kinetics remain null: no independent human terminal metabolite constant was established. Their cited `sourceNotes.relevance` now distinguish these findings:
- The [FDA methadone injection label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2016/021624s006lbl.pdf), Clinical Pharmacology/Metabolism, calls EDDP and other metabolites inactive; that passage does not individually name EMDP and does not settle non-opioid activity.
- [Eap et al. 2007](https://doi.org/10.1038/sj.clpt.6100120), primary results reproduced in the author’s [thesis copy](https://www.researchgate.net/publication/6476612_Stereoselective_Block_of_hERG_Channel_by_S-Methadone_and_QT_Interval_Prolongation_in_CYP2B6_Slow_Metabolizers), reports extremely weak hERG inhibition for both metabolites at 37°C, estimated IC50 >250 µM, with raw metabolite curves not shown.
- [Carlquist et al. 2015, PMID 25903311](https://pubmed.ncbi.nlm.nih.gov/25903311/), Mol Diagn Ther 19:131–138, doi:10.1007/s40291-015-0137-4: a 25-person methadone-initiation pilot found associations of dose-corrected plasma EDDP with QTc/change and higher EDDP in CYP2C19*2 carriers. This observational association cannot establish direct metabolite hERG causality. It measured EDDP, not EMDP.
- [Primary rat α3β4 receptor work](https://www.sciencedirect.com/science/article/abs/pii/S0022356524293381) and [EMDP mouse behavioural work](https://pubmed.ncbi.nlm.nih.gov/26365569/) show that opioid inactivity is not global pharmacological inactivity. Human clinical effect sizes remain unresolved.
The weak-channel experiment and clinical association are different evidence types, not interchangeable positive/negative causal tests. No QT tier, weight, fixed recovery duration or reviewer relevance conclusion was inferred from them.
## 6. Conflicts, structure concerns and safeguards
- All IDs, category assignments, candidate IDs, metabolite-link identities, component membership/ratios, review dates and verification fields match the starting snapshot. All 443 compounds / 340 products remain unverified. No code, specs or candidate-queue edits were made in this supplement. The existing unrelated untracked help/supplement documents and historical reports were preserved.
- Healthy versus patient ibogaine PK remains a material limitation. A treatment-cohort proxy is tagged estimate; inhibited half-life, AUC ratios and clearance/activity-score models were not converted into unsupported phenotype half-life maps.
- Relevance is broader than analgesia. M3G/HM3G neurotoxicity, buprenorphine-conjugate preclinical activity and norhydrocodone activity prevent blanket inactive exclusions. The seven exclusions above have named positive inactivity statements, with their study/label limitations retained.
- Conjugate naming, detected metabolites, Tmax and urine windows do not prove formation limitation. No automatic conjugate heuristic was restored. Normal-renal M3G/M6G values must not be used as renal-impairment constants.
- Mixed-source envelopes for promethazine, meperidine and chlordiazepoxide are tagged estimate; they are not asserted as one cohort’s observed extrema. Clobazam/triazolam label ranges of means are tagged cohort-means. Single-value means have null uncertainty bounds rather than invented SDs.
- Oral-selegiline levo-metabolite estimates do not solve patch-specific formation. Desmethylselegiline remains unresolved. The shared parent/metabolite identities can need route-specific kinetic modelling; topology was preserved.
- Hydroxytriazolam and hydroxylated TCAs aggregate isomers; bupropion metabolite stereoisomers and racemic/S-citalopram metabolites also need identity review. No isomer values were silently copied across records.
- Generic oxycodone IR/ER identity and null product release half-lives remain limitations. The app’s structural status does not require calibrated release, QT, CYP or receptor fields, so computable counts overstate overall clinical completeness.
- Kratom leaf, extract, purified alkaloid and direct 7OH products are not interchangeable. New human extract evidence strengthens the need for dose/formulation context; generic mitragynine kinetics are provisional. Other leaf alkaloids and downstream N,O-didesmethyltramadol, absent from the current tree, require later topology review rather than unauthorized new nodes.
- Phenotype multipliers, unmeasured formation fractions, QT weights/reference amounts and investigational treatment doses remain null. Unknown inhibitor strength can still hide inhibition from the current track; methadone is a concrete unresolved example. A model-derived metabolite tier is not equivalent to a clinical FDA classification.
- Older retained notes sometimes refer to pre-migration zero/false defaults. They are historical context; actual v2.1 null/unassessed fields take precedence. The supplement did not reinterpret those phrases as evidence.
- Failed full-text/anti-bot/permission fetches were not treated as negative studies. Accessible primary abstracts, official labels and primary-paper mirrors are cited only for confirmed values. A gap means no usable evidence established in this pass, not an exhaustive proof that no literature exists. The future-category inventory is an explicit backlog, not an assertion of completed pharmacology research.
## 7. Validation and resume point
`npm run validate` was run after Part 1 (**0 errors, 16 warnings**), Part 2 (**0 errors, 11 warnings**) and Part 3 (**0 errors, 12 warnings**). Final Part 3 warnings: seven unknown steady-state onsets (desalkylflurazepam, fluoxetine, fluvoxamine, methadone, mitragynine, paroxetine, selegiline); morphine’s unknown early-phase fraction; four existing shared-alias warnings (ayahuasca, synthetic cannabinoid, spice, K2). Mitragynine adds one explicitly conservative unknown-onset warning. Unknown onset uses the later single/chronic clear date; no switch day was guessed.
Additional snapshot assertions passed for schema 2.1, ID/order preservation, unchanged formation-link identities/categories/components, untouched reviewed/verification metadata, protected entries, `DRAFT —` prefixes and matching changed-section provenance tags. No browser/clinical outcome test was claimed; this is a data-only change, checked with the project validator and actual app status functions.
Backup SHA-256: `150f101c4614e204edc58cda7a4ee3544c4029c6708af98a6bf8b73f6762afb4`.
Final library SHA-256: `16e7766dca354371ce385e9f1653049cf041bc79656b116349a1c7d046ebd1b5`.
**Resume: antipsychotics, order 94 (quetiapine), using `docs/ClearDate_Prepopulate_Prompt_v2.1.md`.** Do not overwrite the supplement or original v2.1 backups. This supplement stops before continuing the main queue.
