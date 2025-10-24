# Interview Duration Fix - Accurate Billing Calculation

## Problem
Interview duration was showing 30 minutes in the billing system even for 1.5 minute interviews. This was because the backend was hardcoding `started_at = NOW() - INTERVAL '30 minutes'` when creating interview records.

## Root Cause
**File:** `app/api/applications/[applicationId]/interview-status/route.ts`
**Line 217 (OLD):**
```typescript
VALUES ($1::uuid, $2::uuid, NOW() - INTERVAL '30 minutes', NOW(), 'async_ai', 'success', $3)
```

This created a fake 30-minute duration regardless of actual interview length.

## Solution
Pass the actual interview start time from the client to the server for accurate duration calculation.

### Changes Made

#### 1. **Backend API** (`app/api/applications/[applicationId]/interview-status/route.ts`)

**Accept `startedAt` from request body:**
```typescript
const { transcript, startedAt } = body
console.log('📝 Interview started at:', startedAt ? new Date(startedAt).toISOString() : 'Not provided')
```

**Update existing interview with actual start time:**
```typescript
const actualStartedAt = startedAt ? new Date(startedAt).toISOString() : null

const updateQuery = `
  UPDATE interviews
  SET 
    status = 'success',
    completed_at = NOW(),
    raw_transcript = $2,
    started_at = COALESCE($3::timestamp, started_at, NOW())
  WHERE id = $1::uuid
  RETURNING id
`
await DatabaseService.query(updateQuery, [interviewId, transcript || null, actualStartedAt])
```

**Create new interview with actual start time:**
```typescript
const actualStartedAt = startedAt ? new Date(startedAt).toISOString() : null

const createInterviewQuery = `
  INSERT INTO interviews (
    application_round_id,
    round_agent_id,
    started_at,
    completed_at,
    mode,
    status,
    raw_transcript
  )
  VALUES ($1::uuid, $2::uuid, COALESCE($4::timestamp, NOW()), NOW(), 'async_ai', 'success', $3)
  RETURNING id
`
await DatabaseService.query(createInterviewQuery, [applicationRoundId, roundAgentId, transcript || null, actualStartedAt])
```

#### 2. **Frontend Interview Page** (`app/interview/[applicationId]/page.tsx`)

**Send actual start time when completing interview:**
```typescript
const response = await fetch(`/api/applications/${applicationId}/interview-status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    transcript,
    startedAt: interviewStartTime // Send actual start time for accurate duration
  })
})
```

**Note:** `interviewStartTime` is already tracked in state (line 26) and set when agent connects (line 274):
```typescript
setInterviewStartTime(Date.now())
```

## How It Works Now

### Flow:
1. **Interview Starts** → `interviewStartTime = Date.now()` (e.g., 1730000000000)
2. **Interview Ends** → Client sends `{ transcript, startedAt: 1730000000000 }` to API
3. **Server Calculates Duration:**
   ```sql
   EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 as duration_minutes
   ```
4. **Billing Records Actual Duration:**
   ```typescript
   const durationToRecord = Math.max(1, Math.round(duration_minutes || 1))
   await DatabaseService.recordVideoInterviewUsage({
     companyId: company_id,
     jobId: job_id,
     interviewId: interviewId,
     durationMinutes: durationToRecord, // Real duration!
     videoQuality: 'HD'
   })
   ```

## Example

### Before Fix:
- **Actual Interview:** 1.5 minutes
- **Database `started_at`:** `NOW() - INTERVAL '30 minutes'` (hardcoded)
- **Database `completed_at`:** `NOW()`
- **Calculated Duration:** 30 minutes ❌
- **Billing Cost:** 30 min × $0.10 = $3.00 ❌

### After Fix:
- **Actual Interview:** 1.5 minutes
- **Database `started_at`:** Actual timestamp from client (e.g., `2024-10-24 10:00:00`)
- **Database `completed_at`:** `NOW()` (e.g., `2024-10-24 10:01:30`)
- **Calculated Duration:** 1.5 minutes → rounds to 2 minutes (minimum 1 minute) ✅
- **Billing Cost:** 2 min × $0.10 = $0.20 ✅

## Testing

### Test Steps:
1. Start a new interview at `/interview/{applicationId}`
2. Talk for exactly 1.5 minutes
3. End the interview
4. Check billing page: `/dashboard/settings/billing?tab=usage`
5. Verify duration shows ~2 minutes (rounded from 1.5)
6. Check database:
   ```sql
   SELECT 
     started_at,
     completed_at,
     EXTRACT(EPOCH FROM (completed_at - started_at)) / 60 as duration_minutes
   FROM interviews
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Expected Console Logs:
```
📝 Marking interview as completed: {applicationId}
📝 Interview started at: 2024-10-24T10:00:00.000Z
✅ Updated interview with transcript and actual start time
[Interview] ✅ Billing tracked: Video interview usage recorded (2 minutes)
```

## Billing Impact

### With 25% Profit Margin:
- **1.5 min interview:**
  - Base cost: 2 min × $0.10 = $0.20
  - Markup (25%): $0.05
  - **Final cost: $0.25** ✅

- **30 min interview (old bug):**
  - Base cost: 30 min × $0.10 = $3.00
  - Markup (25%): $0.75
  - **Final cost: $3.75** ❌

**Savings:** $3.50 per 1.5 minute interview!

## Files Modified
1. `app/api/applications/[applicationId]/interview-status/route.ts`
   - Accept `startedAt` from request body
   - Use actual timestamp instead of hardcoded 30 minutes
   - Added logging for start time

2. `app/interview/[applicationId]/page.tsx`
   - Send `interviewStartTime` to API when completing interview

## Backward Compatibility
- If `startedAt` is not provided by client, falls back to `NOW()` (current behavior)
- Existing interviews in database are not affected
- New interviews will use accurate duration

## Summary
✅ Fixed hardcoded 30-minute duration bug
✅ Now uses actual interview start/end times
✅ Accurate billing based on real duration
✅ Minimum 1 minute billing (rounds up)
✅ Backward compatible with old clients

**Result:** Billing ab sahi hai - jitna der interview chala, utna hi charge hoga! 🎉
