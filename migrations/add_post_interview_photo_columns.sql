-- Add post-interview photo columns to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN interviews.post_interview_photo_url IS 'URL or base64 data of photo captured after interview completion';
COMMENT ON COLUMN interviews.post_interview_photo_captured_at IS 'Timestamp when post-interview photo was captured';
