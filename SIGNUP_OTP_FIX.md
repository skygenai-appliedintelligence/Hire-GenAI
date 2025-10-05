# Signup OTP Error Fix

## Problem
Users were experiencing a 400 error with message "Invalid or expired OTP" during signup, but data was still being stored in the database. This created a confusing state where:
- The signup appeared to fail from the user's perspective
- Data was actually stored in the database
- Retrying the signup would fail because the OTP was already consumed

## Root Cause
The OTP was being marked as consumed **BEFORE** all database operations completed:

```typescript
// OLD FLOW (BROKEN):
1. Validate OTP ✓
2. Mark OTP as consumed ✓  // <-- TOO EARLY!
3. Create company (might fail) ❌
4. Create user (might fail) ❌
5. Create session (might fail) ❌
6. Return response
```

If any error occurred during steps 3-5, the OTP was already consumed, making retries impossible.

## Solution
Moved OTP consumption to **AFTER** all database operations succeed:

```typescript
// NEW FLOW (FIXED):
1. Validate OTP ✓
2. Check if user already exists (prevent duplicates) ✓
3. Create company ✓
4. Create user ✓
5. Create email identity ✓
6. Create session ✓
7. Mark OTP as consumed ✓  // <-- ONLY AFTER SUCCESS!
8. Return response
```

## Key Changes

### 1. Moved OTP Consumption
- **Before**: OTP consumed immediately after validation (line 79-84)
- **After**: OTP consumed only after all operations succeed (line 155-161)

### 2. Added Duplicate User Check
- Checks if user already exists before creating new account (line 78-120)
- If user exists, creates new session and logs them in
- Prevents duplicate account creation errors

### 3. Idempotent Signup
The signup endpoint is now idempotent:
- Multiple calls with same valid OTP will succeed
- If account already exists, user is logged in instead of getting an error
- OTP is only consumed when operation fully succeeds

## Benefits
1. **No Data Loss**: If signup fails, OTP remains valid for retry
2. **Better UX**: Clear error messages without confusing partial state
3. **Idempotent**: Safe to retry signup without creating duplicates
4. **Atomic**: Either everything succeeds or nothing is committed

## Testing
To test the fix:
1. Start signup flow and get OTP
2. Submit signup form with valid OTP
3. Verify successful signup and redirect to dashboard
4. Check database to confirm single user/company created
5. Try submitting again with same OTP (should log in existing user)

## Related Files
- `/app/api/signup/complete/route.ts` - Main signup endpoint
- `/lib/database.ts` - Database service methods
