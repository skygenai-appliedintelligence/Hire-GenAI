-- Migration script to update jobs table with all required fields
-- Run this in your Neon database console

-- First, let's safely add all the missing columns
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS location_text text,
ADD COLUMN IF NOT EXISTS employment_type employment_type DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS years_experience_min integer,
ADD COLUMN IF NOT EXISTS years_experience_max integer,
ADD COLUMN IF NOT EXISTS technical_skills text[],
ADD COLUMN IF NOT EXISTS domain_knowledge text[],
ADD COLUMN IF NOT EXISTS soft_skills text[],
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS must_have_skills text[],
ADD COLUMN IF NOT EXISTS nice_to_have_skills text[],
ADD COLUMN IF NOT EXISTS duties_day_to_day text[],
ADD COLUMN IF NOT EXISTS duties_strategic text[],
ADD COLUMN IF NOT EXISTS stakeholders text[],
ADD COLUMN IF NOT EXISTS decision_scope text,
ADD COLUMN IF NOT EXISTS salary_min integer,
ADD COLUMN IF NOT EXISTS salary_max integer,
ADD COLUMN IF NOT EXISTS salary_period text,
ADD COLUMN IF NOT EXISTS bonus_incentives text,
ADD COLUMN IF NOT EXISTS perks_benefits text[],
ADD COLUMN IF NOT EXISTS time_off_policy text,
ADD COLUMN IF NOT EXISTS joining_timeline text,
ADD COLUMN IF NOT EXISTS travel_requirements text,
ADD COLUMN IF NOT EXISTS visa_requirements text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Create salary period enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE salary_period AS ENUM ('yearly', 'monthly', 'weekly', 'daily', 'hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update salary_period column to use the enum
ALTER TABLE jobs ALTER COLUMN salary_period TYPE salary_period USING salary_period::salary_period;

-- Migrate existing data if needed
UPDATE jobs SET 
  location_text = location,
  employment_type = 'full_time'::employment_type
WHERE location_text IS NULL AND location IS NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_level ON jobs(level);
CREATE INDEX IF NOT EXISTS idx_jobs_salary_range ON jobs(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at ON jobs(updated_at);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON jobs;
CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

COMMIT;
