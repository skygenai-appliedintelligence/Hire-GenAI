# Quick Action Guide: Fix Real OpenAI Costs

## 🎯 Problem
Uploaded new CV but database still shows old fallback data.

## ⚡ Quick Fix (5 Minutes)

### 1️⃣ Check if Migration Ran

**Run this SQL in Supabase:**
```sql
SELECT COUNT(*) as columns_exist
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name = 'openai_base_cost';
```

**Result:**
- `1` → Migration ran ✅ (skip to step 3)
- `0` → Migration NOT run ❌ (continue to step 2)

### 2️⃣ Run Migration (if step 1 returned 0)

**In Supabase SQL Editor:**
1. Open file: `migrations/fix_cv_parsing_usage_real_costs.sql`
2. Copy ALL contents
3. Paste in SQL Editor
4. Click "Run"

**Verify:**
```sql
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
AND column_name = 'openai_base_cost';
```
Should return `1` ✅

### 3️⃣ Configure Admin Key

**Edit `.env.local`:**
```env
# Must be Admin key (starts with sk-admin-)
OPENAI_API_KEY=sk-admin-xxxxxxxxxxxxx
PROFIT_MARGIN_PERCENTAGE=25
```

**Get Admin Key:** https://platform.openai.com/settings/organization/admin-keys

### 4️⃣ Restart Server

```bash
# Stop server: Ctrl+C
npm run dev
```

### 5️⃣ Upload New CV

1. Upload a resume
2. Check console for:
```
✅ [CV-PARSING] SUCCESS: Real OpenAI cost fetched!
💰 OpenAI Base Cost: $0.0045
🏷️  Source: openai-api
```

### 6️⃣ Verify in Database

```sql
SELECT 
  openai_base_cost,
  pricing_source,
  tokens_used,
  created_at
FROM cv_parsing_usage 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
```
openai_base_cost: 0.004523 (small number)
pricing_source: 'openai-api' ✅
tokens_used: 1500
created_at: [just now]
```

## ✅ Done!

If you see `pricing_source: 'openai-api'` → **Working!** 🎉

If still showing `'fallback'` → See `TROUBLESHOOTING_REAL_COSTS.md`

---

## 🔍 Quick Diagnostic

**Run this one query to check everything:**

```sql
-- Complete diagnostic
SELECT 
  'Migration Status' as check_type,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Migration Ran'
    ELSE '❌ Migration NOT Run'
  END as status
FROM information_schema.columns 
WHERE table_name = 'cv_parsing_usage' 
  AND column_name IN ('openai_base_cost', 'pricing_source', 'tokens_used', 'profit_margin_percent')

UNION ALL

SELECT 
  'Latest Record' as check_type,
  CASE 
    WHEN pricing_source = 'openai-api' THEN '✅ Using Real Costs'
    WHEN pricing_source = 'fallback' THEN '⚠️ Using Fallback'
    ELSE '❌ No Data'
  END as status
FROM cv_parsing_usage 
ORDER BY created_at DESC 
LIMIT 1;
```

**Result:**
```
Migration Status | ✅ Migration Ran
Latest Record    | ✅ Using Real Costs
```

If both show ✅ → **Everything working!** 🚀

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Migration NOT Run | Run `migrations/fix_cv_parsing_usage_real_costs.sql` |
| Using Fallback | Check Admin key in `.env.local` |
| Old Timestamp | Upload NEW CV after restart |
| 401 Error | Need Admin key (not regular key) |

---

**Need detailed help?** → See `TROUBLESHOOTING_REAL_COSTS.md`
