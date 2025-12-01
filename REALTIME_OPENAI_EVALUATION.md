# Real-time OpenAI Evaluation for Interview Answers

## Overview

This implementation provides real-time OpenAI evaluation for each candidate answer during interviews. The system uses the company's service account key from the database (NO mock or fallback scores).

## Key Features

✅ **Real-time evaluation** - Each answer is evaluated immediately using OpenAI  
✅ **Company service key** - Uses per-company OpenAI credentials from database  
✅ **No mock scores** - Returns error if OpenAI credentials are missing  
✅ **Full answer storage** - Stores complete candidate answers (not truncated)  
✅ **Criterion mapping** - Maps each question to correct criterion from job configuration  
✅ **Detailed scoring** - Score, reasoning, completeness, and strengths/gaps  

## Flow

```
1. Candidate answers a question during interview
           ↓
2. Interview page calls /api/interview/evaluate-answer
           ↓
3. API fetches company's OpenAI service key from database
           ↓
4. If no key → Returns error (NO fallback to mock)
           ↓
5. Calls OpenAI with full answer + question + criterion
           ↓
6. OpenAI returns: score, matches_question, completeness, reasoning
           ↓
7. Evaluation stored in realTimeEvaluations state
           ↓
8. When interview ends → All evaluations sent to /api/applications/evaluate
           ↓
9. Final evaluation uses real-time scores (no batch re-evaluation needed)
           ↓
10. Report page shows: full answer, AI score, reasoning, criterion badge
```

## Files Modified

### New File
- `app/api/interview/evaluate-answer/route.ts` - Real-time evaluation endpoint

### Updated Files
- `app/interview/[applicationId]/page.tsx` - Added `evaluateAnswer()` function, stores evaluations
- `app/api/applications/[applicationId]/evaluate/route.ts` - Uses real-time evaluations when available
- `app/dashboard/analytics/[jdId]/applications/[candidateId]/report/page.tsx` - Added real-time indicators

## API: `/api/interview/evaluate-answer`

### Request
```json
{
  "question": "Tell me about your experience with React...",
  "answer": "I have been working with React for 5 years...",
  "criterion": "Technical",
  "questionNumber": 1,
  "totalQuestions": 10,
  "jobTitle": "Senior React Developer",
  "companyName": "HDFC",
  "companyId": "uuid-here",
  "applicationId": "uuid-here"
}
```

### Response (Success)
```json
{
  "ok": true,
  "evaluation": {
    "question_number": 1,
    "question_text": "Tell me about...",
    "full_answer": "I have been working...",
    "criterion": "Technical",
    "score": 85,
    "matches_question": true,
    "completeness": "complete",
    "reasoning": "The candidate demonstrated...",
    "criterion_match": {
      "assigned_criterion": "Technical",
      "matches_criterion": true,
      "criterion_reasoning": "Question asks about..."
    },
    "answer_analysis": {
      "key_points_covered": ["React experience", "Hooks"],
      "missing_elements": ["Testing approach"],
      "strengths": ["Clear explanation"],
      "weaknesses": ["Could be more specific"]
    },
    "recommendation": "proceed",
    "evaluated_at": "2025-01-15T10:30:00Z",
    "source": "openai-realtime"
  }
}
```

### Response (Error - No Credentials)
```json
{
  "ok": false,
  "error": "OpenAI credentials not configured",
  "message": "Please connect OpenAI in Settings → Billing to enable real-time evaluation"
}
```

## Report Page Display

Each question shows:
- **Question text** with number
- **Criterion badge** (Technical, Communication, etc.)
- **Completeness badge** (✓ Complete, ◐ Partial, ○ Incomplete, ✗ Off Topic)
- **AI ✓ badge** - Indicates real-time OpenAI evaluation
- **Score** with progress bar (0-100)
- **Full candidate answer** in bordered box
- **AI reasoning** - Why this score was given
- **Strengths** - What was good in the answer
- **Gaps** - What was missing or could be improved

## Scoring Guidelines

| Score Range | Label | Description |
|-------------|-------|-------------|
| 90-100 | Exceptional | Comprehensive, detailed, with specific examples |
| 75-89 | Good | Covers main points well, may lack some depth |
| 60-74 | Adequate | Addresses question but lacks detail |
| 40-59 | Partial | Some relevant content, significant gaps |
| 20-39 | Weak | Minimal relevant content, mostly off-topic |
| 0-19 | Inadequate | Does not address question, refused to answer |

## Error Handling

- **No companyId**: Returns 400 error
- **Company not found**: Returns 404 error
- **No OpenAI credentials**: Returns 400 error with setup instructions
- **Failed to decrypt key**: Returns 500 error
- **OpenAI API error**: Returns 500 error with details

## Console Logs

During interview:
```
🎯 [REAL-TIME EVAL] Sending answer for OpenAI evaluation...
📝 Question: Tell me about your experience...
💬 Answer length: 450
🎯 Criterion: Technical
✅ [REAL-TIME EVAL] Evaluation received:
📊 Score: 85
📋 Completeness: complete
🎯 Matches Question: true
```

During final evaluation:
```
📊 Real-time evaluations received: 8
✅ [INTERVIEW EVAL] Using real-time OpenAI evaluations (no mock scores)
📊 [INTERVIEW EVAL] Processing 8 real-time evaluations
✅ [INTERVIEW EVAL] Real-time evaluation stored successfully
📊 [INTERVIEW EVAL] Score: 72/100 - Pass
```

## Testing

1. Start an interview with a company that has OpenAI credentials configured
2. Answer a question with at least 10 characters
3. Check console for `[REAL-TIME EVAL]` logs
4. End interview and check report page
5. Verify each question shows:
   - AI ✓ badge
   - Completeness indicator
   - Full answer
   - AI reasoning
   - Score with progress bar

## Benefits

✅ **Accurate scoring** - Based on actual answer content
✅ **Transparent** - AI explains why score was given
✅ **Real-time** - No waiting until end of interview
✅ **No mock scores** - Everything comes from real OpenAI evaluation
✅ **Full context** - Stores complete answers for review
✅ **Per-company billing** - Uses company's OpenAI credentials
