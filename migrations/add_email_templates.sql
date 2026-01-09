-- Create email_templates table for storing reusable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);

-- Add archived status to contact_messages if not exists
ALTER TABLE contact_messages 
DROP CONSTRAINT IF EXISTS contact_messages_status_check;

ALTER TABLE contact_messages
ADD CONSTRAINT contact_messages_status_check 
CHECK (status IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived'));

-- Add archived status to meeting_bookings if not exists
ALTER TABLE meeting_bookings 
DROP CONSTRAINT IF EXISTS meeting_bookings_status_check;

ALTER TABLE meeting_bookings
ADD CONSTRAINT meeting_bookings_status_check 
CHECK (status IN ('new_lead', 'active_prospect', 'inactive_prospect', 'converted_to_customer', 'archived'));

-- Comments for documentation
COMMENT ON TABLE email_templates IS 'Stores reusable email templates for admin to send to contacts and meeting bookings';
COMMENT ON COLUMN email_templates.name IS 'Template name for easy identification';
COMMENT ON COLUMN email_templates.subject IS 'Email subject line';
COMMENT ON COLUMN email_templates.body IS 'Email body content (can include HTML)';
COMMENT ON COLUMN email_templates.category IS 'Category: general, contact, meeting, follow_up, etc.';
COMMENT ON COLUMN email_templates.is_default IS 'Whether this is the default template for its category';