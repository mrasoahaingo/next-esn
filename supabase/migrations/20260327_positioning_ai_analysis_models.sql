-- Modèles LLM utilisés pour le dernier run d’analyse de positionnement (gateway id par tâche).

ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS ai_analysis_models JSONB;

COMMENT ON COLUMN positionings.ai_analysis_models IS
  'Snapshot { byTask: task_key -> gateway_model_id, uniqueModels: string[] } pour le dernier calcul d''analyse.';

ALTER TABLE positioning_analysis_history
  ADD COLUMN IF NOT EXISTS ai_analysis_models JSONB;

COMMENT ON COLUMN positioning_analysis_history.ai_analysis_models IS
  'Copie du snapshot modèles au moment de l’archivage (avant relance / repositionnement).';
