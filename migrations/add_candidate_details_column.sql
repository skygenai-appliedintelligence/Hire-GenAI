-- Add candidate_details and qualification_reason columns to candidate_screening_answers table
ALTER TABLE candidate_screening_answers ADD COLUMN IF NOT EXISTS candidate_details JSONB DEFAULT NULL;
ALTER TABLE candidate_screening_answers ADD COLUMN IF NOT EXISTS qualification_reason TEXT DEFAULT NULL;

-- Drop the foreign key constraint on candidate_id (references candidates.id which is UUID)
ALTER TABLE candidate_screening_answers DROP CONSTRAINT IF EXISTS candidate_screening_answers_candidate_id_fkey;

-- Drop the unique constraint if it exists (it references UUID type)
ALTER TABLE candidate_screening_answers DROP CONSTRAINT IF EXISTS unique_candidate_job_screening;

-- Change candidate_id from UUID to TEXT to support custom IDs like 'candidate_1768205736672_knbycm9'
ALTER TABLE candidate_screening_answers ALTER COLUMN candidate_id TYPE TEXT;

-- Make other columns nullable or set defaults to prevent NOT NULL violations
ALTER TABLE candidate_screening_answers ALTER COLUMN answers SET DEFAULT '{}';
ALTER TABLE candidate_screening_answers ALTER COLUMN answers DROP NOT NULL;

-- Recreate the unique constraint with TEXT type
ALTER TABLE candidate_screening_answers ADD CONSTRAINT unique_candidate_job_screening UNIQUE (candidate_id, job_id);

-- Add comments to explain the columns
COMMENT ON COLUMN candidate_screening_answers.candidate_details IS 'Stores basic candidate details like name, email, phone for prefilling application forms';
COMMENT ON COLUMN candidate_screening_answers.qualification_reason IS 'Human-readable reason for qualification/disqualification';

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_candidate_screening_answers_candidate_details ON candidate_screening_answers USING GIN (candidate_details);
