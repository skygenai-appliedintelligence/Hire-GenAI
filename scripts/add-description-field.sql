-- Simple migration to add description_md field to existing jobs table
-- Run this in your Neon database console

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS description_md text;

COMMIT;
