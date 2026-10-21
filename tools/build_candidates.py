"""Convert ClearDate_Candidate_Drug_List.md into tools/candidates.json.

Structure only: names, aliases, categories, routes, metabolite links. No PK values.
"""
import json, re, sys, unicodedata

SRC, OUT = sys.argv[1], sys.argv[2]

CATEGORY_IDS = {
    "Opioids, OUD treatments and antagonists": "opioids",
    "Benzodiazepines, Z-drugs and other sedatives": "sedatives",
    "Antidepressants": "antidepressants",
    "Antipsychotics": "antipsychotics",
    "Mood stabilisers and anticonvulsants": "mood_anticonvulsants",
    "Stimulants": "stimulants",
    "Psychedelics, entactogens and dissociatives": "psychedelics_dissociatives",
    "Cardiovascular": "cardiovascular",
    "Antimicrobials, antiemetics and other common QT/CYP interactors": "other_interactors",
}
CATEGORY_NAMES = {
    "opioids": "Opioids & OUD treatments",
    "sedatives": "Benzodiazepines & sedatives",
    "antidepressants": "Antidepressants",
    "antipsychotics": "Antipsychotics",
    "mood_anticonvulsants": "Mood stabilisers & anticonvulsants",
    "stimulants": "Stimulants",
    "psychedelics_dissociatives": "Psychedelics, entactogens & dissociatives",
    "cardiovascular": "Cardiovascular",
    "other_interactors": "Antimicrobials, antiemetics & other interactors",
}


def slug(s):
    s = (s.replace("α", "alpha").replace("β", "beta").replace("Δ", "delta")
          .replace("′", "").replace("'", "").replace("→", " "))
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s


def split_top(s, sep=","):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == sep and depth == 0:
            out.append(cur.strip()); cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


# ---------------- compound registry (shared across candidates)
compounds = {}        # id -> dict
name_index = {}       # lowercase name/alias -> id

# names that should resolve to an existing compound
SYNONYMS = {
    "d-amphetamine": "Amphetamine",
    "9-hydroxyrisperidone": "Paliperidone",
    "m3g": "Morphine-3-glucuronide",
    "m6g": "Morphine-6-glucuronide",
    "mhd": "Licarbazepine",
    "o-desmethylvenlafaxine": "Desvenlafaxine",
}
EXTRA_ALIASES = {
    "Paliperidone": ["9-hydroxyrisperidone"],
    "Amphetamine": ["d-amphetamine", "dextroamphetamine"],
    "Licarbazepine": ["MHD", "monohydroxy derivative"],
    "O-desmethyltramadol": ["M1"],
    "Desvenlafaxine": ["O-desmethylvenlafaxine", "ODV"],
    "6-Monoacetylmorphine": ["6-MAM"],
    "Morphine-3-glucuronide": ["M3G"],
    "Morphine-6-glucuronide": ["M6G"],
    "Hydromorphone-3-glucuronide": ["H3G"],
    "N-acetylprocainamide": ["NAPA"],
    "Ecgonine methyl ester": ["EME"],
}


def compound(name, aliases=(), note=""):
    name = tidy(name)
    key = SYNONYMS.get(name.lower(), name)
    lk = key.lower()
    if lk in name_index:
        c = compounds[name_index[lk]]
    else:
        cid = slug(key)
        c = {"id": cid, "name": key, "aliases": [], "formedFrom": [], "notes": []}
        compounds[cid] = c
        name_index[lk] = cid
        for a in EXTRA_ALIASES.get(key, []):
            if a not in c["aliases"]:
                c["aliases"].append(a)
            name_index[a.lower()] = cid
    for a in aliases:
        if a and a != c["name"] and a not in c["aliases"]:
            c["aliases"].append(a)
            name_index.setdefault(a.lower(), c["id"])
    if note and note not in c["notes"]:
        c["notes"].append(note)
    return c["id"]


def link(child_id, parent_id):
    c = compounds[child_id]
    if parent_id not in c["formedFrom"]:
        c["formedFrom"].append(parent_id)


