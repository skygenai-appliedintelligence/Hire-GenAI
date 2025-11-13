# Billing System Synchronization Analysis

## Overview
Complete analysis of how CV parsing, wallet deduction, spending tracking, and admin display are synchronized.

## 1. CV Parsing Flow

### Step 1: User uploads resume
**File**: `app/api/resumes/parse/route.ts` (Line 9-411)

```
POST /api/resumes/parse
  ↓
Parse resume file
  ↓
Extract company_id and job_id from application
  ↓
Record CV parsing usage (Line 364)
```

### Step 2: Record CV Parsing Usage
**Function**: `DatabaseService.recordCVParsingUsage()` (lib/database.ts, Line 2958)

```typescript
// Records into cv_parsing_usage table
INSERT INTO cv_parsing_usage (
  company_id, job_id, candidate_id, file_id, file_size_kb,
  parse_successful, unit_price, cost, success_rate,
  openai_base_cost, pricing_source, tokens_used, profit_margin_percent,
  created_at
)
VALUES (...)
```

**Cost Calculation**:
- Uses OpenAI API to get real cost
- Falls back to $0.50 if API unavailable
- No profit margin applied (profit_margin_percent = 0)

**Console Output**:
```
💰 [CV PARSING] Starting billing calculation...
💾 [CV PARSING] Cost stored in database successfully
💰 Final Cost (no profit margin): $0.50
🎉 [CV PARSING] Billing calculation completed successfully!
```

---

## 2. Wallet Deduction Flow

### Current Issue ⚠️
The `recordCVParsingUsage()` function **DOES NOT** automatically deduct from wallet!

**Why?** Because:
1. CV parsing is recorded in `cv_parsing_usage` table
2. Wallet deduction happens in `recordUsage()` method (Line 2250)
3. `recordUsage()` is NOT called from the parse endpoint

### How Wallet Should Be Deducted

**Option A: During CV Parsing (Recommended)**
```
POST /api/resumes/parse
  ↓
Parse resume
  ↓
Record CV parsing usage
  ↓
Call recordUsage() to deduct from wallet
  ↓
Return parsed data
```

**Option B: Batch Deduction**
```
Cron job runs hourly
  ↓
Find all usage records not yet charged
  ↓
Deduct from wallet
  ↓
Create ledger entries
```

---

## 3. Current Implementation Analysis

### What Works ✅
1. **CV Parsing Recording**: Correctly inserts into `cv_parsing_usage` table
2. **Cost Calculation**: Uses real OpenAI costs or fallback pricing
3. **Usage Aggregation**: Admin page correctly sums costs from usage tables
4. **Current Month Calculation**: Correctly filters by `DATE_TRUNC('month', CURRENT_DATE)`

### What's Missing ❌
1. **Wallet Deduction**: Not happening automatically after CV parsing
2. **Ledger Entry**: No entry in `usage_ledger` table
3. **Job Usage Summary**: Not updated in `job_usage_summary` table
4. **Synchronization**: Wallet balance not updated when usage is recorded

---

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User uploads resume                                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ POST /api/resumes/parse                                     │
│ - Parse resume file                                         │
│ - Extract company_id, job_id                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ DatabaseService.recordCVParsingUsage()                      │
│ - Calculate cost ($0.50 or real OpenAI cost)                │
│ - INSERT into cv_parsing_usage table                        │
│ - ✅ WORKS                                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ ❌ MISSING: Should call recordUsage()
┌─────────────────────────────────────────────────────────────┐
│ DatabaseService.recordUsage()                               │
│ - Check billing status                                      │
│ - Check wallet balance                                      │
│ - Auto-recharge if needed                                   │
│ - Deduct from wallet                                        │
│ - Add ledger entry                                          │
│ - Update job_usage_summary                                  │
│ - ❌ NOT CALLED                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Billing Data Updated                                        │
│ - wallet_balance decreased                                  │
│ - current_month_spent increased                             │
│ - total_spent increased                                     │
│ - ❌ NOT HAPPENING                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ Admin Page Displays Data                                    │
│ GET /api/admin/companies                                    │
│ - Queries cv_parsing_usage, question_generation_usage,      │
│   video_interview_usage tables                              │
│ - Sums costs for current month and total                    │
│ - ✅ WORKS (but shows undeducted amounts)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Admin Companies Page Data

### API Endpoint
**File**: `app/api/admin/companies/route.ts`

### Data Displayed
```
Company Name | Status | Wallet Balance | This Month | Total Spent
─────────────────────────────────────────────────────────────────
Acme Corp    | trial  | $0.00          | $0.50      | $1.50
```

### How Data is Calculated

**Wallet Balance**:
```sql
SELECT COALESCE(cb.wallet_balance, 0) as walletBalance
FROM company_billing cb
```
✅ **Works**: Direct from `company_billing` table

**This Month Spent**:
```sql
SELECT COALESCE(SUM(cost), 0) as total FROM (
  SELECT cost FROM cv_parsing_usage 
  WHERE company_id = $1 AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
  UNION ALL
  SELECT cost FROM question_generation_usage 
  WHERE company_id = $1 AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
  UNION ALL
  SELECT cost FROM video_interview_usage 
  WHERE company_id = $1 AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)
) m
```
✅ **Works**: Sums from usage tables

**Total Spent**:
```sql
SELECT COALESCE(SUM(cost), 0) as total FROM (
  SELECT cost FROM cv_parsing_usage WHERE company_id = $1
  UNION ALL
  SELECT cost FROM question_generation_usage WHERE company_id = $1
  UNION ALL
  SELECT cost FROM video_interview_usage WHERE company_id = $1
) t
```
✅ **Works**: Sums from usage tables

---

## 6. Synchronization Status

