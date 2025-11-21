-- Migration: Add recruitment_assessments table
-- Description: Creates table to store Recruitment Efficiency Assessment form submissions

CREATE TABLE IF NOT EXISTS recruitment_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email CITEXT NOT NULL,
  company VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  answers JSONB DEFAULT '{}',
  efficiency_score INTEGER,
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recruitment_assessments_email ON recruitment_assessments(email);
CREATE INDEX IF NOT EXISTS idx_recruitment_assessments_created_at ON recruitment_assessments(created_at);

-- Add comment to table
COMMENT ON TABLE recruitment_assessments IS 'Stores recruitment efficiency assessment form submissions from the questionnaire';
