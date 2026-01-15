-- Fix ALL NOT NULL constraints on candidate_screening_answers table
-- Make every column nullable except id

-- Drop NOT NULL from all possible columns
DO $$
DECLARE
    col_name text;
BEGIN
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'candidate_screening_answers' 
        AND is_nullable = 'NO'
        AND column_name != 'id'
    LOOP
        EXECUTE format('ALTER TABLE candidate_screening_answers ALTER COLUMN %I DROP NOT NULL', col_name);
        RAISE NOTICE 'Dropped NOT NULL from %', col_name;
    END LOOP;
END $$;

-- Set default values for common columns
ALTER TABLE candidate_screening_answers ALTER COLUMN answers SET DEFAULT '{}';
ALTER TABLE candidate_screening_answers ALTER COLUMN qualified SET DEFAULT NULL;
