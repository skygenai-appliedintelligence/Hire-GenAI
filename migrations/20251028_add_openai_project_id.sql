-- Add openai_project_id column to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS openai_project_id TEXT;
