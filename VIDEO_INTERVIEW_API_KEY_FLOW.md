# Video Interview - OpenAI API Key Flow

## Quick Answer

**Video Interview Evaluation gets OpenAI API key from `.env.local` file**

```
.env.local
    ↓
OPENAI_API_KEY=sk-proj-xxxxx
    ↓
Interview Evaluation Endpoint reads it
    ↓
Calls OpenAI GPT-4o
    ↓
Returns evaluation score
```

---

## Complete Video Interview Flow

### Step 1: Candidate Completes Video Interview
```
Candidate takes video interview
    ↓
Questions asked by AI
    ↓
Answers recorded
    ↓
Transcript generated
```

### Step 2: Interview Marked as Completed
**Endpoint**: `POST /api/applications/{applicationId}/interview-status`

**File**: `app/api/applications/[applicationId]/interview-status/route.ts` (Lines 71-236)

```typescript
// Interview completion data
{
  transcript: "Interview transcript text...",
  startedAt: "2025-01-13T10:00:00Z"
}
```

**What Happens**:
```
1. Find or create interview record
2. Update interview status to 'success'
3. Store transcript in database
4. Record video interview usage for billing
```

### Step 3: Video Interview Evaluation Triggered
**Endpoint**: `POST /api/applications/{applicationId}/evaluate`

**File**: `app/api/applications/[applicationId]/evaluate/route.ts` (Lines 7-683)

```typescript
// Evaluation request
{
  transcript: "Interview transcript text..."
}
```

### Step 4: API Key Resolution (Priority Order)
**Location**: Lines 203-204

```typescript
// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
  // Use mock evaluation
} else {
  // Call real OpenAI API
}
```

**Priority Order**:
```
1️⃣ OPENAI_API_KEY (from .env.local)
   └─ process.env.OPENAI_API_KEY
   
2️⃣ No Key Found
   └─ Use mock evaluation (random score)
```

### Step 5: Call OpenAI API
**Location**: Lines 393-415

```typescript
console.log('🤖 Calling OpenAI API for evaluation...')
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert HR evaluator. Analyze interview transcripts...'
      },
      {
        role: 'user',
        content: evaluationPrompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  })
})
```

### Step 6: Store Evaluation Result
**Location**: Lines 516-668

```typescript
// Store evaluation in database
INSERT INTO evaluations (
  interview_id,
  overall_score,
  skill_scores,
  recommendation,
  rubric_notes_md,
  status,
  created_at
) VALUES (...)

// Also store in interviews.metadata
UPDATE interviews SET
  metadata = jsonb_set(metadata, '{evaluation}', {...})
```

---

## Key Differences: CV vs Interview Evaluation

### CV Evaluation
```
API Key Priority:
  1. Company service account key (from database)
  2. OPENAI_API_KEY (from .env.local)
  3. OPENAI_EVAL_KEY (from .env.local)
  4. Mock data
```

### Interview Evaluation
```
API Key Priority:
  1. OPENAI_API_KEY (from .env.local)
  2. Mock data
  
⚠️ NO company service account key check
⚠️ NO fallback to OPENAI_EVAL_KEY
```

---

