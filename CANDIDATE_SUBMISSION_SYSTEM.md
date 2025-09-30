# Candidate Submission System - Complete Implementation

## Overview
This document describes the end-to-end candidate application submission system with database persistence, validation, idempotency, analytics tracking, and dashboard integration.

## Architecture

### 1. Application Flow
```
User fills form → Client validation → Resume upload → API submission → Database persistence → Analytics event → Dashboard display
```

### 2. Key Components

#### **Frontend: Application Form**
- **Location**: `app/apply/[companySlug]/[jobId]/ApplyForm.tsx`
- **Features**:
  - Comprehensive form validation (all required fields)
  - Resume upload with drag-and-drop support
  - File validation (size < 10MB, types: PDF, DOC, DOCX, TXT)
  - Real-time feedback with toast notifications
  - Metadata capture (timestamp, userAgent)

#### **Backend: Submission API**
- **Location**: `app/api/applications/submit/route.ts`
- **Features**:
  - Server-side validation
  - Idempotency (prevents duplicate applications via candidate_id + job_id unique constraint)
  - Metadata capture (IP, userAgent, timestamp)
  - Atomic database operations
  - Analytics event firing
  - Comprehensive error handling

#### **Backend: Analytics Events API**
- **Location**: `app/api/analytics/events/route.ts`
- **Features**:
  - Tracks `candidate_submitted` events
  - Stores event metadata (source, IP, userAgent, hasResume)
  - Non-blocking (doesn't fail submission if analytics fails)
  - Database persistence with raw SQL

#### **Backend: Applications Fetch API**
- **Location**: `app/api/applications/by-job/[jobId]/route.ts`
- **Features**:
  - Fetches all applications for a specific job
  - **Schema-agnostic**: Dynamically detects available columns in candidates table
  - Joins candidates, applications, and files tables (if columns exist)
  - Maps database status to UI status
  - Returns structured data for dashboard tables
  - Handles missing columns gracefully (e.g., full_name vs first_name/last_name)

#### **Backend: Qualified Applications API**
- **Location**: `app/api/applications/qualified/[jobId]/route.ts`
- **Features**:
  - Fetches only qualified applications
  - Filters by status: qualified, screening_passed, interview_scheduled, etc.
  - Same join logic as applications endpoint

#### **Dashboard: Applications Table**
- **Location**: `app/dashboard/analytics/[jdId]/applications/page.tsx`
- **Features**:
  - Displays all applications for a job
  - Shows: Candidate Name, Email, Phone, CV Link, Status
  - Action buttons: "Show CV Report", "Processed to Next Round"
  - Real-time data from database

#### **Dashboard: Qualified Candidates Table**
- **Location**: `app/dashboard/analytics/[jdId]/qualified/page.tsx`
- **Features**:
  - Displays only qualified candidates
  - Multi-column table with interview pipeline stages
  - Status badges (Qualified, Pending, Expired)
  - Action buttons for progression and resend

## Database Schema

### Tables Used

#### **candidates**
```sql
- id (uuid, primary key)
- email (text, unique)
- full_name (text)
- first_name (text)
- last_name (text)
- phone (text)
- location (text)
- resume_file_id (uuid, foreign key → files.id)
- resume_url (text)
- resume_name (text)
- resume_size (text)
- resume_type (text)
- created_at (timestamp)
```

#### **applications**
```sql
- id (uuid, primary key)
- candidate_id (uuid, foreign key → candidates.id)
- job_id (uuid, foreign key → jobs.id)
- status (text: applied, qualified, screening_passed, interview_scheduled, etc.)
- source (text: direct_application, referral, etc.)
- first_name (text)
- last_name (text)
- email (text)
- phone (text)
- resume_file_id (uuid, foreign key → files.id)
- created_at (timestamp)
- UNIQUE constraint on (candidate_id, job_id) for idempotency
```

#### **files**
```sql
- id (uuid, primary key)
- storage_key (text, unique)
- content_type (text)
- size_bytes (integer)
- created_at (timestamp)
```

#### **candidate_documents**
```sql
- id (uuid, primary key)
- candidate_id (uuid, foreign key → candidates.id)
- file_id (uuid, foreign key → files.id)
- doc_type (text: resume, cover_letter, etc.)
- title (text)
- created_at (timestamp)
```

#### **analytics_events**
```sql
- id (uuid, primary key)
- event_name (text: candidate_submitted, etc.)
- job_id (uuid)
- candidate_id (uuid)
- application_id (uuid)
- event_timestamp (timestamp)
- metadata (jsonb: {source, ip, userAgent, hasResume})
- created_at (timestamp)
```

## API Endpoints

### POST /api/applications/submit
**Purpose**: Submit a new candidate application

**Request Body**:
```json
{
  "jobId": "uuid",
  "candidate": {
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "location": "New York, USA"
  },
  "resume": {
    "url": "https://storage.url/resume.pdf",
    "name": "resume.pdf",
    "type": "application/pdf",
    "size": 123456
  },
  "source": "direct_application",
  "meta": {
    "timestamp": "2025-01-30T12:00:00Z",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response**:
```json
{
  "ok": true,
  "candidateId": "uuid",
  "applicationId": "uuid",
  "fileId": "uuid",
  "message": "Application submitted successfully"
}
```

**Features**:
- ✅ Validates required fields (jobId, candidate.email)
- ✅ Captures metadata (IP, userAgent, timestamp)
- ✅ Upserts candidate by email (idempotent)
- ✅ Creates/reuses file records
- ✅ Creates application (idempotent on candidate_id + job_id)
- ✅ Links documents to candidate
- ✅ Fires analytics event
- ✅ Logs success/failure

### POST /api/analytics/events
**Purpose**: Track analytics events

**Request Body**:
```json
{
  "event": "candidate_submitted",
  "jobId": "uuid",
  "candidateId": "uuid",
  "applicationId": "uuid",
  "timestamp": "2025-01-30T12:00:00Z",
  "metadata": {
    "source": "direct_application",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "hasResume": true
  }
}
```

**Response**:
```json
{
  "ok": true,
  "event": "candidate_submitted"
}
```

### GET /api/applications/by-job/:jobId
**Purpose**: Fetch all applications for a job

**Response**:
```json
{
  "ok": true,
  "jobId": "uuid",
  "applications": [
    {
      "id": "uuid",
      "candidateName": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "cvUrl": "https://storage.url/resume.pdf",
      "status": "CV Qualified",
      "appliedAt": "2025-01-30T12:00:00Z"
    }
  ]
}
```

### GET /api/applications/qualified/:jobId
**Purpose**: Fetch only qualified applications for a job

**Response**: Same structure as above, filtered by qualified statuses

## Validation

### Client-Side Validation
- **Required fields**: firstName, lastName, email, phone, expectedSalary, location, availableStartDate, resume
- **Email format**: Standard email regex
- **Phone format**: Any format accepted (international support)
- **Resume file**:
  - Max size: 10MB
  - Allowed types: PDF, DOC, DOCX, TXT
  - Drag-and-drop or click to upload

### Server-Side Validation
- **jobId**: Required, must be valid UUID
- **candidate.email**: Required, must be valid email format
- **Resume file**: Validated during upload to Vercel Blob
- **Database constraints**: Enforced by PostgreSQL (unique emails, foreign keys)

## Idempotency

### Candidate Level
- **Upsert by email**: If candidate with same email exists, updates their info instead of creating duplicate
- **Resume handling**: Reuses existing file records if storage_key matches

### Application Level
- **Unique constraint**: `(candidate_id, job_id)` prevents duplicate applications
- **Behavior**: If application already exists, returns existing application_id without error

## Error Handling

### Client-Side
- **Missing fields**: Toast notification with list of missing fields
- **File upload failure**: Toast with error message, prevents form submission
- **API errors**: Toast with error message, form remains editable

### Server-Side
- **Database not configured**: Returns graceful error, doesn't crash
- **Missing required fields**: Returns 400 with clear error message
- **Database errors**: Logged to console, returns 500 with generic message
- **Analytics failure**: Logged as warning, doesn't fail submission
- **Partial failures**: Each step wrapped in try-catch, continues on non-critical errors

## Analytics Tracking

### Events Tracked
1. **candidate_submitted**: Fired after successful application submission

### Event Metadata
```json
{
  "source": "direct_application",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "hasResume": true
}
```

### Storage
- **Database table**: `analytics_events`
- **Retention**: Permanent (no automatic cleanup)
- **Query**: Can be aggregated for insights (applications per day, source breakdown, etc.)

## UI Feedback

### Success States
- ✅ Resume uploaded: Toast + file badge with size
- ✅ Application submitted (qualified): Toast + redirect to `/apply/qualified`
- ✅ Application submitted (unqualified): Toast + redirect to `/apply/not-qualified`

### Error States
- ❌ Missing fields: Toast with list of missing fields
- ❌ File too large: Toast with size limit
- ❌ Invalid file type: Toast with allowed types
- ❌ Upload failed: Toast with error message
- ❌ Submission failed: Toast with error message

### Loading States
- ⏳ Form submission: Button shows "Processing..." with spinner
- ⏳ Resume upload: Button disabled during upload
- ⏳ Dashboard tables: "Loading..." message while fetching

## Dashboard Integration

### Applications Page
- **URL**: `/dashboard/analytics/:jdId/applications`
- **Data source**: `/api/applications/by-job/:jobId`
- **Refresh**: On page load (no caching)
- **Empty state**: "No applications yet for this job"

### Qualified Candidates Page
- **URL**: `/dashboard/analytics/:jdId/qualified`
- **Data source**: `/api/applications/qualified/:jobId`
- **Refresh**: On page load (no caching)
- **Empty state**: "No qualified candidates yet for this job"

### Table Columns
Both tables show:
- Candidate Name
- Email
- Phone
- CV Link (clickable)
- Status (badge with color coding)
- Report button
- Action button (context-dependent)

## Security Considerations

### Authentication
- ✅ Dashboard pages require authentication (via `useAuth()`)
- ✅ API endpoints validate database configuration
- ✅ No admin keys exposed to client

### Data Privacy
- ✅ IP addresses captured but not displayed in UI
- ✅ User agents captured for analytics only
- ✅ Resume files stored in secure blob storage
- ✅ Database enforces foreign key constraints

### Input Sanitization
- ✅ All inputs validated on client and server
- ✅ SQL injection prevented by parameterized queries
- ✅ File uploads validated by type and size
- ✅ Email format validated

## Testing Scenarios

### Success Path
1. User fills complete form with valid data
2. Uploads valid resume file
3. Submits form
4. Resume uploads to Vercel Blob
5. Application persists to database
6. Analytics event fires
7. User redirected based on qualification
8. Application appears in dashboard

### Validation Failures
1. Missing required field → Toast notification
2. Invalid email format → Browser validation
3. File too large → Toast notification
4. Invalid file type → Toast notification

### Idempotency
1. Same candidate applies twice → Updates existing candidate, creates new application
2. Same candidate + job → Returns existing application without error

### Error Recovery
1. Resume upload fails → User can retry without losing form data
2. Database insert fails → Error logged, user sees error message
3. Analytics fails → Application still succeeds, warning logged

## Monitoring & Logging

### Success Logs
```
✅ Application submitted: candidate={uuid}, job={uuid}, app={uuid}
📊 Analytics event tracked: candidate_submitted
```

### Error Logs
```
❌ Application submit error: {error message}
⚠️ Analytics event failed: {error message}
⚠️ Application DB submit failed: {error message}
```

### Database Queries
All queries logged via DatabaseService with timing information

## Future Enhancements

### Retry Queue
- Implement background job queue for failed analytics events
- Use Redis or database-backed queue
- Retry with exponential backoff

### Deduplication
- Add fingerprinting based on email + resume content hash
- Detect duplicate applications across jobs
- Warn user before submitting duplicate

### Real-time Updates
- WebSocket connection for live dashboard updates
- Push notifications when new applications arrive
- Real-time status changes

### Advanced Analytics
- Application funnel metrics
- Time-to-hire tracking
- Source effectiveness analysis
- Candidate quality scoring

## Deployment Checklist

- [ ] Database schema migrated (candidates, applications, files, analytics_events)
- [ ] Environment variables set (DATABASE_URL, BLOB_READ_WRITE_TOKEN)
- [ ] Vercel Blob storage configured
- [ ] API endpoints tested with real data
- [ ] Dashboard pages load without errors
- [ ] Form submission works end-to-end
- [ ] Analytics events tracked correctly
- [ ] Error handling tested (network failures, validation errors)
- [ ] Monitoring/logging configured

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify database connection and schema
3. Confirm Vercel Blob storage is configured
4. Test API endpoints directly with curl/Postman
5. Review this documentation for expected behavior

---

**Last Updated**: 2025-01-30  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
