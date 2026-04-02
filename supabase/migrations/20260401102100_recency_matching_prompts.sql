-- Renforce le matching avec la pondération par récence (section ajoutée côté code dans le message utilisateur).

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
    || E'\n\n## Récence des missions / expériences\n'
    || 'Le message utilisateur peut inclure une section « Pondération par récence des missions / expériences » avec des poids numériques par poste (du plus récent au plus ancien). '
    || 'Le matchScore et le matchSummary doivent en tenir compte : une adéquation forte sur le poste le plus récent ou la mission précédente pèse plus qu’une compétence uniquement visible sur des expériences anciennes, sauf si la fiche exige explicitement une ancienneté longue sur une techno historique.',
  updated_at = now()
WHERE task_key = 'positioning.analysis.synthesis'
  AND position('Pondération par récence des missions' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
    || E'\n\n## Récence\n'
    || 'Si le message utilisateur contient des poids de récence par expérience, utilise-les pour classer la pertinence : privilégier l’alignement avec les missions récentes.',
  updated_at = now()
WHERE task_key = 'positioning.analysis.experiences'
  AND position('## Récence' in system_prompt_template) = 0;

UPDATE llm_tasks
SET
  system_prompt_template = rtrim(system_prompt_template)
    || E'\n\n## Récence\n'
    || 'Si des poids de récence par poste sont fournis dans le message utilisateur, une compétence démontrée sur l’expérience la plus récente doit peser plus dans relevance / note qu’une compétence seulement sur un poste ancien.',
  updated_at = now()
WHERE task_key = 'positioning.analysis.skills'
  AND position('## Récence' in system_prompt_template) = 0;
