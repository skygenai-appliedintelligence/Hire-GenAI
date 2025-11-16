# Billing System Synchronization - Verification Guide

## What Was Fixed

### ✅ Issue 1: Wallet Not Deducted After CV Parsing (FIXED)

**Before**:
```
User uploads resume
  ↓
CV parsing recorded in cv_parsing_usage table
  ↓
Wallet balance: UNCHANGED ❌
```

**After**:
```
User uploads resume
  ↓
CV parsing recorded in cv_parsing_usage table
  ↓
chargeForCVParsing() called
  ↓
Wallet balance DEDUCTED ✅
  ↓
Ledger entry created ✅
```

**Files Modified**:
- `lib/database.ts` - Added `chargeForCVParsing()` method
- `app/api/resumes/parse/route.ts` - Calls `chargeForCVParsing()` after recording usage

---

## Complete CV Parsing Flow (After Fix)

### Step 1: User Uploads Resume
```
POST /api/resumes/parse
  - File: resume.pdf
  - Application ID: {app-id}
  - Candidate ID: {candidate-id}
```

### Step 2: Parse Resume
```
- Extract text from PDF/DOC/DOCX
- Extract skills, experience, education
- Save to applications.resume_text
```

### Step 3: Record CV Parsing Usage
```typescript
DatabaseService.recordCVParsingUsage({
  companyId: "550e8400-e29b-41d4-a716-446655440000",
  jobId: "660e8400-e29b-41d4-a716-446655440000",
  candidateId: "770e8400-e29b-41d4-a716-446655440000",
  fileSizeKb: 150,
  parseSuccessful: true,
  successRate: 95
})
```

**Database Action**:
```sql
INSERT INTO cv_parsing_usage (
  company_id, job_id, candidate_id, file_id, file_size_kb,
  parse_successful, unit_price, cost, success_rate,
  openai_base_cost, pricing_source, tokens_used, profit_margin_percent,
  created_at
) VALUES (...)
```

**Console Output**:
```
🎯 [CV PARSING] Starting billing calculation...
💾 [CV PARSING] Cost stored in database successfully
💰 Final Cost (no profit margin): $0.50
🎉 [CV PARSING] Billing calculation completed successfully!
```

### Step 4: Charge for CV Parsing (NEW)
```typescript
DatabaseService.chargeForCVParsing({
  companyId: "550e8400-e29b-41d4-a716-446655440000",
  jobId: "660e8400-e29b-41d4-a716-446655440000",
  cost: 0.50,
  candidateId: "770e8400-e29b-41d4-a716-446655440000",
  fileName: "resume.pdf"
})
```

**Database Actions**:
1. Get current billing status
2. Check if in trial (if yes, no charge)
3. Check wallet balance
4. Auto-recharge if needed
5. Deduct from wallet
6. Create ledger entry

**Database Updates**:
```sql
-- Deduct from wallet
UPDATE company_billing
SET wallet_balance = wallet_balance - 0.50
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'

-- Create ledger entry
INSERT INTO usage_ledger (
  company_id, job_id, entry_type, description,
  amount, balance_before, balance_after, created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  'CV_PARSING',
  'CV parsing for candidate 770e8400-e29b-41d4-a716-446655440000 (resume.pdf)',
  0.50,
  100.00,
  99.50,
  NOW()
)
```

**Console Output**:
```
======================================================================
💳 [CV PARSING CHARGE] Starting wallet deduction...
📋 Company ID: 550e8400-e29b-41d4-a716-446655440000
💼 Job ID: 660e8400-e29b-41d4-a716-446655440000
💰 Amount to charge: $0.50
======================================================================
✅ [CV PARSING CHARGE] Wallet deducted successfully
💰 Balance before: $100.00
💰 Balance after: $99.50
📝 [CV PARSING CHARGE] Ledger entry created
🎉 [CV PARSING CHARGE] Billing completed successfully!
======================================================================
```

---

## Data Synchronization

### Wallet Balance
**Source**: `company_billing.wallet_balance`

**Updated When**:
- CV parsing charged: `-$0.50`
- Question generation charged: `-$0.10` (per 10 questions)
- Video interview charged: `-$0.30` (per minute)
- Auto-recharge triggered: `+$100.00`

**Displayed On**:
- ✅ Billing page: `/dashboard/settings/billing?tab=overview`
- ✅ Admin page: `/admin-hiregenai/companies`
- ✅ Debug endpoint: `/api/billing/debug?companyId={id}`

---

