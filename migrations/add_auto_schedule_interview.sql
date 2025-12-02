-- Migration: Add auto_schedule_interview column to jobs table
-- This column controls whether interview links are auto-scheduled to qualified candidates

-- Add the column with default value of TRUE (ON by default for new jobs)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS auto_schedule_interview BOOLEAN NOT NULL DEFAULT TRUE;

-- Add an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_jobs_auto_schedule ON jobs(auto_schedule_interview) WHERE auto_schedule_interview = TRUE;

-- Comment for documentation
COMMENT ON COLUMN jobs.auto_schedule_interview IS 'When TRUE, automatically schedule interview links to qualified candidates for this job';

-- ============================================================================
-- Migration: Add interview_email_sent tracking to applications table
-- This tracks whether the interview email has been auto-sent or manually sent
-- ============================================================================

-- Add column to track if interview email was sent
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_email_sent BOOLEAN DEFAULT FALSE;

-- Add timestamp for when the email was sent
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interview_email_sent_at TIMESTAMPTZ;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_applications_email_sent ON applications(interview_email_sent) WHERE interview_email_sent = TRUE;

-- Comments for documentation
COMMENT ON COLUMN applications.interview_email_sent IS 'TRUE when interview invitation email has been sent to the candidate';
COMMENT ON COLUMN applications.interview_email_sent_at IS 'Timestamp when the interview invitation email was sent';
