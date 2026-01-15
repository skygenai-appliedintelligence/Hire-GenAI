# Resume Screening Feature - Testing Guide

## Pre-Testing Setup

### 1. Run Database Migration
```bash
psql $DATABASE_URL < migrations/add_screening_questions.sql
```

This will:
- Add `screening_questions` JSONB column to `jobs` table
- Create `candidate_screening_answers` table
- Create indexes for performance
- Create trigger for `updated_at` timestamp

### 2. Verify Database Changes
```sql
-- Check jobs table has screening_questions column
\d jobs

-- Check candidate_screening_answers table exists
\d candidate_screening_answers

-- Verify indexes
SELECT * FROM pg_indexes WHERE tablename IN ('jobs', 'candidate_screening_answers');
```

## Testing Scenarios

### Scenario 1: Create Job WITH Screening Enabled

**Steps**:
1. Navigate to `/dashboard/jobs/new`
2. Fill in Basic Info tab:
   - Job Title: "Senior React Developer"
   - Company: "TechCorp"
   - Location: "Bangalore, India"
   - Job Type: "Full-time"
   - Experience Level: "Senior"
3. Fill in other tabs (Requirements, Responsibilities, etc.)
4. Go to "Screening Questions" tab
5. Toggle "Enable Screening Questions" ON
6. Fill in screening fields:
   - Min Skill Experience: 5
   - Overall Experience: 8
   - Current Location: (leave empty or "Bangalore, India")
   - Nationality: "Any Nationality"
   - Visa Required: "No - Must have valid work authorization"
   - Language Proficiency: "Fluent"
   - Current Monthly Salary: 150000
7. Click "Create Job"

**Expected Results**:
- Job created successfully
- Redirect to `/dashboard/jobs`
- In database, `jobs.screening_questions` should contain:
```json
{
  "enabled": true,
  "min_skill_experience": 5,
  "overall_experience": 8,
  "current_location": null,
  "nationality": "any",
  "visa_required": false,
  "language_proficiency": "fluent",
  "current_monthly_salary": 150000
}
```

**Verification**:
```sql
SELECT id, title, screening_questions FROM jobs 
WHERE title = 'Senior React Developer' 
LIMIT 1;
```

---

### Scenario 2: Create Job WITHOUT Screening

**Steps**:
1. Navigate to `/dashboard/jobs/new`
2. Fill in Basic Info and other tabs
3. Go to "Screening Questions" tab
4. Toggle "Enable Screening Questions" OFF
5. Click "Create Job"

**Expected Results**:
- Job created successfully
- In database, `jobs.screening_questions` should be NULL

**Verification**:
```sql
SELECT id, title, screening_questions FROM jobs 
WHERE screening_questions IS NULL 
LIMIT 1;
```

---

### Scenario 3: Candidate Applies to Job WITH Screening (Qualified)

**Steps**:
1. Navigate to job detail page: `/jobs/techcorp/[jobId]`
2. Click "Apply Now" button
3. Should redirect to `/jobs/techcorp/[jobId]/screening`
4. Verify screening form loads with all 4 sections
5. Fill in answers that MEET criteria:
   - Min Skill Experience: 6 (required 5) ✓
   - Overall Experience: 9 (required 8) ✓
   - Current Location: "Bangalore, India"
   - Nationality: "Indian"
   - Visa Required: "No, I have valid work authorization" ✓
   - Language Proficiency: "Fluent" (required Fluent) ✓
   - Current Monthly Salary: 140000 (required max 150000) ✓
6. Click "Continue to Application"

**Expected Results**:
- Form submits successfully
- Shows "Congratulations!" screen
- After 2 seconds, redirects to `/apply/techcorp/[jobId]`
- In database, `candidate_screening_answers` should have:
  - `qualified = true`
  - `answers` contains submitted data
  - `qualification_reason` = "You meet all the screening criteria for this position!"