# ---------------- parse markdown
rows = []
cat = None
for line in open(SRC, encoding="utf-8"):
    line = line.rstrip("\n")
    m = re.match(r"^## (.+)$", line)
    if m:
        cat = CATEGORY_IDS[m.group(1).strip()]
        continue
    if line.startswith("| ") and not line.startswith("| #") and cat:
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 5 and cells[0].isdigit():
            rows.append({"n": int(cells[0]), "drug": cells[1], "mets": cells[2],
                         "routes": cells[3], "why": cells[4], "category": cat})

UNTRACKED = re.compile(r"^(—|inactive|glucuronides?$|minimal|peptide|hydroxylated|"
                       r"catechol|ester-hydrolysis|nor-metabolites)", re.I)

# vague labels in the source list -> specific names
RENAME = {
    "CVT-2738 and others": "CVT-2738",
    "sulfoxide": "Fluphenazine sulfoxide",
    "Active thiol metabolite": "Clopidogrel active thiol metabolite",
}
KEEP_CASE = ("trans-", "ucb", "m-", "p-", "d-", "l-")


def tidy(name):
    name = RENAME.get(name, name)
    if name and name[0].islower() and not name.lower().startswith(KEEP_CASE):
        name = name[0].upper() + name[1:]
    return name


def parse_name(s):
    """'Heroin (diacetylmorphine)' -> ('Heroin', ['diacetylmorphine'])"""
    m = re.match(r"^(.*?)\s*\((.+)\)\s*$", s)
    if m:
        inner = m.group(2)
        if inner.lower() in ("inactive",) or "with ethanol" in inner or inner.startswith("and "):
            return m.group(1).strip(), [], inner
        return m.group(1).strip(), [inner.strip()], ""
    return s.strip(), [], ""


def default_metabolites(parent_id, cell):
    """Simple case: comma/semicolon list, each item a direct metabolite;
    'A → B' inside an item means A from parent, B from A."""
    untracked = []
    if UNTRACKED.match(cell.strip()):
        return [cell.strip()]
    # split on ';' or ', ' (comma+space) outside parentheses — chemical names like
    # '3,4,5-Trimethoxyphenylacetic acid' contain commas without spaces
    for item in re.split(r";|,\s(?![^(]*\))", cell):
        item = item.strip()
        if not item:
            continue
        if UNTRACKED.match(item) or "(inactive)" in item or "markers" in item:
            untracked.append(item)
            continue
        prev = parent_id
        for part in [p.strip() for p in item.split("→")]:
            name, aliases, note = parse_name(part)
            cid = compound(name, aliases, note)
            link(cid, prev)
            prev = cid
    return untracked


