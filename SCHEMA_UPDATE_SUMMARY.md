# Database Schema Update Summary

## ✅ Completed Changes

### 1. **Prisma Schema Updated** (`prisma/schema.prisma`)

#### Companies Model - Added Fields:
```prisma
phone_number                 String?  @db.VarChar(50)
primary_country              String?  @db.VarChar(2)
legal_company_name           String?
tax_id_ein                   String?  @db.VarChar(100)
business_registration_number String?  @db.VarChar(100)
```

#### New Model: company_addresses
```prisma
model company_addresses {
  id             String
  company_id     String
  address_type   String   @default("primary")
  street_address String
  city           String
  state_province String
  postal_code    String
  country        String   // ISO-3166-1 alpha-2
  is_primary     Boolean  @default(true)
  created_at     DateTime
  updated_at     DateTime
}
```

#### Users Model - Added Fields:
```prisma
job_title         String?   @db.VarChar(255)
email_verified_at DateTime? @db.Timestamptz(6)
```

#### New Model: email_verifications
```prisma
model email_verifications {
  id          String
  email       String
  code        String
  purpose     String
  expires_at  DateTime
  verified_at DateTime?
  sent_count  Int       @default(1)
  created_at  DateTime
  updated_at  DateTime
}
```

### 2. **Database Migration SQL Created**
- File: `prisma/migrations/add_company_address_legal_fields.sql`
- Ready to run on your database
- Includes all ALTER TABLE and CREATE TABLE statements
- Includes indexes for performance
- Includes helpful comments

### 3. **DatabaseService Updated** (`lib/database.ts`)

#### `createCompanyFromSignup()` - Enhanced:
- ✅ Stores phone_number directly in companies table
- ✅ Stores primary_country (ISO-3166-1 alpha-2)
- ✅ Stores legal_company_name
- ✅ Stores tax_id_ein
- ✅ Stores business_registration_number
- ✅ Creates structured address in company_addresses table
- ✅ Maintains backward compatibility with headquarters field

#### `findOrCreateUser()` - Enhanced:
- ✅ New parameter: `jobTitle?: string`
- ✅ New parameter: `emailVerified?: boolean`
- ✅ Sets email_verified_at timestamp when email is verified
- ✅ Stores job_title in users table

### 4. **API Endpoint Updated** (`app/api/signup/complete/route.ts`)
- ✅ Passes jobTitle to user creation
- ✅ Marks email as verified (emailVerified = true)
- ✅ All legal information is now stored in database

## 📋 Field Mapping Complete

| Signup Form Field | Database Location | Status |
|-------------------|-------------------|--------|
| Company Name | `companies.name` | ✅ Stored |
| Industry | `companies.industry` | ✅ Stored |
| Company Size | `companies.size_band` | ✅ Stored (mapped to enum) |
| Website | `companies.website_url` | ✅ Stored |
| Description | `companies.description_md` | ✅ Stored |
| Phone | `companies.phone_number` | ✅ Stored (NEW) |
| Street | `company_addresses.street_address` | ✅ Stored (NEW) |
| City | `company_addresses.city` | ✅ Stored (NEW) |
| State | `company_addresses.state_province` | ✅ Stored (NEW) |
| Postal Code | `company_addresses.postal_code` | ✅ Stored (NEW) |
| Country | `company_addresses.country` | ✅ Stored (NEW) |
| Legal Name | `companies.legal_company_name` | ✅ Stored (NEW) |
| Tax ID | `companies.tax_id_ein` | ✅ Stored (NEW) |
| Registration # | `companies.business_registration_number` | ✅ Stored (NEW) |
| First Name | `users.full_name` | ✅ Stored |
| Last Name | `users.full_name` | ✅ Stored |
| Email | `users.email` | ✅ Stored |
| Job Title | `users.job_title` | ✅ Stored (NEW) |
| Email Verified | `users.email_verified_at` | ✅ Stored (NEW) |

## 🚀 Next Steps

### 1. Run the Migration
```bash
# Option A: Using psql
psql $DATABASE_URL < prisma/migrations/add_company_address_legal_fields.sql

# Option B: Using Prisma
npx prisma db push
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Test the Signup Flow
1. Go to `/signup`
2. Fill out all 5 steps
3. Submit the form
4. Verify data in database

### 4. Verify Data Storage
```sql
-- Check latest company
SELECT * FROM companies ORDER BY created_at DESC LIMIT 1;

-- Check company address
SELECT * FROM company_addresses ORDER BY created_at DESC LIMIT 1;

-- Check latest user
SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
```

## 📚 Documentation Created

1. **DATABASE_MIGRATION_GUIDE.md** - Complete migration instructions
2. **SIGNUP_FLOW_UPDATE.md** - API and flow documentation
3. **CLEANUP_OLD_SIGNUP.md** - Old system removal documentation
4. **SCHEMA_UPDATE_SUMMARY.md** - This file

## ⚠️ Important Notes

1. **Country Codes**: Use ISO-3166-1 alpha-2 format (2 letters: "US", "IN", "GB")
2. **Backward Compatibility**: `headquarters` field still populated for legacy support
3. **Email Verification**: Automatically set when OTP is verified
4. **Address Storage**: Both legacy (headquarters) and structured (company_addresses) are populated
5. **Optional Fields**: Legal information fields are optional, can be added later

## 🔄 Migration Status

- [x] Prisma schema updated
- [x] Migration SQL created
- [x] DatabaseService updated
- [x] API endpoint updated
- [x] Documentation created
- [ ] **Migration SQL needs to be run on database**
- [ ] **Prisma client needs to be regenerated**
- [ ] **Testing needed**

## 🎯 Benefits

1. **Structured Data**: Addresses stored in normalized table
2. **Legal Compliance**: Proper storage of legal entity information
3. **Email Verification**: Track when users verify their email
4. **Job Titles**: Store user roles/positions
5. **International Support**: ISO country codes for proper localization
6. **Extensibility**: Easy to add more address types (billing, shipping, etc.)

## 🛠️ Rollback Available

If needed, rollback instructions are in `DATABASE_MIGRATION_GUIDE.md`
