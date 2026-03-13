-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    extracted_data JSONB NOT NULL DEFAULT '{}',
    original_file_url TEXT NOT NULL,
    formatted_file_url TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'extracting', 'reviewing', 'ready', 'generated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for candidates
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_extracted_data ON candidates USING GIN (extracted_data);

-- Create extraction_history table
CREATE TABLE IF NOT EXISTS extraction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    extraction_result JSONB NOT NULL,
    ai_model VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for extraction_history
CREATE INDEX IF NOT EXISTS idx_extraction_candidate_id ON extraction_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_extraction_created_at ON extraction_history(created_at DESC);

-- Grant permissions
GRANT SELECT ON candidates TO anon;
GRANT ALL PRIVILEGES ON candidates TO authenticated;
GRANT SELECT ON extraction_history TO anon;
GRANT ALL PRIVILEGES ON extraction_history TO authenticated;

-- Storage setup
-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv-original', 'cv-original', false) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv-formatted', 'cv-formatted', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to cv-original
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow upload' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Allow upload" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'cv-original');
    END IF;
END
$$;

-- Allow public read access to formatted CVs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Allow read formatted' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Allow read formatted" ON storage.objects
        FOR SELECT TO anon
        USING (bucket_id = 'cv-formatted');
    END IF;
END
$$;
