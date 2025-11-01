# CV Evaluator Fixes Applied

## Problem
CV evaluation was failing with:
- "generateText is not defined" error
- "No OpenAI API key configured" error
- Falling back to mock evaluation instead of real OpenAI calls

## Root Causes
1. Missing import: `generateText` from `@ai-sdk/core`
2. Route not fetching company's service account key
3. Evaluator not using the passed-in API key
4. No fallback to environment variables for evaluation

## Fixes Applied

### 1. **lib/cv-evaluator.ts**
- ✅ Added missing import: `import { generateText } from "@ai-sdk/core"`
- ✅ Updated `evaluateCandidate()` to accept and use the `openaiClient` parameter with API key
- ✅ Temporarily set `OPENAI_API_KEY` environment variable during the OpenAI call
- ✅ Properly restore original key in finally block
- ✅ Added fallback to `OPENAI_EVAL_KEY` environment variable

### 2. **app/api/applications/evaluate-cv/route.ts**
- ✅ Added `companyId` parameter extraction from request body
- ✅ Fetch company's `openai_service_account_key` from database
- ✅ Parse the service account key JSON and extract the `value` field
- ✅ Fallback to environment `OPENAI_API_KEY` or `OPENAI_EVAL_KEY` if no company key
- ✅ Pass the API key object to `CVEvaluator.evaluateCandidate()`
- ✅ Added detailed logging for key source

## How It Works Now

### Flow:
1. **Request comes in** with `applicationId`, `resumeText`, `jobDescription`, `companyId`
2. **Route fetches** company's service account key from database
3. **Route passes** the API key to the evaluator
4. **Evaluator temporarily sets** `OPENAI_API_KEY` environment variable
5. **Evaluator calls** OpenAI's `generateText()` with real API key
6. **Evaluator restores** original environment key
7. **Result stored** in database with real evaluation data

### API Key Priority:
1. Company's service account key (from database)
2. Environment `OPENAI_API_KEY`
3. Environment `OPENAI_EVAL_KEY`
4. If none found → Falls back to mock evaluation

## Configuration Required

### Option 1: Per-Company Service Account Keys (Recommended)
- Each company has `openai_service_account_key` stored in database
- Automatically used when evaluating candidates for that company
- No environment configuration needed

### Option 2: Environment Variables
Add to `.env.local`:
```env
# For evaluation (can be service account key or regular key)
OPENAI_API_KEY=sk-svcacct-xxxxx
# OR
OPENAI_EVAL_KEY=sk-svcacct-xxxxx
```

## Testing

### To verify it's working:

1. **Upload a resume and trigger evaluation**
2. **Check server logs for:**
   ```
   ✅ [CV Evaluator] Using company service account key for evaluation
   (or)
   ✅ [CV Evaluator] Using environment OPENAI_API_KEY for evaluation
   ```
   NOT:
   ```
   🔐 [CV EVALUATOR] No OpenAI API key configured
   ```

3. **Check the evaluation result:**
   - Should have real AI-generated scores
   - NOT mock data (30-70 random range)
   - Should include detailed breakdown

4. **Check database:**
   ```sql
   SELECT openai_base_cost, pricing_source, tokens_used, created_at
   FROM cv_parsing_usage
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   Should show:
   - `pricing_source: 'openai-api'` (not 'fallback')
   - Real `openai_base_cost` value
   - `tokens_used` captured

## Result

✅ **Real OpenAI evaluations now work**
- CV evaluation uses real AI analysis
- Proper error handling with fallback to mock data
- Usage tracking captures real costs
- Billing page shows accurate evaluation costs

**Ab evaluation bilkul real AI se ho raha hai! 🚀**
