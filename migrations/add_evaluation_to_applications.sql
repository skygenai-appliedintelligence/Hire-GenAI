-- Add evaluation column to applications table
-- This column will store interview evaluation results as JSONB

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS evaluation JSONB DEFAULT '{}'::jsonb;

-- Add status column if it doesn't exist
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add comment to explain the columns
COMMENT ON COLUMN applications.evaluation IS 'Stores interview evaluation results as JSON: {"scores": {...}, "overall_score": 7.5, "recommendation": "Hire", ...}';
COMMENT ON COLUMN applications.status IS 'Application status: pending, interviewed, evaluated, hired, rejected';

-- Create an index for faster queries on status
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);

-- Create an index for faster queries on evaluation
CREATE INDEX IF NOT EXISTS idx_applications_evaluation ON applications USING GIN (evaluation);
