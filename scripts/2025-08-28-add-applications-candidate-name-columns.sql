-- Safe migration to add applicant contact/name fields
-- Date: 2025-08-28

BEGIN;

-- Applications: add columns if not exists
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email citext,
  ADD COLUMN IF NOT EXISTS phone text;

-- Candidates: add first/last name if not exists (keep existing full_name)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

-- Backfill candidates.first_name/last_name from full_name if they are null
UPDATE candidates
SET
  first_name = COALESCE(first_name, NULLIF(split_part(full_name, ' ', 1), '')),
  last_name  = COALESCE(last_name, NULLIF(NULLIF(substring(full_name from position(' ' in full_name) + 1), ''), ''))
WHERE full_name IS NOT NULL
  AND (first_name IS NULL OR last_name IS NULL);

COMMIT;