### Current Month Spent
**Source**: Sum of costs from usage tables (1st of month to now)

**Query**:
```sql
SELECT COALESCE(SUM(cost), 0) as total FROM (
  SELECT cost FROM cv_parsing_usage
  WHERE company_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  UNION ALL
  SELECT cost FROM question_generation_usage
  WHERE company_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  UNION ALL
  SELECT cost FROM video_interview_usage
  WHERE company_id = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
) m
```

**Updated When**:
- Any usage recorded in current month

**Displayed On**:
- ✅ Billing page: "Current Month" card
- ✅ Admin page: "This Month" column
- ✅ Debug endpoint: `currentMonthUsage.totalCost`

---

### Total Spent
**Source**: Sum of all costs from usage tables (all-time)

**Query**:
```sql
SELECT COALESCE(SUM(cost), 0) as total FROM (
  SELECT cost FROM cv_parsing_usage WHERE company_id = $1
  UNION ALL
  SELECT cost FROM question_generation_usage WHERE company_id = $1
  UNION ALL
  SELECT cost FROM video_interview_usage WHERE company_id = $1
) t
```

**Updated When**:
- Any usage recorded

**Displayed On**:
- ✅ Billing page: "Total Spent" card
- ✅ Admin page: "Total Spent" column
- ✅ Debug endpoint: `totalSpent`

---

## Verification Checklist

### 1. CV Parsing Records Usage ✅
```bash
# Check cv_parsing_usage table
SELECT * FROM cv_parsing_usage 
WHERE company_id = '{your-company-id}' 
ORDER BY created_at DESC LIMIT 1;
```

Expected: Row with cost = 0.50 (or real OpenAI cost)

### 2. Wallet Deducted ✅
```bash
# Before CV parsing
SELECT wallet_balance FROM company_billing 
WHERE company_id = '{your-company-id}';
# Result: 100.00

# After CV parsing
SELECT wallet_balance FROM company_billing 
WHERE company_id = '{your-company-id}';
# Result: 99.50 (decreased by 0.50)
```

### 3. Ledger Entry Created ✅
```bash
SELECT * FROM usage_ledger 
WHERE company_id = '{your-company-id}' 
AND entry_type = 'CV_PARSING'
ORDER BY created_at DESC LIMIT 1;
```

Expected: Entry with:
- `entry_type`: 'CV_PARSING'
- `amount`: 0.50
- `balance_before`: 100.00
- `balance_after`: 99.50

### 4. Billing Page Shows Correct Values ✅
Navigate to: `http://localhost:3000/dashboard/settings/billing?tab=overview`

Expected:
- **Wallet Balance**: $99.50 (decreased)
- **Current Month**: $0.50 (increased)
- **Total Spent**: $0.50 (increased)

### 5. Admin Page Shows Correct Values ✅
Navigate to: `http://localhost:3000/admin-hiregenai/companies`

Expected:
- **Wallet Balance**: $99.50
- **This Month**: $0.50
- **Total Spent**: $0.50

### 6. Debug Endpoint Shows Correct Values ✅
```bash
curl "http://localhost:3000/api/billing/debug?companyId={your-company-id}"
```

Expected response:
```json
{
  "ok": true,
  "debug": {
    "walletBalance": 99.50,
    "currentMonthSpent": 0.50,
    "totalSpent": 0.50,
    "usageBreakdown": {
      "cvParsing": {
        "count": 1,
        "totalCost": 0.50
      }
    }
  }
}
```

### 7. Console Logs Show Billing Flow ✅
Check server logs for:
```
🎯 [CV PARSING] Starting billing calculation...
💾 [CV PARSING] Cost stored in database successfully
💳 [CV PARSING CHARGE] Starting wallet deduction...
✅ [CV PARSING CHARGE] Wallet deducted successfully
📝 [CV PARSING CHARGE] Ledger entry created
🎉 [CV PARSING CHARGE] Billing completed successfully!
```

---

## Test Scenarios

### Scenario 1: Normal CV Parsing (Paid Account)
**Setup**:
- Company status: `active`
- Wallet balance: $100.00
- Auto-recharge: enabled
- Monthly cap: none

**Action**: Upload resume

**Expected**:
- ✅ CV parsed successfully
- ✅ Usage recorded in `cv_parsing_usage`
- ✅ Wallet deducted: $100.00 → $99.50
- ✅ Ledger entry created
- ✅ Billing page shows: Wallet=$99.50, Month=$0.50, Total=$0.50

---