## Complete Video Interview Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ 1. Candidate Takes Video Interview              │
│    - AI asks questions                          │
│    - Candidate answers                          │
│    - Video recorded                             │
│    - Transcript generated                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 2. Interview Marked as Completed                │
│    POST /api/applications/{id}/interview-status │
│    - Send transcript                            │
│    - Update interview status                    │
│    - Record video interview usage               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 3. Evaluate Interview                           │
│    POST /api/applications/{id}/evaluate         │
│    - Send transcript                            │
│    - Get job details                            │
│    - Get evaluation criteria                    │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ 4. Resolve OpenAI API Key                       │
│                                                 │
│ Check: process.env.OPENAI_API_KEY              │
│   ✅ Found → Use real OpenAI                    │
│   ❌ Not found → Use mock data                  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    Key Found            No Key Found
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Call OpenAI API  │  │ Use Mock Data     │
│ GPT-4o           │  │ Random score     │
│ Real evaluation  │  │ (30-70%)         │
│                  │  │ Fallback result  │
│ POST to:         │  │                  │
│ api.openai.com   │  │ No API call      │
│ /v1/chat/        │  │ Instant response │
│ completions      │  │                  │
└──────────┬───────┘  └──────────┬───────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │ Get Evaluation Result           │
        │ - Score (0-100)                 │
        │ - 4 categories with weights     │
        │ - Strengths/improvements       │
        │ - Recommendation (Hire/No Hire) │
        └──────────────┬──────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────┐
        │ Store Evaluation in Database    │
        │ - evaluations table             │
        │ - interviews.metadata           │
        │ - Update application status     │
        └──────────────┬──────────────────┘
                       │
                       ▼
        ┌─────────────────────────────────┐
        │ Return Result to Frontend       │
        │ - Display score                 │
        │ - Show feedback                 │
        │ - Update status                 │
        │ - Appear in "Successful Hire"   │
        │   tab if score >= 65%           │
        └─────────────────────────────────┘
```

---

## Code Locations

### Interview Evaluation Endpoint
**File**: `app/api/applications/[applicationId]/evaluate/route.ts`

| Line Range | What It Does |
|-----------|-------------|
| 1-6 | Imports and setup |
| 7-31 | Get application ID and transcript |
| 33-50 | Fetch application and job details |
| 52-78 | Get evaluation criteria from job rounds |
| 80-201 | Build evaluation prompt with 4 categories |
| 203-204 | **Check if API key exists** |
| 207-391 | **If NO key: Use mock evaluation** |
| 393-415 | **If YES key: Call OpenAI API** |
| 417-430 | Check API response |
| 432-514 | Parse evaluation JSON |
| 516-668 | Store evaluation in database |
| 673-677 | Return result to frontend |

### Interview Status Endpoint (Marks Interview Complete)
**File**: `app/api/applications/[applicationId]/interview-status/route.ts`

| Line Range | What It Does |
|-----------|-------------|
| 71-236 | Mark interview as completed |
| 240-335 | Record video interview usage for billing |

---

## API Key Check

### Location: Line 203-204
```typescript
// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
  // Use mock evaluation (lines 207-391)
} else {
  // Call real OpenAI API (lines 393-415)
}
```

### If API Key NOT Found (Lines 207-391)
```typescript
const mockEvaluation = {
  question_analysis: {
    "Technical Skills": {
      questions: [
        {
          question: "Can you explain your experience with React and state management?",
          candidate_response: "Discussed Redux and Context API usage in previous projects",
          score: 8,
          max_score: 10,
          feedback: "Good understanding of state management concepts..."
        }
      ],
      category_score: 15,
      category_max: 20,
      weight: 0.40
    },
    // ... other categories
  },
  overall_score: 77,
  recommendation: 'Hire',
  // ... more fields
}
```

### If API Key FOUND (Lines 393-415)
```typescript
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert HR evaluator...'
      },
      {
        role: 'user',
        content: evaluationPrompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  })
})
```

---

## Evaluation Categories & Weights

```
Technical Skills:    40% weight (max 5 questions)
Communication:       20% weight (max 3 questions)
Problem Solving:     25% weight (max 4 questions)
Cultural Fit:        15% weight (max 2 questions)
─────────────────────────────────────────────────
Total:              100%
```

### Scoring Example
```
Technical Skills:
  Q1: 8/10
  Q2: 7/10
  Category: 15/20 = 75%
  Weighted: 75% × 40% = 30 points

Communication:
  Q1: 8/10
  Category: 8/10 = 80%
  Weighted: 80% × 20% = 16 points

Problem Solving:
  Q1: 7/10
  Q2: 8/10
  Q3: 6/10
  Category: 21/30 = 70%
  Weighted: 70% × 25% = 17.5 points

