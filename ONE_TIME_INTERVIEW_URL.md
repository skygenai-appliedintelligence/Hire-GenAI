# One-Time Interview URL Implementation

## Overview
Interview URLs are now **one-time use only**. Once a candidate completes an interview, they cannot use the same URL again.

## Implementation Details

### 1. API Endpoint: `/api/applications/[applicationId]/interview-status`

**GET** - Check if interview has been completed
- Returns `canInterview: true/false`
- Returns interview status and completion timestamps

**POST** - Mark interview as completed
- Saves interview transcript to database
- Updates interview status to 'success'
- Sets `completed_at` timestamp

### 2. Interview Page Protection

Both interview pages now check completion status:
- `/interview/[applicationId]/start` - Landing page
- `/interview/[applicationId]` - Interview page

**Flow:**
1. Page loads → Check interview status via API
2. If `canInterview = false` → Show "Interview Already Completed" message
3. If `canInterview = true` → Allow interview to proceed
4. When interview ends → Mark as completed in database

### 3. Database Integration

Uses existing `interviews` table:
- `status` field - tracks interview state (enum: 'awaiting', 'in_progress', 'success', 'failed', 'expired')
- `completed_at` timestamp - marks when interview finished
- `raw_transcript` - stores conversation transcript
- Interview is considered completed when `status = 'success'` OR `completed_at IS NOT NULL`

### 4. User Experience

**First Visit:**
- Interview loads normally
- Candidate can complete interview
- On completion, status is saved to database

**Subsequent Visits:**
- Shows warning message: "Interview Already Completed"
- Explains that each link is one-time use only
- Provides "Go to Home" button
- Shows Application ID for reference

## Security Features

✅ **One-time use** - URL becomes invalid after completion
✅ **Database-backed** - Status persists across sessions
✅ **Transcript saved** - Interview data is preserved
✅ **Clear messaging** - Users understand why they can't re-access

## Technical Notes

- Interview completion is marked when user clicks "End Interview" button
- Status check happens before camera/mic permissions are requested
- Works with existing database schema (no migrations needed)
- Falls back gracefully if status check fails (allows interview to proceed)

## Testing

To test the one-time use feature:
1. Start an interview with a new application URL
2. Complete the interview (click red phone button)
3. Try to access the same URL again
4. Should see "Interview Already Completed" message