# ---------------- per-row overrides for combined rows and chains
# Each override returns a list of candidate dicts: (name, aliases, edges, untracked, routes?)
# edges: list of (child_name, parent_name)
OVR = {
    7: [("Heroin", ["diacetylmorphine"], [("6-Monoacetylmorphine", "Heroin"), ("Morphine", "6-Monoacetylmorphine")], [])],
    15: [("Isotonitazene", ["nitazene"], [("N-desethyl isotonitazene", "Isotonitazene")], ["Other nitazenes (metonitazene, protonitazene, etc.) can be added as separate entries."])],
    23: [("Mitragynine", ["kratom"], [("7-Hydroxymitragynine", "Mitragynine"), ("9-O-demethylmitragynine", "Mitragynine"), ("Mitragynine pseudoindoxyl", "7-Hydroxymitragynine")], [])],
    24: [("7-Hydroxymitragynine", ["7-OH", "7-OH-mitragynine"], [("Mitragynine pseudoindoxyl", "7-Hydroxymitragynine")], [])],
    27: [("Diazepam", ["Valium"], [("Nordiazepam", "Diazepam"), ("Temazepam", "Diazepam"), ("Oxazepam", "Nordiazepam"), ("Oxazepam", "Temazepam")], [])],
    28: [("Chlordiazepoxide", ["Librium"], [("Desmethylchlordiazepoxide", "Chlordiazepoxide"), ("Demoxepam", "Desmethylchlordiazepoxide"), ("Nordiazepam", "Demoxepam"), ("Oxazepam", "Nordiazepam")], [])],
    29: [("Clorazepate", ["Tranxene"], [("Nordiazepam", "Clorazepate"), ("Oxazepam", "Nordiazepam")], [])],
    34: [("Temazepam", ["Restoril"], [("Oxazepam", "Temazepam"), ("Temazepam glucuronide", "Temazepam")], ["Oxazepam formation is minor."])],
    43: [("Zopiclone", [], [("N-desmethylzopiclone", "Zopiclone"), ("Zopiclone N-oxide", "Zopiclone")], []),
         ("Eszopiclone", ["Lunesta"], [("N-desmethylzopiclone", "Eszopiclone"), ("Zopiclone N-oxide", "Eszopiclone")], [])],
    48: [("GHB", ["gamma-hydroxybutyrate", "sodium oxybate", "G"], [], []),
         ("GBL", ["gamma-butyrolactone"], [("GHB", "GBL")], []),
         ("1,4-Butanediol", ["1,4-BD", "BDO"], [("GHB", "1,4-Butanediol")], [])],
    49: [("Ethanol", ["alcohol"], [("Acetaldehyde", "Ethanol")], ["Ethyl glucuronide (EtG) and ethyl sulfate (EtS) are minor urinary markers, not tracked."])],
    61: [("Paroxetine", ["Paxil"], [], ["Catechol/conjugated metabolites are inactive."])],
    69: [("Milnacipran", ["Savella"], [], ["Glucuronides (inactive)."]),
         ("Levomilnacipran", ["Fetzima"], [], ["Glucuronides (inactive)."])],
    72: [("Bupropion", ["Wellbutrin", "Zyban"], [("Hydroxybupropion", "Bupropion"), ("Threohydrobupropion", "Bupropion"), ("Erythrohydrobupropion", "Bupropion")], [])],
    76: [("Amitriptyline", ["Elavil"], [("Nortriptyline", "Amitriptyline"), ("10-Hydroxyamitriptyline", "Amitriptyline"), ("10-Hydroxynortriptyline", "Nortriptyline")], [])],
    78: [("Imipramine", ["Tofranil"], [("Desipramine", "Imipramine"), ("2-Hydroxyimipramine", "Imipramine"), ("2-Hydroxydesipramine", "Desipramine")], [])],
    85: [("Selegiline", ["Emsam", "Eldepryl"], [("Desmethylselegiline", "Selegiline"), ("Levomethamphetamine", "Selegiline"), ("Levoamphetamine", "Levomethamphetamine")], [])],
    89: [("Hyperforin", ["St John's wort", "Hypericum"], [], ["Product is a herbal mixture; hyperforin is the main CYP3A4-inducing constituent. Hypericin is a separate constituent."])],
    92: [("Risperidone", ["Risperdal"], [("Paliperidone", "Risperidone")], [])],
    115: [("Cocaine", ["coke", "crack"], [("Benzoylecgonine", "Cocaine"), ("Ecgonine methyl ester", "Cocaine"), ("Norcocaine", "Cocaine"), ("Cocaethylene", "Cocaine")], ["Cocaethylene forms only with concurrent ethanol."])],
    117: [("Lisdexamfetamine", ["Vyvanse"], [("Amphetamine", "Lisdexamfetamine")], [])],
    118: [("Methamphetamine", ["meth", "crystal", "Desoxyn"], [("Amphetamine", "Methamphetamine"), ("4-Hydroxymethamphetamine", "Methamphetamine")], [])],
    119: [("Methylphenidate", ["Ritalin", "Concerta"], [("Ritalinic acid", "Methylphenidate"), ("Ethylphenidate", "Methylphenidate")], ["Ethylphenidate forms only with concurrent ethanol."])],
    120: [("Modafinil", ["Provigil"], [("Modafinil acid", "Modafinil"), ("Modafinil sulfone", "Modafinil")], []),
          ("Armodafinil", ["Nuvigil"], [("Modafinil acid", "Armodafinil"), ("Modafinil sulfone", "Armodafinil")], [])],
    123: [("Nicotine", ["tobacco", "vape"], [("Cotinine", "Nicotine"), ("trans-3′-Hydroxycotinine", "Cotinine")], [])],
    127: [("Pseudoephedrine", ["Sudafed"], [("Norephedrine", "Pseudoephedrine")], ["Norephedrine formation is minor."]),
          ("Ephedrine", ["ephedra"], [("Norephedrine", "Ephedrine")], ["Norephedrine formation is minor."])],
    129: [("Ibogaine", ["iboga", "Tabernanthe iboga"], [("Noribogaine", "Ibogaine"), ("Noribogaine glucuronide", "Noribogaine")], [])],
    130: [("Noribogaine", [], [("Noribogaine glucuronide", "Noribogaine")], [])],
    131: [("MDMA", ["ecstasy", "molly", "E"], [("MDA", "MDMA"), ("HMMA", "MDMA"), ("HMA", "MDA")], [])],
    132: [("MDA", ["sass", "sally"], [("HMA", "MDA")], [])],
    133: [("MDEA", ["MDE", "Eve"], [("MDA", "MDEA"), ("HMEA", "MDEA")], [])],
    134: [("Psilocybin", ["magic mushrooms", "shrooms"], [("Psilocin", "Psilocybin"), ("Psilocin-O-glucuronide", "Psilocin"), ("4-HIAA", "Psilocin")], [])],
    136: [("1P-LSD", [], [("LSD", "1P-LSD")], [])],
    138: [("Harmine", ["ayahuasca"], [("Harmol", "Harmine")], ["Ayahuasca usually also contains DMT; enter DMT separately."]),
          ("Harmaline", ["ayahuasca"], [("Harmalol", "Harmaline")], ["Ayahuasca usually also contains DMT; enter DMT separately."])],
    142: [("Ketamine", ["Ketalar", "K", "special K"], [("Norketamine", "Ketamine"), ("Dehydronorketamine", "Norketamine"), ("Hydroxynorketamine", "Norketamine")], [])],
    147: [("Ibotenic acid", ["Amanita muscaria", "fly agaric"], [("Muscimol", "Ibotenic acid")], ["Product is the mushroom; it also contains muscimol directly."])],
    148: [("Δ9-THC", ["THC", "cannabis", "marijuana", "weed"], [("11-OH-THC", "Δ9-THC"), ("THC-COOH", "11-OH-THC")], [])],
    151: [("MDMB-4en-PINACA", ["synthetic cannabinoid", "spice", "K2"], [("MDMB-4en-PINACA butanoic acid", "MDMB-4en-PINACA")], []),
          ("ADB-BUTINACA", ["synthetic cannabinoid", "spice", "K2"], [], ["Ester-hydrolysis / hydroxylated metabolites — choose which to track."])],
    152: [("Kavalactones", ["kava", "Piper methysticum"], [], ["Product is a herbal mixture of kavalactones."])],
    153: [("Mesembrine", ["kanna", "Sceletium tortuosum"], [("O-desmethylmesembrine", "Mesembrine")], [])],
    185: [("Apixaban", ["Eliquis"], [], ["Inactive metabolites."]),
          ("Rivaroxaban", ["Xarelto"], [], ["Inactive metabolites."])],
    193: [("Levofloxacin", ["Levaquin"], [], []), ("Moxifloxacin", ["Avelox"], [], []),
          ("Ciprofloxacin", ["Cipro"], [], [])],
    195: [("Itraconazole", ["Sporanox"], [("Hydroxyitraconazole", "Itraconazole")], []),
          ("Ketoconazole", ["Nizoral"], [], [])],
    203: [("Tamoxifen", ["Nolvadex"], [("N-desmethyltamoxifen", "Tamoxifen"), ("4-Hydroxytamoxifen", "Tamoxifen"), ("Endoxifen", "N-desmethyltamoxifen")], [])],
    210: [("Semaglutide", ["Ozempic", "Wegovy", "Rybelsus"], [], ["Peptide catabolites, not tracked."]),
          ("Tirzepatide", ["Mounjaro", "Zepbound"], [], ["Peptide catabolites, not tracked."])],
    213: [("5-HTP", ["5-hydroxytryptophan"], [], ["Converted to serotonin (endogenous, not tracked)."]),
          ("L-Tryptophan", ["tryptophan"], [], ["Converted via 5-HTP to serotonin (endogenous, not tracked)."])],
}

