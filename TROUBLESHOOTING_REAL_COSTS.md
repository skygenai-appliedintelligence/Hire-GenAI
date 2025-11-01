# Troubleshooting: Real OpenAI Costs Not Working

## 🔴 Problem: Uploaded new CV but still showing old fallback data

You uploaded a new resume but the database query still shows:
```
openai_base_cost: 0.500000
pricing_source: 'fallback'
profit_margin_percent: -100.00
```

## 🔍 Root Cause Analysis

There are **3 possible causes**:

### 1. ❌ Migration Not Run (Most Likely)
The database migration hasn't been executed yet, so the new columns don't exist.

### 2. ❌ Server Not Restarted
Code changes require server restart to take effect.

### 3. ❌ OpenAI Admin Key Not Configured
The OpenAI Usage API requires an Admin key (not regular key).

---

## ✅ SOLUTION: Step-by-Step Fix

### **Step 1: Verify Migration Status**

Run this SQL in Supabase SQL Editor:

```sql
-- Quick check: Do new columns exist?
SELECT COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent');
```

**Expected Result:**
- ✅ `column_count: 4` → Migration ran successfully
- ❌ `column_count: 0` → Migration NOT run (proceed to Step 2)

### **Step 2: Run the Migration** (if Step 1 returned 0)

1. **Open Supabase SQL Editor**
2. **Open file:** `migrations/fix_cv_parsing_usage_real_costs.sql`
3. **Copy entire contents** (all ~200 lines)
4. **Paste in SQL Editor**
5. **Click "Run"** or press Ctrl+Enter

**Expected Output:**
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
COMMENT
COMMENT
...
CREATE VIEW
```

6. **Verify migration ran:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent')
ORDER BY column_name;
```

**Should return 4 rows:**
```
openai_base_cost      | numeric
pricing_source        | character varying
profit_margin_percent | numeric
tokens_used           | integer
```

### **Step 3: Configure OpenAI Admin Key**

Check your `.env.local` file:

```env
# ❌ WRONG - Regular key (won't work)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# ✅ CORRECT - Admin key (required)
OPENAI_API_KEY=sk-admin-xxxxxxxxxxxxx

# Optional: Profit margin
PROFIT_MARGIN_PERCENTAGE=25
```

**Get Admin Key:**
1. Go to: https://platform.openai.com/settings/organization/admin-keys
2. Click "Create new admin key"
3. Copy the key (starts with `sk-admin-`)
4. Update `.env.local`

### **Step 4: Restart Dev Server**

```bash
# Stop current server (Ctrl+C in terminal)

# Restart
npm run dev
```

**Wait for:**
```
✓ Ready in 3.2s
○ Local:   http://localhost:3000
```

### **Step 5: Upload New CV**

1. Go to your application
2. Upload a **NEW resume**
3. **Watch the server console** for logs

**Expected Console Output:**
```
🎯 [CV PARSING] Starting billing calculation...
📋 Company ID: xxx
💼 Job ID: xxx
======================================================================

🎯 [CV PARSING] Tracking OpenAI usage...
🔗 [CV-PARSING] Fetching REAL OpenAI usage from API...
⏰ Time Range: Last 5 minutes
✅ [CV-PARSING] SUCCESS: Real OpenAI cost fetched!
💰 OpenAI Base Cost: $0.0045
💵 Final Cost (with margin): $0.0057
🔢 Tokens Used: 1500
🏷️  Source: openai-api
======================================================================

💾 [CV PARSING] Cost stored in database successfully
💰 Final Cost (with margin): $0.0057
📈 Base Cost: $0.0045
🏷️  Source: openai-api
🎉 [CV PARSING] Billing calculation completed successfully!
======================================================================
```

**If you see errors:**
```
❌ [CV PARSING] ERROR: Failed to record billing usage:
🔥 Error Details: column "openai_base_cost" does not exist
```
→ Migration not run, go back to Step 2

```
⚠️  [CV-PARSING] Failed to fetch from OpenAI API: 401 Unauthorized
```
→ Admin key not configured, go back to Step 3

### **Step 6: Verify in Database**

Run this SQL:

