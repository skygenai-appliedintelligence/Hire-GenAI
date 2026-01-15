# Resume Screening Feature - Implementation Summary

## Overview
Complete implementation of a resume screening feature that allows admins to define screening questions for jobs, and candidates to answer them before proceeding to the full application.

## Architecture

### Database Schema
**New Migration**: `migrations/add_screening_questions.sql`
- **Column**: `jobs.screening_questions` (JSONB)
  - Stores structured screening criteria per job
  - Format: `{ enabled, min_skill_experience, overall_experience, current_location, nationality, visa_required, language_proficiency, current_monthly_salary }`
  
- **Table**: `candidate_screening_answers`
  - Stores candidate responses to screening questions
  - Fields: `id, job_id, candidate_id, answers (JSONB), qualified (boolean), qualification_reason, created_at, updated_at`
  - Unique constraint: `(candidate_id, job_id)` - one screening per candidate per job

### Admin Side (Job Creation)

**File**: `app/dashboard/jobs/new/page.tsx`

**Changes**:
1. Added screening fields to `formData` state:
   - `screeningEnabled` (boolean)
   - `screeningMinSkillExp` (string/number)
   - `screeningOverallExp` (string/number)
   - `screeningCurrentLocation` (string)
   - `screeningNationality` (string)
   - `screeningVisaRequired` (yes/no)
   - `screeningLanguageProficiency` (basic/intermediate/fluent/native)
   - `screeningCurrentSalary` (string/number)

2. Redesigned "Resume Screening" tab (renamed to "Screening Questions"):
   - Professional form with 4 sections:
     1. Experience Requirements (min skill + overall)
     2. Location & Nationality
     3. Visa & Work Authorization
     4. Language & Compensation
   - Toggle to enable/disable screening
   - Conditional rendering of form fields
   - Helper text and validation hints
   - Info box explaining how screening works

3. Tab label updated: "Resume Screening" → "Screening Questions"

**API Integration**:
- `app/api/jobs/route.ts` (POST):
  - Builds `screening_questions` JSON object from form fields
  - Passes to `DatabaseService.createJob()` with screening data
  - Both create and retry paths include screening_questions

**Database Service**:
- `lib/database.ts`:
  - Updated `createJob()` input type to include `screening_questions?: Record<string, any> | null`
  - Updated SQL INSERT query to include `screening_questions` column
  - Converts screening_questions to JSON string before inserting

### Candidate Side (Apply Flow)

**File**: `app/jobs/[companySlug]/[jobId]/screening/page.tsx`

**Features**:
1. Dynamic form rendering based on job's screening_questions
2. Progress bar showing: Screening (1) → Application (2) → Submitted (3)
3. Clear heading: "Quick Screening - Takes less than 2 minutes"
4. 4 sections matching admin configuration:
   - Experience (min skill + overall)
   - Location & Nationality
   - Work Authorization (visa required)
   - Language & Compensation
5. Form validation and submission
6. Result screen:
   - **If Qualified**: "Congratulations!" message with redirect to application
   - **If Not Qualified**: Rejection message with reason and back button

**Styling**:
- Gradient background (emerald theme)
- Card-based layout
- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Color-coded section numbers (blue, purple, orange, teal)

### API Endpoints

**1. GET `/api/jobs/[jobId]/screening`**
- Fetches job details with screening_questions
- Returns: `{ ok, job: { id, title, company_name, location, screening_questions } }`
- Validates job is open before returning

**2. POST `/api/jobs/[jobId]/screening/submit`**
- Accepts candidate answers
- Evaluates qualification based on criteria
- Stores answers in `candidate_screening_answers` table
- Returns: `{ ok, qualified: boolean, reason: string }`

### Qualification Logic

**File**: `app/api/jobs/[jobId]/screening/submit/route.ts`

**Rules**:
1. **Minimum Skill Experience**: `candidate.min_skill_experience >= job.min_skill_experience`
2. **Overall Experience**: `candidate.overall_experience >= job.overall_experience`
3. **Visa Requirement**: 
   - If job requires valid work auth (visa_required = false), candidate must not need sponsorship
   - If job offers sponsorship (visa_required = true), candidate can need it
