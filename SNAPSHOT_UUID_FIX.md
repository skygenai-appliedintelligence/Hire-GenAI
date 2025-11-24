# 🔧 Verification Snapshot - UUID Type Cast Fix

## Problem
```
ERROR: operator does not exist: uuid = text
HINT: No operator matches the given name and argument types. 
You might need to add explicit type casts.
```

## Root Cause
PostgreSQL was comparing a UUID column with a text parameter. The `application_id` and `id` columns are UUID types, but the parameters were being passed as text strings without explicit type casting.

## Solution Applied

### File: `app/api/interviews/save-snapshot/route.ts`

**Change 1: SELECT Query (Line 29)**
```sql
-- BEFORE (WRONG)
WHERE ar.application_id = $1

-- AFTER (CORRECT)
WHERE ar.application_id = $1::uuid
```

**Change 2: UPDATE Query (Line 46)**
```sql
-- BEFORE (WRONG)
WHERE id = $2

-- AFTER (CORRECT)
WHERE id = $2::uuid
```

## How It Works

```
PostgreSQL Type Casting:
├─ $1::uuid → Converts parameter 1 to UUID type
├─ $2::uuid → Converts parameter 2 to UUID type
└─ Allows proper comparison with UUID columns
```

## Testing

1. Go to: `http://localhost:3000/interview/78aab16f-2379-4158-a3b4-8ee117a0ec5f/`
2. Start interview
3. Wait for second question
4. Click "OK, I'm Ready"
5. Wait for countdown
6. ✅ **Screenshot should save without UUID error**
7. Check console: `✅ [SNAPSHOT] Verification snapshot saved for interview: uuid`

## Verification Query

```sql
-- Check if snapshot was saved
SELECT id, verification_snapshot IS NOT NULL as has_snapshot 
FROM interviews 
WHERE id = 'interview-id-here';

-- Check snapshot size
SELECT octet_length(verification_snapshot) as size_bytes 
FROM interviews 
WHERE verification_snapshot IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

## Status: ✅ FIXED

The UUID type casting issue has been resolved. The API endpoint will now correctly save snapshots to the database.

---

**Last Updated**: Nov 20, 2025
**Time**: 4:33 PM UTC+05:30
