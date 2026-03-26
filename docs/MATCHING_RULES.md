# Règles de matching CV ↔ mission (référence produit)

**Comment le matching se fait, en bref** (pitch non technique) : l’outil ne se limite pas à repérer des mots-clés sur le CV. Il **structure d’abord** la fiche de mission en attentes lisibles (priorités, niveau recherché, sujets à clarifier ou à surveiller). Il **compare ensuite** le parcours du candidat à ces attentes : adéquation sur les compétences et le contexte, importance accordée aux expériences **récentes** par rapport aux plus anciennes, et **garde-fou sur le niveau** (autonomie, séniorité) lorsque la mission l’exige — une techno maîtrisée ou un poste récent ne « rattrape » pas à lui seul un décalage de niveau documenté. On obtient un **score indicatif**, des **alertes** et des **questions** pour cadrer l’échange avec le client ou le candidat ; les livrables (CV adapté, mails) s’appuient sur cette analyse une fois les réponses intégrées.

**Ce document fait foi** pour les règles métier et techniques du matching, du barème mission et de la pondération par récence. Toute évolution du comportement attendu (schémas, prompts, merge, config org) doit être **reflétée ici** dans la même modification (ou PR).

- Spécification longue et contexte produit : `./REFACTO.md`
- Fonctionnalités livrées : `./FEATURES.md`

---

## 1. Flux de données

| Étape | Rôle | Stockage / artefact |
|--------|------|----------------------|
| Analyse fiche mission | Texte brut → barème structuré + synthèse | `missions.job_analysis` (JSON), workflow `analyze-job-posting` |
| Analyse positionnement | CV + fiche + barème → scores, lacunes, questions | `positionings.analysis`, workflow `positioning-analyze` |
| Génération positionnement | CV + analyse + réponses → livrables | `positionings` (champs générés), workflow `positioning-generate` |

**Déclenchement auto de l’analyse fiche** (sans action manuelle sur « Analyser ») : à la **création** de mission avec texte de fiche et au **PATCH** lorsque `job_description` change, `launchMissionJobPostingAnalysisAfterContentChange` (`lib/services/job-posting-analyze-trigger.ts`) peut lancer le workflow. Comportement : ne pas relancer si `job_analysis` existe déjà et `job_analysis_input_hash` égale le hash du texte courant ; si une analyse est **en cours** (`job_analysis_workflow_run_id`) et que le texte change, le run précédent est **annulé** ; en cas de **course** entre deux démarrages, un seul run est « claim » sur la mission — l’autre est annulé et journalisé sans LLM (voir § 5).

Le **barème mission** (`JobPostingAnalysis`) est la **source prioritaire** pour les prompts d’analyse et de génération de positionnement lorsqu’il est présent (voir `lib/services/positioning.service.ts`).

**Hiérarchie dans les prompts de positionnement** (ordre effectif du message utilisateur) :

1. **`expectedExpertiseLevel`** (niveau d’expertise attendu) — lorsqu’il est présent dans `job_analysis`, il **prime** sur les correspondances technologiques et sur la pondération par **récence** pour juger l’adéquation de **niveau** (séniorité, autonomie, périmètre). Une stack proche ou un poste récent ne compense pas un écart documenté ici.
2. **Reste du barème** (synthèse exécutive, `keyPoints`, listes, mots-clés).
3. **Bloc récence** (paramètres org + poids par expérience), **subordonné** au point 1.

---

## 2. Barème mission (`JobPostingAnalysis`)

Schéma Zod : `lib/schema.ts` (`jobPostingAnalysisSchema` et sous-schémas).

### 2.1 Synthèse exécutive

- Champ `executiveSummary` : vue courte (3–5 phrases), **sans** dupliquer le détail du barème.
- Produite par la tâche LLM `mission.jobPosting.executive` (branche dédiée du workflow).

### 2.1 bis Niveau d’expertise attendu (`expectedExpertiseLevel`)

- Objet **optionnel** en base pour rétrocompatibilité ; les **nouvelles** analyses fiche doivent le produire (consigne LLM `mission.jobPosting.keyPoints`, migration `20260401_expertise_level_and_score_confidence.sql`).
- Schéma Zod : `jobPostingExpectedExpertiseLevelSchema` dans `lib/schema.ts` (`summary`, `statedLevel`, `interpretedBand`, `signalsFromPosting`, `hardOnLevel`, `minYearsHint` optionnel, `recruiterCalibrationQuestions`).
- **Rôle produit** : expliciter ce que la mission attend comme **niveau** (le point difficile pour beaucoup de recruteurs) ; sert de **garde-fou** contre un score trop optimiste fondé uniquement sur technos + récence.
- Fusion LLM : rempli par la branche `keyPoints` ; la branche `executive` ne l’écrase pas (`mergeJobPostingPartial`).

