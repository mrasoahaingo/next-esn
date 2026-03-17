-- Log every AI call with full SDK usage data
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Link to the entity that triggered the call
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    positioning_id UUID REFERENCES positionings(id) ON DELETE CASCADE,
    -- What operation was performed
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('extraction', 'analysis', 'generation')),
    -- AI model used
    ai_model VARCHAR(100) NOT NULL,
    -- Duration
    duration_ms INTEGER NOT NULL,
    -- Token usage (from SDK LanguageModelUsage)
    input_tokens INTEGER,
    output_tokens INTEGER,
    -- Token details
    cache_read_tokens INTEGER,
    cache_write_tokens INTEGER,
    reasoning_tokens INTEGER,
    -- Total tokens (convenience)
    total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) STORED,
    -- Raw usage JSON for any extra fields the SDK returns
    raw_usage JSONB,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_candidate ON ai_usage_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_positioning ON ai_usage_log(positioning_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_operation ON ai_usage_log(operation);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log(created_at DESC);

GRANT SELECT ON ai_usage_log TO anon;
GRANT ALL PRIVILEGES ON ai_usage_log TO authenticated;