# brand / common aliases for simple rows (search convenience; extend freely)
ALIASES = {
    "Methadone": ["Dolophine", "Methadose", "done"], "Buprenorphine": ["Subutex", "Suboxone", "Sublocade", "Brixadi", "Butrans", "Belbuca", "bupe", "subs"],
    "Naloxone": ["Narcan"], "Naltrexone": ["Vivitrol", "Revia"], "Nalmefene": ["Zurnai", "Opvee"],
    "Morphine": ["MS Contin"], "Codeine": ["Tylenol #3"], "Hydrocodone": ["Vicodin", "Norco"], "Hydromorphone": ["Dilaudid"],
    "Oxycodone": ["OxyContin", "Percocet", "oxy", "roxy"], "Oxymorphone": ["Opana"], "Fentanyl": ["Duragesic", "fent"],
    "Tramadol": ["Ultram"], "Tapentadol": ["Nucynta"], "Meperidine": ["Demerol", "pethidine"], "Loperamide": ["Imodium"],
    "Dextromethorphan": ["DXM", "Robitussin"], "Tianeptine": ["Zaza", "Tianaa"], "Pentazocine": ["Talwin"],
    "Alprazolam": ["Xanax", "bars", "xans"], "Clonazepam": ["Klonopin", "K-pin"], "Lorazepam": ["Ativan"], "Oxazepam": ["Serax"],
    "Midazolam": ["Versed"], "Triazolam": ["Halcion"], "Flurazepam": ["Dalmane"], "Clobazam": ["Onfi"],
    "Zolpidem": ["Ambien"], "Zaleplon": ["Sonata"], "Phenobarbital": ["Luminal"], "Carisoprodol": ["Soma"],
    "Gabapentin": ["Neurontin"], "Pregabalin": ["Lyrica"], "Baclofen": ["Lioresal"], "Suvorexant": ["Belsomra"],
    "Diphenhydramine": ["Benadryl"], "Hydroxyzine": ["Atarax", "Vistaril"], "Promethazine": ["Phenergan"], "Doxylamine": ["Unisom"],
    "Fluoxetine": ["Prozac"], "Sertraline": ["Zoloft"], "Citalopram": ["Celexa"], "Escitalopram": ["Lexapro"],
    "Fluvoxamine": ["Luvox"], "Venlafaxine": ["Effexor"], "Desvenlafaxine": ["Pristiq"], "Duloxetine": ["Cymbalta"],
    "Vortioxetine": ["Trintellix"], "Vilazodone": ["Viibryd"], "Mirtazapine": ["Remeron"], "Trazodone": ["Desyrel"],
    "Nefazodone": ["Serzone"], "Nortriptyline": ["Pamelor"], "Desipramine": ["Norpramin"], "Clomipramine": ["Anafranil"],
    "Doxepin": ["Sinequan", "Silenor"], "Phenelzine": ["Nardil"], "Tranylcypromine": ["Parnate"], "Isocarboxazid": ["Marplan"],
    "Moclobemide": ["Manerix"], "Esketamine": ["Spravato"], "Zuranolone": ["Zurzuvae"],
    "Quetiapine": ["Seroquel"], "Olanzapine": ["Zyprexa"], "Paliperidone": ["Invega", "Invega Sustenna", "Invega Trinza", "Invega Hafyera"],
    "Aripiprazole": ["Abilify", "Abilify Maintena", "Aristada"], "Brexpiprazole": ["Rexulti"], "Cariprazine": ["Vraylar"],
    "Haloperidol": ["Haldol"], "Fluphenazine": ["Prolixin"], "Ziprasidone": ["Geodon"], "Lurasidone": ["Latuda"],
    "Clozapine": ["Clozaril"], "Chlorpromazine": ["Thorazine"], "Thioridazine": ["Mellaril"], "Pimozide": ["Orap"], "Iloperidone": ["Fanapt"],
    "Lithium": ["Lithobid"], "Valproate": ["Depakote", "valproic acid"], "Lamotrigine": ["Lamictal"], "Carbamazepine": ["Tegretol"],
    "Oxcarbazepine": ["Trileptal"], "Topiramate": ["Topamax"], "Levetiracetam": ["Keppra"], "Phenytoin": ["Dilantin"], "Lacosamide": ["Vimpat"],
    "Amphetamine": ["Adderall", "speed"], "Atomoxetine": ["Strattera"], "Mephedrone": ["4-MMC", "meow meow"], "α-PVP": ["flakka"],
    "MDPV": ["bath salts"], "Phentermine": ["Adipex"], "LSD": ["acid"], "DMT": ["dimethyltryptamine"], "5-MeO-DMT": ["toad"],
    "Mescaline": ["peyote", "San Pedro"], "PCP": ["phencyclidine", "angel dust"], "Methoxetamine": ["MXE"],
    "Nitrous oxide": ["N2O", "nangs", "whippets"], "Salvinorin A": ["salvia"], "Δ8-THC": ["delta-8"], "Cannabidiol": ["CBD"],
    "Amiodarone": ["Cordarone", "Pacerone"], "Dronedarone": ["Multaq"], "Sotalol": ["Betapace"], "Dofetilide": ["Tikosyn"],
    "Flecainide": ["Tambocor"], "Propafenone": ["Rythmol"], "Disopyramide": ["Norpace"], "Ranolazine": ["Ranexa"],
    "Metoprolol": ["Lopressor", "Toprol"], "Carvedilol": ["Coreg"], "Propranolol": ["Inderal"], "Nebivolol": ["Bystolic"],
    "Atenolol": ["Tenormin"], "Bisoprolol": ["Zebeta"], "Diltiazem": ["Cardizem"], "Verapamil": ["Calan"], "Amlodipine": ["Norvasc"],
    "Digoxin": ["Lanoxin"], "Ivabradine": ["Corlanor"], "Clonidine": ["Catapres"], "Lofexidine": ["Lucemyra"], "Guanfacine": ["Intuniv", "Tenex"],
    "Losartan": ["Cozaar"], "Spironolactone": ["Aldactone"], "Furosemide": ["Lasix"], "Hydrochlorothiazide": ["HCTZ"],
    "Warfarin": ["Coumadin"], "Clopidogrel": ["Plavix"], "Ondansetron": ["Zofran"], "Domperidone": ["Motilium"],
    "Metoclopramide": ["Reglan"], "Azithromycin": ["Zithromax", "Z-Pak"], "Clarithromycin": ["Biaxin"], "Fluconazole": ["Diflucan"],
    "Terbinafine": ["Lamisil"], "Hydroxychloroquine": ["Plaquenil"], "Rifampin": ["rifampicin", "Rifadin"], "Efavirenz": ["Sustiva"],
    "Ritonavir": ["Norvir"], "Cinacalcet": ["Sensipar"], "Mirabegron": ["Myrbetriq"], "Cyclobenzaprine": ["Flexeril"],
    "Tizanidine": ["Zanaflex"], "Disulfiram": ["Antabuse"], "Varenicline": ["Chantix", "Champix"], "Acetaminophen": ["Tylenol", "paracetamol", "APAP"],
    "Omeprazole": ["Prilosec"], "Prednisone": ["Deltasone"], "Sildenafil": ["Viagra", "Revatio"], "Caffeine": [], "Carfentanil": [],
    "Levorphanol": [], "Butorphanol": ["Stadol"], "Melatonin": [], "Etizolam": ["Etilaam"], "Erythromycin": [],
    "Procainamide": [], "Quinidine": [], "Mexiletine": [], "Yohimbine": [],
}