### 2.2 Points clés (`keyPoints`)

Chaque point comporte notamment :

- `id` : identifiant **stable** (slug ASCII), réutilisable entre réanalyses.
- `aspect` : `technical` \| `methodology` \| `soft_skills` \| `context_client` \| `constraints` \| `delivery` \| `other`.
- **`technical`** : `canonicalSkillKey` **obligatoire** (minuscules, tirets ; ex. `react`, `nodejs`) — utilisé pour stats cross-missions et « compris » recruteur.
- `category` : libellé court FR pour l’UI (ex. Backend, Cloud & DevOps).
- `importanceRank` : entier ≥ 1, **1 = le plus critique** ; liste triée par rang croissant.
- `roleInMission` : impact concret pour recruteur / candidat.

### 2.3 Rubric REFACTO (optionnelle sur les points, rétrocompat)

- `requirementTier` : `hard_constraint` \| `must_have` \| `should_have` \| `nice_to_have`.
  - `hard_constraint` : éliminatoire si non satisfait — **uniquement** si objectivement vérifiable (légal, certif. réglementaire, localisation stricte, droit au travail explicite). Pas de critères subjectifs type « bonne culture ».
- `importanceWeight` : 0–1 pour les tiers **non** `hard_constraint` ; la **somme** des poids sur `must_have` + `should_have` + `nice_to_have` doit valoir **~1,0** (tolérance ±0,05). Répartition indicative dans le prompt LLM : ~40–50 % hard skills core, ~20–30 % contexte, ~15–20 % environnement, ~5–10 % nice-to-have.
- `evidenceTypeExpected` : `explicit` \| `implicit_acceptable` \| `transferable_proven`.
- `valueSought`, `scoringRubricHint` : formulations pour le scoring 0 / 50 / 100 côté prompts positionnement.

### 2.4 Mots-clés CV (`cvSearchKeywords`)

- Tableau optionnel ; visé à **10–15** termes pour prioriser le contexte CV dans les prompts de matching.

### 2.5 « À clarifier » et « Points de vigilance »

- Champs `openQuestions` et `redFlags` (tableaux de chaînes).
- **Contrat produit** : l’utilisateur doit **toujours** voir au moins une entrée par liste après analyse.
- **Implémentation** :
  - Prompt DB `mission.jobPosting.keyPoints` : les deux listes sont **obligatoires** (au moins une phrase chacune ; si rien à signaler, phrase explicite du type « aucune ambiguïté majeure… » / « aucun point de vigilance majeur… »). Migration : `20260331_mission_keypoints_open_redflags_required.sql`.
  - Normalisation code : `withMandatoryJobPostingLists` dans `lib/services/job-posting-analysis.service.ts` (après fusion LLM, avant sauvegarde ; aussi côté UI et chargement `job_analysis` dans les workflows positionnement si données anciennes incomplètes).

### 2.6 Fusion des flux LLM (analyse mission)

- Deux branches parallèles : `executive` (synthèse seule) et `keyPoints` (barème + listes + mots-clés + `expectedExpertiseLevel`).
- **Merge** : `mergeJobPostingPartial` dans `lib/services/job-posting-analysis-merge.ts` — la branche **`executive` ne met à jour que `executiveSummary`** et ne doit **jamais** écraser `keyPoints`, `openQuestions`, `redFlags`, `cvSearchKeywords`, **`expectedExpertiseLevel`** (évite les partiels vides / parasites du flux structuré).

---

## 3. Pondération par récence des expériences

- Config : `MatchingWeightsConfig` dans `lib/config/matching-weights.ts`.
- Stockage org : `organization_settings.matching_weights` (JSONB, nullable = défauts code). Migration : `20260329_organization_matching_weights.sql`.
- Champs :
  - `experienceRecencyEnabled` (défaut `true`) : si `false`, aucun bloc récence n’est injecté dans les prompts.
  - `recencyMode` : `exponential` \| `explicit`.
  - `recencyDecayPerRank` (0,1–0,99, défaut 0,74), `recencyWeightFloor` (défaut 0,12).
  - `recencyExplicitWeights` : poids par rang si mode `explicit`.
