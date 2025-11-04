# Quick Fix for CV Evaluation API Key Issue

## Problem
CV evaluation is failing with "No OpenAI API key configured" even though company service account key exists in database.

## Root Cause
The evaluation API route needs the `companyId` parameter to fetch the service account key, but it might not be getting passed correctly.

## Fixes Applied

### 1. **ApplyForm.tsx** - Pass companyId to evaluation API
✅ Added `companyId: job?.company_id` to the evaluation API request body

### 2. **evaluate-cv/route.ts** - Enhanced debugging
✅ Added detailed logging to see if `companyId` is received
✅ Added logging for key source (company vs environment)

## Next Steps

1. **Restart dev server** to pick up code changes
2. **Upload a new resume** and submit application
3. **Check server logs** for:
   ```
   [Application] Calling evaluation API with companyId: 7984987d-85b0-4fa0-848a-5cc087d8094e
   [CV Evaluator] Received companyId: 7984987d-85b0-4fa0-848a-5cc087d8094e
   [CV Evaluator] Using company service account key for evaluation
   ✅ [CV Evaluator] Real AI evaluation completed successfully
   ```

## If Still Failing

### Option A: Check Environment Variables
Add these to your `.env.local`:

```env
# Admin key for usage tracking (required)
OPENAI_API_KEY=sk-admin-xxxxxxxxxxxxx

# Evaluation key (can be service account key)
OPENAI_EVAL_KEY=sk-svcacct-xxxxxxxxxxxxx
```

### Option B: Verify Database
Check if service account key exists:

```sql
SELECT id, name, openai_service_account_key FROM companies WHERE id = '7984987d-85b0-4fa0-848a-5cc087d8094e';
```

Should return the key JSON.

## Expected Result After Fix
- ✅ CV evaluation uses real OpenAI API
- ✅ Usage tracking shows `pricing_source: 'openai-api'`
- ✅ `openai_base_cost` reflects real OpenAI costs
- ✅ Billing page shows accurate evaluation costs

**Try the fix now by restarting server and uploading a resume! 🚀**
