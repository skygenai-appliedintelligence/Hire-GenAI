-- Migration: Add Company Address and Legal Fields
-- Date: 2025-10-04
-- Purpose: Update companies table to match new signup form structure

-- Add new fields to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS primary_country VARCHAR(2), -- ISO-3166-1 alpha-2
  ADD COLUMN IF NOT EXISTS legal_company_name TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_ein VARCHAR(100),
  ADD COLUMN IF NOT EXISTS business_registration_number VARCHAR(100);

-- Create company_addresses table for structured address storage
CREATE TABLE IF NOT EXISTS company_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  address_type VARCHAR(50) DEFAULT 'primary', -- primary, billing, shipping, etc.
  street_address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  state_province VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL, -- ISO-3166-1 alpha-2
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, address_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_addresses_company_id ON company_addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_company_addresses_primary ON company_addresses(company_id, is_primary) WHERE is_primary = true;

-- Add email_verified_at to users table if not exists
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);

-- Create email_verifications table for OTP codes
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- signup, login, password_reset, etc.
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  sent_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email_verifications
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- Add comments for documentation
COMMENT ON COLUMN companies.phone_number IS 'Primary contact phone number for the company';
COMMENT ON COLUMN companies.primary_country IS 'Primary country of operation (ISO-3166-1 alpha-2)';
COMMENT ON COLUMN companies.legal_company_name IS 'Official legal name as registered';
COMMENT ON COLUMN companies.tax_id_ein IS 'Tax ID or EIN number';
COMMENT ON COLUMN companies.business_registration_number IS 'Business registration/incorporation number';

COMMENT ON TABLE company_addresses IS 'Structured storage for company addresses (primary, billing, etc.)';
COMMENT ON COLUMN company_addresses.country IS 'Country code (ISO-3166-1 alpha-2)';

COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN users.job_title IS 'Job title/position of the user';

COMMENT ON TABLE email_verifications IS 'Email verification codes for signup, login, and other purposes';
