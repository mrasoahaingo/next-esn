-- ============================================================
-- Domaine prospection (v1.3) — 7 tables + prospection_settings
-- Tout est org-scopé (Clerk org_id). Le serveur passe par la service role
-- (RLS contournée) : chaque requête applicative DOIT filtrer .eq('org_id', orgId).
-- Les policies ci-dessous sont une défense en profondeur (convention du projet).
-- Pas d'enum Postgres : des types globaux `signal_source`, `heat_level`,
-- `action_type`, `action_outcome` existent déjà (radar) ; text + CHECK nommés.
-- updated_at : aucun trigger dans ce projet, écrit par le code applicatif.
-- siren nullable + CHECK + UNIQUE(org_id, siren) : décision orchestrateur Phase 9 —
-- les entreprises non résolues sont dédoublonnées par l'index partiel sur normalized_name.
-- D-05/D-06 : prospection_scores = snapshot par run, pas de purge en v1.3 ;
-- D-08 : justification/call_pitch/synthesis_generated_at sur prospection_companies.
-- ============================================================

-- ─── prospection_settings (D-01..D-03) ─────────────────────────
CREATE TABLE IF NOT EXISTS prospection_settings (
  org_id         TEXT PRIMARY KEY,
  heat_threshold SMALLINT NOT NULL DEFAULT 60,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_settings_heat_threshold_range CHECK (heat_threshold BETWEEN 0 AND 100)
);

-- ─── prospection_automations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_automations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL,
  name         TEXT NOT NULL,
  criteria     JSONB NOT NULL DEFAULT '{}'::jsonb,   -- validé par Zod (secteurs NAF, tranches effectif, géo, profils à placer)
  enabled      BOOLEAN NOT NULL DEFAULT true,
  created_by   TEXT,
  last_run_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_automations_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_automations_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- ─── prospection_companies (SIG-04 : une ligne par SIREN et par org) ─
CREATE TABLE IF NOT EXISTS prospection_companies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  TEXT NOT NULL,
  siren                   TEXT,
  name                    TEXT NOT NULL,
  normalized_name         TEXT NOT NULL,
  naf_code                TEXT,
  headcount_range         TEXT,
  city                    TEXT,
  postal_code             TEXT,
  website                 TEXT,
  linkedin_url            TEXT,
  status                  TEXT NOT NULL DEFAULT 'new',
  current_score           SMALLINT,
  current_score_at        TIMESTAMPTZ,
  signal_last_fetched_at  TIMESTAMPTZ,          -- TTL collecte (coûts API)
  enrichment_gated_at     TIMESTAMPTZ,          -- moment où le seuil a ouvert l'enrichissement
  contacts_enriched_at    TIMESTAMPTZ,          -- cache 7 j Phase 13
  justification           TEXT,                 -- D-08, rempli Phase 12
  call_pitch              TEXT,                 -- D-08, rempli Phase 12
  synthesis_generated_at  TIMESTAMPTZ,          -- D-08
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_companies_org_siren_key UNIQUE (org_id, siren),
  CONSTRAINT prospection_companies_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_companies_siren_format CHECK (siren IS NULL OR siren ~ '^[0-9]{9}$'),
  CONSTRAINT prospection_companies_status_check CHECK (status IN ('new', 'to_call', 'called', 'dismissed')),
  CONSTRAINT prospection_companies_current_score_range CHECK (current_score IS NULL OR current_score BETWEEN 0 AND 100)
);

-- Entreprises non encore résolues : une seule ligne par nom normalisé (pas de fusion sur le nom
-- quand le SIREN est connu — la contrainte (org_id, siren) prime).
CREATE UNIQUE INDEX IF NOT EXISTS prospection_companies_unresolved_name_key
  ON prospection_companies (org_id, normalized_name) WHERE siren IS NULL;
