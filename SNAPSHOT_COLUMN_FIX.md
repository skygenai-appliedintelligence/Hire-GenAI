# 🔧 Verification Snapshot - Column Name Fix

## Problem
```
ERROR: column i.created_at does not exist
Code: 42703
```

## Root Cause
The SQL query was trying to order by `i.created_at` (interviews table), but the `created_at` column doesn't exist in the `interviews` table. It exists in the `application_rounds` table.

## Solution Applied

**File**: `app/api/interviews/save-snapshot/route.ts` (Line 42)

```sql
-- BEFORE (WRONG)
ORDER BY i.created_at DESC

-- AFTER (CORRECT)
ORDER BY ar.created_at DESC
```

## Full Query

```sql
SELECT i.id FROM interviews i
JOIN application_rounds ar ON i.application_round_id = ar.id
WHERE ar.application_id = $1::uuid
ORDER BY ar.created_at DESC  ← Changed from i.created_at to ar.created_at
LIMIT 1
```

## Why This Works

- `i` = interviews table (no created_at column)
- `ar` = application_rounds table (has created_at column)
- We order by the application_rounds created_at to get the most recent interview

## Testing

1. Go to: `http://localhost:3000/interview/78aab16f-2379-4158-a3b4-8ee117a0ec5f/`
2. Start interview
3. Wait for 2nd question
4. Click "OK, I'm Ready"
5. ✅ **Screenshot should save successfully** (no column error)
6. Check console: `✅ [SNAPSHOT API] Verification snapshot saved for interview: uuid`

## Status: ✅ FIXED

The column name error has been resolved. The API endpoint will now correctly query the database.

---

**Last Updated**: Nov 20, 2025
**Time**: 4:43 PM UTC+05:30
