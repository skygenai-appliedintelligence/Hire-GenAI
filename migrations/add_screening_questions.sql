-- Migration: Add screening_questions JSONB column to jobs table
-- This stores structured screening criteria per job

-- Add screening_questions column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS screening_questions JSONB DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN jobs.screening_questions IS 'Structured screening questions/criteria for pre-application screening. Format: {primary_skill: string, overall_experience: number, current_location: string, nationality: string, visa_required: boolean, language_proficiency: string, current_monthly_salary: number}';

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_jobs_screening_questions ON jobs USING GIN (screening_questions);

-- Create candidate_screening_answers table
CREATE TABLE IF NOT EXISTS candidate_screening_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}',
    qualified BOOLEAN DEFAULT NULL,
    qualification_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each candidate can only answer screening for a job once
    CONSTRAINT unique_candidate_job_screening UNIQUE (candidate_id, job_id)
);

-- Add comments
COMMENT ON TABLE candidate_screening_answers IS 'Stores candidate responses to job screening questions and qualification status';
COMMENT ON COLUMN candidate_screening_answers.answers IS 'Candidate answers in JSON format matching screening_questions structure';
COMMENT ON COLUMN candidate_screening_answers.qualified IS 'TRUE if candidate passed screening, FALSE if rejected, NULL if pending review';
COMMENT ON COLUMN candidate_screening_answers.qualification_reason IS 'Human-readable reason for qualification/disqualification';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_screening_answers_job_id ON candidate_screening_answers(job_id);
CREATE INDEX IF NOT EXISTS idx_screening_answers_candidate_id ON candidate_screening_answers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_screening_answers_qualified ON candidate_screening_answers(qualified);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_screening_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_screening_answers_updated_at ON candidate_screening_answers;
CREATE TRIGGER trigger_screening_answers_updated_at
    BEFORE UPDATE ON candidate_screening_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_screening_answers_updated_at();
