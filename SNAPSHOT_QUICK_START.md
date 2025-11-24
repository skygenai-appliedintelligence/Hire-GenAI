# 🚀 Verification Snapshot - Quick Start Guide

## What Was Implemented

When a candidate reaches the **second interview question**, the system:
1. Shows a modal: "Security Verification"
2. Displays message: "For security purposes, we are capturing a verification snapshot before asking the next question. Please be attentive and look into the camera."
3. User clicks "OK, I'm Ready"
4. 5-second countdown timer appears
5. Full-screen screenshot is automatically captured
6. Screenshot saved as BLOB in database

## Setup (3 Steps)

### Step 1: Run Migration
```bash
psql $DATABASE_URL < migrations/add_verification_snapshot.sql
```

### Step 2: Verify Files Created
- ✅ `migrations/add_verification_snapshot.sql`
- ✅ `app/api/interviews/save-snapshot/route.ts`
- ✅ `app/interview/[applicationId]/page.tsx` (updated)

### Step 3: Test
Go to: `http://localhost:3000/interview/78aab16f-2379-4158-a3b4-8ee117a0ec5f/`

## How It Works

```
Question 1 asked by agent
    ↓
Question 2 asked by agent
    ↓
🎥 Modal appears automatically
    ↓
User clicks OK
    ↓
⏱️ 5-second countdown
    ↓
📸 Screenshot captured
    ↓
💾 Saved to database
```

## Database Query to View Snapshots

```sql
-- Check if snapshot was saved
SELECT id, created_at, verification_snapshot IS NOT NULL as has_snapshot 
FROM interviews 
ORDER BY created_at DESC 
LIMIT 5;

-- Get snapshot size
SELECT id, octet_length(verification_snapshot) as size_bytes 
FROM interviews 
WHERE verification_snapshot IS NOT NULL;

-- Export snapshot as base64
SELECT encode(verification_snapshot, 'base64') 
FROM interviews 
WHERE id = 'YOUR_INTERVIEW_ID';
```

## Console Logs to Watch For

```
🎥 [SNAPSHOT] Second question detected - triggering snapshot capture
📸 [SNAPSHOT] Capturing full-screen screenshot...
✅ [SNAPSHOT] Screenshot saved successfully
```

## Key Features

✅ **Automatic**: No manual intervention after user clicks OK
✅ **Secure**: Stored as binary BLOB in database
✅ **Timestamped**: Captured at exact moment before Q2
✅ **Full-Screen**: Captures entire interview interface
✅ **Compressed**: JPEG 80% quality for optimal size
✅ **Indexed**: Fast database queries

## API Endpoint

**POST** `/api/interviews/save-snapshot`

Request:
```json
{
  "applicationId": "78aab16f-2379-4158-a3b4-8ee117a0ec5f",
  "snapshotData": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

Response:
```json
{
  "ok": true,
  "message": "Snapshot saved successfully",
  "interviewId": "uuid"
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal doesn't appear | Check console for "Second question detected" log |
| Screenshot not saving | Verify migration ran: `\d interviews` in psql |
| Timer not counting | Check browser console for errors |
| API 404 error | Verify endpoint file exists at correct path |

## Files Changed

| File | Changes |
|------|---------|
| `app/interview/[applicationId]/page.tsx` | Added snapshot logic, modal, and functions |
| `app/api/interviews/save-snapshot/route.ts` | NEW - API endpoint |
| `migrations/add_verification_snapshot.sql` | NEW - Database column |

## Next Steps

1. ✅ Run migration
2. ✅ Test on interview page
3. ✅ Check database for saved snapshots
4. ✅ Deploy to production

---

**Status**: ✅ Ready to use
**Last Updated**: Nov 20, 2025
