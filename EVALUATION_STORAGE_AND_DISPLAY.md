# EVALUATION STORAGE & REPORT DISPLAY - COMPLETE FLOW

## 1. WHERE EVALUATIONS ARE STORED

### Primary Storage: `evaluations` Table
**Location:** Database table `evaluations`
**Fields:**
- `interview_id` (links to interviews table)
- `overall_score` (decimal: 0-100)
- `skill_scores` (JSONB: {technical: 90, communication: 85, etc.})
- `recommendation` (rec_outcome enum: 'next_round', 'unqualified', 'on_hold')
- `rubric_notes_md` (text: formatted markdown with strengths, weaknesses, scores)
- `status` ('Pass' if overall_score >= 65, 'Fail' otherwise)
- `created_at` (timestamp)

### Secondary Storage: `interviews.metadata`
**Location:** `interviews` table → `metadata` column (JSONB)
**Path:** `interviews.metadata.evaluation`
**Contains:** Full evaluation object with:
- `overall_score`
- `questions[]` (real-time evaluation details)
- `scores`, `strengths`, `weaknesses`
- `criteria_breakdown` (detailed per-criterion analysis)
- `scoring_explanation`

### Real-Time Evaluations Storage
**Location:** Memory during interview (`realTimeEvaluationsRef.current`)
**Structure:** Array of evaluation objects:
```javascript
[
  {
    question_number: 1,
    question_text: "How do your skills...",
    full_answer: "I have four years...",
    criterion: "Technical Skills",
    score: 90, // FROM OPENAI
    completeness: "complete",
    reasoning: "The candidate provided...",
    source: "openai-realtime"
  }
]
```

---

## 2. HOW EVALUATION PAGE SHOWS THE REPORT

### Report Page URL
```
/dashboard/analytics/{jdId}/applications/{applicationId}/report
```

### Data Fetch Flow

#### Step 1: Fetch from `/api/candidates/{applicationId}/report?jobId={jdId}`
**File:** `app/api/candidates/[candidateId]/report/route.ts`

#### Step 2: Data Sources (Priority Order)

**PRIMARY SOURCE:** `interviews.metadata->evaluation` (Line 186-282)
```sql
SELECT (i.metadata -> 'evaluation') AS evaluation_json
FROM interviews i
JOIN application_rounds ar ON ar.id = i.application_round_id
WHERE ar.application_id = $1::uuid
ORDER BY i.completed_at DESC
LIMIT 1
```

**FALLBACK 1:** `applications.evaluation` (Line 284-340)
```sql
-- From row.evaluation (applications table)
```

**FALLBACK 2:** `evaluations` table (Line 342-389)
```sql
SELECT e.overall_score, e.skill_scores, e.recommendation, e.rubric_notes_md
FROM evaluations e
JOIN interviews i ON e.interview_id = i.id
JOIN application_rounds ar ON ar.id = i.application_round_id
WHERE ar.application_id = $1::uuid
ORDER BY e.created_at DESC
LIMIT 1
```

#### Step 3: Data Processing
- Parse JSON evaluation data
- Extract scores, strengths, weaknesses
- Build `criteriaBreakdown` from real-time evaluations
- Calculate section pointers (technical, communication, etc.)
- Format for UI display

### Report Page Display
**File:** `app/dashboard/analytics/[jdId]/applications/[candidateId]/report/page.tsx`

#### Tab: "Evaluation"
- Shows overall score: `{overallScore}/100`
- Displays strengths and weaknesses
- Shows detailed criteria breakdown (if available)
- **Displays real-time evaluation details:**
  - Full candidate answers (not truncated)
  - AI scores per question (90/100, 70/100)
  - AI reasoning for each score
  - Criterion badges (Technical Skills, Team Player)
  - Completeness badges (Complete, Partial, etc.)
  - "AI ✓" indicator for real-time evaluated questions

#### Score Display Logic (Line 423-470)
```javascript
// Prefer evaluation score; fall back to DB score only if evaluation missing
const overallScore = ((evaluation?.overallScore ?? null) !== null)
  ? (evaluation!.overallScore as number)
  : (typeof dbScore === 'number' ? dbScore : null)
```

#### Real-Time Evaluation Display (Lines 1785-1901)
```jsx
{evaluation?.questions?.map((question, index) => (
  <div key={index} className="border-b pb-6 mb-6">
    <div className="flex items-center gap-2 mb-3">
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
        {question.criteria || question.category || 'General'}
      </Badge>
      <Badge variant="secondary" className="bg-green-50 text-green-600">
        AI ✓ Real-time Evaluated
      </Badge>
      <Badge variant="outline" className={
        question.completeness === 'complete' ? 'bg-green-50 text-green-700' :
        question.completeness === 'partial' ? 'bg-yellow-50 text-yellow-700' :
        'bg-red-50 text-red-700'
      }>
        {question.completeness || 'pending'}
      </Badge>
    </div>

    <h4 className="font-medium text-gray-900 mb-2">
      Question {question.question_number}: {question.question_text}
    </h4>

    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <p className="text-gray-800 whitespace-pre-wrap">
        {question.candidate_response || question.full_answer}
      </p>
    </div>

    <div className="flex items-center gap-3 mb-2">
      <div className="flex items-center gap-1">
        <span className="text-2xl font-bold text-purple-600">
          {question.score}/100
        </span>
        <span className="text-sm text-gray-500">({getScoreLabel(question.score)})</span>
      </div>
    </div>

    <div className="text-sm text-gray-600">
      <strong>AI Reasoning:</strong> {question.evaluation_reasoning || question.reasoning}
    </div>
  </div>
))}
```

---

## 3. COMPLETE FLOW SUMMARY

### Interview → Storage → Display

```
1. INTERVIEW PHASE:
   ├─ Candidate answers → evaluateAnswer() → OpenAI API
   └─ Real-time evaluations stored in memory (realTimeEvaluationsRef)

2. END INTERVIEW:
   ├─ Call /api/applications/{id}/evaluate
   ├─ Send realTimeEvaluations + transcript
   └─ OpenAI processes full transcript + real-time data

3. EVALUATION STORAGE:
   ├─ PRIMARY: evaluations table (overall_score, skill_scores, etc.)
   └─ SECONDARY: interviews.metadata (full evaluation JSON)

4. REPORT DISPLAY:
   ├─ Page loads → /api/candidates/{id}/report
   ├─ API fetches from evaluations + interviews.metadata
   └─ Page displays: full answers, AI scores, reasoning, badges
```

### Key Points:
- **Real-time scores** (90, 70) come from OpenAI during interview
- **Final evaluation** stored in database tables
- **Report page** fetches from database and displays everything
- **No truncation** - full candidate answers shown
- **Detailed reasoning** from AI for each score

---

## Database Schema

### evaluations table:
```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY,
  interview_id UUID REFERENCES interviews(id),
  overall_score DECIMAL,
  skill_scores JSONB,
  recommendation rec_outcome,
  rubric_notes_md TEXT,
  status VARCHAR(10), -- 'Pass' or 'Fail'
  created_at TIMESTAMP
);
```

### interviews table:
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY,
  metadata JSONB -- contains full evaluation object
);
```

**Result:** Complete evaluation system with real-time AI scoring, full storage, and comprehensive reporting.
