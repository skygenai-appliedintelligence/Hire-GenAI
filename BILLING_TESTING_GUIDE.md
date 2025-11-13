# Billing System Testing Guide

## Quick Test Steps

### 1. Check Billing Page
Navigate to: `http://localhost:3000/dashboard/settings/billing?tab=overview`

You should see:
- **Wallet Balance**: Current wallet balance
- **Current Month**: Spending from 1st of current month
- **Total Spent**: All-time spending
- **Auto-Recharge**: Status (ON/OFF)

### 2. Verify with Debug Endpoint
Replace `{company-id}` with your actual company ID:

```bash
curl "http://localhost:3000/api/billing/debug?companyId={company-id}"
```

Expected response:
```json
{
  "ok": true,
  "debug": {
    "companyId": "{company-id}",
    "billingStatus": "trial",
    "walletBalance": 0,
    "currentMonthSpent": 45.50,
    "totalSpent": 150.75,
    "monthlySpendCap": null,
    "autoRechargeEnabled": true,
    "usageBreakdown": {
      "cvParsing": {
        "count": 2,
        "totalCost": 1.00
      },
      "questionGeneration": {
        "count": 2,
        "totalCost": 44.50
      },
      "videoInterview": {
        "count": 0,
        "totalCost": 0
      }
    },
    "currentMonthUsage": {
      "count": 4,
      "totalCost": 45.50
    },
    "currentMonthStart": "2025-11-01T00:00:00.000Z"
  }
}
```

### 3. Check Server Logs
Look for messages like:
```
💰 [Billing] Current month (2025-11-01T00:00:00.000Z) spending for {company-id}: $45.50
💰 [Billing] Total spending (all-time) for {company-id}: $150.75
```

## Troubleshooting

### Issue: Current Month shows $0.00 but there's usage
**Possible Causes:**
1. Usage records have `created_at` before the 1st of the month
2. Usage records are in a different timezone
3. Usage tables are empty

**Solution:**
- Check usage tables directly:
```sql
SELECT COUNT(*), SUM(cost) FROM cv_parsing_usage WHERE company_id = '{company-id}';
SELECT COUNT(*), SUM(cost) FROM question_generation_usage WHERE company_id = '{company-id}';
SELECT COUNT(*), SUM(cost) FROM video_interview_usage WHERE company_id = '{company-id}';
```

### Issue: Total Spent shows $0.00 but debug shows usage
**Possible Causes:**
1. Billing data not refreshed
2. Database connection issue

**Solution:**
- Refresh the page
- Check browser console for errors
- Verify database connection in `.env.local`

## Manual Database Verification

### Check Company Billing Record
```sql
SELECT * FROM company_billing WHERE company_id = '{company-id}';
```

### Check All Usage for Company
```sql
SELECT 'cv_parsing' as type, COUNT(*) as count, SUM(cost) as total_cost
FROM cv_parsing_usage
WHERE company_id = '{company-id}'
UNION ALL
SELECT 'question_generation', COUNT(*), SUM(cost)
FROM question_generation_usage
WHERE company_id = '{company-id}'
UNION ALL
SELECT 'video_interview', COUNT(*), SUM(cost)
FROM video_interview_usage
WHERE company_id = '{company-id}';
```

### Check Current Month Usage
```sql
SELECT 
  'cv_parsing' as type, 
  COUNT(*) as count, 
  SUM(cost) as total_cost
FROM cv_parsing_usage
WHERE company_id = '{company-id}' 
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
  'question_generation', 
  COUNT(*), 
  SUM(cost)
FROM question_generation_usage
WHERE company_id = '{company-id}' 
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
  'video_interview', 
  COUNT(*), 
  SUM(cost)
FROM video_interview_usage
WHERE company_id = '{company-id}' 
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE);
```

## Expected Behavior

### When Company is Created
- Billing record created with `billing_status = 'trial'`
- `wallet_balance = 0`
- `current_month_spent = 0`
- `total_spent = 0`

### When Usage is Recorded
- Usage record inserted into appropriate table (cv_parsing_usage, etc.)
- `cost` field populated based on pricing
- Next billing status fetch recalculates spending

### When Month Changes
- `current_month_spent` resets to 0 on 1st of month
- `total_spent` continues accumulating
- `current_month_start` updates to new month

## API Response Format

### Billing Status Response
```json
{
  "ok": true,
  "billing": {
    "status": "trial",
    "walletBalance": 0,
    "autoRechargeEnabled": true,
    "monthlySpendCap": null,
    "currentMonthSpent": 45.50,
    "totalSpent": 150.75,
    "paymentMethod": null,
    "trialInfo": {
      "trialActive": true,
      "jdCount": 1,
      "interviewCount": 0,
      "canCreateJD": false,
      "canRunInterview": true
    }
  },
  "pricing": {
    "cvParsePrice": 0.50,
    "questionPricePer1kTokens": 0.002,
    "videoPricePerMin": 0.10,
    "rechargeAmount": 100.00
  }
}
```

## Key Files

- **Calculation Logic**: `lib/database.ts` - `getCompanyBilling()` method
- **API Endpoint**: `app/api/billing/status/route.ts`
- **Debug Endpoint**: `app/api/billing/debug/route.ts`
- **UI Component**: `app/dashboard/settings/_components/BillingContent.tsx`
- **Database Schema**: `migrations/billing_system.sql`
