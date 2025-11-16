# OpenAI API Key - CV vs Interview Evaluation Comparison

## Quick Comparison

| Aspect | CV Evaluation | Interview Evaluation |
|--------|---------------|---------------------|
| **Endpoint** | `/api/applications/evaluate-cv` | `/api/applications/{id}/evaluate` |
| **Trigger** | After resume upload | After video interview |
| **What It Evaluates** | Resume vs Job Description | Interview transcript |
| **API Key Source** | Database or .env | Only .env |
| **Fallback Keys** | OPENAI_EVAL_KEY | None |
| **Company Key Check** | ✅ Yes | ❌ No |
| **Mock Fallback** | ✅ Yes | ✅ Yes |
| **Categories** | Overall score | 4 weighted categories |
| **Pass Threshold** | >= 40% | >= 65% |
| **File Location** | `app/api/applications/evaluate-cv/route.ts` | `app/api/applications/[applicationId]/evaluate/route.ts` |

---

## CV Evaluation - API Key Priority

```
Priority Order:
  1️⃣ Company service account key (from database)
     └─ SELECT openai_service_account_key FROM companies
     
  2️⃣ OPENAI_API_KEY (from .env.local)
     └─ process.env.OPENAI_API_KEY
     
  3️⃣ OPENAI_EVAL_KEY (from .env.local)
     └─ process.env.OPENAI_EVAL_KEY
     
  4️⃣ No Key Found
     └─ Use mock evaluation
```

**File**: `app/api/applications/evaluate-cv/route.ts` (Lines 26-58)

```typescript
// Priority 1: Check database for company key
if (companyId) {
  const companyData = await DatabaseService.query(
    `SELECT openai_service_account_key FROM companies WHERE id = $1`,
    [companyId]
  )
  if (companyData[0]?.openai_service_account_key) {
    openaiApiKey = JSON.parse(companyData[0].openai_service_account_key).value
    console.log('Using company service account key')
  }
}

// Priority 2: Fall back to environment variables
if (!openaiApiKey) {
  openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
  console.log('Using environment OPENAI_API_KEY')
}
```

---

## Interview Evaluation - API Key Priority

```
Priority Order:
  1️⃣ OPENAI_API_KEY (from .env.local)
     └─ process.env.OPENAI_API_KEY
     
  2️⃣ No Key Found
     └─ Use mock evaluation
```

**File**: `app/api/applications/[applicationId]/evaluate/route.ts` (Lines 203-204)

```typescript
// Check if OpenAI API key is configured
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
  // Use mock evaluation
} else {
  // Call real OpenAI API
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    // ... rest of request
  })
}
```

---

## Key Differences

### 1. API Key Source

**CV Evaluation**:
- ✅ Checks database first (company service account key)
- ✅ Falls back to environment variables
- ✅ Has multiple fallback options

**Interview Evaluation**:
- ❌ Does NOT check database
- ❌ Only checks environment variables
- ❌ No fallback to OPENAI_EVAL_KEY

### 2. Database Check

**CV Evaluation** (Lines 26-48):
```typescript
// Fetch company's OpenAI service account key if companyId provided
let openaiApiKey: string | undefined = undefined
if (companyId) {
  try {
    const companyData = await DatabaseService.query(
      `SELECT openai_service_account_key FROM companies WHERE id = $1::uuid LIMIT 1`,
      [companyId]
    ) as any[]
    
    if (companyData && companyData.length > 0 && companyData[0].openai_service_account_key) {
      try {
        const keyObj = JSON.parse(companyData[0].openai_service_account_key)
        openaiApiKey = keyObj.value
        console.log('[CV Evaluator] Using company service account key for evaluation')
      } catch (parseErr) {
        console.warn('[CV Evaluator] Failed to parse company service account key:', parseErr)
      }
    }
  } catch (fetchErr) {
    console.warn('[CV Evaluator] Failed to fetch company service account key:', fetchErr)
  }
}
```

**Interview Evaluation**:
```typescript
// NO database check - goes straight to environment variable
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
}
```

### 3. Fallback Keys

**CV Evaluation**:
```typescript
// Fallback to environment variable if no company key
if (!openaiApiKey) {
  openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
  if (openaiApiKey) {
    console.log('[CV Evaluator] Using environment OPENAI_API_KEY for evaluation')
  }
}
```

**Interview Evaluation**:
```typescript
// Only checks OPENAI_API_KEY - no OPENAI_EVAL_KEY fallback
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
}
```

---

## Evaluation Comparison

