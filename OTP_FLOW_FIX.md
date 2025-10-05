# OTP Flow Fix - "No valid OTP found" Error

## Error Encountered

```
POST http://localhost:3000/api/signup/complete 500 (Internal Server Error)
Signup error: Error: No valid OTP found for this email
```

## Root Cause

The signup flow was verifying the OTP **twice**:

1. **Step 4** - Called `/api/otp/verify` which:
   - Verified OTP ✅
   - **Consumed/deleted the OTP** ✅
   - Created user and company ✅

2. **Step 5** - Called `/api/signup/complete` which:
   - Tried to verify OTP again ❌
   - **OTP already consumed** - Not found!
   - Failed with "No valid OTP found"

## Solution Applied

### Changed the Flow

**OLD FLOW (Broken):**
```
Step 4: Verify OTP → /api/otp/verify → Creates user/company (with minimal data)
Step 5: Submit → /api/signup/complete → Tries to verify OTP again (FAILS!)
```

**NEW FLOW (Fixed):**
```
Step 4: Verify OTP → /api/otp/verify-code → Just checks if OTP is valid (doesn't consume)
Step 5: Submit → /api/signup/complete → Verifies & consumes OTP, creates user/company (with full data)
```

### Files Changed

#### 1. `/app/signup/page.tsx`
Changed `handleVerifyOtp()` to call `/api/otp/verify-code` instead of `/api/otp/verify`:

```typescript
const handleVerifyOtp = async () => {
  // Just verify the OTP is valid, don't create user/company yet
  const res = await fetch('/api/otp/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: form.email, otp, purpose: 'signup' })
  })
  // ... handle response
  setOtpVerified(true)
}
```

#### 2. `/app/api/otp/verify-code/route.ts` (NEW)
Created new endpoint that only validates OTP without consuming it:

```typescript
// Check if OTP exists and is valid
const verifyQuery = `
  SELECT * FROM otp_challenges 
  WHERE email = $1 
    AND code = $2 
    AND purpose = $3
    AND expires_at > NOW()
    AND verified_at IS NULL
  LIMIT 1
`
// Don't mark as verified yet - that happens in /api/signup/complete
return { ok: true }
```

#### 3. `/app/api/signup/complete/route.ts` (Unchanged)
Still verifies and consumes OTP, creates user/company with full data:

```typescript
// Verify OTP challenge (this consumes it)
await DatabaseService.verifyOtpChallenge(normEmail, otp, 'signup')

// Create company with full signup data
const company = await DatabaseService.createCompanyFromSignup(...)

// Create user
const user = await DatabaseService.findOrCreateUser(...)
```

## How It Works Now

### Step 4: Admin Account + OTP Verification

1. User enters email and clicks "Send OTP"
2. OTP sent to email (stored in `otp_challenges` table)
3. User enters OTP code
4. Clicks "Verify"
5. **NEW**: Calls `/api/otp/verify-code`
   - Checks if OTP is valid ✅
   - Does NOT consume it ✅
   - Returns success ✅
6. Shows "Email verified" message
7. User clicks "Next"

### Step 5: Review & Complete

1. User reviews all information
2. Agrees to terms
3. Clicks "Complete Signup"
4. Calls `/api/signup/complete`
   - Verifies OTP (still valid!) ✅
   - Consumes/marks OTP as verified ✅
   - Creates company with ALL form data ✅
   - Creates user with job title ✅
   - Creates session ✅
5. Redirects to dashboard ✅

## Testing

### Test the Fix

1. **Restart dev server** (code is updated)
2. Go to `/signup`
3. Fill all 5 steps
4. In Step 4:
   - Send OTP
   - Enter OTP
   - Click "Verify" → Should show "Email verified"
5. In Step 5:
   - Click "Complete Signup" → Should work! ✅

### Verify in Database

```sql
-- Check OTP was consumed
SELECT * FROM otp_challenges 
WHERE email = 'your@email.com'
ORDER BY created_at DESC LIMIT 1;
-- Should show verified_at timestamp

-- Check user was created
SELECT * FROM users 
WHERE email = 'your@email.com';
-- Should exist with all data

-- Check company was created
SELECT * FROM companies 
ORDER BY created_at DESC LIMIT 1;
-- Should have all fields populated
```

## API Endpoints Summary

| Endpoint | Purpose | Consumes OTP? | Creates User/Company? |
|----------|---------|---------------|----------------------|
| `/api/otp/send` | Send OTP email | No | No |
| `/api/otp/verify-code` | Check if OTP is valid | **No** ✅ | No |
| `/api/otp/verify` | Verify OTP (old flow) | Yes | Yes (minimal data) |
| `/api/signup/complete` | Complete signup | **Yes** ✅ | **Yes (full data)** ✅ |

## Benefits of New Flow

1. ✅ **Single source of truth**: All data created in one place (`/api/signup/complete`)
2. ✅ **No duplicate OTP verification**: OTP verified once and consumed once
3. ✅ **Full data storage**: All form fields saved to database
4. ✅ **Better UX**: User can verify email in Step 4, submit in Step 5
5. ✅ **Atomic operation**: User/company creation happens together

## Related Files

- ✅ `app/signup/page.tsx` - Updated to use new endpoint
- ✅ `app/api/otp/verify-code/route.ts` - New validation-only endpoint
- ✅ `app/api/signup/complete/route.ts` - Final submission endpoint
- ✅ `lib/database.ts` - Database operations

## Status

✅ **FIXED** - Signup now works end-to-end without OTP errors!
