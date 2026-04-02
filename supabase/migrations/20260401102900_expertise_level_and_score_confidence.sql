-- Bloc mission expectedExpertiseLevel (prioritaire matching) + confiance du score positionnement + signaux niveau CV.

-- ─── Analyse fiche mission : expectedExpertiseLevel obligatoire dans la sortie JSON keyPoints ───
UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $block$

## Niveau d'expertise attendu (sortie JSON obligatoire)

Tu dois remplir **expectedExpertiseLevel** en plus de keyPoints, cvSearchKeywords, openQuestions et redFlags.

Ce bloc **prime** sur les correspondances technologiques et sur la récence des expériences pour juger si un candidat a le **bon niveau** (séniorité, autonomie, périmètre). Il aide le recruteur à expliciter ce que la fiche demande vraiment comme niveau.

Structure **expectedExpertiseLevel** :
- **summary** (string) : ce que le niveau attendu implique **concrètement sur cette mission** (autonomie, criticité, mentoring, taille de périmètre).
- **statedLevel** (string) : libellé repris de la fiche (ex. « Développeur senior », « Expert PHP »).
- **interpretedBand** (string, une valeur parmi) : `junior` | `confirmed` | `senior` | `expert_lead` | `unclear` — interprétation normalisée ; `unclear` si la fiche est trop ambiguë.
- **signalsFromPosting** (array de strings, au moins 1) : indices **factuels** tirés du texte (responsabilités, années mentionnées, pilotage, encadrement, stack critique, etc.).
- **hardOnLevel** (boolean) : true si le niveau est clairement **non négociable** pour cette mission.
- **minYearsHint** (number, optionnel) : **uniquement** si la fiche suggère clairement un minimum d'années d'expérience ; sinon omettre la clé.
- **recruiterCalibrationQuestions** (array, 1 à 4 strings) : questions **courtes** pour calibrer le niveau avec le client (complément des openQuestions ; ne pas les dupliquer mot pour mot).

Si la fiche ne nomme pas explicitement « junior/senior/expert », **déduis** le niveau attendu à partir du périmètre, des responsabilités et du vocabulaire (ex. « pilote », « expert », « référent », « lead »).
$block$,
  updated_at = now()
WHERE task_key = 'mission.jobPosting.keyPoints'
  AND position('expectedExpertiseLevel' in system_prompt_template) = 0;

-- ─── Extraction CV identité : niveau inféré (prudent) ───
UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $cv$

## Niveau professionnel inféré (pour le matching — rester prudent)

Dans **personalInfo**, remplis aussi :
- **inferredSeniorityBand** : une valeur parmi `junior` | `confirmed` | `senior` | `expert_lead` | `unknown` — déduite **uniquement** des titres, durées totales, descriptions et périmètres décrits dans le CV. Utilise `unknown` si le CV est trop court ou ambigu.
- **seniorityInferenceNote** : 1–2 phrases en français expliquant **sur quels faits** du CV la fourchette repose ; **omettre** ou laisser vide si `unknown`.

Ne pas inférer à partir d'attributs protégés. Ne pas sur-interpréter : en cas de doute, `unknown`.
$cv$,
  updated_at = now()
WHERE task_key = 'cv.branch.identity'
  AND position('inferredSeniorityBand' in system_prompt_template) = 0;

-- ─── Positionnement : rappel priorité niveau mission (append court par tâche) ───
UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $pos$

## Priorité du niveau d'expertise attendu

Si le message utilisateur contient le bloc JSON **expectedExpertiseLevel** (niveau d'expertise attendu), il **prime** sur les technos et sur la récence : une stack proche ou une expérience récente **ne compense pas** un écart objectivable sur le niveau requis. Les critères de **posture / séniorité** du poste ne peuvent être `strong` que si le CV apporte des preuves cohérentes avec ce bloc (sinon `partial` au plus).
$pos$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.skills'
  AND position('Priorité du niveau d''expertise attendu' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $pos$

## Priorité du niveau d'expertise attendu

Si le message contient **expectedExpertiseLevel**, une expérience récente en `high` **ne suffit pas** seule à valider une exigence de niveau « senior / expert / lead » si l'ancienneté ou le périmètre du CV reste court par rapport à ce bloc.
$pos$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.experiences'
  AND position('expectedExpertiseLevel' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $pos$

## Priorité du niveau d'expertise attendu

Si **expectedExpertiseLevel** est fourni, les lacunes doivent inclure en priorité les **écarts de niveau** (séniorité, autonomie, années) lorsqu'ils sont objectivables par rapport à ce bloc, pas seulement les trous technologiques.
$pos$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.gaps'
  AND position('expectedExpertiseLevel' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $pos$

## Priorité du niveau d'expertise attendu

Si **expectedExpertiseLevel** est fourni, les questions doivent aider à lever les doutes sur l'**adéquation de niveau** entre le CV et ce bloc, en plus des points clés techniques.
$pos$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.questions'
  AND position('expectedExpertiseLevel' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $syn$

## Confiance du score (champs OBLIGATOIRES)

En plus de **matchScore** et **matchSummary**, produis **obligatoirement** :
- **matchScoreConfidence** : exactement une valeur parmi `low` | `medium` | `high`.
  - `low` : contradiction ou flou sur le **niveau** attendu vs le CV, plusieurs must_have en preuve faible, barème incomplet, peu de liens `keyPointId`, ou données CV ambiguës.
  - `medium` : score utilisable mais résidu d'incertitude notable.
  - `high` : preuves solides, alignement niveau clair, barème exploitable, cohérence entre branches d'analyse.
- **matchScoreConfidenceNote** : 1 à 3 phrases en français, factuelles, pour l'aide à la décision (pourquoi ce niveau de confiance).

Le **matchScore** ne doit pas être lu seul : il doit être **cohérent** avec **matchScoreConfidence** (éviter un score très élevé avec `low` sans justification forte dans la note).
$syn$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.synthesis'
  AND position('matchScoreConfidence' in system_prompt_template) = 0;
