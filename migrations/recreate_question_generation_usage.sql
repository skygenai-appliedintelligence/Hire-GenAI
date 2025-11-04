-- Drop existing question_generation_usage table and recreate with minimal columns
-- Supports draft job IDs for usage tracking before job is saved

-- Drop the existing table
DROP TABLE IF EXISTS question_generation_usage CASCADE;

-- Create new minimal table
CREATE TABLE question_generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE, -- Nullable for draft jobs
  draft_job_id TEXT, -- Stores temporary UUID before job is saved
  
  -- Usage metrics
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  question_count INTEGER NOT NULL DEFAULT 0,
  
  -- Pricing
  cost DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  
  -- Metadata
  model_used VARCHAR(50) DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_question_usage_company ON question_generation_usage(company_id);
CREATE INDEX idx_question_usage_job ON question_generation_usage(job_id);
CREATE INDEX idx_question_usage_draft ON question_generation_usage(draft_job_id);
CREATE INDEX idx_question_usage_created ON question_generation_usage(created_at);

-- Comments
COMMENT ON TABLE question_generation_usage IS 'Tracks question generation usage with support for draft jobs';
COMMENT ON COLUMN question_generation_usage.job_id IS 'Real job ID (nullable until job is saved)';
COMMENT ON COLUMN question_generation_usage.draft_job_id IS 'Temporary UUID for draft jobs before they are saved';
COMMENT ON COLUMN question_generation_usage.cost IS 'Final cost with profit margin applied';