Cultural Fit:
  Q1: 9/10
  Q2: 8/10
  Category: 17/20 = 85%
  Weighted: 85% × 15% = 12.75 points

─────────────────────────────────────────────────
TOTAL: 30 + 16 + 17.5 + 12.75 = 76.25/100
STATUS: PASS (>= 65%)
```

---

## Console Output

### With API Key (Real Evaluation)
```
🔍 EVALUATION API CALLED
📝 Application ID: {id}
📝 Transcript length: 5000
📝 Transcript preview: "Interviewer: Tell me about..."
🔍 Starting evaluation for application: {id}
📊 Evaluation criteria: ['React', 'Node.js', 'Problem Solving']
🤖 Calling OpenAI API for evaluation...
✅ Received evaluation from OpenAI
✅ Evaluation stored in evaluations table: {id}
📊 Candidate result: Pass (Score: 76.25/100)
🎉 Candidate PASSED - will appear in Successful Hire tab!
✅ Evaluation completed and stored for application: {id}
```

### Without API Key (Mock Evaluation)
```
🔍 EVALUATION API CALLED
📝 Application ID: {id}
📝 Transcript length: 5000
⚠️ OPENAI_API_KEY not configured, using mock evaluation
✅ Mock evaluation stored in evaluations table: {id}
📊 Mock candidate result: Pass (Score: 77/100)
🎉 Mock candidate PASSED - will appear in Successful Hire tab!
```

---

## Pass/Fail Determination

```typescript
// Line 554
const status = (evaluation.overall_score || 0) >= 65 ? 'Pass' : 'Fail'

// If Pass (>= 65%):
//   - Appears in "Successful Hire" tab
//   - Recommendation: 'Hire'
//   - Status: 'Pass'

// If Fail (< 65%):
//   - Does NOT appear in "Successful Hire" tab
//   - Recommendation: 'No Hire' or 'Maybe'
//   - Status: 'Fail'
```

---

## Database Storage

### evaluations Table
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

### interviews Table (metadata)
```sql
UPDATE interviews SET
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{evaluation}',
    {evaluation_data},
    true
  )
WHERE id = {interviewId}
```

---

## Troubleshooting

### Problem: "OPENAI_API_KEY not configured, using mock evaluation"
```
Solution:
1. Add OPENAI_API_KEY to .env.local
2. Restart npm run dev
3. Verify key starts with sk-proj-
```

### Problem: Getting Mock Scores Instead of Real Evaluation
```
Solution:
1. Check if OPENAI_API_KEY is set in .env.local
2. Verify API key is valid
3. Check OpenAI account has credits
4. Check server logs for API errors
```

### Problem: Interview Evaluation Not Storing
```
Solution:
1. Check if interview record exists
2. Check if application_rounds table has data
3. Check if database connection is working
4. Check server logs for errors
```

---

## Summary

### ✅ Video Interview API Key Flow
1. **Source**: `.env.local` file (`OPENAI_API_KEY`)
2. **Check**: Line 203-204 in evaluate endpoint
3. **If Found**: Call OpenAI GPT-4o API (lines 393-415)
4. **If Not Found**: Use mock evaluation (lines 207-391)
5. **Store**: In `evaluations` and `interviews.metadata` tables

### ✅ Key Points
- API key from `.env.local` (NOT database)
- Only checks `OPENAI_API_KEY` (no fallback to `OPENAI_EVAL_KEY`)
- No company service account key check (unlike CV evaluation)
- Fallback to mock data if no key
- Evaluates 4 categories with weights
- Pass if score >= 65%
- Appears in "Successful Hire" tab if passed

### ✅ Difference from CV Evaluation
| Aspect | CV Evaluation | Interview Evaluation |
|--------|---------------|---------------------|
| **API Key Source** | Database or .env | Only .env |
| **Fallback Keys** | OPENAI_EVAL_KEY | None |
| **Company Key** | Yes | No |
| **Mock Fallback** | Yes | Yes |
| **Categories** | Overall | 4 weighted |
| **Pass Threshold** | >= 40% | >= 65% |
