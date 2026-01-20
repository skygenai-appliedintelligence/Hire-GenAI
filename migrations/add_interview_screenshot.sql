-- Add interview screenshot column to interviews table
-- This stores a screenshot captured automatically during the interview
-- when all questions have been asked (without candidate's knowledge)

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS interview_screenshot TEXT,
ADD COLUMN IF NOT EXISTS interview_screenshot_captured_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN interviews.interview_screenshot IS 'Base64 encoded screenshot captured silently during interview after all questions asked';
COMMENT ON COLUMN interviews.interview_screenshot_captured_at IS 'Timestamp when interview screenshot was captured';

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_interviews_screenshot_captured 
ON interviews(id) 
WHERE interview_screenshot IS NOT NULL;
