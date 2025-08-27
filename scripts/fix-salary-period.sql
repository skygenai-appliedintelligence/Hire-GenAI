-- Fix empty salary_period values by setting them to 'monthly' as default
UPDATE jobs 
SET salary_period = 'monthly' 
WHERE salary_period IS NULL OR salary_period = '';

-- Add NOT NULL constraint to prevent future empty values
ALTER TABLE jobs 
ALTER COLUMN salary_period SET NOT NULL,
ALTER COLUMN salary_period SET DEFAULT 'monthly';
