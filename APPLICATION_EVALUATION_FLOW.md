# Application Evaluation Flow - Complete Explanation

## Overview
When a candidate applies for a job, the system performs **two types of evaluations**:
1. **CV Evaluation** - Automatic evaluation of resume against job description
2. **Interview Evaluation** - Manual evaluation after video interview

---

## Part 1: Application Submission Flow

### Step 1: Candidate Submits Application
**Endpoint**: `POST /api/applications/submit`

**What Happens**:
```
Candidate fills form:
  - Name, Email, Phone
  - Location, LinkedIn, Portfolio
  - Expected Salary
  - Resume/CV file
  
↓

System receives application data
  
↓

Creates/Updates candidate record in `candidates` table
  
↓

Creates application record in `applications` table with status='applied'
  
↓

Stores resume file in `files` table
  
↓

Returns: candidateId, applicationId, fileId
```

**Database Tables Updated**:
- `candidates` - New or updated candidate record
- `applications` - New application with status='applied'
- `files` - Resume file stored
- `candidate_documents` - Resume linked to candidate

**Console Output**:
```
✅ Application submitted: candidate={id}, job={id}, app={id}
```

---

## Part 2: CV Evaluation (Automatic)

### When Does CV Evaluation Happen?
**Trigger**: After resume is uploaded and parsed

**Endpoint**: `POST /api/applications/evaluate-cv`

### Step 1: Get Resume Text
```
Resume uploaded
  ↓
Parse resume (extract text)
  ↓
Save to applications.resume_text
  ↓
Trigger CV evaluation
```

### Step 2: Fetch Job Description
```
Get job_id from application
  ↓
Query jobs table
  ↓
Get job description/JD text
```

### Step 3: Evaluate CV Against Job Description
**Source**: `lib/cv-evaluator.ts`

**What It Does**:
```
Resume Text + Job Description
  ↓
Send to OpenAI GPT-4o
  ↓
AI evaluates:
  - Skills match
  - Experience match
  - Education match
  - Overall qualification
  ↓
Returns score (0-100) and qualification status
```

**Evaluation Criteria**:
- Technical skills alignment
- Years of experience required
- Education requirements
- Specific keywords/skills
- Pass threshold: 40% (configurable)

### Step 4: Store CV Evaluation Results
**Database Updates**:
```sql
UPDATE applications SET
  qualification_score = {score},
  is_qualified = {true/false},
  qualification_explanations = {detailed_json}
WHERE id = {applicationId}
```

**If Qualified**:
```sql
UPDATE applications SET
  status = 'cv_qualified'
WHERE id = {applicationId}
```

**Console Output**:
```
[CV Evaluator] Starting evaluation for application: {id}
[CV Evaluator] Evaluation complete: score={score}, qualified={true/false}
✅ [CV EVALUATOR] Real AI evaluation completed successfully
[CV Evaluator] Saved evaluation to database
[CV Evaluator] Application status set to cv_qualified
```

---

## Part 3: Interview Evaluation (Manual)

### When Does Interview Evaluation Happen?
**Trigger**: After video interview is completed

**Endpoint**: `POST /api/applications/{applicationId}/evaluate`

### Step 1: Get Interview Transcript
```
Video interview completed
  ↓
Extract transcript from interview
  ↓
Send to evaluation endpoint
```

### Step 2: Evaluate Interview Transcript
**What It Does**:
```
Interview Transcript + Job Details + Evaluation Criteria
  ↓
Send to OpenAI GPT-4o
  ↓
AI evaluates by category:
  - Technical Skills (40% weight)
  - Communication (20% weight)
  - Problem Solving (25% weight)
  - Cultural Fit (15% weight)
  ↓
Returns detailed scores and recommendation
```

### Step 3: Scoring System
**Categories & Weights**:
```
Technical Skills:      40% weight, max 5 questions
Communication:         20% weight, max 3 questions
Problem Solving:       25% weight, max 4 questions
Cultural Fit:          15% weight, max 2 questions
─────────────────────────────────────────────────
Total:                100% weight
```

**Scoring**:
```
Each question scored out of 10 points
  ↓
Category score = Sum of question scores
  ↓
Weighted score = Category score × Weight
  ↓
Final score = Sum of all weighted scores
```

**Example**:
```
Technical Skills:
  Q1: 8/10
  Q2: 7/10
  Total: 15/20 = 75%
  Weighted: 75% × 40% = 30 points

Communication:
  Q1: 8/10
  Total: 8/10 = 80%
  Weighted: 80% × 20% = 16 points

Problem Solving:
  Q1: 7/10
  Total: 7/10 = 70%
  Weighted: 70% × 25% = 17.5 points

Cultural Fit:
  Q1: 9/10
  Total: 9/10 = 90%
  Weighted: 90% × 15% = 13.5 points

─────────────────────────────────────────────────
FINAL SCORE: 30 + 16 + 17.5 + 13.5 = 77/100
```

