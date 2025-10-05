-- Add configuration column to job_rounds table
-- This column will store interview questions and evaluation criteria as JSONB

ALTER TABLE job_rounds 
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN job_rounds.configuration IS 'Stores interview questions and evaluation criteria as JSON: {"questions": [...], "criteria": [...]}';

-- Create an index for faster queries on configuration
CREATE INDEX IF NOT EXISTS idx_job_rounds_configuration ON job_rounds USING GIN (configuration);
