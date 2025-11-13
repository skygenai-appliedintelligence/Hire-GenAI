# OpenAI API Key Flow - Complete Explanation

## Quick Answer
**OpenAI API key comes from `.env.local` file** - NOT from database. The system reads it from environment variables.

---

## Where Does OpenAI API Key Come From?

### ✅ Primary Source: `.env.local` File
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### ✅ Fallback Source: `OPENAI_EVAL_KEY` Environment Variable
```
OPENAI_EVAL_KEY=sk-proj-xxxxxxxxxxxxx
```

### ✅ Alternative: Company Service Account Key (From Database)
For multi-tenant setup, can fetch from database:
```
SELECT openai_service_account_key FROM companies WHERE id = {company_id}
```

---

## Complete Flow: How API Key is Used

### Step 1: Application Submitted
```
Candidate applies for job
  ↓
POST /api/applications/submit
  ↓
Application stored in database
```

### Step 2: Resume Parsed
```
Resume uploaded
  ↓
POST /api/resumes/parse
  ↓
Extract text from PDF/DOC
  ↓
Save to applications.resume_text
```

### Step 3: CV Evaluation Triggered
```
POST /api/applications/evaluate-cv
  ↓
Endpoint receives:
  - applicationId
  - resumeText
  - jobDescription
  - companyId (optional)
```

### Step 4: API Key Resolution (Priority Order)
**File**: `app/api/applications/evaluate-cv/route.ts` (Lines 26-58)

```typescript
// Priority 1: Check if company has service account key
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

// Priority 3: No key found
if (!openaiApiKey) {
  console.log('No OpenAI API key configured')
}
```

### Step 5: Call OpenAI API
**File**: `lib/cv-evaluator.ts` (Lines 197-225)

```typescript
// Get API key from parameter or environment
const apiKey = openaiClient?.apiKey || 
               process.env.OPENAI_API_KEY || 
               process.env.OPENAI_EVAL_KEY

if (!apiKey) {
  throw new Error('No OpenAI API key configured')
}

// Temporarily set in environment for this call
const originalKey = process.env.OPENAI_API_KEY
process.env.OPENAI_API_KEY = apiKey

try {
  // Call OpenAI GPT-4o
  const response = await generateText({
    model: openai("gpt-4o"),
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.1,
  })
  text = response.text
} finally {
  // Restore original key
  process.env.OPENAI_API_KEY = originalKey
}
```

### Step 6: Store Evaluation Result
```
OpenAI returns evaluation
  ↓
Parse JSON response
  ↓
Update applications table with score
  ↓
Return to frontend
```

---

## API Key Priority Order

### For CV Evaluation
```
1. Company service account key (from database)
   ↓ (if not found)
2. OPENAI_API_KEY (from .env.local)
   ↓ (if not found)
3. OPENAI_EVAL_KEY (from .env.local)
   ↓ (if not found)
4. ERROR: No API key configured
```

### For Interview Evaluation
```
1. OPENAI_API_KEY (from .env.local)
   ↓ (if not found)
2. ERROR: No API key configured
```

---

## .env.local Configuration

### Required Variables
```bash
# Primary OpenAI API key
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Optional: Separate evaluation key
OPENAI_EVAL_KEY=sk-proj-yyyyyyyyyyyyy

# Optional: Admin key for usage tracking
OPENAI_ADMIN_KEY=sk-admin-zzzzzzzzzzz
```

### How to Get API Key
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy the key (starts with `sk-proj-` or `sk-`)
4. Add to `.env.local`

### Required Permissions
- `api.responses.write` - For CV and interview evaluation
- `api.usage.read` - For usage tracking (optional)

---

## Database vs Environment Variables

### ❌ NOT Stored in Database
- OpenAI API key is **NOT** stored in `company_billing` table
- OpenAI API key is **NOT** stored in `companies` table
- OpenAI API key is **NOT** stored in any billing table

### ✅ Stored in Environment Variables
- `.env.local` file (development)
- Environment variables (production)
- System environment (Docker, Kubernetes, etc.)

### ✅ Optional: Company Service Account Key (Database)
For multi-tenant setup, can optionally store per-company key:
```sql
SELECT openai_service_account_key FROM companies WHERE id = {company_id}
```

This is stored as JSON:
```json
{
  "value": "sk-proj-xxxxxxxxxxxxx",
  "provider": "openai",
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

## Code Locations

### Where API Key is Read

#### 1. CV Evaluator (`lib/cv-evaluator.ts`)
```typescript
// Line 199
const apiKey = openaiClient?.apiKey || 
               process.env.OPENAI_API_KEY || 
               process.env.OPENAI_EVAL_KEY
