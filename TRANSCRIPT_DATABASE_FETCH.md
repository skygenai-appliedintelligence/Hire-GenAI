# Transcript Database Fetch Implementation

## Overview
Report page ab database se interview transcript fetch karta hai instead of mock data.

## Implementation Details

### API Endpoint
**GET** `/api/candidates/[candidateId]/report?jobId=[jobId]`

### Database Query
```sql
SELECT 
  i.raw_transcript,
  i.started_at,
  i.completed_at,
  i.status,
  ra.name as agent_name
FROM interviews i
JOIN application_rounds ar ON ar.id = i.application_round_id
LEFT JOIN round_agents ra ON ra.id = i.round_agent_id
WHERE ar.application_id = $1::uuid
ORDER BY i.completed_at DESC NULLS LAST, i.started_at DESC NULLS LAST
LIMIT 1
```

### Data Flow

1. **Interview Completion**
   - User ends interview
   - Transcript saved to `interviews.raw_transcript`
   - Status set to 'success'
   - `completed_at` timestamp recorded

2. **Report Page Load**
   - User opens report page with `?tab=transcript`
   - API fetches from `interviews` table
   - Joins with `application_rounds` to get application
   - Joins with `round_agents` to get interviewer name

3. **Transcript Display**
   - Shows full conversation text
   - Calculates interview duration
   - Shows interview date
   - Shows interviewer name (AI Agent)

### Response Format

```json
{
  "ok": true,
  "transcript": {
    "text": "Agent: Hello...\n\nYou: Hi...",
    "duration": "15 minutes",
    "interviewDate": "2025-10-05T12:30:00Z",
    "interviewer": "AI Agent",
    "status": "success"
  }
}
```

### Features

✅ **Real Database Integration** - Fetches from `interviews` table
✅ **Duration Calculation** - Auto-calculates from start/end timestamps
✅ **Latest Interview** - Always shows most recent interview
✅ **Fallback Handling** - Shows "No transcript available" if not found
✅ **Logging** - Comprehensive logs for debugging

### Logging

Server console shows:
- 📝 Fetching transcript for application: [id]
- 📝 Transcript rows found: [count]
- ✅ Transcript loaded, length: [chars]
- ⚠️ No transcript found (if empty)
- ❌ Failed to fetch transcript (on error)

## Testing

1. Complete an interview
2. Navigate to: `/dashboard/analytics/[jdId]/applications/[applicationId]/report?tab=transcript`
3. Transcript should display from database
4. Check server console for logs

## Database Schema

Uses existing tables:
- `interviews` - Stores `raw_transcript`
- `application_rounds` - Links interview to application
- `round_agents` - Provides interviewer name

No migrations needed!
