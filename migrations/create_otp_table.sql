-- Create table for storing email verification OTPs
CREATE TABLE IF NOT EXISTS screening_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    job_id UUID NOT NULL,
    otp TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent multiple OTPs for same email+job
    CONSTRAINT unique_email_job_otp UNIQUE (email, job_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_screening_otps_email_job ON screening_otps(email, job_id);
CREATE INDEX IF NOT EXISTS idx_screening_otps_expires ON screening_otps(expires_at);

-- Add comment
COMMENT ON TABLE screening_otps IS 'Stores OTPs for email verification during candidate screening';
