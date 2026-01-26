-- Migration: Add hiring_status column to applications table
-- This column tracks the post-recommendation hiring pipeline:
-- sent_to_manager, offer_extended, offer_accepted, rejected_withdraw, hired

-- Add the hiring_status column
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS hiring_status TEXT DEFAULT NULL;

-- Create an index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_applications_hiring_status ON applications(hiring_status);

-- Add a comment explaining the column
COMMENT ON COLUMN applications.hiring_status IS 'Tracks hiring pipeline status: sent_to_manager, offer_extended, offer_accepted, rejected_withdraw, hired';
