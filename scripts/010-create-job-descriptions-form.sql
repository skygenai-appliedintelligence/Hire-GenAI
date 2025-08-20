-- Create Job Descriptions table matching the dashboard form fields
-- Safe to run multiple times (guards included)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type') THEN
    CREATE TYPE job_type AS ENUM ('full_time', 'part_time', 'contract', 'freelance');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_level') THEN
    CREATE TYPE experience_level AS ENUM ('entry', 'mid', 'senior', 'lead');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information (required on form)
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  employment_type job_type NOT NULL,
  experience_level experience_level NOT NULL,

  -- Job Details
  summary TEXT NOT NULL,
  requirements TEXT NOT NULL,
  responsibilities TEXT,
  benefits TEXT,
  salary_label TEXT,

  -- Interview Process
  interview_rounds TEXT[] NOT NULL DEFAULT '{}',
  interview_duration TEXT,

  -- Platforms
  platforms TEXT[] NOT NULL DEFAULT '{}',

  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_descriptions_title
  ON public.job_descriptions USING gin (to_tsvector('simple', title));

CREATE INDEX IF NOT EXISTS idx_job_descriptions_company
  ON public.job_descriptions (company_name);

DROP TRIGGER IF EXISTS trg_job_descriptions_set_updated_at ON public.job_descriptions;
CREATE TRIGGER trg_job_descriptions_set_updated_at
BEFORE UPDATE ON public.job_descriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