candidates = []
for r in rows:
    routes = [x[0].upper() + x[1:] for x in split_top(r["routes"])]
    if r["n"] in OVR:
        specs = OVR[r["n"]]
        for name, aliases, edges, untracked in specs:
            pid = compound(name, aliases)
            for child, parent in edges:
                link(compound(child), compound(parent))
            candidates.append({"name": name, "parentCompound": pid, "aliases": aliases,
                               "category": r["category"], "routes": routes, "reviewHints": r["why"],
                               "untrackedMetabolites": untracked, "sourceRow": r["n"]})
    else:
        name, aliases, _ = parse_name(r["drug"])
        aliases = aliases + ALIASES.get(name, [])
        pid = compound(name, aliases)
        untracked = default_metabolites(pid, r["mets"])
        candidates.append({"name": name, "parentCompound": pid, "aliases": aliases,
                           "category": r["category"], "routes": routes, "reviewHints": r["why"],
                           "untrackedMetabolites": untracked, "sourceRow": r["n"]})

# ---------------- checks
problems = []
for c in compounds.values():
    for p in c["formedFrom"]:
        if p not in compounds:
            problems.append(f"{c['id']}: unknown parent {p}")


def has_cycle():
    state = {}
    def visit(n):
        if state.get(n) == 1: return True
        if state.get(n) == 2: return False
        state[n] = 1
        for p in compounds[n]["formedFrom"]:
            if visit(p): return True
        state[n] = 2
        return False
    return any(visit(n) for n in compounds)


