-- Verification Script: Check if signup data is being stored correctly
-- Run this after completing a signup to verify all fields are populated

-- 1. Check latest company with all new fields
SELECT 
  id,
  name,
  industry,
  size_band,
  website_url,
  description_md,
  phone_number,                    -- NEW FIELD
  primary_country,                 -- NEW FIELD
  legal_company_name,              -- NEW FIELD
  tax_id_ein,                      -- NEW FIELD
  business_registration_number,    -- NEW FIELD
  headquarters,                    -- Legacy field (still populated)
  status,
  verified,
  created_at
FROM companies 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check company address (structured storage)
SELECT 
  id,
  company_id,
  address_type,
  street_address,                  -- NEW TABLE
  city,                            -- NEW TABLE
  state_province,                  -- NEW TABLE
  postal_code,                     -- NEW TABLE
  country,                         -- NEW TABLE
  is_primary,
  created_at
FROM company_addresses 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Check latest user with new fields
SELECT 
  id,
  company_id,
  email,
  full_name,
  job_title,                       -- NEW FIELD
  email_verified_at,               -- NEW FIELD
  status,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 1;

-- 4. Check user role assignment
SELECT 
  ur.user_id,
  ur.role,
  u.email,
  u.full_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 1;

-- 5. Check company domain mapping
SELECT 
  cd.id,
  cd.company_id,
  cd.domain,
  c.name as company_name
FROM company_domains cd
JOIN companies c ON cd.company_id = c.id
ORDER BY c.created_at DESC
LIMIT 1;

-- 6. Summary: Count records in new tables
SELECT 
  'company_addresses' as table_name,
  COUNT(*) as record_count
FROM company_addresses
UNION ALL
SELECT 
  'email_verifications' as table_name,
  COUNT(*) as record_count
FROM email_verifications;

-- 7. Check if all required fields are populated (latest company)
SELECT 
  CASE 
    WHEN name IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_name,
  CASE 
    WHEN phone_number IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_phone,
  CASE 
    WHEN primary_country IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_country,
  CASE 
    WHEN legal_company_name IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_legal_name,
  CASE 
    WHEN tax_id_ein IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_tax_id,
  CASE 
    WHEN business_registration_number IS NOT NULL THEN '✓' ELSE '✗' 
  END as has_registration_number,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM company_addresses 
      WHERE company_id = companies.id
    ) THEN '✓' ELSE '✗' 
  END as has_address
FROM companies 
ORDER BY created_at DESC 
LIMIT 1;

-- 8. Check if user fields are populated (latest user)
SELECT 
  email,
  full_name,
  CASE 
    WHEN job_title IS NOT NULL THEN '✓ ' || job_title ELSE '✗ No job title' 
  END as job_title_status,
  CASE 
    WHEN email_verified_at IS NOT NULL THEN '✓ Verified at ' || email_verified_at ELSE '✗ Not verified' 
  END as email_verification_status
FROM users 
ORDER BY created_at DESC 
LIMIT 1;