### ✅ What's Synchronized
1. **Admin Page "This Month"** ↔ **Billing Page "Current Month"**
   - Both calculate from usage tables
   - Both use same date range (1st of month to now)
   - Values match

2. **Admin Page "Total Spent"** ↔ **Billing Page "Total Spent"**
   - Both sum all-time costs from usage tables
   - Values match

3. **Admin Page "Wallet Balance"** ↔ **Billing Page "Wallet Balance"**
   - Both read from `company_billing.wallet_balance`
   - Values match

### ❌ What's NOT Synchronized
1. **Wallet Deduction** ❌
   - CV parsing records usage but doesn't deduct wallet
   - Wallet balance stays the same after CV parsing
   - Should be: `wallet_balance -= cost`

2. **Ledger Entries** ❌
   - No entries in `usage_ledger` table
   - No audit trail of charges
   - Should have: `INSERT INTO usage_ledger (...)`

3. **Job Usage Summary** ❌
   - `job_usage_summary` table not updated
   - No aggregated view per job
   - Should have: `UPDATE job_usage_summary (...)`

---

## 7. Issues Found

### Issue 1: Wallet Not Deducted After CV Parsing
**Severity**: 🔴 CRITICAL

**Current Behavior**:
```
Before CV parsing: wallet_balance = $100.00
After CV parsing:  wallet_balance = $100.00 ❌ (should be $99.50)
```

**Root Cause**:
- `recordCVParsingUsage()` only inserts into `cv_parsing_usage` table
- Does NOT call `recordUsage()` to deduct from wallet
- Wallet deduction logic exists but is never triggered

**Location**: `app/api/resumes/parse/route.ts` Line 364

**Fix Required**: After recording CV parsing usage, call `recordUsage()` to deduct from wallet

---

### Issue 2: No Ledger Entries
**Severity**: 🟡 MEDIUM

**Current Behavior**:
- Usage is recorded but no audit trail
- Can't see when charges were applied
- No way to track billing history

**Root Cause**:
- `recordCVParsingUsage()` doesn't create ledger entries
- Only `recordUsage()` creates ledger entries
- `recordUsage()` is not called

**Location**: `lib/database.ts` Line 2285

**Fix Required**: Call `recordUsage()` after CV parsing to create ledger entry

---

### Issue 3: Job Usage Summary Not Updated
**Severity**: 🟡 MEDIUM

**Current Behavior**:
- `job_usage_summary` table remains empty
- No aggregated view per job
- Can't see job-level spending

**Root Cause**:
- `recordCVParsingUsage()` doesn't update `job_usage_summary`
- Only `recordUsage()` updates it
- `recordUsage()` is not called

**Location**: `lib/database.ts` Line 2297

**Fix Required**: Call `recordUsage()` to update job usage summary

---

## 8. Recommended Fix

### Solution: Call recordUsage() After CV Parsing

**File**: `app/api/resumes/parse/route.ts`

**Change**: After line 374, add wallet deduction logic

```typescript
// After recordCVParsingUsage() succeeds
const usageResult = await DatabaseService.recordCVParsingUsage({...})

// NEW: Deduct from wallet
try {
  await DatabaseService.recordUsage({
    companyId: companyIdForBilling,
    jobId: jobIdForBilling,
    usageType: 'cv_parsing',
    quantity: 1,
    unitPrice: usageResult.cost,
    cost: usageResult.cost,
    entryType: 'CV_PARSING',
    description: `CV parsing for candidate ${candidateId || 'unknown'}`,
    metadata: {
      fileSize: Math.round(file.size / 1024),
      fileName: file.name
    }
  })
  console.log('✅ Wallet deducted: $' + usageResult.cost.toFixed(2))
} catch (walletErr) {
  console.error('❌ Failed to deduct from wallet:', walletErr)
  // Decide: Should we fail the entire request or just log?
}
```

---

## 9. Testing Checklist

- [ ] CV parsing records usage in `cv_parsing_usage` table
- [ ] Wallet balance decreases after CV parsing
- [ ] Ledger entry created in `usage_ledger` table
- [ ] Job usage summary updated in `job_usage_summary` table
- [ ] Admin page shows correct wallet balance
- [ ] Admin page shows correct "This Month" spending
- [ ] Admin page shows correct "Total Spent"
- [ ] Billing page shows same values as admin page
- [ ] Current month resets on 1st of month
- [ ] Auto-recharge triggers when wallet is low

---

## 10. Files Involved

### Reading Usage
- `app/api/admin/companies/route.ts` - Admin display
- `app/dashboard/settings/_components/BillingContent.tsx` - Billing page
- `app/api/billing/status/route.ts` - Billing API

### Recording Usage
- `app/api/resumes/parse/route.ts` - CV parsing
- `lib/database.ts` - `recordCVParsingUsage()`, `recordUsage()`, `recordQuestionGenerationUsage()`, `recordVideoInterviewUsage()`

### Wallet Management
- `lib/database.ts` - `deductFromWallet()`, `autoRecharge()`

### Database Tables
- `company_billing` - Wallet balance, spending caps
- `cv_parsing_usage` - CV parsing records
- `question_generation_usage` - Question generation records
- `video_interview_usage` - Video interview records
- `usage_ledger` - Audit trail
- `job_usage_summary` - Job-level aggregates

---

## 11. Summary

### Current State
✅ Usage is recorded in database
✅ Admin page displays correct aggregated costs
✅ Billing page displays correct spending
❌ Wallet is NOT deducted
❌ No ledger entries created
❌ Job usage summary not updated

### After Fix
✅ Usage is recorded in database
✅ Wallet is deducted immediately
✅ Ledger entries created for audit trail
✅ Job usage summary updated
✅ All data synchronized across pages
✅ Complete billing audit trail available
