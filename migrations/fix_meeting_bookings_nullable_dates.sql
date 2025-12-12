-- Migration: Fix meeting_bookings table - make date/time fields nullable
-- Description: Allow meeting_date, meeting_time, meeting_end_time to be NULL since they're set via Google Calendar

-- Alter table to make date/time fields nullable
ALTER TABLE IF EXISTS meeting_bookings
    ALTER COLUMN meeting_date DROP NOT NULL,
    ALTER COLUMN meeting_time DROP NOT NULL,
    ALTER COLUMN meeting_end_time DROP NOT NULL;

-- Add default values
ALTER TABLE IF EXISTS meeting_bookings
    ALTER COLUMN meeting_date SET DEFAULT NULL,
    ALTER COLUMN meeting_time SET DEFAULT NULL,
    ALTER COLUMN meeting_end_time SET DEFAULT NULL;

COMMIT;
