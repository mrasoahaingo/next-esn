-- Synthèse : niveau sur les 2 dernières expériences ; ne pas pénaliser la confiance pour ambiguïté textuelle seule (aligné avec `buildSynthesisVerdictInstructionsBlock`).

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $syn$

## Niveau du candidat (2 expériences les plus récentes)

Pour le **verdict** (score + confiance), le niveau (Lead, Senior, Expert, etc.) se juge **uniquement** sur les deux entrées les plus récentes du tableau experiences du JSON CV (indices 0 et 1, 0 = plus récent). Ne fais pas baisser **matchScoreConfidence** surtout à cause d’ambiguïté ou de contradiction dans la fiche / barème si ces deux postes montrent déjà un niveau aligné avec le besoin.
$syn$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.synthesis'
  AND position('2 expériences les plus récentes' in system_prompt_template) = 0;