if has_cycle():
    problems.append("cycle in formedFrom")
ids = [c["parentCompound"] for c in candidates]
dupe_cands = {i for i in ids if ids.count(i) > 1}
if dupe_cands:
    problems.append(f"duplicate candidates: {sorted(dupe_cands)}")

# candidate ids & order
for i, c in enumerate(candidates, 1):
    c["id"] = c["parentCompound"]
    c["order"] = i

# downstream metabolites for each candidate (for display/stubbing)
children = {}
for c in compounds.values():
    for p in c["formedFrom"]:
        children.setdefault(p, []).append(c["id"])


def downstream(cid, seen=None):
    seen = seen if seen is not None else []
    for ch in sorted(children.get(cid, [])):
        if ch not in seen:
            seen.append(ch)
            downstream(ch, seen)
    return seen


for c in candidates:
    c["metaboliteTree"] = downstream(c["parentCompound"])

# metabolite-only compounds flag
parents_as_candidates = set(ids)
for c in compounds.values():
    c["isMetabolite"] = bool(c["formedFrom"])
    c["alsoTakenDirectly"] = c["id"] in parents_as_candidates
    if not c["notes"]:
        del c["notes"]

ordered_keys = ["id", "order", "name", "aliases", "category", "parentCompound", "routes",
                "metaboliteTree", "untrackedMetabolites", "reviewHints", "sourceRow"]
out = {
    "schemaVersion": 1,
    "description": "ClearDate work queue for the local data editor. Structure only (names, aliases, categories, routes, metabolite links). Contains no pharmacokinetic values; every value must be entered and verified by hand.",
    "categories": [{"id": k, "name": v, "order": i} for i, (k, v) in enumerate(CATEGORY_NAMES.items(), 1)],
    "candidates": [{k: c[k] for k in ordered_keys} for c in candidates],
    "compounds": sorted(
        [{k: c[k] for k in ["id", "name", "aliases", "formedFrom", "isMetabolite", "alsoTakenDirectly", "notes"] if k in c}
         for c in compounds.values()], key=lambda x: x["id"]),
}
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"rows={len(rows)} candidates={len(candidates)} compounds={len(compounds)} "
      f"metabolite-only={sum(1 for c in compounds.values() if not c['alsoTakenDirectly'])}")
print("problems:", problems or "none")
