-- Add during-interview screenshot column to interviews table
-- This stores a screenshot captured silently during the interview when all questions have been asked
-- Different from post_interview_photo which is captured after interview ends

ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS during_interview_screenshot TEXT,
ADD COLUMN IF NOT EXISTS during_interview_screenshot_captured_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN interviews.during_interview_screenshot IS 'Base64 encoded screenshot captured silently during interview after all questions asked';
COMMENT ON COLUMN interviews.during_interview_screenshot_captured_at IS 'Timestamp when during-interview screenshot was captured';
