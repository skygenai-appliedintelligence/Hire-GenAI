-- Migration: Create meeting_bookings table
-- Description: Store all meeting booking requests from /book-meeting page

-- Create meeting_bookings table
CREATE TABLE IF NOT EXISTS meeting_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contact Information
    full_name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    
    -- Meeting Details
    meeting_date DATE NOT NULL,
    meeting_time VARCHAR(20) NOT NULL,
    meeting_end_time VARCHAR(20) NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    timezone VARCHAR(100) DEFAULT 'India Standard Time',
    
    -- Location/Platform
    meeting_location VARCHAR(100) DEFAULT 'google-meet',
    meeting_link VARCHAR(500),
    
    -- Additional Notes
    notes TEXT,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled',
    -- Possible statuses: scheduled, confirmed, completed, cancelled, no_show
    
    -- Metadata
    ip_address VARCHAR(50),
    user_agent TEXT,
    source VARCHAR(100) DEFAULT 'website',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_email ON meeting_bookings(work_email);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_date ON meeting_bookings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_status ON meeting_bookings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_created_at ON meeting_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_bookings_company ON meeting_bookings(company_name);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_meeting_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meeting_bookings_updated_at ON meeting_bookings;
CREATE TRIGGER trigger_meeting_bookings_updated_at
    BEFORE UPDATE ON meeting_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_bookings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE meeting_bookings IS 'Stores all meeting booking requests from the book-meeting page';
COMMENT ON COLUMN meeting_bookings.status IS 'scheduled, confirmed, completed, cancelled, no_show';
COMMENT ON COLUMN meeting_bookings.meeting_location IS 'google-meet, zoom, teams, phone, in-person';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON meeting_bookings TO your_app_user;

COMMIT;
