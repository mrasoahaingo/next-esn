-- Ajout des colonnes de snapshot modèles IA pour extraction CV, analyse mission, et génération positionnement.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS ai_extraction_models JSONB;

COMMENT ON COLUMN candidates.ai_extraction_models IS
  'Snapshot des modèles LLM utilisés lors de la dernière extraction (format CvExtractionModelsSnapshot : byTask, uniqueModels).';

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS ai_job_analysis_models JSONB;

COMMENT ON COLUMN missions.ai_job_analysis_models IS
  'Snapshot des modèles LLM utilisés lors de la dernière analyse de fiche mission (format PositioningAnalysisModelsSnapshot : byTask, uniqueModels).';

ALTER TABLE positionings
  ADD COLUMN IF NOT EXISTS ai_generation_models JSONB;

COMMENT ON COLUMN positionings.ai_generation_models IS
  'Snapshot des modèles LLM utilisés lors de la dernière génération (emails/CV). Format : byTask, uniqueModels.';
