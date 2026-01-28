-- Add salary_currency field to jobs table
ALTER TABLE jobs ADD COLUMN salary_currency VARCHAR(3) DEFAULT 'USD';

-- Add comment for documentation
COMMENT ON COLUMN jobs.salary_currency IS 'Currency code for salary (e.g., USD, EUR, INR)';