```sql
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

**Expected Result (NEW upload):**
```
openai_base_cost: 0.004523 (or similar small number)
cost: 0.01 (or similar)
pricing_source: 'openai-api' ✅
tokens_used: 1500 (or similar)
profit_margin_percent: 25.00
created_at: [timestamp from just now]
```

**If still showing old data:**
- Check `created_at` - is it recent (within last minute)?
- If timestamp is old → New record NOT created
- Check server console for errors

---

## 🧪 Complete Test Suite

Run this comprehensive test:

```sql
-- Copy and run: test-migration.sql
-- This will check:
-- ✅ Column existence
-- ✅ Data types
-- ✅ View creation
-- ✅ Existing data
-- ✅ Latest record
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "Column does not exist" Error

**Error:**
```
ERROR: column "openai_base_cost" does not exist
```

**Solution:**
- Migration not run
- Run `migrations/fix_cv_parsing_usage_real_costs.sql`
- Restart server

### Issue 2: Still Showing Fallback Pricing

**Symptoms:**
```
pricing_source: 'fallback'
openai_base_cost: 0.500000
```

**Possible Causes:**
1. **Old record** - Check `created_at` timestamp
2. **OpenAI API unavailable** - Check console for API errors
3. **Admin key not configured** - Check `.env.local`

**Solution:**
- Verify timestamp is recent
- Check console logs for errors
- Ensure Admin key is set
- Restart server

### Issue 3: No New Record Created

**Symptoms:**
- Upload CV
- No new record in database
- Latest record is old

**Solution:**
1. Check server console for errors
2. Verify `recordCVParsingUsage` is being called
3. Check database connection
4. Look for try-catch errors in logs

### Issue 4: 401 Unauthorized from OpenAI

**Error:**
```
⚠️  [CV-PARSING] Failed to fetch from OpenAI API: 401 Unauthorized
```

**Solution:**
- Using regular key instead of Admin key
- Get Admin key from: https://platform.openai.com/settings/organization/admin-keys
- Update `.env.local` with `sk-admin-` key
- Restart server

---

## 📊 Verification Checklist

Use this checklist to verify everything is working:

- [ ] **Migration ran:** 4 columns exist in `cv_parsing_usage`
- [ ] **Admin key configured:** `.env.local` has `sk-admin-` key
- [ ] **Server restarted:** Dev server restarted after changes
- [ ] **CV uploaded:** New resume uploaded after restart
- [ ] **Console logs:** Show "SUCCESS: Real OpenAI cost fetched!"
- [ ] **Database record:** Latest record has `pricing_source: 'openai-api'`
- [ ] **Timestamp:** `created_at` is recent (within last minute)
- [ ] **Cost values:** `openai_base_cost` is small (< $0.01 typically)

---

## 🎯 Expected vs Actual

### ❌ What You're Seeing (WRONG):
```sql
openai_base_cost: 0.500000
cost: _.00
pricing_source: 'fallback'
tokens_used: NULL
profit_margin_percent: -100.00
created_at: [old timestamp]
```

### ✅ What You Should See (CORRECT):
```sql
openai_base_cost: 0.004523
cost: 0.01
pricing_source: 'openai-api'
tokens_used: 1500
profit_margin_percent: 25.00
created_at: [recent timestamp - just now]
```

---

## 🆘 Still Not Working?

If you've followed all steps and it's still not working, share:

1. **Migration check result:**
   ```sql
   SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = 'cv_parsing_usage' 
   AND column_name = 'openai_base_cost';
   ```

2. **Server console logs** after CV upload

3. **Latest database record:**
   ```sql
   SELECT openai_base_cost, pricing_source, created_at
   FROM cv_parsing_usage 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

4. **Environment check:**
   - Is `OPENAI_API_KEY` in `.env.local`?
   - Does it start with `sk-admin-`?

This will help identify the exact issue!

---

## 🎉 Success Indicators

You'll know it's working when you see:

✅ Console logs show "SUCCESS: Real OpenAI cost fetched!"
✅ Database shows `pricing_source: 'openai-api'`
✅ `openai_base_cost` is small (< $0.01 for typical CV)
✅ `created_at` timestamp is recent
✅ Billing page shows accurate costs

**Ab sab kuch real OpenAI API se calculate ho raha hai! 🚀**
