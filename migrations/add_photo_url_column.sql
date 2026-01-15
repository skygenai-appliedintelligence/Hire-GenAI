-- Migration: Add photo_url column to applications table
-- Description: Stores webcam captured photo URL for candidate identity verification
-- Date: 2025-01-12

-- Add photo_url column to applications table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'applications' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE applications ADD COLUMN photo_url TEXT;
        COMMENT ON COLUMN applications.photo_url IS 'Webcam captured photo URL for candidate identity verification';
    END IF;
END $$;

-- Also add photo_url to candidates table for profile photo storage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE candidates ADD COLUMN photo_url TEXT;
        COMMENT ON COLUMN candidates.photo_url IS 'Candidate profile photo URL';
    END IF;
END $$;

-- Create index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_applications_photo_url ON applications(photo_url) WHERE photo_url IS NOT NULL;
