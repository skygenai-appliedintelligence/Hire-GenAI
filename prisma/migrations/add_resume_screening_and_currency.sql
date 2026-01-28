-- Migration: Add resume_screening_enabled and salary_currency to jobs table
-- Date: 2026-01-28

-- Add salary_currency column (default INR)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'INR';

-- Add resume_screening_enabled column (default false)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS resume_screening_enabled BOOLEAN DEFAULT false;

-- Add index for resume_screening_enabled for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_resume_screening ON jobs(resume_screening_enabled);

-- Update existing rows to have default values
UPDATE jobs SET salary_currency = 'INR' WHERE salary_currency IS NULL;
UPDATE jobs SET resume_screening_enabled = false WHERE resume_screening_enabled IS NULL;

COMMIT;
