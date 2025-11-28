-- Migration: Add languages column to applications table
-- This column stores language and proficiency levels selected by candidates in the application form

-- Add the languages column as JSONB with default empty array
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the column
COMMENT ON COLUMN applications.languages IS 'JSON array of language objects with language and proficiency fields. Example: [{"language": "English", "proficiency": "fluent"}, {"language": "Hindi", "proficiency": "native"}]';

-- Create an index for efficient querying of languages (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_applications_languages ON applications USING GIN (languages);
