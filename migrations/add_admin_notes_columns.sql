-- Migration: Add admin_notes column to contact_messages and meeting_bookings tables
-- Description: Allow admins to add internal notes to customer interactions

-- Add admin_notes to contact_messages if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contact_messages' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE contact_messages ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Add admin_notes to meeting_bookings if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meeting_bookings' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE meeting_bookings ADD COLUMN admin_notes TEXT;
    END IF;
END $$;

-- Add archived status to contact_messages status check if using enum
-- (This is optional - only needed if you have a CHECK constraint on status)

COMMENT ON COLUMN contact_messages.admin_notes IS 'Internal notes from admin about this contact message';
COMMENT ON COLUMN meeting_bookings.admin_notes IS 'Internal notes from admin about this meeting booking';