### CV Evaluation
```
Input:
  - Resume text
  - Job description
  - Pass threshold (default: 40%)

Output:
  - Score: 0-100
  - Qualified: true/false
  - Breakdown:
    - Role/Title alignment (15%)
    - Hard skills (35%)
    - Experience depth (20%)
    - Domain relevance (10%)
    - Education/certs (10%)
    - Nice-to-have skills (5%)
    - Communication/red flags (5%)

Pass Threshold: >= 40%
```

### Interview Evaluation
```
Input:
  - Interview transcript
  - Job title
  - Company name
  - Candidate name
  - Evaluation criteria

Output:
  - Score: 0-100
  - Recommendation: Hire/No Hire/Maybe
  - Breakdown by 4 categories:
    - Technical Skills (40%)
    - Communication (20%)
    - Problem Solving (25%)
    - Cultural Fit (15%)
  - Question-wise scores
  - Strengths & areas for improvement

Pass Threshold: >= 65%
```

---

## Flow Comparison

### CV Evaluation Flow
```
Resume Uploaded
    ↓
POST /api/applications/evaluate-cv
    ↓
Resolve API Key:
  1. Check database (company key)
  2. Check OPENAI_API_KEY
  3. Check OPENAI_EVAL_KEY
  4. Use mock data
    ↓
Call OpenAI or Use Mock
    ↓
Store in applications table
    ↓
Return score
```

### Interview Evaluation Flow
```
Video Interview Completed
    ↓
POST /api/applications/{id}/interview-status
    ↓
Mark interview complete
Record video usage
    ↓
POST /api/applications/{id}/evaluate
    ↓
Resolve API Key:
  1. Check OPENAI_API_KEY
  2. Use mock data
    ↓
Call OpenAI or Use Mock
    ↓
Store in evaluations table
    ↓
Return score
```

---

## Console Output Comparison

### CV Evaluation - With API Key
```
[CV Evaluator] Starting evaluation for application: {id}
[CV Evaluator] Resume length: 5000 JD length: 2000
[CV Evaluator] Using environment OPENAI_API_KEY for evaluation
[CV Evaluator] Evaluation complete: score=85, qualified=true
✅ [CV EVALUATOR] Real AI evaluation completed successfully
[CV Evaluator] Saved evaluation to database
[CV Evaluator] Application status set to cv_qualified
```

### CV Evaluation - Without API Key
```
[CV Evaluator] Starting evaluation for application: {id}
🔐 [CV EVALUATOR] No OpenAI API key configured (no company key, no env key)
⚠️ [CV EVALUATOR] Using fallback evaluation due to OpenAI API key permissions
📝 [CV EVALUATOR] Current evaluation is simulated data
```

### Interview Evaluation - With API Key
```
🔍 EVALUATION API CALLED
📝 Application ID: {id}
📝 Transcript length: 5000
🔍 Starting evaluation for application: {id}
📊 Evaluation criteria: ['React', 'Node.js', 'Problem Solving']
🤖 Calling OpenAI API for evaluation...
✅ Received evaluation from OpenAI
✅ Evaluation stored in evaluations table: {id}
📊 Candidate result: Pass (Score: 76.25/100)
🎉 Candidate PASSED - will appear in Successful Hire tab!
```

### Interview Evaluation - Without API Key
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

## Why the Difference?

### CV Evaluation Complexity
- Needs to support **multi-tenant** scenarios
- Different companies might have different OpenAI keys
- Checks database first for company-specific keys
- Falls back to environment variables

### Interview Evaluation Simplicity
- Simpler flow - just evaluates transcript
- Uses standard environment variable
- No company-specific key logic
- Straightforward: key exists or use mock

---

## Setup Checklist

### For CV Evaluation to Work
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] OR add `OPENAI_EVAL_KEY` to `.env.local`
- [ ] OR add `openai_service_account_key` to companies table (database)

### For Interview Evaluation to Work
- [ ] Add `OPENAI_API_KEY` to `.env.local`
- [ ] That's it! (No other options)

---

## Summary

### ✅ CV Evaluation
- **Source**: Database (company key) → .env (OPENAI_API_KEY) → .env (OPENAI_EVAL_KEY) → Mock
- **Complexity**: High (multi-tenant support)
- **Flexibility**: High (multiple key sources)
- **File**: `app/api/applications/evaluate-cv/route.ts`

### ✅ Interview Evaluation
- **Source**: .env (OPENAI_API_KEY) → Mock
- **Complexity**: Low (simple check)
- **Flexibility**: Low (only one key source)
- **File**: `app/api/applications/[applicationId]/evaluate/route.ts`

### ✅ Both Use Mock Fallback
- If no API key found, both use mock evaluation
- Mock data: Random scores (30-70%)
- System still works but with fake data
- Useful for testing without API key
