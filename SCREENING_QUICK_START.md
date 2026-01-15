# Resume Screening Feature - Quick Start Guide

## What Was Implemented

A complete resume screening system that pre-qualifies candidates before they access the full application form.

## Quick Setup

### 1. Apply Database Migration
```bash
psql $DATABASE_URL < migrations/add_screening_questions.sql
```

### 2. Start Using

**For Admins**:
1. Go to `/dashboard/jobs/new`
2. Fill job details
3. Go to "Screening Questions" tab
4. Toggle "Enable Screening Questions"
5. Fill in screening criteria
6. Create job

**For Candidates**:
1. View job at `/jobs/[company]/[jobId]`
2. Click "Apply Now"
3. Answer screening questions
4. If qualified → proceed to application
5. If not qualified → see rejection reason

## File Changes Summary

### New Files Created
```
migrations/add_screening_questions.sql
app/jobs/[companySlug]/[jobId]/screening/page.tsx
app/api/jobs/[jobId]/screening/route.ts
app/api/jobs/[jobId]/screening/submit/route.ts
RESUME_SCREENING_IMPLEMENTATION.md
SCREENING_TESTING_GUIDE.md
SCREENING_QUICK_START.md
```

### Modified Files
```
app/dashboard/jobs/new/page.tsx
  - Added screening form fields to state
  - Redesigned "Resume Screening" tab
  - Added screening questions UI with 4 sections

app/api/jobs/route.ts
  - Added screening fields to CreateJobBody type
  - Added screening_questions JSON building logic
  - Passed screening_questions to DatabaseService.createJob()

lib/database.ts
  - Added screening_questions to createJob() input type
  - Updated SQL INSERT to include screening_questions column
  - Added JSON serialization for screening data

app/jobs/[companySlug]/[jobId]/page.tsx
  - Updated all 3 Apply Now buttons to route through screening
  - Changed href from /apply/... to /jobs/.../screening
```

## Database Schema

### jobs table (new column)
```sql
screening_questions JSONB DEFAULT NULL
```

Structure:
```json
{
  "enabled": true,
  "min_skill_experience": 5,
  "overall_experience": 8,
  "current_location": "Bangalore, India",
  "nationality": "indian",
  "visa_required": false,
  "language_proficiency": "fluent",
  "current_monthly_salary": 150000
}
```

### candidate_screening_answers table (new)
```sql
id UUID PRIMARY KEY
job_id UUID REFERENCES jobs(id)
candidate_id UUID REFERENCES candidates(id)
answers JSONB
qualified BOOLEAN
qualification_reason TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
UNIQUE(candidate_id, job_id)
```

## API Endpoints

### GET /api/jobs/[jobId]/screening
Returns job details with screening questions
```json
{
  "ok": true,
  "job": {
    "id": "uuid",
    "title": "Job Title",
    "company_name": "Company",
    "location": "Location",
    "screening_questions": { ... }
  }
}
```

### POST /api/jobs/[jobId]/screening/submit
Evaluates candidate answers and returns qualification status
```json
{
  "ok": true,
  "qualified": true,
  "reason": "You meet all the screening criteria..."
}
```

## User Flow

### Admin Flow
```
Job Creation Page
  ↓
Screening Questions Tab
  ↓
Toggle Enable Screening
  ↓
Fill 4 Sections:
  1. Experience (min skill + overall)
  2. Location & Nationality
  3. Visa & Work Authorization
  4. Language & Compensation
  ↓
Create Job
  ↓
screening_questions stored in DB
```

### Candidate Flow
```
Job Detail Page (/jobs/[company]/[jobId])
  ↓
Click "Apply Now"
  ↓
Route to /jobs/[company]/[jobId]/screening
  ↓
Fetch job screening_questions
  ↓
If screening enabled:
  ↓
  Show screening form
  ↓
  Candidate fills 4 sections
  ↓
  Submit answers
  ↓
  Evaluate qualification
  ↓
  If qualified:
    ↓
    Show "Congratulations!"
    ↓
    Redirect to /apply/[company]/[jobId]
  ↓
  If not qualified:
    ↓
    Show rejection reason
    ↓
    Offer back/browse buttons
↓
If no screening:
  ↓
  Redirect directly to /apply/[company]/[jobId]
```

## Qualification Logic

Candidate is **QUALIFIED** if ALL of:
1. `min_skill_experience >= job.min_skill_experience` (if set)
2. `overall_experience >= job.overall_experience` (if set)
3. `visa_required matches job requirement` (if set)
4. `language_proficiency >= job.language_proficiency` (if set)
5. `current_salary <= job.max_salary` (if set)

If ANY criterion fails → **NOT QUALIFIED** with detailed reason

## Key Features

✅ **Admin Side**
- Clean form UI with 4 logical sections
- Toggle to enable/disable screening
- Helper text for each field
- Data stored in JSONB for flexibility

✅ **Candidate Side**
- Dynamic form based on job requirements
- Progress bar (Screening → Application → Submitted)
- Clear "Quick Screening - Takes less than 2 minutes" message
- Instant feedback (qualified/rejected)
- Detailed rejection reasons

✅ **Qualification Logic**
- Automatic evaluation
- Multiple criteria support
- Language level hierarchy (basic < intermediate < fluent < native)
- Lenient nationality matching
- Detailed reason messages

✅ **Data & Performance**
- JSONB storage for flexibility
- Indexes on job_id, candidate_id, qualified
- Unique constraint prevents duplicates
- Trigger for updated_at timestamp

## Testing Quick Checklist

- [ ] Run migration
- [ ] Create job WITH screening enabled
- [ ] Create job WITHOUT screening
- [ ] Apply to job with screening (qualified)
- [ ] Apply to job with screening (not qualified)
- [ ] Apply to job without screening (direct to app)
- [ ] Verify data in candidate_screening_answers table
- [ ] Test mobile responsiveness
- [ ] Check console for errors

## Troubleshooting

**Screening page not loading?**
- Check browser console for errors
- Verify API endpoint returns job data
- Check job status is "open"

**Qualification logic wrong?**
- Verify criteria values are numbers
- Check language level mapping
- Review qualification_reason in database

**Data not saving?**
- Verify candidate_screening_answers table exists
- Check for FK constraint violations
- Verify answers JSON is valid

## Next Steps (Optional)

1. **Admin Dashboard**
   - Show qualified vs rejected candidates per job
   - Display screening answer analytics
   - Add manual override capability

2. **Candidate Features**
   - Save and resume screening
   - Review answers before submission
   - Download screening results

3. **Advanced Logic**
   - Custom scoring system
   - Weighted criteria
   - A/B testing different criteria

4. **Integrations**
   - Email notifications for qualified candidates
   - Bulk screening operations
   - Third-party API integrations

## Support

For detailed testing procedures, see: `SCREENING_TESTING_GUIDE.md`
For implementation details, see: `RESUME_SCREENING_IMPLEMENTATION.md`
