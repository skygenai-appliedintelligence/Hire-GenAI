# ✅ Signup Flow Test Checklist

## Pre-Test Setup

- [x] Migration SQL executed successfully
- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] Development server restarted
- [ ] Database connection verified

## Test Signup Flow

### Step 1: Company Information
Navigate to: `http://localhost:3000/signup?section=company`

Fill in:
- [ ] Company Name (Required)
- [ ] Industry (Optional)
- [ ] Company Size (Optional)
- [ ] Website (Optional)
- [ ] Company Description (Optional)

Click **Next** → Should go to `/signup?section=contact`

### Step 2: Contact Information
URL: `http://localhost:3000/signup?section=contact`

Fill in:
- [ ] Street Address
- [ ] City
- [ ] State/Province
- [ ] ZIP/Postal Code
- [ ] Country
- [ ] Phone Number

Click **Next** → Should go to `/signup?section=legal`

### Step 3: Legal Information
URL: `http://localhost:3000/signup?section=legal`

Fill in:
- [ ] Legal Company Name
- [ ] Tax ID / EIN
- [ ] Business Registration Number

Click **Next** → Should go to `/signup?section=admin`

### Step 4: Admin Account
URL: `http://localhost:3000/signup?section=admin`

Fill in:
- [ ] First Name (Required)
- [ ] Last Name (Required)
- [ ] Email (Required)
- [ ] Job Title

Actions:
- [ ] Click "Send OTP" button
- [ ] Check terminal/console for OTP code
- [ ] Enter OTP code
- [ ] Click "Verify" button
- [ ] See "Email verified" message

Click **Next** → Should go to `/signup?section=review`

### Step 5: Review & Consent
URL: `http://localhost:3000/signup?section=review`

- [ ] Review all entered information
- [ ] Check "I agree to Terms of Service" (Required)
- [ ] Check "I agree to Privacy Policy" (Required)
- [ ] Check "Send me marketing emails" (Optional)

Click **Complete Signup** → Should redirect to `/dashboard`

## Verify Data in Database

Run the verification script:
```bash
psql $DATABASE_URL < verify_signup_data.sql
```

### Check Companies Table
```sql
SELECT 
  name, phone_number, primary_country, 
  legal_company_name, tax_id_ein, 
  business_registration_number
FROM companies 
ORDER BY created_at DESC LIMIT 1;
```

Expected:
- [ ] `name` = Company Name entered
- [ ] `phone_number` = Phone entered
- [ ] `primary_country` = Country code (e.g., "US", "IN")
- [ ] `legal_company_name` = Legal name entered
- [ ] `tax_id_ein` = Tax ID entered
- [ ] `business_registration_number` = Registration number entered
- [ ] `industry` = Industry selected
- [ ] `size_band` = Size mapped to enum (small/medium/large)
- [ ] `website_url` = Website entered
- [ ] `description_md` = Description entered

### Check Company Addresses Table
```sql
SELECT * FROM company_addresses 
ORDER BY created_at DESC LIMIT 1;
```

Expected:
- [ ] `street_address` = Street entered
- [ ] `city` = City entered
- [ ] `state_province` = State entered
- [ ] `postal_code` = Postal code entered
- [ ] `country` = Country code (ISO-3166-1 alpha-2)
- [ ] `address_type` = "primary"
- [ ] `is_primary` = true

### Check Users Table
```sql
SELECT 
  email, full_name, job_title, email_verified_at
FROM users 
ORDER BY created_at DESC LIMIT 1;
```

Expected:
- [ ] `email` = Email entered (lowercase)
- [ ] `full_name` = "FirstName LastName"
- [ ] `job_title` = Job title entered
- [ ] `email_verified_at` = Timestamp (not null)

### Check User Role
```sql
SELECT ur.role, u.email 
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
ORDER BY u.created_at DESC LIMIT 1;
```

Expected:
- [ ] `role` = "admin"

### Check Company Domain
```sql
SELECT domain FROM company_domains 
WHERE company_id = (
  SELECT id FROM companies 
  ORDER BY created_at DESC LIMIT 1
);
```

Expected:
- [ ] `domain` = Email domain (e.g., "example.com")

### Check Session Created
```sql
SELECT * FROM sessions 
WHERE user_id = (
  SELECT id FROM users 
  ORDER BY created_at DESC LIMIT 1
);
```

Expected:
- [ ] Session record exists
- [ ] `expires_at` is in the future

## Test Edge Cases

### Test 1: Missing Required Fields
- [ ] Try to submit without Company Name → Should show error
- [ ] Try to submit without First/Last Name → Should show error
- [ ] Try to submit without Email → Should show error
- [ ] Try to submit without agreeing to ToS → Should show error

### Test 2: Invalid Data
- [ ] Enter invalid email format → Should show validation error
- [ ] Enter invalid website URL → Should handle gracefully
- [ ] Enter very long text in fields → Should handle gracefully

### Test 3: OTP Verification
- [ ] Try to submit without verifying OTP → Should show error
- [ ] Enter wrong OTP code → Should show error
- [ ] Request OTP resend → Should work

### Test 4: Browser Navigation
- [ ] Click browser back button → Should go to previous step
- [ ] Click browser forward button → Should go to next step
- [ ] Refresh page → Should maintain current step
- [ ] Bookmark a step URL → Should work when visited

### Test 5: Optional Fields
- [ ] Submit with only required fields → Should work
- [ ] Submit with all fields filled → Should work
- [ ] Submit with some optional fields → Should work

## Common Issues & Solutions

### Issue: "Column does not exist"
**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate
# Restart dev server
```

### Issue: "Relation does not exist"
**Solution:**
```bash
# Re-run migration
psql $DATABASE_URL < prisma/migrations/add_company_address_legal_fields.sql
```

### Issue: "Cannot read property of undefined"
**Solution:**
- Check browser console for errors
- Verify API endpoint is returning correct data
- Check network tab for failed requests

### Issue: Data not saving
**Solution:**
```sql
-- Check if tables exist
\dt company_addresses
\dt email_verifications

-- Check if columns exist
\d companies
\d users
```

## Success Criteria

All of the following must be true:
- [ ] Signup completes without errors
- [ ] User is redirected to dashboard
- [ ] All company fields are saved in database
- [ ] Address is saved in company_addresses table
- [ ] Legal information is saved
- [ ] User job title is saved
- [ ] Email verification timestamp is set
- [ ] User has admin role
- [ ] Session is created
- [ ] Company domain is mapped

## Performance Check

- [ ] Signup completes in < 5 seconds
- [ ] No console errors
- [ ] No network errors
- [ ] Database queries are efficient

## Final Verification

Run this query to see a complete summary:
```sql
SELECT 
  c.name as company_name,
  c.phone_number,
  c.legal_company_name,
  ca.city || ', ' || ca.country as location,
  u.full_name as admin_name,
  u.job_title,
  u.email_verified_at IS NOT NULL as email_verified,
  ur.role
FROM companies c
LEFT JOIN company_addresses ca ON ca.company_id = c.id AND ca.is_primary = true
LEFT JOIN users u ON u.company_id = c.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
ORDER BY c.created_at DESC
LIMIT 1;
```

Expected output should show all fields populated correctly.

## 🎉 Test Complete!

If all checkboxes are checked, the signup flow is working correctly with all new database fields!
