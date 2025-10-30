-- Add OpenAI service account key column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS openai_service_account_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN companies.openai_service_account_key IS 'Service account API key for the OpenAI project, used for all API calls for this company';
