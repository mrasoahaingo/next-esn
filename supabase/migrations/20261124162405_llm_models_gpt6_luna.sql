-- Quick 261124-mk0 : bascule de toutes les tâches LLM sur openai/gpt-6-luna (D-01).
--
-- Contexte : les appels LLM partent désormais avec ZDR (zero data retention) et inférence UE
-- imposés par le garde-fou de lib/ai.ts. Le modèle retenu est openai/gpt-6-luna (fournisseur
-- openai, zone UE, ZDR) pour toutes les tâches.
--
-- Ce que fait la migration :
--   1. insère le modèle dans llm_models (sans réécrire un tarif déjà saisi par un admin) ;
--   2. repointe TOUTES les lignes de llm_tasks vers ce modèle, quel que soit leur modèle actuel ;
--   3. repointe les surcharges org dont model_id est renseigné ; les NULL restent NULL
--      (elles héritent de la tâche).
-- Ce qu'elle ne fait pas : aucun prompt modifié, aucune ligne supprimée, aucun modèle retiré.
--
-- Idempotente et robuste à tout état de prod (ON CONFLICT DO NOTHING, IS DISTINCT FROM) :
-- un second passage ne modifie aucune ligne. À appliquer par l'orchestrateur après déploiement
-- du code qui impose ZDR + UE.

INSERT INTO llm_models (
  gateway_model_id,
  display_name,
  input_usd_per_1m,
  output_usd_per_1m,
  cache_read_usd_per_1m,
  notes
)
VALUES (
  'openai/gpt-6-luna',
  'GPT-6 Luna',
  0.11,
  0.55,
  0.011,
  'Zone UE, fournisseur openai, ZDR — palier > 272 001 tokens non modélisé (0,22 / 0,825).'
)
ON CONFLICT (gateway_model_id) DO NOTHING;

UPDATE llm_tasks
SET
  model_id = (SELECT id FROM llm_models WHERE gateway_model_id = 'openai/gpt-6-luna'),
  updated_at = now()
WHERE model_id IS DISTINCT FROM (SELECT id FROM llm_models WHERE gateway_model_id = 'openai/gpt-6-luna');

UPDATE llm_task_org_overrides
SET
  model_id = (SELECT id FROM llm_models WHERE gateway_model_id = 'openai/gpt-6-luna'),
  updated_at = now()
WHERE model_id IS NOT NULL
  AND model_id IS DISTINCT FROM (SELECT id FROM llm_models WHERE gateway_model_id = 'openai/gpt-6-luna');
