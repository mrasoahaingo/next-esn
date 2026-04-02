CREATE TABLE IF NOT EXISTS radar_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  siren TEXT,
  sector TEXT,
  city TEXT,
  headcount INTEGER,
  website TEXT,
  linkedin_url TEXT,
  enrichment_data JSONB DEFAULT '{}'::jsonb,
  last_enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, siren)
);

DO $$ BEGIN
  CREATE TYPE signal_source AS ENUM ('job_offer', 'public_market', 'linkedin', 'press');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radar_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  source signal_source NOT NULL,
  title TEXT NOT NULL,
  raw_content TEXT,
  weight INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(1536),
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days')
);

DO $$ BEGIN
  CREATE TYPE heat_level AS ENUM ('cold', 'warm', 'hot', 'burning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radar_prospect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  signal_count INTEGER NOT NULL DEFAULT 0,
  convergence_bonus INTEGER NOT NULL DEFAULT 0,
  heat heat_level NOT NULL DEFAULT 'cold',
  breakdown JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

DO $$ BEGIN
  CREATE TYPE availability_status AS ENUM ('available', 'on_mission', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radar_consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  skills_embedding vector(1536),
  experience_years INTEGER,
  tjm INTEGER,
  availability availability_status DEFAULT 'available',
  available_from DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS radar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES radar_consultants(id) ON DELETE CASCADE,
  match_score REAL NOT NULL,
  match_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, consultant_id)
);

DO $$ BEGIN
  CREATE TYPE action_type AS ENUM ('email_sent', 'call_made', 'linkedin_message', 'meeting', 'brief_generated', 'dismissed', 'feedback');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_outcome AS ENUM ('pending', 'positive', 'negative', 'no_response');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radar_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES radar_companies(id) ON DELETE CASCADE,
  action action_type NOT NULL,
  outcome action_outcome DEFAULT 'pending',
  notes TEXT,
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radar_signals_company ON radar_signals(company_id);
CREATE INDEX IF NOT EXISTS idx_radar_signals_source ON radar_signals(source);
CREATE INDEX IF NOT EXISTS idx_radar_signals_detected ON radar_signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_signals_expires ON radar_signals(expires_at);
CREATE INDEX IF NOT EXISTS idx_radar_scores_org ON radar_prospect_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_radar_scores_heat ON radar_prospect_scores(heat);
CREATE INDEX IF NOT EXISTS idx_radar_scores_score ON radar_prospect_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_radar_companies_org ON radar_companies(org_id);
CREATE INDEX IF NOT EXISTS idx_radar_companies_sector ON radar_companies(sector);
CREATE INDEX IF NOT EXISTS idx_radar_consultants_org ON radar_consultants(org_id);
CREATE INDEX IF NOT EXISTS idx_radar_actions_company ON radar_actions(company_id);

CREATE INDEX IF NOT EXISTS idx_radar_signals_embedding ON radar_signals USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_radar_consultants_embedding ON radar_consultants USING ivfflat (skills_embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE radar_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_prospect_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_consultants ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS radar_companies_select ON radar_companies;
CREATE POLICY radar_companies_select ON radar_companies
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');
DROP POLICY IF EXISTS radar_companies_write ON radar_companies;
CREATE POLICY radar_companies_write ON radar_companies
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

DROP POLICY IF EXISTS radar_scores_select ON radar_prospect_scores;
CREATE POLICY radar_scores_select ON radar_prospect_scores
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');
DROP POLICY IF EXISTS radar_scores_write ON radar_prospect_scores;
CREATE POLICY radar_scores_write ON radar_prospect_scores
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

DROP POLICY IF EXISTS radar_consultants_select ON radar_consultants;
CREATE POLICY radar_consultants_select ON radar_consultants
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');
DROP POLICY IF EXISTS radar_consultants_write ON radar_consultants;
CREATE POLICY radar_consultants_write ON radar_consultants
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

DROP POLICY IF EXISTS radar_actions_select ON radar_actions;
CREATE POLICY radar_actions_select ON radar_actions
  FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');
DROP POLICY IF EXISTS radar_actions_write ON radar_actions;
CREATE POLICY radar_actions_write ON radar_actions
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');


CREATE OR REPLACE FUNCTION match_consultants(
  query_embedding vector(1536),
  match_org_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  skills jsonb,
  tjm integer,
  availability availability_status,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.name,
    rc.skills,
    rc.tjm,
    rc.availability,
    1 - (rc.skills_embedding <=> query_embedding) AS similarity
  FROM radar_consultants rc
  WHERE rc.org_id = match_org_id
    AND rc.availability != 'unavailable'
    AND rc.skills_embedding IS NOT NULL
    AND 1 - (rc.skills_embedding <=> query_embedding) > match_threshold
  ORDER BY rc.skills_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