### Step 4: Pass/Fail Determination
```
if overall_score >= 65:
  status = 'Pass'
  recommendation = 'Hire'
else:
  status = 'Fail'
  recommendation = 'No Hire'
```

### Step 5: Store Interview Evaluation
**Database Updates**:
```sql
INSERT INTO evaluations (
  interview_id,
  overall_score,
  skill_scores,
  recommendation,
  rubric_notes_md,
  status,
  created_at
) VALUES (
  {interviewId},
  {score},
  {detailed_scores_json},
  {recommendation},
  {markdown_notes},
  {Pass/Fail},
  NOW()
)
```

**Also Updates**:
```sql
UPDATE interviews SET
  metadata = jsonb_set(metadata, '{evaluation}', {evaluation_data})
WHERE id = {interviewId}
```

**Console Output**:
```
🔍 EVALUATION API CALLED
📝 Application ID: {id}
📝 Transcript length: {length}
🤖 Calling OpenAI API for evaluation...
✅ Received evaluation from OpenAI
✅ Evaluation stored in evaluations table: {id}
📊 Candidate result: Pass (Score: 77/100)
🎉 Candidate PASSED - will appear in Successful Hire tab!
```

---

## Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ CANDIDATE APPLIES FOR JOB                                    │
│ POST /api/applications/submit                                │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ CREATE APPLICATION RECORD                                    │
│ - Insert into candidates table                               │
│ - Insert into applications table (status='applied')          │
│ - Store resume file                                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ PARSE RESUME                                                 │
│ POST /api/resumes/parse                                      │
│ - Extract text from PDF/DOC                                  │
│ - Save to applications.resume_text                           │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ CV EVALUATION (AUTOMATIC)                                    │
│ POST /api/applications/evaluate-cv                           │
│ - Get resume text                                            │
│ - Get job description                                        │
│ - Send to OpenAI GPT-4o                                      │
│ - Get qualification score (0-100)                            │
│ - Update applications table                                  │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ├─ If NOT qualified (score < 40):
                   │  └─ Status remains 'applied'
                   │
                   └─ If qualified (score >= 40):
                      └─ Status changes to 'cv_qualified'
                         │
                         ▼
                   ┌──────────────────────────────────────────┐
                   │ SCHEDULE VIDEO INTERVIEW                 │
                   │ - Create interview record                │
                   │ - Send interview link to candidate       │
                   └──────────────────┬───────────────────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────────────┐
                   │ CANDIDATE COMPLETES VIDEO INTERVIEW      │
                   │ - Video recorded                         │
                   │ - Transcript generated                   │
                   │ - Interview marked as completed          │
                   └──────────────────┬───────────────────────┘
                                      │
                                      ▼
                   ┌──────────────────────────────────────────┐
                   │ INTERVIEW EVALUATION (MANUAL)            │
                   │ POST /api/applications/{id}/evaluate     │
                   │ - Get interview transcript               │
                   │ - Send to OpenAI GPT-4o                  │
                   │ - Evaluate by 4 categories               │
                   │ - Calculate weighted score               │
                   │ - Determine Pass/Fail                    │
                   │ - Store in evaluations table             │
                   └──────────────────┬───────────────────────┘
                                      │
                                      ├─ If FAIL (score < 65):
                                      │  └─ Status = 'Fail'
                                      │     Recommendation = 'No Hire'
                                      │
                                      └─ If PASS (score >= 65):
                                         └─ Status = 'Pass'
                                            Recommendation = 'Hire'
                                            Appears in "Successful Hire" tab
