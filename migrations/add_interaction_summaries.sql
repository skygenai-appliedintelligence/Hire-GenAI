-- Add interaction_summary column to contact_messages table to store notes
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS interaction_summary TEXT;

-- Add replied column to track if email was sent
ALTER TABLE contact_messages 
ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;

-- Add interaction_summary column to meeting_bookings table to store notes
ALTER TABLE meeting_bookings 
ADD COLUMN IF NOT EXISTS interaction_summary TEXT;

-- Comments for documentation
COMMENT ON COLUMN contact_messages.interaction_summary IS 'JSON array of interaction notes with timestamps';
COMMENT ON COLUMN contact_messages.replied IS 'Whether an email reply has been sent to this contact';
COMMENT ON COLUMN meeting_bookings.interaction_summary IS 'JSON array of interaction notes with timestamps';
