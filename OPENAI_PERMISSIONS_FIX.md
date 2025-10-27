# OpenAI API Key Permissions Fix

## Problem
You're getting this error when trying to evaluate CVs:

```
Failed to evaluate CV: You have insufficient permissions for this operation. Missing scopes: api.responses.write
```

## Root Cause
Your OpenAI API key doesn't have the required permissions/scopes to use the AI evaluation features.

## Solution

### Step 1: Check Your Current Status
Visit: `http://localhost:3000/openai-diagnostic`

This will show you exactly what's wrong with your API key configuration.

### Step 2: Get Proper API Key Permissions

1. **Go to OpenAI Platform**: https://platform.openai.com/
2. **Navigate to API Keys**: https://platform.openai.com/settings/organization/api-keys
3. **Find your API key** (the one in your `.env.local` file)
4. **Edit the key settings**
5. **Enable all available scopes/permissions**
6. **Save the changes**

### Step 3: Alternative - Create New API Key

If editing permissions doesn't work:

1. **Create a new API key** with full permissions
2. **Update your `.env.local` file**:
   ```env
   OPENAI_API_KEY=sk-your-new-key-here
   ```
3. **Restart your development server**:
   ```bash
   npm run dev
   ```

### Step 4: Verify the Fix

1. **Visit the diagnostic page**: `http://localhost:3000/openai-diagnostic`
2. **Look for green checkmarks** ✅
3. **Try evaluating a CV** - should work with real AI now

## What This Fixes

With proper permissions, CV evaluation will use **real AI analysis** instead of mock data:

- ✅ **Real AI evaluation** with detailed scoring
- ✅ **Accurate skill matching** against job descriptions
- ✅ **Professional evaluation reports** with evidence
- ✅ **Proper qualification decisions**

Without permissions, it falls back to **mock evaluation** with simulated data.

## Testing

1. Upload a resume for any job
2. Check the console logs - you should see:
   ```
   ✅ [CV EVALUATOR] OpenAI API key has proper permissions - Real AI evaluation available
   ```
3. View the candidate report - should show detailed AI analysis

## Need Help?

- Check OpenAI Platform status: https://status.openai.com/
- Ensure your OpenAI account has sufficient credits
- Verify the API key format starts with `sk-`

---

**Result**: CV evaluation now works with real AI analysis instead of mock data! 🎯
