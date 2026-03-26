Voici la **documentation finale** pour spécifier l'application. Ce document est conçu pour être utilisé comme contexte de build (prompt engineering) ou comme cahier des charges technique.

---

# Spécification Technique : Système d'Analyse de Matching CV-Mission

**Version** : 1.0  
**Architecture** : Extraction-Découplée (Extract Once, Match Many)  
**Date** : 2026-03-25

---

## 1. Principes Fondamentaux

### 1.1 Philosophie du système
Le système n'est pas un "comparateur textuel" mais un **évaluateur structuré par preuves**. Il sépare strictement :
1. **L'extraction** (comprhension des documents)
2. **La normalisation** (stockage structuré et versionné)
3. **L'évaluation** (matching logique et LLM ciblé)

### 1.2 Contraintes non négociables
- **Structured Outputs** : Toute sortie LLM doit suivre un schéma JSON strict (Pydantic/Zod)
- **No Inference on Protected Attributes** : Jamais d'inférence sur âge, genre, origine, statut marital
- **Evidence-Based Scoring** : Tout score doit être justifié par une citation exacte du document source
- **Deterministic Hard Constraints** : Les critères bloquants sont évalués par règles code, pas par LLM
- **Human-in-the-Loop** : Le recruteur garde le contrôle final sur toute décision éliminatoire

---

## 2. Architecture Système (3 couches)

### 2.1 Couche d'Extraction (One-Time)
**Rôle** : Transformer documents bruts (PDF, DOCX, texte) en objets structurés normalisés.

**Composants** :
- **CV Parser** : Détection layout (OCR si image) → Extraction brute → Normalisation sémantique
- **Job Parser** : Analyse sémantique profonde de la fiche de poste → Génération de rubric (barème)
- **Validation Engine** : Vérification cohérence schéma + calcul métriques dérivées (durées, niveaux)

**Stockage** : 
- `cv_profiles/` : JSON versionnés (hash du fichier source)
- `job_profiles/` : JSON avec rubric et pondérations explicites

### 2.2 Couche de Stockage (Normalisation)
**Rôle** : Servir de source de vérité immuable pour les matchings futurs.

