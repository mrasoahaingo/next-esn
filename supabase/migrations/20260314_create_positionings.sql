CREATE TABLE positionings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_description TEXT NOT NULL,
  analysis JSONB,
  answers JSONB,
  tailored_cv JSONB,
  email JSONB,
  candidate_email JSONB,
  tailored_file_url TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
