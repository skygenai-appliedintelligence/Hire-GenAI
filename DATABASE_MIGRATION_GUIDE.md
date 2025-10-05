# Database Migration Guide - Company Signup Schema Update

## Overview
This migration adds comprehensive company, address, and legal information fields to support the new 5-step signup form.

## Changes Summary

### 1. Companies Table - New Fields
```sql
ALTER TABLE companies ADD COLUMN:
- phone_number VARCHAR(50)           -- Primary contact phone
- primary_country VARCHAR(2)         -- ISO-3166-1 alpha-2 country code
- legal_company_name TEXT            -- Official legal name
- tax_id_ein VARCHAR(100)            -- Tax ID or EIN
- business_registration_number VARCHAR(100) -- Business registration number
```

### 2. New Table: company_addresses
Structured storage for company addresses (replaces the legacy `headquarters` text field).

```sql
CREATE TABLE company_addresses (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  address_type VARCHAR(50) DEFAULT 'primary',
  street_address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  state_province VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL,  -- ISO-3166-1 alpha-2
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, address_type)
);
```

**Indexes:**
- `idx_company_addresses_company_id` on `company_id`
- `idx_company_addresses_primary` on `(company_id, is_primary)` WHERE `is_primary = true`

### 3. Users Table - New Fields
```sql
ALTER TABLE users ADD COLUMN:
- job_title VARCHAR(255)             -- User's job title/position
- email_verified_at TIMESTAMPTZ      -- When email was verified
```

### 4. New Table: email_verifications
Replaces `otp_challenges` for email verification codes.

```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL,  -- signup, login, password_reset, etc.
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  sent_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Indexes:**
- `idx_email_verifications_email` on `email`
- `idx_email_verifications_code` on `code`
- `idx_email_verifications_expires` on `expires_at`

## Migration Steps

### Step 1: Run the SQL Migration

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration file
\i prisma/migrations/add_company_address_legal_fields.sql
```

Or using a migration tool:

```bash
# If using Prisma
npx prisma db push

# Or apply the SQL file directly
psql $DATABASE_URL < prisma/migrations/add_company_address_legal_fields.sql
```

### Step 2: Verify Schema Changes

```sql
-- Check companies table
\d companies

-- Check new company_addresses table
\d company_addresses

-- Check users table
\d users

-- Check new email_verifications table
\d email_verifications
```

### Step 3: Update Prisma Client (if using Prisma)

```bash
# Generate new Prisma client with updated schema
npx prisma generate
```

### Step 4: Test the Signup Flow

1. Navigate to `/signup`
2. Complete all 5 steps
3. Verify data is stored correctly:

```sql
-- Check company data
SELECT 
  id, name, industry, size_band, phone_number, 
  primary_country, legal_company_name, tax_id_ein,
  business_registration_number
FROM companies 
ORDER BY created_at DESC 
LIMIT 1;

-- Check company address
SELECT * FROM company_addresses 
WHERE company_id = (SELECT id FROM companies ORDER BY created_at DESC LIMIT 1);

-- Check user data
SELECT 
  id, email, full_name, job_title, email_verified_at
FROM users 
ORDER BY created_at DESC 
LIMIT 1;
```

## Data Mapping

### Signup Form → Database

| Form Field | Database Location | Notes |
|------------|------------------|-------|
| **Step 1: Company Information** |
| Company Name | `companies.name` | Required |
| Industry | `companies.industry` | Optional |
| Company Size | `companies.size_band` | Mapped to enum (small/medium/large) |
| Website | `companies.website_url` | Optional |
| Company Description | `companies.description_md` | Optional |
| **Step 2: Contact Information** |
| Street Address | `company_addresses.street_address` | Required for address |
| City | `company_addresses.city` | Required for address |
| State/Province | `company_addresses.state_province` | Required for address |
| ZIP/Postal Code | `company_addresses.postal_code` | Required for address |
| Country | `company_addresses.country` | ISO-3166-1 alpha-2 |
| Phone Number | `companies.phone_number` | Optional |
| **Step 3: Legal Information** |
| Legal Company Name | `companies.legal_company_name` | Optional |
| Tax ID / EIN | `companies.tax_id_ein` | Optional |
| Business Registration Number | `companies.business_registration_number` | Optional |
| **Step 4: Admin Account** |
| First Name + Last Name | `users.full_name` | Required |
| Email | `users.email` | Required, verified via OTP |
| Job Title | `users.job_title` | Optional |
| Email Verified | `users.email_verified_at` | Set to NOW() after OTP verification |

## Backward Compatibility

### Legacy Fields Kept
- `companies.headquarters` - Still populated with combined address string for backward compatibility
- `companies.socials` - JSON field, no longer used for phone storage

### Migration for Existing Data
If you have existing companies, you may want to migrate data:

```sql
-- Example: Extract phone from socials JSON to new phone_number field
UPDATE companies 
SET phone_number = socials->>'phone'
WHERE socials ? 'phone' AND phone_number IS NULL;
```

## API Changes

### Updated Endpoints

**`/api/signup/complete`** - Now stores:
- All company fields including legal information
- Structured address in `company_addresses` table
- User job title and email verification timestamp

### DatabaseService Methods Updated

**`createCompanyFromSignup()`**
- Now inserts into new company fields
- Creates `company_addresses` record
- Stores legal information

**`findOrCreateUser()`**
- New parameters: `jobTitle?: string, emailVerified?: boolean`
- Sets `email_verified_at` when email is verified
- Stores job title

## Rollback Plan

If you need to rollback this migration:

```sql
-- Remove new tables
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS company_addresses;

-- Remove new columns from companies
ALTER TABLE companies 
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS primary_country,
  DROP COLUMN IF EXISTS legal_company_name,
  DROP COLUMN IF EXISTS tax_id_ein,
  DROP COLUMN IF EXISTS business_registration_number;

-- Remove new columns from users
ALTER TABLE users 
  DROP COLUMN IF EXISTS job_title,
  DROP COLUMN IF EXISTS email_verified_at;
```

## Testing Checklist

- [ ] Migration SQL runs without errors
- [ ] All new tables are created
- [ ] All new columns are added
- [ ] Indexes are created
- [ ] Signup flow completes successfully
- [ ] Company data is stored correctly
- [ ] Address is stored in `company_addresses` table
- [ ] Legal information is stored
- [ ] User job title is stored
- [ ] Email verification timestamp is set
- [ ] Existing functionality still works

## Notes

1. **ISO-3166-1 alpha-2**: Country codes should be 2-letter codes (e.g., "US", "IN", "GB")
2. **Address Type**: Currently only "primary" is used, but the schema supports multiple address types
3. **Email Verifications**: The new table can replace `otp_challenges` in future updates
4. **Phone Number**: Stored directly in companies table, no longer in JSON
5. **Legal Fields**: All optional, can be added later if not provided during signup

## Support

For issues or questions:
1. Check the migration logs
2. Verify Prisma schema matches database
3. Run `npx prisma db pull` to sync schema from database
4. Check `SIGNUP_FLOW_UPDATE.md` for API documentation
