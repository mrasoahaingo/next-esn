-- Retrait des confirmations d'expertise en phase génération (doublon avec l'affinage analyse).

DELETE FROM llm_task_org_overrides WHERE task_key = 'positioning.generate.expertiseConfirmations';

DELETE FROM llm_tasks WHERE task_key = 'positioning.generate.expertiseConfirmations';

ALTER TABLE positionings DROP COLUMN IF EXISTS generation_expertise_prompts;
