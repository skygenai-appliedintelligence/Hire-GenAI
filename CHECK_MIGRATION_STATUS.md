# Check Migration Status

## Issue: New CV upload still showing old data

You uploaded a new resume but the database still shows old data with `pricing_source: 'fallback'`.

## Possible Causes:

### 1. **Migration Not Run** ❌
The database migration might not have been executed yet.

**Check by running this SQL:**
```sql
-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent')
ORDER BY column_name;
```

**Expected Result:** Should return 4 rows
- `openai_base_cost | numeric`
- `pricing_source | character varying`
- `profit_margin_percent | numeric`
- `tokens_used | integer`

**If returns 0 rows:** Migration not run! Run it:
```bash
# In Supabase SQL Editor, paste and execute:
migrations/fix_cv_parsing_usage_real_costs.sql
```

### 2. **Database Method Error** ❌
The `recordCVParsingUsage` method might be failing silently.

**Check server console logs for:**
```
❌ [CV PARSING] ERROR: Failed to record billing usage:
🔥 Error Details: [error message]
```

**Common errors:**
- `column "openai_base_cost" does not exist` → Migration not run
- `OpenAI API error` → Admin key not configured
- `undefined is not a function` → Code issue

### 3. **OpenAI Admin Key Not Configured** ❌
The OpenAI Usage API requires an Admin key.

**Check `.env.local`:**
```env
# Must be Admin key (starts with sk-admin-)
OPENAI_API_KEY=sk-admin-xxxxxxxxxxxxx

# Not this (regular key):
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx ❌
```

**Get Admin Key:** https://platform.openai.com/settings/organization/admin-keys

### 4. **Server Not Restarted** ❌
After updating code, the dev server needs restart.

**Restart server:**
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

## Quick Diagnostic Steps:

### Step 1: Check Migration Status
```sql
-- Run in Supabase SQL Editor
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name = 'openai_base_cost';
```

**Result:**
- ✅ Returns 1 row → Migration ran
- ❌ Returns 0 rows → Migration NOT run

### Step 2: Check Server Logs
After uploading CV, check console for:

**Success:**
```
🎯 [CV PARSING] Starting billing calculation...
🔗 [CV-PARSING] Fetching REAL OpenAI usage from API...
✅ [CV-PARSING] SUCCESS: Real OpenAI cost fetched!
💰 OpenAI Base Cost: $0.0045
💵 Final Cost (with margin): $0.0057
🏷️  Source: openai-api
💾 [CV PARSING] Cost stored in database successfully
```

**Failure:**
```
❌ [CV PARSING] ERROR: Failed to record billing usage:
🔥 Error Details: [error message here]
```

### Step 3: Check Database After Upload
```sql
-- Get the LATEST record (just uploaded)
SELECT 
  id,
  openai_base_cost,
  cost,
  pricing_source,
  tokens_used,
  profit_margin_percent,
  created_at
FROM cv_parsing_usage 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected for NEW upload:**
```
openai_base_cost: 0.004523 (or similar small number)
cost: 0.01 (or similar)
pricing_source: 'openai-api' ✅
tokens_used: 1500 (or similar)
profit_margin_percent: 25.00
created_at: [just now timestamp]
```

**If still showing old data:**
- Check `created_at` timestamp - is it recent?
- If timestamp is old → New record NOT being created
- Check server logs for errors

## Most Likely Issue:

Based on your screenshot showing `pricing_source: 'fallback'`, the most likely issue is:

**❌ Migration has NOT been run yet**

## Solution:

1. **Run the migration:**
   - Open Supabase SQL Editor
   - Open file: `migrations/fix_cv_parsing_usage_real_costs.sql`
   - Copy entire contents
   - Paste in SQL Editor
   - Click "Run"

2. **Verify migration:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'cv_parsing_usage' 
   AND column_name = 'openai_base_cost';
   ```
   Should return 1 row

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Upload NEW CV**

5. **Check database:**
   ```sql
   SELECT openai_base_cost, pricing_source, created_at
   FROM cv_parsing_usage 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

6. **Should now show:**
   - `pricing_source: 'openai-api'` ✅
   - Recent `created_at` timestamp ✅

## Need Help?

Share:
1. Result of migration check query
2. Server console logs after CV upload
3. Latest database record timestamp

This will help identify the exact issue!