### Scenario 2: Trial Account (No Charge)
**Setup**:
- Company status: `trial`
- Wallet balance: $0.00
- Auto-recharge: disabled

**Action**: Upload resume

**Expected**:
- ✅ CV parsed successfully
- ✅ Usage recorded in `cv_parsing_usage`
- ✅ Wallet NOT deducted: $0.00 → $0.00
- ✅ Ledger entry NOT created (trial)
- ✅ Console shows: "Company in trial - no charge applied"

---

### Scenario 3: Insufficient Wallet (Auto-Recharge)
**Setup**:
- Company status: `active`
- Wallet balance: $0.10
- Auto-recharge: enabled
- Monthly cap: none

**Action**: Upload resume (cost $0.50)

**Expected**:
- ✅ CV parsed successfully
- ✅ Auto-recharge triggered: $0.10 → $100.10
- ✅ Wallet deducted: $100.10 → $99.60
- ✅ Ledger entries created (auto-recharge + CV parsing)
- ✅ Console shows: "Auto-recharging wallet..."

---

### Scenario 4: Insufficient Wallet (No Auto-Recharge)
**Setup**:
- Company status: `active`
- Wallet balance: $0.10
- Auto-recharge: disabled

**Action**: Upload resume (cost $0.50)

**Expected**:
- ✅ CV parsed successfully
- ✅ Usage recorded in `cv_parsing_usage`
- ✅ Charge fails: "Insufficient wallet balance"
- ✅ Wallet NOT deducted: $0.10 → $0.10
- ✅ Console shows error message
- ✅ User sees error but CV is still parsed

---

### Scenario 5: Monthly Spend Cap Exceeded
**Setup**:
- Company status: `active`
- Wallet balance: $100.00
- Auto-recharge: enabled
- Monthly cap: $0.40
- Current month spent: $0.30

**Action**: Upload resume (cost $0.50)

**Expected**:
- ✅ CV parsed successfully
- ✅ Usage recorded in `cv_parsing_usage`
- ✅ Charge fails: "Monthly spend cap of $0.40 reached"
- ✅ Wallet NOT deducted: $100.00 → $100.00
- ✅ Console shows error message
- ✅ User sees error but CV is still parsed

---

## Troubleshooting

### Issue: Wallet Not Deducting
**Check**:
1. Company status is not 'trial'
2. Wallet balance is sufficient
3. Monthly cap not exceeded
4. Check server logs for error messages

**Debug**:
```bash
curl "http://localhost:3000/api/billing/debug?companyId={id}"
```

### Issue: Ledger Entry Not Created
**Check**:
1. Wallet deduction succeeded
2. Company ID is valid UUID
3. Job ID is valid UUID

**Debug**:
```sql
SELECT * FROM usage_ledger 
WHERE company_id = '{company-id}' 
ORDER BY created_at DESC;
```

### Issue: Admin Page Shows Old Data
**Solution**:
1. Refresh the page
2. Check browser cache
3. Check if API is returning fresh data

**Debug**:
```bash
curl "http://localhost:3000/api/admin/companies"
```

---

## Files Modified

### `lib/database.ts`
- Added `chargeForCVParsing()` method (lines 2389-2470)
- Handles wallet deduction with validation
- Creates ledger entries
- Supports auto-recharge

### `app/api/resumes/parse/route.ts`
- Added call to `chargeForCVParsing()` (lines 376-391)
- Captures usage record cost
- Handles charge errors gracefully
- Non-blocking (CV parsing succeeds even if charge fails)

---

## Summary

### What Works Now ✅
1. CV parsing records usage
2. Wallet deducted immediately
3. Ledger entries created for audit trail
4. Auto-recharge triggered when needed
5. Monthly spend cap enforced
6. Trial accounts not charged
7. All data synchronized across pages
8. Complete billing audit trail available

### Data Flow
```
Resume Upload
    ↓
Parse Resume
    ↓
Record Usage (cv_parsing_usage table)
    ↓
Charge for CV Parsing
    ├─ Check billing status
    ├─ Check wallet balance
    ├─ Auto-recharge if needed
    ├─ Deduct from wallet
    └─ Create ledger entry
    ↓
Return Parsed Data
    ↓
Billing Page & Admin Page Show Updated Values
```

### Verification
- Navigate to `/dashboard/settings/billing?tab=overview` to see updated wallet
- Navigate to `/admin-hiregenai/companies` to see synchronized data
- Call `/api/billing/debug?companyId={id}` to verify calculations
- Check server logs for `💳 [CV PARSING CHARGE]` messages
