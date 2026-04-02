-- Modèles LLM (gateway id + tarifs admin)
CREATE TABLE IF NOT EXISTS llm_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_model_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    input_usd_per_1m NUMERIC(12, 6) NOT NULL DEFAULT 0,
    output_usd_per_1m NUMERIC(12, 6) NOT NULL DEFAULT 0,
    cache_read_usd_per_1m NUMERIC(12, 6),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tâches LLM (prompt template + lien modèle)
CREATE TABLE IF NOT EXISTS llm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    model_id UUID NOT NULL REFERENCES llm_models(id) ON DELETE RESTRICT,
    system_prompt_template TEXT NOT NULL,
    use_extract_json_middleware BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Surcharges par organisation (null = garder la valeur globale)
CREATE TABLE IF NOT EXISTS llm_task_org_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    task_key TEXT NOT NULL,
    model_id UUID REFERENCES llm_models(id) ON DELETE SET NULL,
    system_prompt_template TEXT,
    use_extract_json_middleware BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_llm_task_org_overrides_org ON llm_task_org_overrides(org_id);
CREATE INDEX IF NOT EXISTS idx_llm_task_org_overrides_task ON llm_task_org_overrides(task_key);

-- Reporting usage par tâche
ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS task_key TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_task_key ON ai_usage_log(task_key);

-- Seed modèle par défaut (aligné lib/pricing.ts)
INSERT INTO llm_models (gateway_model_id, display_name, input_usd_per_1m, output_usd_per_1m, cache_read_usd_per_1m, notes)
VALUES (
    'google/gemini-2.5-flash',
    'Gemini 2.5 Flash',
    0.075,
    0.3,
    0.01875,
    'Barème indicatif — mettre à jour selon la grille fournisseur.'
)
ON CONFLICT (gateway_model_id) DO NOTHING;

-- Accès : uniquement via service role côté app (pas d’exposition client)
ALTER TABLE llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_task_org_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_anon_llm_models" ON llm_models;
CREATE POLICY "deny_all_anon_llm_models" ON llm_models FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "deny_all_anon_llm_tasks" ON llm_tasks;
CREATE POLICY "deny_all_anon_llm_tasks" ON llm_tasks FOR ALL TO anon USING (false);
DROP POLICY IF EXISTS "deny_all_anon_llm_overrides" ON llm_task_org_overrides;
CREATE POLICY "deny_all_anon_llm_overrides" ON llm_task_org_overrides FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "deny_all_auth_llm_models" ON llm_models;
CREATE POLICY "deny_all_auth_llm_models" ON llm_models FOR ALL TO authenticated USING (false);
DROP POLICY IF EXISTS "deny_all_auth_llm_tasks" ON llm_tasks;
CREATE POLICY "deny_all_auth_llm_tasks" ON llm_tasks FOR ALL TO authenticated USING (false);
DROP POLICY IF EXISTS "deny_all_auth_llm_overrides" ON llm_task_org_overrides;
CREATE POLICY "deny_all_auth_llm_overrides" ON llm_task_org_overrides FOR ALL TO authenticated USING (false);

GRANT SELECT, INSERT, UPDATE, DELETE ON llm_models TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON llm_tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON llm_task_org_overrides TO service_role;