- Calcul du poids par rang : `weightForRecencyRank` ; tri des expériences : `lib/utils/experience-recency.ts` (plus récent = rang 0). La fin de période pour un poste **en cours** utilise l’année calendaire **UTC** de la date de référence passée au tri (à l’exécution : `new Date()` dans le workflow / service, pas d’année codée en dur).
- Normalisation préalable du CV : `lib/utils/cv-experience-time.ts` (`prepareCvForMatchingPrompt`) — si la première expérience n’a pas de date de fin exploitable, `isCurrent` est forcé à vrai et `personalInfo.yearsOfExperience` est recalculé (union des périodes jusqu’à l’instant du run). Les années dans les chaînes de dates sont extraites via `lib/utils/cv-date-years.ts` (utilisé par `cv-experience-time`). Appliqué après extraction CV et avant les prompts d’analyse / génération de positionnement.
- **Extraction LLM expériences** : la consigne `cv.branch.experiences` en base (migration `20260403_cv_branch_experiences_current_role_prompt.sql`) aligne l’ordre récent → ancien et la règle **poste en cours** / fin de date avec la normalisation ci-dessus (éviter divergence extraction vs matching).
- Injection prompt : `buildExperienceRecencyContextBlock` — utilisée dans `buildAnalysisUserContent`, `buildPositioningSynthesisUserContent`, `buildGenerateUserContent`.
- **Limite** : la récence **ne prime pas** sur `expectedExpertiseLevel` lorsque celui-ci est fourni (rappel dans le bloc récence et dans les prompts positionnement).

---

## 3 bis Signaux de niveau sur le CV (extraction)

- Champs optionnels dans `personalInfo` : `inferredSeniorityBand` (`junior` \| `confirmed` \| `senior` \| `expert_lead` \| `unknown`), `seniorityInferenceNote`.
- Remplis par la tâche `cv.branch.identity` (consigne prudente : `unknown` si ambigu) — migration `20260401_expertise_level_and_score_confidence.sql`.
- Objectif : donner des **repères comparables** au bloc mission pour l’aide à la décision, sans remplacer le jugement recruteur.

---

## 4. Analyse & génération de positionnement

- Les prompts utilisateur sont assemblés dans `lib/services/positioning.service.ts` : **niveau attendu** d’abord (si présent), puis barème, puis récence et CV. **Si** `hasUsableJobAnalysisForPositioning(job_analysis)` est vrai (points clés ou `expectedExpertiseLevel`), le **texte brut de la fiche n’est pas envoyé au LLM** : seul le JSON du barème + une ligne « Référence poste » (titre / client) font foi. Sinon, comportement historique avec fiche brute.
- Écran positionnement lié à une mission : libellé **titre + entreprise** à la place du corps de la fiche (`JobInput` + `GET /api/positioning/[id]` avec jointure `missions`).
- `job_analysis` passé aux workflows `positioning-analyze` et `positioning-generate` est normalisé avec `withMandatoryJobPostingLists` pour garantir `openQuestions` / `redFlags` non vides dans les prompts.
- Les tâches LLM et clés stables : `lib/llm/task-keys.ts` ; prompts système en base (`llm_tasks`) et surcharges org.
- **`positionings.answers`** : réponses saisies (clés `candidat:` / `client:` + libellé de la question). Elles sont **fusionnées** dans la base avant `POST /api/positioning/analyze`, puis injectées dans le prompt utilisateur via `buildPriorAnswersPromptBlock` (`buildAnalysisUserContent` / synthèse) pour que **toutes les branches** d’analyse et le **score** en tiennent compte — pas seulement la génération CV / mails (`buildGenerateUserContent`). Les clés `generationExpertise:` sont **réservées à la phase génération** et **exclues** des prompts d’analyse (`analysisPhaseAnswersOnly`).
- **`positionings.analysis_recruiter_answers`** (JSONB, nullable) : **snapshot** de `analysisPhaseAnswersOnly(normalizePositioningAnswers(answers))` **au démarrage** du run (`priorAnswers` dans `workflows/positioning-analyze.ts`), persisté à la fin de `saveAnalysis` avec le même contenu que celui injecté dans les prompts. L’UI « Résultats » n’affiche ce bloc que pour ce snapshot (pas la saisie live) ; l’onglet Questions & affinage liste **toutes** les questions avec brouillon dans `answers` / formulaire jusqu’à relance. Migration : `20260405_positioning_analysis_recruiter_answers.sql`.
- **`positioning_analysis_history`** : snapshots d’**analyse + `answers`** avant une **relance** explicite — lors d’un `PATCH` sur `PATCH /api/positioning/[id]` avec `archiveAnalysisBeforeClear: true` et `analysis: null`, l’analyse courante (si présente) est insérée dans cette table avant remise à zéro (`status` repasse notamment en brouillon). Migration : `20260402_positioning_analysis_history.sql`.
- **Champs libres phase analyse** : clés réservées `candidat:Contexte libre (recruteur)` et `client:Contexte libre (demande client)` dans `positionings.answers` — même chaîne de persistance, prompts (`formatPositioningAnswerLines`) et comparaison au snapshot que les Q/R structurées (`POSITIONING_ANALYSIS_FREEFORM_*` dans `lib/services/positioning.service.ts`).
- **`positionings.generation_expertise_prompts`** : questions + **suggestions de réponses** produites par la branche `positioning.generate.expertiseConfirmations` ; saisie recruteur dans l’UI génération (pas dans le formulaire CV), persistée via `answers` (`generationExpertise:ec-i`) ; bloc dédié dans `buildGenerateUserContent` (`buildGenerationExpertiseRecruiterBlock`).

