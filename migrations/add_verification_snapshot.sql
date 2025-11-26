-- Add verification_snapshot column to interviews table to store BLOB data
ALTER TABLE interviews ADD COLUMN verification_snapshot BYTEA;

-- Add index for faster queries
CREATE INDEX idx_interviews_snapshot ON interviews(id) WHERE verification_snapshot IS NOT NULL;