4. **Language Proficiency**: `candidate.language_proficiency >= job.language_proficiency`
   - Levels: basic < intermediate < fluent < native
5. **Salary** (optional): `candidate_salary <= job_max_salary`
6. **Nationality** (lenient): Checked but not enforced to allow flexibility

**Output**:
- If all criteria met: `qualified = true`
- If any criterion fails: `qualified = false` with detailed reason

### Job Detail Page Updates

**File**: `app/jobs/[companySlug]/[jobId]/page.tsx`

**Changes**:
- Updated all "Apply Now" buttons to route through screening:
  - Inline header button: `/jobs/${company}/${jobId}/screening`
  - Sticky mobile button: `/jobs/${company}/${jobId}/screening`
  - Summary card button: `/jobs/${company}/${jobId}/screening`

**Flow**:
1. User clicks "Apply Now"
2. Redirects to `/jobs/[company]/[jobId]/screening`
3. Screening page fetches job's screening_questions
4. If no screening enabled → redirects directly to `/apply/[company]/[jobId]`
5. If screening enabled → shows form
6. After submission:
   - If qualified → redirects to `/apply/[company]/[jobId]`
   - If not qualified → shows rejection message

## File Structure

```
migrations/
  └── add_screening_questions.sql

app/
  ├── dashboard/jobs/new/
  │   └── page.tsx (updated)
  ├── jobs/[companySlug]/[jobId]/
  │   ├── page.tsx (updated)
  │   └── screening/
  │       └── page.tsx (new)
  └── api/
      └── jobs/
          ├── route.ts (updated)
          └── [jobId]/
              └── screening/
                  ├── route.ts (new - GET)
                  └── submit/
                      └── route.ts (new - POST)

lib/
  └── database.ts (updated)
```

## Testing Checklist

- [ ] Run migration: `psql $DATABASE_URL < migrations/add_screening_questions.sql`
- [ ] Create new job with screening enabled
  - [ ] Fill all screening fields
  - [ ] Verify data saves to `jobs.screening_questions`
- [ ] Create new job without screening
  - [ ] Verify `screening_questions` is NULL
- [ ] Apply to job with screening enabled
  - [ ] Verify screening page loads
  - [ ] Test qualified candidate (meets all criteria)
  - [ ] Test unqualified candidate (fails one criterion)
  - [ ] Verify answers stored in `candidate_screening_answers`
- [ ] Apply to job without screening
  - [ ] Verify direct redirect to application form
- [ ] Test qualification logic
  - [ ] Experience validation
  - [ ] Visa requirement matching
  - [ ] Language proficiency levels
  - [ ] Salary expectations
- [ ] Test UI/UX
  - [ ] Progress bar displays correctly
  - [ ] Form validation works
  - [ ] Rejection message is clear
  - [ ] Mobile responsiveness

## Key Features

✅ **Admin Configuration**
- Clean, organized form UI
- 4 logical sections
- Toggle to enable/disable
- Helper text for each field
- Persistent storage in JSONB column

✅ **Candidate Experience**
- Dynamic form based on job requirements
- Clear progress indication
- Professional styling
- Instant feedback (qualified/rejected)
- Detailed rejection reasons

✅ **Qualification Logic**
- Automatic evaluation
- Multiple criteria support
- Detailed reason messages
- Lenient nationality matching
- Language level hierarchy

✅ **Data Persistence**
- Screening questions stored per job
- Candidate answers stored with qualification result
- Audit trail with timestamps
- Unique constraint prevents duplicate submissions

✅ **User Experience**
- Seamless flow: Job → Screening → Application
- No friction for jobs without screening
- Clear messaging at each step
- Mobile-friendly design
- Smooth animations

## Future Enhancements

1. Admin dashboard showing:
   - Qualified vs rejected candidates per job
   - Screening answer analytics
   - Qualification reasons distribution

2. Candidate features:
   - Save and resume screening
   - Review answers before submission
   - Download screening results

3. Advanced qualification logic:
   - Custom scoring system
   - Weighted criteria
   - Manual override capability

4. Integration:
   - Email notifications for qualified candidates
   - Bulk screening operations
   - API for third-party integrations
