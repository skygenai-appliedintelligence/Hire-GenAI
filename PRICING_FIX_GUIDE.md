# Pricing Fix - Correct Video & CV Costs

## Problem
- Video interviews showing $0.04 instead of ~$0.30/min (Realtime API pricing)
- CV parsing showing $0.05 instead of $0.50+ (with profit margin)

## Root Cause
The billing page was using OpenAI token-based heuristics instead of your actual database records which have the correct flat/duration pricing with profit margin.

## Solution Applied

### 1. Updated API Endpoint (`app/api/billing/openai-usage/route.ts`)
**Changed from:** Mixed OpenAI + Database approach
**Changed to:** Database-only approach

Now the endpoint:
- ✅ Uses `DatabaseService.getCompanyUsage()` for ALL costs (CV, Questions, Video)
- ✅ Pulls from `cv_parsing_usage`, `question_generation_usage`, `video_interview_usage` tables
- ✅ All costs already have profit margin applied (stored in DB)
- ✅ Returns `jobUsage` from `job_usage_summary` for the breakdown section

### 2. Updated Video Pricing (`lib/database.ts`)
**Changed from:** $0.10/min
**Changed to:** $0.30/min (OpenAI Realtime API: $0.06 input + $0.24 output)

### 3. Database Migration Required
Run this SQL in your Supabase SQL Editor:

```sql
-- Update video pricing to $0.30/min
UPDATE pricing_history
SET 
  video_price_per_min = 0.30,
  notes = 'Updated to OpenAI Realtime API pricing'
WHERE effective_until IS NULL OR effective_until > NOW();
```

Or run the full migration file: `migrations/update_video_pricing.sql`

## Expected Results After Fix

### With 25% Profit Margin (PROFIT_MARGIN_PERCENTAGE=25):

**1 CV Parsed:**
- Base: $0.50
- Markup: $0.125 (25%)
- **Final: $0.625** ✅

**1 Minute Video Interview:**
- Base: $0.30 (Realtime API)
- Markup: $0.075 (25%)
- **Final: $0.375** ✅

**1,657 Tokens (Questions):**
- Base: $0.003314 (1.657K × $0.002)
- Markup: $0.0008285 (25%)
- **Final: $0.0041** ✅

## How to Verify

1. **Run the database migration:**
   ```sql
   -- In Supabase SQL Editor
   UPDATE pricing_history
   SET video_price_per_min = 0.30
   WHERE effective_until IS NULL OR effective_until > NOW();
   ```

2. **Restart your dev server:**
   ```bash
   npm run dev
   ```

3. **Check the billing page:**
   - Go to: http://localhost:3000/dashboard/settings/billing?tab=usage
   - Verify costs match expected values above

4. **Test with new usage:**
   - Parse a CV → Should show $0.625 (with 25% margin)
   - Complete a 1-min interview → Should show $0.375 (with 25% margin)

## Data Flow (Simplified)

```
User Action (CV/Video/Questions)
    ↓
DatabaseService.record[Service]Usage()
    ↓
Calculates: baseCost × (1 + profitMargin/100)
    ↓
Stores in database table with final cost
    ↓
GET /api/billing/openai-usage?companyId=xxx
    ↓
DatabaseService.getCompanyUsage(companyId)
    ↓
Aggregates costs from tables
    ↓
Returns to UI
    ↓
Displays correct costs ✅
```

## Files Modified

1. **app/api/billing/openai-usage/route.ts**
   - Removed OpenAI usage service dependency
   - Now uses DatabaseService exclusively
   - Requires `companyId` parameter

2. **lib/database.ts**
   - Updated default `video_price_per_min` from 0.10 to 0.30

3. **app/dashboard/settings/_components/BillingContent.tsx**
   - Already passes `companyId` and `jobId` to API

## Important Notes

- ✅ All costs in database already include profit margin
- ✅ No need to calculate profit margin in the UI
- ✅ Database triggers auto-update `job_usage_summary`
- ⚠️ Must run the pricing migration SQL to update existing pricing
- ⚠️ New usage will use new pricing automatically

## Troubleshooting

**Still seeing wrong costs?**
1. Check if pricing migration ran: `SELECT * FROM pricing_history ORDER BY effective_from DESC LIMIT 1;`
2. Verify profit margin: Check `PROFIT_MARGIN_PERCENTAGE` in `.env.local`
3. Check if usage exists: `SELECT * FROM video_interview_usage WHERE company_id = 'your-company-id';`
4. Restart dev server to reload env vars

**No data showing?**
- Ensure you have usage records in the database tables
- Check that `companyId` is being passed correctly
- Look at browser console for API errors
