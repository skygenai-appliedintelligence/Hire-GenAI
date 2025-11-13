# Billing System - Current Month & Total Spent Fix

## Overview
Fixed the billing system to properly calculate `current_month_spent` and `total_spent` from the usage tables in the database.

## Problem
The billing page at `/dashboard/settings/billing?tab=overview` was not displaying correct values for:
- **Current Month Spent**: Should show spending from the 1st of the current month
- **Total Spent**: Should show all-time spending across all usage

## Root Cause
The `getCompanyBilling()` method in `lib/database.ts` was:
1. Not using proper CAST for decimal calculations
2. Converting values to strings with `.toFixed(2)` instead of keeping them as numbers

## Solution

### 1. Updated `lib/database.ts` - `getCompanyBilling()` method

**Key Changes:**
- Added `CAST(cost AS DECIMAL(10,2))` to ensure proper decimal handling in SQL
- Removed `.toFixed(2)` conversion, keeping values as numbers
- Added console logging for debugging
- Stored ISO string of current month start for accurate date comparison

```typescript
// Before (incorrect):
billing.current_month_spent = currentMonthSpent.toFixed(2)  // Returns string
billing.total_spent = totalSpent.toFixed(2)                 // Returns string

// After (correct):
billing.current_month_spent = currentMonthSpent  // Returns number
billing.total_spent = totalSpent                 // Returns number
```

### 2. Database Queries

**Current Month Spending Query:**
```sql
SELECT
  COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total
FROM (
  SELECT cost FROM cv_parsing_usage
  WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
  UNION ALL
  SELECT cost FROM question_generation_usage
  WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
  UNION ALL
  SELECT cost FROM video_interview_usage
  WHERE company_id = $1::uuid AND created_at >= $2::timestamptz
) as all_usage
```

**Total Spending Query:**
```sql
SELECT 
  COALESCE(SUM(CAST(cost AS DECIMAL(10,2))), 0) as total
FROM (
  SELECT cost FROM cv_parsing_usage WHERE company_id = $1::uuid
  UNION ALL
  SELECT cost FROM question_generation_usage WHERE company_id = $1::uuid
  UNION ALL
  SELECT cost FROM video_interview_usage WHERE company_id = $1::uuid
) as all_usage
```

## Usage Tables

The system tracks usage across three main tables:

### 1. `cv_parsing_usage`
- Tracks CV parsing operations
- Fields: `company_id`, `job_id`, `cost`, `created_at`

### 2. `question_generation_usage`
- Tracks JD question generation
- Fields: `company_id`, `job_id`, `cost`, `created_at`

### 3. `video_interview_usage`
- Tracks video interview sessions
- Fields: `company_id`, `job_id`, `cost`, `created_at`

## Billing Page Display

The billing overview page displays four key metrics:

```
┌─────────────────┬──────────────────┬──────────────┬──────────────┐
│ Wallet Balance  │ Current Month    │ Total Spent  │ Auto-Recharge│
│ $X.XX           │ $X.XX            │ $X.XX        │ ON/OFF       │
│ [Status Badge]  │ Cap: $X.XX       │ All-time     │ Automatic $100
└─────────────────┴──────────────────┴──────────────┴──────────────┘
```

### Current Month Calculation
- Starts from: 1st of current month at 00:00:00
- Includes: All usage from `cv_parsing_usage`, `question_generation_usage`, `video_interview_usage`
- Updated: Real-time when `/api/billing/status` is called

### Total Spent Calculation
- Includes: All-time usage across all three tables
- Updated: Real-time when `/api/billing/status` is called

## API Endpoints

### GET `/api/billing/status?companyId={id}`
Returns current billing status including:
- `walletBalance`: Current wallet balance
- `currentMonthSpent`: Spending from 1st of month to now
- `totalSpent`: All-time spending
- `monthlySpendCap`: Monthly spending limit (if set)
- `autoRechargeEnabled`: Auto-recharge status

### GET `/api/billing/debug?companyId={id}` (New)
Debug endpoint to verify billing calculations. Shows:
- Raw usage counts and costs per table
- Current month usage breakdown
- Billing configuration

## Console Logging

When billing data is fetched, you'll see logs like:
```
💰 [Billing] Current month (2025-11-01T00:00:00.000Z) spending for {companyId}: $45.50
💰 [Billing] Total spending (all-time) for {companyId}: $150.75
```

## Testing

To test the billing system:

1. **Check billing page**: Navigate to `/dashboard/settings/billing?tab=overview`
2. **Use debug endpoint**: Call `/api/billing/debug?companyId={your-company-id}`
3. **Check console logs**: Look for `💰 [Billing]` messages in server logs

## Files Modified

- `lib/database.ts` - Updated `getCompanyBilling()` method

## Files Created

- `app/api/billing/debug/route.ts` - Debug endpoint for billing calculations

## Notes

- The system calculates spending in real-time from usage tables
- No need to manually update `company_billing` table with spending amounts
- The `company_billing` table stores configuration (wallet balance, caps, etc.)
- Usage tables are the source of truth for spending calculations
