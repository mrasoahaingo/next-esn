-- Modèles LLM utilisés pour le dernier run d'analyse de positionnement (gateway id par tâche).

ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS ai_analysis_models JSONB;

COMMENT ON COLUMN positionings.ai_analysis_models IS
  'Snapshot { byTask: task_key -> gateway_model_id, uniqueModels: string[] } pour le dernier calcul d''analyse.';

-- positioning_analysis_history peut ne pas encore exister (créée dans une migration ultérieure)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'positioning_analysis_history'
  ) THEN
    ALTER TABLE positioning_analysis_history ADD COLUMN IF NOT EXISTS ai_analysis_models JSONB;
  END IF;
END $$;
