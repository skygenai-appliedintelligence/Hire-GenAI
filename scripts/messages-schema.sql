-- =========================
-- MESSAGES SYSTEM
-- =========================

-- Message categories enum
DO $$ BEGIN
  CREATE TYPE message_category AS ENUM ('interview', 'new_job', 'general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Message status enum
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Messages table to store interview and job-related communications
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sender_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  recipient_email citext NOT NULL,
  recipient_name  text,
  category        message_category NOT NULL DEFAULT 'general',
  subject         text NOT NULL,
  content         text NOT NULL,
  status          message_status NOT NULL DEFAULT 'draft',
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_category ON messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);

-- Message threads for conversation tracking
CREATE TABLE IF NOT EXISTS message_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category        message_category NOT NULL,
  participant_email citext NOT NULL,
  participant_name  text,
  subject         text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  message_count   int NOT NULL DEFAULT 0,
  is_archived     boolean NOT NULL DEFAULT false,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Link messages to threads
ALTER TABLE messages ADD COLUMN thread_id uuid REFERENCES message_threads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);

-- Indexes for message threads
CREATE INDEX IF NOT EXISTS idx_message_threads_company ON message_threads(company_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_category ON message_threads(category);
CREATE INDEX IF NOT EXISTS idx_message_threads_participant ON message_threads(participant_email);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON message_threads(last_message_at DESC);

-- Message templates for common interview and job messages
CREATE TABLE IF NOT EXISTS message_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        message_category NOT NULL,
  subject_template text NOT NULL,
  content_template text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_company ON message_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY company_messages_policy ON messages
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY company_message_threads_policy ON message_threads
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

CREATE POLICY company_message_templates_policy ON message_templates
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- Insert sample message templates
INSERT INTO message_templates (company_id, name, category, subject_template, content_template, created_by) 
SELECT 
  c.id as company_id,
  'Interview Invitation',
  'interview',
  'Interview Invitation - {{job_title}}',
  'Dear {{candidate_name}},

We are pleased to invite you for an interview for the {{job_title}} position at {{company_name}}.

Interview Details:
- Date: {{interview_date}}
- Time: {{interview_time}}
- Duration: {{duration}} minutes
- Format: {{interview_format}}

Please confirm your availability by replying to this email.

Best regards,
{{sender_name}}
{{company_name}} Recruitment Team',
  NULL
FROM companies c
WHERE c.name = 'TechCorp Inc'
ON CONFLICT DO NOTHING;

INSERT INTO message_templates (company_id, name, category, subject_template, content_template, created_by)
SELECT 
  c.id as company_id,
  'New Job Opportunity',
  'new_job',
  'New Job Opportunity: {{job_title}}',
  'Dear {{candidate_name}},

We have an exciting new job opportunity that matches your profile:

Position: {{job_title}}
Location: {{job_location}}
Experience Level: {{experience_level}}
Employment Type: {{employment_type}}

Job Description:
{{job_description}}

If you are interested, please apply through our portal or reply to this email.

Best regards,
{{sender_name}}
{{company_name}} Recruitment Team',
  NULL
FROM companies c
WHERE c.name = 'TechCorp Inc'
ON CONFLICT DO NOTHING;

-- Insert sample messages
INSERT INTO messages (company_id, recipient_email, recipient_name, category, subject, content, status, sent_at)
SELECT 
  c.id as company_id,
  'john.smith@example.com',
  'John Smith',
  'interview',
  'Interview Invitation - Senior Software Engineer',
  'Your interview is scheduled for tomorrow at 2:00 PM. Please join the meeting using the link provided.',
  'delivered',
  now() - interval '2 hours'
FROM companies c
WHERE c.name = 'TechCorp Inc';

INSERT INTO messages (company_id, recipient_email, recipient_name, category, subject, content, status, sent_at)
SELECT 
  c.id as company_id,
  'sarah.johnson@example.com',
  'Sarah Johnson',
  'interview',
  'Technical Assessment Completed',
  'Thank you for completing the technical assessment. We will review your submission and get back to you soon.',
  'delivered',
  now() - interval '1 day'
FROM companies c
WHERE c.name = 'TechCorp Inc';

INSERT INTO messages (company_id, recipient_email, recipient_name, category, subject, content, status, sent_at)
SELECT 
  c.id as company_id,
  'mike.davis@example.com',
  'Mike Davis',
  'new_job',
  'New Job Opening: Senior Frontend Developer',
  'New job opening: Senior Frontend Developer - React/Next.js. Apply now!',
  'delivered',
  now() - interval '3 hours'
FROM companies c
WHERE c.name = 'TechCorp Inc';

INSERT INTO messages (company_id, recipient_email, recipient_name, category, subject, content, status, sent_at)
SELECT 
  c.id as company_id,
  'alice.wilson@example.com',
  'Alice Wilson',
  'new_job',
  'Job Application Received - Full Stack Developer',
  'Your job application for Full Stack Developer position has been received. Job ID: #12345',
  'delivered',
  now() - interval '5 hours'
FROM companies c
WHERE c.name = 'TechCorp Inc';

COMMIT;
