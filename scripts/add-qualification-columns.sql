-- Add qualification columns to applications table
-- Run this migration to support auto-qualification feature

-- Add resume_text column (parsed resume content)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- Add qualification_score column (0-100)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_score INTEGER;

-- Add is_qualified column (boolean result)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN;

-- Add qualification_threshold_used column (audit trail)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_threshold_used INTEGER;

-- Add qualification_explanations column (JSON with reasoning, matches, gaps)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_explanations JSONB;

-- Add parsing_status column (success, failed, pending)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS parsing_status VARCHAR(20);

-- Add min_qualification_score to jobs table (per-job threshold override)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS min_qualification_score INTEGER DEFAULT 40;

-- Add index for quick filtering by qualification status
CREATE INDEX IF NOT EXISTS idx_applications_is_qualified ON applications(is_qualified);
CREATE INDEX IF NOT EXISTS idx_applications_qualification_score ON applications(qualification_score);
CREATE INDEX IF NOT EXISTS idx_applications_parsing_status ON applications(parsing_status);

-- Add comment for documentation
COMMENT ON COLUMN applications.resume_text IS 'Parsed plain text from uploaded resume';
COMMENT ON COLUMN applications.qualification_score IS 'Auto-qualification score (0-100) based on JD match';
COMMENT ON COLUMN applications.is_qualified IS 'Whether candidate meets qualification threshold';
COMMENT ON COLUMN applications.qualification_threshold_used IS 'Threshold used at time of scoring (audit)';
COMMENT ON COLUMN applications.qualification_explanations IS 'JSON with reasoning, top_matches, and gaps';
COMMENT ON COLUMN applications.parsing_status IS 'Resume parsing status: success, failed, or pending';
COMMENT ON COLUMN jobs.min_qualification_score IS 'Minimum score required for qualification (default 40)';