```

---

## Data Sources for Evaluation

### CV Evaluation Uses:
1. **Resume Text** - From `applications.resume_text` (extracted from uploaded file)
2. **Job Description** - From `jobs.description` or `jobs.job_description`
3. **Pass Threshold** - Default 40% (configurable)

### Interview Evaluation Uses:
1. **Interview Transcript** - From interview recording/transcription
2. **Job Title** - From `jobs.title`
3. **Company Name** - From `companies.name`
4. **Candidate Name** - From `candidates.first_name`, `candidates.last_name`
5. **Evaluation Criteria** - From `job_rounds.configuration`

---

## Database Tables Involved

### `applications`
- `qualification_score` - CV evaluation score (0-100)
- `is_qualified` - CV evaluation result (true/false)
- `qualification_explanations` - Detailed CV evaluation JSON
- `status` - Application status (applied → cv_qualified → interview → pass/fail)

### `evaluations`
- `interview_id` - Reference to interview
- `overall_score` - Interview evaluation score (0-100)
- `skill_scores` - Detailed scores by category (JSON)
- `recommendation` - Hire/No Hire/Maybe
- `rubric_notes_md` - Markdown notes with detailed feedback
- `status` - Pass/Fail

### `interviews`
- `metadata` - Contains evaluation data (JSON)
- `status` - Interview status (scheduled, started, completed)
- `transcript` - Interview transcript

### `jobs`
- `description` or `job_description` - Job description text
- `title` - Job title

### `candidates`
- `full_name` or `first_name`/`last_name` - Candidate name
- `email` - Candidate email

---

## OpenAI API Integration

### CV Evaluation
**Model**: GPT-4o
**Prompt**: Resume vs Job Description matching
**Output**: Qualification score + detailed breakdown

### Interview Evaluation
**Model**: GPT-4o
**Prompt**: Weighted category evaluation with question-wise scoring
**Output**: 
- Overall score (0-100)
- Category scores (Technical, Communication, Problem Solving, Cultural Fit)
- Question-wise feedback
- Recommendation (Hire/No Hire/Maybe)

### Fallback (No API Key)
If OpenAI API key not configured:
- CV Evaluation: Mock score (50-80)
- Interview Evaluation: Mock score (50-80)
- Uses predefined mock data

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Trigger |
|----------|--------|---------|---------|
| `/api/applications/submit` | POST | Submit application | Manual (candidate) |
| `/api/resumes/parse` | POST | Parse resume file | Manual (after upload) |
| `/api/applications/evaluate-cv` | POST | Evaluate CV | Manual (after parsing) |
| `/api/applications/{id}/evaluate` | POST | Evaluate interview | Manual (after interview) |

---

## Key Points

### ✅ CV Evaluation
- Happens **automatically** after resume upload
- Compares resume against job description
- Determines if candidate is qualified
- Score >= 40% = Qualified
- Updates application status to 'cv_qualified'

### ✅ Interview Evaluation
- Happens **manually** after video interview
- Evaluates interview transcript
- Uses 4 weighted categories
- Score >= 65% = Pass (Hire)
- Score < 65% = Fail (No Hire)
- Appears in "Successful Hire" tab if Pass

### ✅ Data Flow
1. Application submitted
2. Resume parsed
3. CV evaluated (automatic)
4. If qualified → Interview scheduled
5. Interview completed
6. Interview evaluated (manual)
7. Result stored and displayed

### ✅ Scoring
- CV: 0-100 (threshold: 40%)
- Interview: 0-100 (threshold: 65%)
- Interview uses weighted categories
- Each category has multiple questions
- Final score = weighted average

---

## Example Scenario

```
1. John applies for "Senior Developer" role
   - Submits resume (resume.pdf)
   - Fills application form
   
2. System parses resume
   - Extracts: Python, React, 5 years experience
   
3. CV Evaluation runs
   - Compares against job description
   - Score: 75% (Qualified)
   - Status: cv_qualified
   
4. Interview scheduled
   - John receives interview link
   
5. John completes video interview
   - 4 technical questions
   - 2 communication questions
   - 3 problem-solving questions
   - 2 cultural fit questions
   
6. Interview Evaluation runs
   - Technical Skills: 8/10, 7/10, 8/10, 7/10 = 30/40 = 75% × 40% = 30 pts
   - Communication: 8/10, 7/10 = 15/20 = 75% × 20% = 15 pts
   - Problem Solving: 7/10, 8/10, 6/10 = 21/30 = 70% × 25% = 17.5 pts
   - Cultural Fit: 9/10, 8/10 = 17/20 = 85% × 15% = 12.75 pts
   - Total: 30 + 15 + 17.5 + 12.75 = 75.25/100
   - Status: Pass
   - Recommendation: Hire
   
7. John appears in "Successful Hire" tab
```

---

## Troubleshooting

### CV Evaluation Not Running
- Check if resume was uploaded
- Check if resume text was extracted
- Check OpenAI API key configuration
- Check server logs for errors

### Interview Evaluation Not Running
- Check if interview was completed
- Check if transcript was generated
- Check OpenAI API key configuration
- Check server logs for errors

### Wrong Scores
- Check if OpenAI API key has correct permissions
- Check if evaluation prompt is correct
- Check if category weights are correct
- Check if threshold values are correct

### Candidate Not in "Successful Hire" Tab
- Check if interview evaluation status is 'Pass'
- Check if overall score >= 65%
- Check if evaluation was stored in database
- Check if interview_id is correct

---

## Summary

The evaluation system has **two stages**:

1. **CV Evaluation** (Automatic)
   - Happens after resume upload
   - Compares resume vs job description
   - Determines qualification
   - Uses OpenAI GPT-4o

2. **Interview Evaluation** (Manual)
   - Happens after video interview
   - Evaluates interview transcript
   - Uses 4 weighted categories
   - Determines Pass/Fail
   - Uses OpenAI GPT-4o

Both use AI (OpenAI GPT-4o) to provide intelligent, objective evaluation of candidates.
