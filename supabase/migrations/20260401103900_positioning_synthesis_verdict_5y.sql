-- Aligne le prompt système synthèse avec le bloc « 5 dernières années » injecté dans le message utilisateur (`buildPositioningSynthesisUserContent`).

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
  || $syn$

## Verdict final (fenêtre 5 ans)

Le message utilisateur définit le verdict final : pour **matchScore**, **matchSummary**, **matchScoreConfidence** et **matchScoreConfidenceNote**, ne te base que sur le parcours pertinent des **5 dernières années** par rapport à la date de référence indiquée ; le parcours plus ancien ne doit pas faire varier le score ni la confiance (cohérent avec les instructions détaillées du message utilisateur).
$syn$,
  updated_at = now()
WHERE task_key = 'positioning.analysis.synthesis'
  AND position('fenêtre 5 ans' in system_prompt_template) = 0;