CREATE INDEX IF NOT EXISTS prospection_companies_org_score_idx
  ON prospection_companies (org_id, current_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS prospection_companies_org_status_idx
  ON prospection_companies (org_id, status);

-- ─── prospection_run_logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_run_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL,
  automation_id    UUID NOT NULL,
  workflow_run_id  TEXT,
  trigger          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running',
  source_results   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- par collecteur : { ok, count, error } (SIG-06)
  signals_upserted INTEGER NOT NULL DEFAULT 0,
  companies_upserted INTEGER NOT NULL DEFAULT 0,
  error            TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  CONSTRAINT prospection_run_logs_org_id_id_key UNIQUE (org_id, id),
  CONSTRAINT prospection_run_logs_trigger_check CHECK (trigger IN ('cron', 'manual')),
  CONSTRAINT prospection_run_logs_status_check CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  CONSTRAINT prospection_run_logs_automation_fk FOREIGN KEY (org_id, automation_id)
    REFERENCES prospection_automations (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_run_logs_automation_started_idx
  ON prospection_run_logs (automation_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS prospection_run_logs_workflow_run_id_key
  ON prospection_run_logs (workflow_run_id) WHERE workflow_run_id IS NOT NULL;
-- Garde anti-double run (AUTO-05) : au plus un run 'running' par automation.
CREATE UNIQUE INDEX IF NOT EXISTS prospection_run_logs_one_running_key
  ON prospection_run_logs (automation_id) WHERE status = 'running';

-- ─── prospection_signals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospection_signals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT NOT NULL,
  company_id     UUID NOT NULL,
  automation_id  UUID,
  run_id         UUID,
  source         TEXT NOT NULL,
  signal_type    TEXT NOT NULL,
  source_ref     TEXT NOT NULL,             -- id externe (offre FT, annonce BODACC…) — clé de dédup
  title          TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    TIMESTAMPTZ NOT NULL,      -- date de l'événement : base du decay (SCOR-02)
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_signals_dedup_key UNIQUE (company_id, source, source_ref),
  CONSTRAINT prospection_signals_source_check CHECK (source IN ('france_travail', 'sirene', 'pappers', 'scrapin')),
  CONSTRAINT prospection_signals_type_check CHECK (signal_type IN (
    'job_posting', 'headcount_growth', 'funding', 'financial_growth', 'legal_event', 'leadership_change')),
  CONSTRAINT prospection_signals_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE,
  CONSTRAINT prospection_signals_automation_fk FOREIGN KEY (automation_id)
    REFERENCES prospection_automations (id) ON DELETE SET NULL,
  CONSTRAINT prospection_signals_run_fk FOREIGN KEY (run_id)
    REFERENCES prospection_run_logs (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS prospection_signals_company_occurred_idx
  ON prospection_signals (company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS prospection_signals_org_automation_idx
  ON prospection_signals (org_id, automation_id);
CREATE INDEX IF NOT EXISTS prospection_signals_expires_idx
  ON prospection_signals (expires_at);
CREATE INDEX IF NOT EXISTS prospection_signals_run_idx
  ON prospection_signals (run_id);

-- ─── prospection_scores (D-05..D-07 : snapshot par run) ────────
CREATE TABLE IF NOT EXISTS prospection_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           TEXT NOT NULL,
  company_id       UUID NOT NULL,
  run_id           UUID,
  score            SMALLINT NOT NULL,
  score_breakdown  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ signal_id, signal_type, occurred_at, weight, decay, contribution }]
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_scores_score_range CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT prospection_scores_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE,
  CONSTRAINT prospection_scores_run_fk FOREIGN KEY (run_id)
    REFERENCES prospection_run_logs (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS prospection_scores_company_created_idx
  ON prospection_scores (company_id, created_at DESC);   -- D-06
CREATE INDEX IF NOT EXISTS prospection_scores_run_idx
  ON prospection_scores (run_id);
-- D-05 : un seul snapshot par entreprise et par run (index non partiel : les run_id NULL
-- restent multiples, et l'upsert onConflict 'company_id,run_id' reste possible).
CREATE UNIQUE INDEX IF NOT EXISTS prospection_scores_company_run_key
  ON prospection_scores (company_id, run_id);

-- ─── prospection_contacts (CONT-05 : provenance + rétention RGPD) ─
CREATE TABLE IF NOT EXISTS prospection_contacts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     TEXT NOT NULL,
  company_id                 UUID NOT NULL,
  full_name                  TEXT NOT NULL,
  job_title                  TEXT,
  linkedin_url               TEXT,
  email                      TEXT,
  email_enriched_at          TIMESTAMPTZ,
  contact_source             TEXT NOT NULL,
  contact_sourced_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  gdpr_retention_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '3 years'),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_contacts_source_check CHECK (contact_source IN ('scrapin', 'dropcontact', 'pappers', 'manual')),
  CONSTRAINT prospection_contacts_retention_after_sourcing CHECK (gdpr_retention_expires_at > contact_sourced_at),
  CONSTRAINT prospection_contacts_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_contacts_company_idx
  ON prospection_contacts (company_id);
CREATE INDEX IF NOT EXISTS prospection_contacts_retention_idx
  ON prospection_contacts (gdpr_retention_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS prospection_contacts_company_linkedin_key
  ON prospection_contacts (company_id, linkedin_url) WHERE linkedin_url IS NOT NULL;

-- ─── prospection_actions (LIST-02 : historique des statuts) ─────
CREATE TABLE IF NOT EXISTS prospection_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL,
  company_id  UUID NOT NULL,
  user_id     TEXT NOT NULL,
  status      TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prospection_actions_status_check CHECK (status IN ('new', 'to_call', 'called', 'dismissed')),
  CONSTRAINT prospection_actions_company_fk FOREIGN KEY (org_id, company_id)
    REFERENCES prospection_companies (org_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS prospection_actions_company_created_idx
  ON prospection_actions (company_id, created_at DESC);

-- ─── RLS (convention : anon_deny_all + 4 policies org-scopées TO authenticated) ─
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'prospection_settings', 'prospection_automations', 'prospection_companies',
    'prospection_run_logs', 'prospection_signals', 'prospection_scores',
    'prospection_contacts', 'prospection_actions'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL PRIVILEGES ON %I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_deny_all_' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO anon USING (false)', 'anon_deny_all_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_select_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR SELECT TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_select_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_insert_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR INSERT TO authenticated
      WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_insert_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_update_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR UPDATE TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))
      WITH CHECK (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_update_' || t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_delete_' || t, t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR DELETE TO authenticated
      USING (org_id = (select auth.jwt() ->> 'org_id'))$p$, 'org_delete_' || t, t);
  END LOOP;
END $$;