### 4.1 Preuves et biais (consignes métier)

- Pas d’inférence sur attributs protégés (âge, genre, origine, statut marital, etc.).
- Côté compétences : citation du CV attendue (`evidenceQuote` / équivalent schéma positioning) ; utiliser la littérale **`NO_EVIDENCE`** si aucune preuve (voir implémentation et prompts `positioning.analysis.*`).

### 4.2 Score et confiance (`matchScore`, `matchScoreConfidence`)

- `matchScore` et `matchSummary` sont produits par la branche synthèse `positioning.analysis.synthesis` ; le score reste **heuristique** (LLM), pas une formule déterministe.
- **`matchScoreConfidence`** : `low` \| `medium` \| `high` — **obligatoire** dans la sortie structurée de la synthèse pour les **nouvelles** analyses ; optionnel en base pour les analyses antérieures.
- **`matchScoreConfidenceNote`** : courte justification FR pour l’aide à la décision (incertitudes, contradictions niveau vs CV, barème incomplet, etc.).
- UI : affichage de la fiabilité à côté du score (page positionnement + section synthèse), avec tooltip sur la note ; utilitaires `lib/utils/match-score-confidence.ts`.

---

## 5. Traçabilité LLM (`ai_usage_log`)

- Chaque appel modèle doit être journalisé via `logAiUsage` (`lib/services/ai-usage.service.ts`).
- Champs utiles au diagnostic matching :
  - `workflow_run_id` : regrouper les appels d’un même run workflow.
  - `branch` : ex. `executive` \| `keyPoints` pour l’analyse fiche (deux appels parallèles).
  - `call_status` : `completed` \| `failed` \| `cancelled` — **`completed` sur une ligne = cette branche / cet appel est terminé**, pas forcément l’ensemble du workflow (l’autre branche ou la sauvegarde peut encore être en cours).
- Modèle factice `workflow/no-llm` : lignes d’audit sans appel modèle (ex. run concurrent **supplanté** lors du claim mission), barème coût à 0 dans `lib/pricing.ts` ; `taskKey` associé : `mission.jobPosting.workflowDedup` (`TASK_KEY.MISSION_JOB_POSTING_WORKFLOW_DEDUP`).

---

## 6. Fichiers de référence (à tenir alignés avec ce doc)

| Sujet | Fichiers |
|--------|-----------|
| Schémas | `lib/schema.ts` |
| Merge mission | `lib/services/job-posting-analysis-merge.ts` |
| Normalisation listes mission | `lib/services/job-posting-analysis.service.ts` |
| Déclenchement / dédup analyse fiche | `lib/services/job-posting-analyze-trigger.ts` |
| Workflow analyse mission | `workflows/analyze-job-posting.ts` |
| Affichage niveau attendu (mission) | `components/mission-job-analysis.tsx` |
| Prompts utilisateur positioning | `lib/services/positioning.service.ts` |
| API positioning (GET jointure mission, archive avant relance) | `app/api/positioning/[id]/route.ts` |
| Confiance score (UI + labels) | `lib/utils/match-score-confidence.ts` |
| Récence | `lib/config/matching-weights.ts`, `lib/utils/experience-recency.ts`, `lib/utils/cv-experience-time.ts`, `lib/utils/cv-date-years.ts` |
| UI paramètres org | `app/settings/organization/page.tsx` (si présent) |
| Migrations prompts / `matching_weights` | `supabase/migrations/*` concernés |

---

## 7. Maintenance

Lors d’un changement qui touche :

- barème, tiers, preuves attendues, mots-clés, listes obligatoires, merge des branches, récence, ou interprétation des logs LLM pour le matching,

**mettre à jour `docs/MATCHING_RULES.md` dans le même changement**, puis vérifier que `AGENTS.md` pointe toujours vers ce fichier.
