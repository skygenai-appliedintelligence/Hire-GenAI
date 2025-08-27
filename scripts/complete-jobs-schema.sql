-- Complete jobs table schema replacement
-- This creates the full jobs table structure your application needs

-- Drop existing jobs table and recreate with complete schema
DROP TABLE IF EXISTS jobs CASCADE;

-- Create salary period enum
DO $$ BEGIN
  CREATE TYPE salary_period AS ENUM ('yearly', 'monthly', 'weekly', 'daily', 'hourly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create the complete jobs table
CREATE TABLE jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name          text,
  title                 text NOT NULL,
  description_md        text,
  location_text         text,
  status                text NOT NULL DEFAULT 'open',
  employment_type       employment_type NOT NULL DEFAULT 'full_time',
  level                 job_level,
  education             text,
  years_experience_min  integer,
  years_experience_max  integer,
  technical_skills      text[],
  domain_knowledge      text[],
  soft_skills           text[],
  languages             text[],
  must_have_skills      text[],
  nice_to_have_skills   text[],
  duties_day_to_day     text[],
  duties_strategic      text[],
  stakeholders          text[],
  decision_scope        text,
  salary_min            integer,
  salary_max            integer,
  salary_period         salary_period,
  bonus_incentives      text,
  perks_benefits        text[],
  time_off_policy       text,
  joining_timeline      text,
  travel_requirements   text,
  visa_requirements     text,
  is_public             boolean NOT NULL DEFAULT true,
  visible_from          timestamptz,
  visible_until         timestamptz,
  created_by            uuid REFERENCES users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz
);

-- Create indexes
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_public_time ON jobs(is_public, status, visible_from, visible_until);
CREATE INDEX idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX idx_jobs_level ON jobs(level);
CREATE INDEX idx_jobs_salary_range ON jobs(salary_min, salary_max);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_updated_at ON jobs(updated_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY company_jobs_policy ON jobs
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY public_jobs_policy ON jobs
  FOR SELECT USING (is_public = true AND status = 'open');

COMMIT;
