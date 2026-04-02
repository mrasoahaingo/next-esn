-- Hiérarchie : la 1re expérience (plus récente) définit le niveau actuel ; la 2e corrobore (aligné avec `buildSynthesisVerdictInstructionsBlock`).

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $syn$

## Niveau actuel : première expérience prioritaire

Pour le verdict, l’entrée **la plus récente** du tableau experiences du JSON CV (indice 0) définit **techniquement** le niveau actuel du candidat ; l’entrée suivante (indice 1) **corrobore** le niveau sur le poste précédent, sans le même poids qu’une contradiction sur le poste actuel. Ne baisse pas surtout la confiance pour une ambiguïté de fiche si le poste actuel montre un niveau aligné avec le besoin.
$syn$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.synthesis'
  AND position('première expérience prioritaire' in system_prompt_template) = 0;