**Principes** :
- **Immutabilité** : Quand un CV est mis à jour, création d'une nouvelle version (v1, v2...), pas de modification
- **Diff Tracking** : Stockage des différences entre versions pour invalidation sélective des anciens matchings
- **Anonymisation optionnelle** : Champs d'identité séparés des chards d'évaluation (permettre l'evaluation blind)

### 2.3 Couche de Matching (On-Demand)
**Rôle** : Combiner un CV Profile et un Job Profile pour produire une évaluation.

**Pipeline** :
1. **Hard Filter** (Règles déterministes) : Langues, localisation, années min, certifications légales
2. **Dimension Scoring** (LLM ciblé) : Évaluation critère par critère avec preuves
3. **Aggregation** (Algo + LLM) : Calcul pondéré + Détection contradictions
4. **Synthesis** (LLM) : Génération rapport recruteur + Questions d'entretien

---

## 3. Spécifications des Schémas de Données

### 3.1 Schéma CV Profile (v1.0)

**Métadonnées** :
- `schema_version`: "1.0"
- `cv_id`: UUID unique
- `source_hash`: Hash SHA256 du fichier original (détection doublons/modifications)
- `extraction_date`: ISO 8601
- `extraction_confidence`: Float 0-1 (confiance globale de l'extraction)
- `anonymized_id`: ID séparé pour mode évaluation sans biais

**Données calculées** :
- `total_years_experience`: Float (somme des durées, chevauchements gérés)
- `average_tenure_months`: Float (stabilité perçue)
- `current_role`: String normalisé (dernier poste)
- `is_actively_looking`: Boolean (déduit des dates de fin si < 1 mois)

**Expériences** (Array) :
Chaque expérience doit contenir :
- `title_normalized`: Intitulé standardisé (ex: "Senior Backend Developer" et non "Lead Ninja Python")
- `company`: String
- `sector`: Enum (Tech, Finance, Retail, Consulting, etc.) ou null
- `duration_months`: Integer calculé précisément
- `level`: Enum (junior, confirmed, senior, lead, manager, director, vp, c-level)
- `environment`: Array (startup, scaleup, corporate, freelance, agency)
- `responsibilities`: Array strings (bullet points originaux)
- `achievements_quantified`: Array strings (réalisations avec chiffres extraits)
- `tools_used`: Array strings (stack explicite)
- `team_context`: Object {size: int, reporting_to: string, autonomy_level: enum}

**Compétences** (Array) :
- `name_normalized`: String standardisé (ex: "Python", "React", "AWS Lambda")
- `category`: Enum (language, framework, library, database, cloud, tool, soft_skill, domain_knowledge)
- `proficiency`: Enum (beginner, intermediate, advanced, expert)
- `years_experience`: Float cumulé sur toutes les expériences
- `context`: String (où démontré: "Expérience chez [Company]", "Projet X")
- `verification_status`: Enum (explicitly_proved, implicitly_mentioned, inferred_from_context)

**Contraintes dures** :
- `languages`: Array {lang: ISO_code, level: CEFR (A1-C2), context: string}
- `location`: Object {city: string, country: string, remote_pref: enum(onsite, hybrid, remote), mobility: boolean}
- `certifications`: Array strings (normés)
- `work_authorization`: Enum (EU citizen, work permit, sponsorship_needed, unknown)

**Flags d'information manquante** :
- `missing_info_flags`: Array strings (ex: "dates manquantes expérience #3", "niveau langue non précisé")

### 3.2 Schéma Job Profile (v1.0)

**Métadonnées** :
- `schema_version`: "1.0"
- `job_id`: UUID
- `title`: String
- `company_sector`: Enum
- `contract_type`: Enum (CDI, CDD, Freelance, Stage, Apprenticeship)
- `created_at`: Date

**Structure d'évaluation (Rubric)** :
- `requirements`: Array d'objets Requirement :
  - `id`: String unique (ex: "backend_python")
  - `category`: Enum (hard_constraint, must_have, should_have, nice_to_have)
  - `field`: Enum (skill, experience_years, language, location, certification, sector, soft_skill)
  - `value`: String recherché (ex: "Python", "5", "fr_C1")
  - `min_years`: Float (si field = experience_years)
  - `importance_weight`: Float 0-1 (somme des non-hard-constraint = 1.0)
  - `evidence_type_expected`: Enum (explicit, implicit_acceptable, transferable_proven)
  - `description`: String explicite du critère pour évaluation
  - `scoring_rubric`: Object décrivant 0, 50, 100 points

**Contexte métier** :
- `work_environment`: Object {remote_policy: enum, team_size: range, methodology: array(agile, waterfall, etc.)}
- `growth_profile`: Enum (executor, expert_specialist, tech_lead, engineering_manager, architect, vp_eng)
- `tech_stack_primary`: Array strings (technologies core)
- `tech_stack_secondary`: Array strings (nice to have)

**Keywords pour recherche** :
- `cv_search_keywords`: Array 10-15 mots-clés prioritaires à retrouver dans le CV (pour sélection contexte)

---

## 4. Workflows Détaillés

### 4.1 Workflow d'Extraction CV

**Input** : Fichier (PDF/DOCX/TXT) + Métadonnées upload  
**Output** : CV Profile JSON validé

**Étapes** :
1. **Pré-traitement** :
   - Détection type de fichier
   - Si PDF image → OCR (Vision API) sinon extraction texte brut
   - Conservation du texte brut original pour citations exactes

2. **Extraction Structurée** (Prompt LLM avec Structured Output) :
   - Extraction brutale de toutes les données temporelles, postes, compagnies
   - Normalisation des intitulés (mapping interne vers taxonomie standard)
   - Détection implicite du niveau de séniorité (basé sur responsabilités, pas titre seul)
   - Extraction compétences avec contexte de preuve

3. **Calculs dérivés** :
   - Calcul durées précises (gestion des chevauchements)
   - Déduction stabilité (average_tenure)
   - Identification "current_role" (date de fin la plus récente ou null)

4. **Validation** :
   - Vérification cohérence dates (fin > début)
   - Vérification somme durées vs total_years_experience
   - Flag si extraction_confidence < 0.7 sur des champs critiques

5. **Stockage** :
   - Génération `source_hash`
   - Vérification existence version précédente (si oui, création v2 avec diff)
   - Sauvegarde JSON immuable

### 4.2 Workflow d'Extraction Mission

**Input** : Texte fiche de poste ( brut ou structuré)  
**Output** : Job Profile JSON avec Rubric

**Étape critique : Génération de la Rubric** :
Le système doit transformer une fiche narrative en critères évaluables pondérés.

**Processus LLM** :
1. **Analyse sémiotique** : Identifier ce qui est :
   - Exigence éliminatoire (bloquante)
   - Must-have (mission impossible sans)
   - Should-have (forte valeur ajoutée)
   - Nice-to-have (différenciant)

2. **Décomposition** :
   - Transformer "Piloter la transformation data" → Critères mesurables : 
     * Architecture data design (must_have, weight 0.25)
     * Leadership technique (should_have, weight 0.15)
     * Expérience Cloud Data (must_have, weight 0.20)

3. **Attribution poids** :
   - Hard constraints : poids 1.0 (pass/fail)
   - Autres : répartition selon importance métier (total = 1.0)
   - Note : Les poids doivent être validables/ajustables par le recruteur avant lancement matching

4. **Génération keywords** :
   - Identification 10-15 termes techniques spécifiques à cette mission pour priorisation lors du scoring CV

### 4.3 Workflow de Matching (Scoring)

**Input** : `cv_id` + `job_id`  
**Output** : Match Report JSON + Synthèse textuelle

**Phase 1 : Hard Constraints Filter (Déterministe)** :
- Vérification langues (niveau CEFR atteint ?)
- Vérification localisation (compatible avec remote_policy ?)
- Vérification années min (total_years_experience >= min ?)
- Vérification certifications obligatoires (présentes dans liste ?)
- **Résultat** : Si un blocage → Verdict "INCOMPATIBLE" avec raison explicite, fin du workflow (pas de LLM scoring)

**Phase 2 : Dimension Scoring (LLM parallèle ou séquentiel)** :
Pour chaque `requirement` de category != hard_constraint :
- **Context Injection** : Sélectionner dans le CV uniquement les expériences/skills pertinents (basé sur keywords de la mission)
- **Prompt Scoring** : Évaluation du niveau d'adéquation (0-100) avec :
  * Citation exacte prouvant le score (ou "NO_EVIDENCE")
  * Niveau de confiance (1.0 = preuve explicite, 0.5 = transfert logique, 0.0 = absent)
  * Status : "met" (90-100), "partial" (50-89), "missing" (0-49)
- **Règles de scoring** :
  * Si `evidence_type_expected` = "explicit" et preuve implicite seulement → plafonné à 30/100
  * Compétence ancienne (>5 ans) poids 0.5 vs récente si mission exige stack actuel
  * "Expert" sur CV sans preuve concrète (chiffres, scope) → max 60/100

**Phase 3 : Agrégation** :
- Calcul score global pondéré : Σ(score * weight) / Σ(weights)
- Détection anomalies : Si un must_have à 20/100 mais score global > 70 → flag "Incohérence à vérifier"

**Phase 4 : Synthesis & Critique** (LLM raisonnement) :
Utilisation modèle de reasoning (o3-mini/o1) uniquement si :
- Score global dans zone grise (65-79)
- Contradictions détectées (titre "Lead" mais pas de preuve management)
- Contexte complexe (transfert de compétences entre secteurs différents)

**Output Synthesis** :
- `verdict` : Enum (STRONG_MATCH, MATCH, WEAK_MATCH, INSUFFICIENT)
- `overall_score` : 0-100
- `dimension_breakdown` : Array résultats par critère
- `top_strengths` : 3 points forts avec citations
- `top_gaps` : 3 manques bloquants ou risques
- `evidence_quotes` : Dictionnaire {critère: citation exacte CV}
- `interview_questions` : 2-3 questions spécifiques pour lever les doutes
- `bias_flags` : Alertes si détection possible biais (ex: surestimation due à marque d'école prestigieuse non demandée)

---

## 5. Prompts Engineering (Spécifications)

### 5.1 Prompt System : Extraction CV
```
Tu es un parser de CV expert. Ta mission est d'extraire des informations structurées 
vers un schéma JSON strict sans inventer de données.

RÈGLES DE NORMALISATION :
- Titres de poste : Standardiser vers taxonomie {Junior/Confirmé/Senior/Lead/Manager} + Métier
  Exemples : "Data Ninja" → "Data Analyst", "Dev Backend JS" → "Backend Developer"
- Compétences : Normaliser les noms (Python, pas python3.9 ou Python 3)
- Dates : Calculer duration_months précisément. Si "Présent", utiliser date du jour.

RÈGLES DE PROFICIENCY :
- expert : preuve de design/architecture ou mention "expert" avec contexte technique profond
- advanced : utilisation régulière sur plusieurs projets ou années
- intermediate : mention dans stack ou utilisation basique
- beginner : mention sans contexte ou cours suivi uniquement

INTERDICTIONS STRICTES :
- NE PAS inférer l'âge des dates de formation (bac+5 = 23 ans ? INTERDIT)
- NE PAS déduire le genre du prénom ou des activités
- NE PAS calculer de salaire attendu basé sur l'adresse
- NE PAS évaluer la "qualité" de l'école sauf si explicitement requise dans la mission

GESTION DES MANQUES :
Si une information est absente (dates pour expérience #2, niveau de langue précis), 
utiliser "unknown" et ajouter un flag dans missing_info_flags.

OUTPUT : JSON strict conforme au schéma CV Profile v1.0
```

### 5.2 Prompt System : Extraction Mission (Génération Rubric)
```
Tu es un analyste de fiches de poste. Transforme une description narrative en 
barème d'évaluation structuré (Rubric).

PHASE 1 - Classification des exigences :
Pour chaque compétence/demande dans le texte, classer :
- HARD_CONSTRAINT : Éliminatoire si manquant (langue légale, certification réglementaire, localisation stricte, droit de travail)
- MUST_HAVE : Mission impossible sans (ex: "maîtrise Python" pour dev Python)
- SHOULD_HAVE : Important mais négociable (ex: "connaissance cloud AWS" quand c'est formable)
- NICE_TO_HAVE : Bonus différenciant (ex: "certification Scrum" quand c'est du dev backend)

PHASE 2 - Pondération :
Attributer importance_weight à chaque critère non-bloquant (somme = 1.0).
Répartition suggérée :
- 40-50% sur hard skills core (techniques métier)
- 20-30% sur expérience contextuelle (secteur, type de problèmes résolus)
- 15-20% sur environnement (autonomie, stack similaire)
- 5-10% sur nice-to-have

PHASE 3 - Définition des preuves attendues :
Pour chaque critère, définir evidence_type_expected :
- explicit : Doit être clairement écrit sur le CV (ex: "3 ans Python")
- implicit_acceptable : Peut être déduit d'autres éléments (ex: "Développeur Django" → Python implicite)
- transferable_proven : Expérience différente mais démonstration capacité adaptation nécessaire

RÈGLE CRITIQUE : 
Les hard_constraints doivent être objectivement vérifiables (présence/absence binaire), 
pas subjectives ("bonne culture d'entreprise").

OUTPUT : JSON strict Job Profile avec rubric complète.
```

### 5.3 Prompt System : Dimension Scoring
```
Tu es un évaluateur objectif. Tu compares une exigence de mission à un profil de candidat.

CONTEXTE FOURNI :
- Requirement : {json du critère à évaluer}
- Candidate evidences : {3 expériences/skills les plus pertinents du CV pour ce critère}
- Règles de scoring : {rubric du requirement}

TÂCHE :
Évaluer le niveau d'adéquation (0-100) UNIQUEMENT sur les preuves fournies.

CONTRAINTES D'ÉVALUATION :
1. Preuve explicite = score libre selon qualité (0-100)
2. Preuve implicite/unverified = plafonné à 30/100
3. Absence totale = 0/100
4. Si "must_have" et score < 50 : expliquer précisément ce qui manque pour atteindre 50

CITATIONS OBLIGATOIRES :
Pour tout score > 0, fournir :
- "evidence_quote" : phrase exacte du CV (copy-paste)
- "confidence" : 1.0 (texte explicite), 0.7 (inférence forte), 0.4 (implicite)

BIAS CHECK :
Si tu détectes que tu sur-évalues à cause d'un "prestige" (école, entreprise connue) 
non demandé dans le requirement, ajuster le score à la baisse et noter "bias_corrected".

OUTPUT : JSON {score, evidence_quote, confidence, status, gap_description}
```

### 5.4 Prompt System : Synthesis & Questions
```
Tu es un assistant recrutement senior. Tu synthétises une évaluation technique 
en outil de décision pour un recruteur.

INPUT : 
- Dimension scores : [liste des résultats par critère]
- Hard constraints : [résultats passe/échoue]
- Overall score calculé : {valeur}

OUTPUT ATTENDU :
1. Verdict : 
   - STRONG_MATCH (85-100) : Candidat probablement surqualifié ou parfait fit
   - MATCH (70-84) : Fit bon, quelques vérifications nécessaires
   - WEAK_MATCH (50-69) : Possible avec formation/adaptation
   - INSUFFICIENT (<50) : Trop de gaps critiques

2. Top 3 Forces : Compétences où le candidat excède la mission avec preuves concrètes

3. Top 3 Risques : Gaps réels ou surinterprétations du CV (ex: "Lead" sans équipe)

4. Questions d'entretien ciblées : 
   - 2 questions pour valider les risques identifiés
   - 1 question pour explorer une force surprenante (si strong_match)

5. Red Flags éthiques : 
   - Liste si détection de possible biais dans l'évaluation précédente (ex: surestimation école)
   - Suggestion d'entretien "blind" si nécessaire

FORMAT : Réponse structurée, concise, orientée action (pas de blabla).
```

---

## 6. Logique Métier & Règles de Scoring

### 6.1 Règles de normalisation sémantique
**Intitulés de poste** : Mapping obligatoire vers taxonomie interne
- "Data Scientist", "Machine Learning Engineer", "AI Engineer" → distinctions selon contexte (modélisation vs prod vs recherche)
- "Fullstack", "Frontend", "Backend" → séparation stricte basée sur % temps décrit dans responsabilités

**Niveaux de séniorité** : Déduction multi-facteurs (pas seulement années)
- **Junior** : < 2 ans OU supervision forte requise selon CV
- **Confirmé** : 2-5 ans + autonomie sur features
- **Senior** : 5+ ans + architecture/design + mentoring implicite ou explicite
- **Lead** : Preuve de décision technique + coordination (pas seulement "lead" dans le titre)
- **Manager** : Preuve de management d'équipe (reviews, 1:1, carrière des reports)

### 6.2 Gestion du temps
- **Période de carence** : Expérience > 5 ans = poids 0.7 pour techs évolutives (React, Cloud), poids 1.0 pour fondamentaux (Algo, Gestion projet)
- **Trous de CV** : Flag si trou > 6 mois non expliqué, mais PAS de scoring négatif automatique (éviter biais parentalité)

### 6.3 Calcul de matching
**Formule agrégation** :
```
Score Global = (Hard_Constraints_Pass * 100) * 0.5 + (Weighted_Dimensions_Score * 0.5)

Où Weighted_Dimensions_Score = Σ(score_i * weight_i) / Σ|weights|

Note : Hard_constraints_Pass est binaire (0 ou 1). Si 0, score global = 0 (rejet).
```

**Seuils de verdict** :
- 90-100 : Strong Match (Candidat idéal ou surqualifié)
- 75-89 : Match (Bon fit)
- 60-74 : Weak Match (Nécessite formation ou adaptation)
- <60 : Insufficient (Rejet)

**Zone de raisonnement** : Scores entre 65-80 déclenchent automatiquement un appel au modèle de reasoning pour analyse fine des contradictions.

---

## 7. Compliance & Sécurité

### 7.1 Conformité AI Act (UE)
Le système est classé **High-Risk** (Employment/Worker management).
**Obligations implémentées** :
- **Human Oversight** : Toute décision éliminatoire doit être validée par humain (interface de confirmation)
- **Transparency** : Fourniture d'explications compréhensibles (quotes exactes, pas de "black box")
- **Accuracy** : Évaluation continue via échantillonnage recruteur (voir section 9)
- **Bias Monitoring** : Détection automatique proxy variables (voir 7.2)

### 7.2 Détection et mitigation des biais
**Proxy variables interdites** :
- Prestige école (sur-pondération automatique si détectée)
- Origine géographique (hors contrainte mission explicite)
- Genre (inférence par prénom ou activités)
- Âge (inférence par dates formation)

**Mécanisme de correction** :
- Score de "bias risk" calculé par heuristique (ex: écart entre score brut et score si suppression école)
- Si risque > seuil, suggestion de réévaluation "blind" (masquage école/nom)

### 7.3 Protection des données
- Hashage des noms/emails dans la couche d'évaluation (si mode anonymisé activé)
- Logs d'audit : Stockage de toutes les décisions LLM avec justification (traçabilité)
- Droit à l'explication : Export possible du JSON de scoring complet pour le candidat (si demande RGPD)

---

## 8. Interface & UX (Vue Recruteur)

### 8.1 Dashboard d'analyse
**Layout recommandé** :
```
┌─────────────────────────────────────────────────────┐
│ VERDICT : [MATCH] 78/100    [🔍 Détails] [✓ Valider] │
├─────────────────────────────────────────────────────┤
│ HARD CONSTRAINTS : [5/5 ✓]                          │
│ Langue FR-C1 ✓ | Location Paris ✓ | XP 5+ ans ✓ ... │
├─────────────────────────────────────────────────────┤
│ DIMENSIONS ÉVALUÉES :                               │
│ Backend Python    [████████░░] 85/100  → "3 ans Django│
│ Architecture Data [██████░░░░] 60/100  → Manque preuve│
│ Leadership        [░░░░░░░░░░] 20/100  → Titre seul   │
├─────────────────────────────────────────────────────┤
│ 📄 PREUVES CITÉES :                                 │
│ • "Conception pipeline ETL chez X" [CV p.2 l.15]   │
│ • "Optimisation latency 40%" [CV p.1 l.8]          │
├─────────────────────────────────────────────────────┤
│ ⚠️  QUESTIONS SUGGÉRÉES :                           │
│ 1. "Décris ton rôle sur le projet Data Lake ?"      │
│ 2. "Comment as-tu mesuré l'optimisation des 40% ?"  │
└─────────────────────────────────────────────────────┘
```

### 8.2 Mode Debug (pour admin/amélioration)
- Visualisation du JSON intermédiaire complet
- Comparaison côte à côte Requirement vs Evidence extraite
- Possibilité de "rejouer" un scoring avec ajustement de poids (what-if)

---

## 9. Tests & Validation

### 9.1 Golden Dataset (Bootstrapping)
**Construction** :
- 20 CVs synthétiques créés manuellement avec ground truth parfait (présence/absence compétences connues)
- 5 Missions types (CDI tech senior, Freelance expert, Junior avec formation...)
- Annotations humaines : Score attendu pour chaque paire CV-Mission

**Tests de régression** :
- À chaque changement de prompt ou modèle, re-run des 100 paires
- Tolérance : Écart < 5% avec version précédente, sinon investigation

### 9.2 Tests de robustesse
- **Consistency Test** : Même CV reformaté (PDF vs TXT vs DOCX) → Doit donner score identique (±3 points)
- **Noise Test** : Ajout de sections inutiles dans CV → Ne doit pas changer le score final (test de focus)
- **Adversarial Test** : CV avec buzzwords mais sans preuve → Doit être détecté comme faible score (test de résistance)

### 9.3 Monitoring production
**Métriques** :
- `hard_constraint_precision` : Doit être 100% (aucun faux négatif sur bloquants)
- `explanation_faithfulness` : % de citations qui existent réellement dans le CV (vérification spot)
- `human_override_rate` : % de fois où recruteur change le verdict IA (target < 15% si système mature)

---

## 10. Roadmap d'Implémentation

### Phase 1 : Fondations (Semaine 1-2)
- Setup schémas Pydantic/Zod stricts (validation runtime)
- Implémentation parsers CV (OCR + texte) avec extraction v1
- Stockage JSON versionné (filesystem ou DB document)

### Phase 2 : Matching Engine (Semaine 3-4)
- Hard constraints filter (logique code pure)
- Prompts scoring dimension (itération prompts avec 10 cas tests)
- Synthesis engine (génération rapports)

### Phase 3 : Interface & UX (Semaine 5-6)
- Dashboard recruteur (visualisation scores + preuves)
- Système de feedback (recruteur peut flaguer erreur pour amélioration)
- Mode debug/anonymisation

### Phase 4 : Robustesse (Semaine 7-8)
- Golden dataset construction
- Bias detection heuristics
- Audit trail complet (logging)
- Tests E2E (upload → extraction → matching → rapport)

---

## Annexes

### A. Glossaire
- **Rubric** : Barème d'évaluation détaillé (critères + pondération)
- **Evidence** : Citation exacte du document source justifiant une évaluation
- **Hard Constraint** : Exigence binaire (pass/fail) éliminatoire
- **Dimension** : Aspect évalué du candidat (ex: "Backend Skills", "Leadership")

### B. Exemple de flux complet (Narratif)
1. Upload CV "John Doe.pdf" → Extraction → CV Profile v1 créé (confidence 0.92)
2. Upload Mission "Lead Dev Backend" → Extraction → Job Profile avec rubric (Must: Python 5ans, Should: Leadership)
3. Matching lancé :
   - Hard filter : Langue OK, XP OK (5.2 ans calculé) → Passe
   - Dimension Python : Score 90 (preuve: "Architecte Python 3 ans chez Scale")
   - Dimension Leadership : Score 40 (preuve: "Lead" dans titre mais pas d'équipe mentionnée)
   - Global : (90*0.6 + 40*0.4) = 70/100 → Verdict "MATCH"
4. Recruteur voit : Score 70, Force Python, Risque Leadership, Question suggérée : "Combien de personnes as-tu managé ?"

---

**Fin de la spécification**