```

#### 2. CV Evaluation Endpoint (`app/api/applications/evaluate-cv/route.ts`)
```typescript
// Lines 26-58
// Check company service account key first
// Then fall back to environment variables
```

#### 3. Interview Evaluation Endpoint (`app/api/applications/[applicationId]/evaluate/route.ts`)
```typescript
// Line 204
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not configured, using mock evaluation')
}
```

#### 4. Config File (`lib/config.ts`)
```typescript
// Line 6
openai: {
  apiKey: process.env.OPENAI_API_KEY || '',
  hasKey: !!(process.env.OPENAI_API_KEY),
}
```

#### 5. Environment File (`lib/env.ts`)
```typescript
// Line 2
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Candidate applies for job                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Resume uploaded & parsed                                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ CV Evaluation Triggered                                     │
│ POST /api/applications/evaluate-cv                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Resolve OpenAI API Key                                      │
│                                                             │
│ Priority 1: Check database for company key                 │
│   SELECT openai_service_account_key FROM companies         │
│                                                             │
│ Priority 2: Check environment variables                    │
│   process.env.OPENAI_API_KEY                               │
│   process.env.OPENAI_EVAL_KEY                              │
│                                                             │
│ Priority 3: No key found → Use mock evaluation             │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    Key Found            No Key Found
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Call OpenAI API  │  │ Use Mock Data     │
│ GPT-4o           │  │ Random score     │
│ Real evaluation  │  │ Fallback result  │
└──────────┬───────┘  └──────────┬───────┘
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
        ┌─────────────────────────────────┐
        │ Store Evaluation Result         │
        │ UPDATE applications SET         │
        │   qualification_score = {score} │
        └─────────────────────────────────┘
```

---

## What Happens Without API Key?

### ❌ No API Key Configured
```
OpenAI API key not found
  ↓
System uses MOCK EVALUATION
  ↓
Returns random score (30-70%)
  ↓
Logs warning: "Mock evaluation - OpenAI API unavailable"
  ↓
Evaluation still works but with fake data
```

### ✅ With API Key
```
OpenAI API key found
  ↓
Calls OpenAI GPT-4o API
  ↓
Real AI evaluation
  ↓
Returns actual score based on resume/JD match
  ↓
Logs: "Real AI evaluation completed successfully"
```

---

## Environment Variables Summary

| Variable | Source | Purpose | Required |
|----------|--------|---------|----------|
| `OPENAI_API_KEY` | `.env.local` | Primary API key for evaluation | ✅ Yes |
| `OPENAI_EVAL_KEY` | `.env.local` | Fallback evaluation key | ❌ No |
| `OPENAI_ADMIN_KEY` | `.env.local` | Admin key for usage tracking | ❌ No |
| `OPENAI_ORG_ID` | `.env.local` | Organization ID (multi-org) | ❌ No |

---

## Setup Instructions

### 1. Get OpenAI API Key
```
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with sk-proj-)
```

### 2. Add to .env.local
```bash
# .env.local
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 3. Restart Development Server
```bash
npm run dev
```

### 4. Verify Setup
```
Check console logs for:
"Using environment OPENAI_API_KEY for evaluation"
```

---

## Troubleshooting

### Issue: "No OpenAI API key configured"
**Solution**:
1. Add `OPENAI_API_KEY` to `.env.local`
2. Restart development server
3. Check that key starts with `sk-`

### Issue: "OpenAI API key lacks required permissions"
**Solution**:
1. Go to https://platform.openai.com/api-keys
2. Edit the API key
3. Enable `api.responses.write` scope
4. Save and restart server

### Issue: "Mock evaluation - OpenAI API unavailable"
**Solution**:
1. Check if `OPENAI_API_KEY` is set
2. Verify API key is valid
3. Check OpenAI account has credits
4. Check OpenAI status page for outages

### Issue: Using Mock Data Instead of Real Evaluation
**Solution**:
1. Ensure `OPENAI_API_KEY` is in `.env.local`
2. Check server logs for API errors
3. Verify API key permissions
4. Test API key with curl:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-proj-xxxxxxxxxxxxx"
```

---

## Summary

### ✅ API Key Source
- **Primary**: `.env.local` file (`OPENAI_API_KEY`)
- **Fallback**: `OPENAI_EVAL_KEY` environment variable
- **Optional**: Company service account key from database

### ✅ How It's Used
1. CV Evaluation reads from `.env.local`
2. Calls OpenAI GPT-4o API
3. Returns evaluation score
4. Stores result in database

### ✅ NOT from Database
- API key is **NOT** stored in database
- API key is **NOT** in billing tables
- API key is **NOT** in company records
- API key is **ONLY** in environment variables

### ✅ Security
- API key never exposed in logs
- API key never sent to frontend
- API key only used server-side
- API key can be rotated without database changes

### ✅ Fallback
- If no API key: Uses mock evaluation
- Mock data: Random scores 30-70%
- System still works but with fake data
- Useful for testing without API key
