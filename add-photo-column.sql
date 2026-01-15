-- Add photo_url column to applications table if it doesn't exist
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_applications_photo_url 
ON applications(photo_url) 
WHERE photo_url IS NOT NULL;
