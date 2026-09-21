-- Horodatage du démarrage d'un run workflow sur les lignes concernées.
-- Sert de preuve d'ancienneté pour la réconciliation anti-zombie (WORKFLOW_ZOMBIE_TIMEOUT_MS).
-- `updated_at` n'a aucun trigger dans ce projet et n'est pas rafraîchi de façon fiable par les
-- updates existants ; l'API `workflow/api` n'expose pas de date de démarrage exploitable.
-- Pas d'index : la lecture se fait toujours par `id` ou par `workflow_run_id`.

ALTER TABLE positionings ADD COLUMN IF NOT EXISTS workflow_started_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS workflow_started_at TIMESTAMPTZ;
