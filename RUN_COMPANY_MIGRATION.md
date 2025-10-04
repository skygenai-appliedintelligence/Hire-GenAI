# 🚀 Database Migration - Company Signup Schema Update

## Quick Start - Run These Commands

### Step 1: Apply Database Migration
```bash
# Option A: Using psql (Recommended)
psql $DATABASE_URL < prisma/migrations/add_company_address_legal_fields.sql

# Option B: Using Prisma
npx prisma db push
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

## What This Migration Does

### New Fields Added to `companies` table:
- ✅ `phone_number` - Company phone
- ✅ `primary_country` - ISO country code  
- ✅ `legal_company_name` - Official legal name
- ✅ `tax_id_ein` - Tax ID/EIN
- ✅ `business_registration_number` - Registration number

### New Table: `company_addresses`
- ✅ Structured address storage (street, city, state, postal, country)
- ✅ Supports multiple address types (primary, billing, etc.)
- ✅ Replaces legacy `headquarters` text field

### New Fields Added to `users` table:
- ✅ `job_title` - User's position
- ✅ `email_verified_at` - Email verification timestamp

### New Table: `email_verifications`
- ✅ Email verification codes with expiration
- ✅ Tracks verification status and send count

## Verify Migration Success

```bash
# Check if new tables exist
psql $DATABASE_URL -c "\dt company_addresses"
psql $DATABASE_URL -c "\dt email_verifications"

# Check if new columns exist
psql $DATABASE_URL -c "\d companies" | grep phone_number
psql $DATABASE_URL -c "\d users" | grep job_title
```

## Test the Signup Flow

1. Navigate to: `http://localhost:3000/signup`
2. Complete all 5 steps
3. Check database:

```sql
-- View latest company with new fields
SELECT 
  name, phone_number, primary_country, 
  legal_company_name, tax_id_ein 
FROM companies 
ORDER BY created_at DESC LIMIT 1;

-- View company address
SELECT * FROM company_addresses 
ORDER BY created_at DESC LIMIT 1;

-- View user with job title
SELECT 
  email, full_name, job_title, email_verified_at 
FROM users 
ORDER BY created_at DESC LIMIT 1;
```

## Troubleshooting

### Error: "relation does not exist"
```bash
# Make sure migration ran successfully
psql $DATABASE_URL < prisma/migrations/add_company_address_legal_fields.sql
```

### Error: "column does not exist"
```bash
# Regenerate Prisma client
npx prisma generate
# Restart dev server
```

### Error: "Cannot find module '@prisma/client'"
```bash
npm install @prisma/client
npx prisma generate
```

## Rollback (if needed)

```sql
-- Remove new tables
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS company_addresses;

-- Remove new columns
ALTER TABLE companies 
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS primary_country,
  DROP COLUMN IF EXISTS legal_company_name,
  DROP COLUMN IF EXISTS tax_id_ein,
  DROP COLUMN IF EXISTS business_registration_number;

ALTER TABLE users 
  DROP COLUMN IF EXISTS job_title,
  DROP COLUMN IF EXISTS email_verified_at;
```

## Documentation

- **DATABASE_MIGRATION_GUIDE.md** - Detailed migration instructions
- **SCHEMA_UPDATE_SUMMARY.md** - Complete summary of changes
- **SIGNUP_FLOW_UPDATE.md** - API and flow documentation

## Status Checklist

- [ ] Migration SQL executed
- [ ] Prisma client regenerated
- [ ] Dev server restarted
- [ ] Signup flow tested
- [ ] Data verified in database

## Need Help?

1. Check error messages in terminal
2. Review PostgreSQL logs
3. Verify DATABASE_URL is correct
4. Ensure PostgreSQL is running
5. Check file: `DATABASE_MIGRATION_GUIDE.md` for detailed troubleshooting