**Verification**:
```sql
SELECT * FROM candidate_screening_answers 
WHERE job_id = '[jobId]' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Scenario 4: Candidate Applies to Job WITH Screening (Not Qualified - Low Experience)

**Steps**:
1. Navigate to job detail page: `/jobs/techcorp/[jobId]`
2. Click "Apply Now" button
3. Fill in answers that FAIL criteria:
   - Min Skill Experience: 3 (required 5) ✗
   - Overall Experience: 6 (required 8) ✗
   - Current Location: "Bangalore, India"
   - Nationality: "Indian"
   - Visa Required: "No, I have valid work authorization" ✓
   - Language Proficiency: "Fluent" ✓
   - Current Monthly Salary: 140000 ✓
4. Click "Continue to Application"

**Expected Results**:
- Shows rejection screen with message:
  - "Required 5+ years in primary skill, but you have 3 years"
  - "Required 8+ years overall experience, but you have 6 years"
- Shows "Browse Other Jobs" and "Back to Job" buttons
- In database, `qualified = false` with detailed reason

---

### Scenario 5: Candidate Applies to Job WITH Screening (Not Qualified - Visa Mismatch)

**Steps**:
1. Navigate to job detail page: `/jobs/techcorp/[jobId]`
2. Click "Apply Now" button
3. Fill in answers:
   - Min Skill Experience: 6 ✓
   - Overall Experience: 9 ✓
   - Current Location: "Bangalore, India"
   - Nationality: "Indian"
   - Visa Required: "Yes, I need visa sponsorship" ✗ (job doesn't offer)
   - Language Proficiency: "Fluent" ✓
   - Current Monthly Salary: 140000 ✓
4. Click "Continue to Application"

**Expected Results**:
- Shows rejection screen with message:
  - "This position requires valid work authorization. Visa sponsorship is not available."
- In database, `qualified = false`

---

### Scenario 6: Candidate Applies to Job WITHOUT Screening

**Steps**:
1. Navigate to job detail page for job created in Scenario 2
2. Click "Apply Now" button
3. Should immediately redirect to `/apply/[company]/[jobId]` (no screening page)

**Expected Results**:
- No screening form shown
- Direct access to application form
- No entry in `candidate_screening_answers` table

---

### Scenario 7: Language Proficiency Validation

**Steps**:
1. Create job with Language Proficiency: "Intermediate"
2. Apply with different proficiency levels:
   - "Basic" → Should fail
   - "Intermediate" → Should pass
   - "Fluent" → Should pass
   - "Native" → Should pass

**Expected Results**:
- Proper hierarchy enforcement: basic < intermediate < fluent < native

---

### Scenario 8: UI/UX Testing

**Test Progress Bar**:
- Verify step 1 (Screening) is highlighted in green
- Verify steps 2 and 3 are grayed out
- Verify progress bar shows 0% filled

**Test Form Validation**:
- Try submitting empty form → Should show validation errors
- Verify required fields are marked with *
- Verify number fields only accept numbers
- Verify select fields have proper options

**Test Mobile Responsiveness**:
- View on mobile device (or use DevTools)
- Verify form is readable and usable
- Verify buttons are properly sized
- Verify no horizontal scrolling

**Test Animations**:
- Verify smooth fade-in of form sections
- Verify button hover effects
- Verify result screen animations

---

## Edge Cases

### Edge Case 1: Job Status Changed to Closed
**Steps**:
1. Create job with screening
2. Change job status to "Closed"
3. Try to access screening page

**Expected**:
- Should show error: "This job is not accepting applications at this time"

### Edge Case 2: Duplicate Screening Submission
**Steps**:
1. Submit screening answers
2. Try to submit again from same candidate

**Expected**:
- Should update existing record (due to UNIQUE constraint)
- `updated_at` timestamp should change
- Only one record per candidate per job

### Edge Case 3: Missing Screening Questions Column
**Steps**:
1. Don't run migration
2. Try to create job with screening

**Expected**:
- Should fail with database error
- Error message should be clear

### Edge Case 4: Null Values in Screening Criteria
**Steps**:
1. Create job with some screening fields empty
2. Apply with those fields

**Expected**:
- Empty criteria should be skipped
- Only filled criteria should be validated

---

## Performance Testing

### Test 1: Large Number of Screening Answers
**Steps**:
1. Create 1000 screening answer records
2. Query by job_id
3. Measure query time

**Expected**:
- Queries should complete in < 100ms
- Indexes should be used

**Verification**:
```sql
EXPLAIN ANALYZE
SELECT * FROM candidate_screening_answers 
WHERE job_id = '[jobId]';
```

### Test 2: JSON Query Performance
**Steps**:
1. Create 100 jobs with screening questions
2. Query by screening criteria

**Expected**:
- JSON queries should be efficient
- GIN index should be used

---

## API Testing (with curl/Postman)

### Test GET /api/jobs/[jobId]/screening
```bash
curl -X GET http://localhost:3000/api/jobs/[jobId]/screening
```

**Expected Response**:
```json
{
  "ok": true,
  "job": {
    "id": "uuid",
    "title": "Senior React Developer",
    "company_name": "TechCorp",
    "location": "Bangalore, India",
    "screening_questions": {
      "enabled": true,
      "min_skill_experience": 5,
      ...
    }
  }
}
```

### Test POST /api/jobs/[jobId]/screening/submit
```bash
curl -X POST http://localhost:3000/api/jobs/[jobId]/screening/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "min_skill_experience": 6,
      "overall_experience": 9,
      "current_location": "Bangalore, India",
      "nationality": "indian",
      "visa_required": false,
      "language_proficiency": "fluent",
      "current_monthly_salary": 140000
    }
  }'
```

**Expected Response (Qualified)**:
```json
{
  "ok": true,
  "qualified": true,
  "reason": "You meet all the screening criteria for this position!"
}
```

**Expected Response (Not Qualified)**:
```json
{
  "ok": true,
  "qualified": false,
  "reason": "Required 5+ years in primary skill, but you have 3 years. Required 8+ years overall experience, but you have 6 years."
}
```

---

## Regression Testing

### Existing Functionality
- [ ] Job creation without screening still works
- [ ] Job detail page displays correctly
- [ ] Application form still accessible for non-screening jobs
- [ ] Job editing still works
- [ ] Job deletion still works
- [ ] Analytics still work
- [ ] Interview process still works

---

## Sign-Off Checklist

- [ ] All 8 scenarios pass
- [ ] All edge cases handled
- [ ] Performance acceptable
- [ ] API endpoints working
- [ ] UI/UX polished
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Database migration applied
- [ ] No regressions in existing features
- [ ] Code reviewed and tested

---

## Troubleshooting

### Issue: Screening page shows blank form
**Solution**: Check browser console for errors. Verify API endpoint is returning job data.

### Issue: Qualification logic not working
**Solution**: Check language level mapping in `app/api/jobs/[jobId]/screening/submit/route.ts`. Verify criteria values are numbers.

### Issue: Database migration fails
**Solution**: Check PostgreSQL version (must be 9.3+). Verify `candidates` table exists.

### Issue: Answers not storing
**Solution**: Verify `candidate_screening_answers` table exists. Check for FK constraint violations.

---

## Success Criteria

✅ Feature is complete when:
1. Admin can create jobs with screening questions
2. Screening questions are stored in JSONB column
3. Candidates see screening form before application
4. Qualification logic correctly evaluates answers
5. Qualified candidates proceed to application
6. Unqualified candidates see rejection message
7. Screening answers are stored with qualification result
8. Jobs without screening skip screening page
9. All UI is responsive and polished
10. No regressions in existing features
