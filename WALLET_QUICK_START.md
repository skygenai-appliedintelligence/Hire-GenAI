# 🚀 Wallet Balance System - Quick Start Guide

## ✅ What's Been Implemented

The wallet balance system now **automatically deducts costs** from the company's wallet whenever:
- ✅ User uploads a CV
- ✅ User generates questions for a job
- ✅ User completes a video interview

All costs are tracked in real-time and displayed on the billing dashboard.

---

## 🎯 Quick Setup (3 Steps)

### **Step 1: Configure Prices in .env.local**

Add these lines to your `.env.local` file:

```env
# Billing Prices
CV_PARSING_PRICE=0.50
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.10
PROFIT_MARGIN_PERCENTAGE=0
```

### **Step 2: Initialize Wallet Balance**

Run this SQL query in your database to add $100 to your test company's wallet:

```sql
-- Replace 'your-company-id' with your actual company UUID
UPDATE company_billing
SET wallet_balance = 100.00,
    auto_recharge_enabled = true
WHERE company_id = 'your-company-id';
```

**Or find your company ID first:**
```sql
-- Find your company
SELECT id, name FROM companies ORDER BY created_at DESC LIMIT 5;

-- Then update wallet
UPDATE company_billing
SET wallet_balance = 100.00,
    auto_recharge_enabled = true
WHERE company_id = 'paste-company-id-here';
```

### **Step 3: Restart Server**

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

---

## 🧪 Test the System

### **Test 1: Upload a CV**

1. Go to: `http://localhost:3000/dashboard/jobs/[jobId]/applications`
2. Upload a CV
3. Check console logs - you should see:
   ```
   💳 [WALLET] Starting wallet deduction...
   💰 [WALLET] Current Balance: $100.00
   💸 [WALLET] Amount to Deduct: $0.50
   ✅ [WALLET] Deduction successful!
   💰 [WALLET] New Balance: $99.50
   📝 [LEDGER] Entry created successfully
   ```

4. Check dashboard: `http://localhost:3000/dashboard/settings/billing?tab=overview`
   - Wallet Balance should show: **$99.50**
   - Current Month Spent should show: **$0.50**

### **Test 2: Generate Questions**

1. Go to: `http://localhost:3000/dashboard/jobs/new`
2. Create a job with 10 AI-generated questions
3. Check console logs - you should see:
   ```
   💳 [WALLET] Starting wallet deduction...
   💰 [WALLET] Current Balance: $99.50
   💸 [WALLET] Amount to Deduct: $0.10
   ✅ [WALLET] Deduction successful!
   💰 [WALLET] New Balance: $99.40
   ```

4. Check dashboard:
   - Wallet Balance: **$99.40**
   - Current Month Spent: **$0.60**

### **Test 3: Complete Video Interview**

1. Start a video interview
2. Complete it (let's say 5 minutes)
3. Check console logs - you should see:
   ```
   💳 [WALLET] Starting wallet deduction...
   💰 [WALLET] Current Balance: $99.40
   💸 [WALLET] Amount to Deduct: $2.50
   ✅ [WALLET] Deduction successful!
   💰 [WALLET] New Balance: $96.90
   ```

4. Check dashboard:
   - Wallet Balance: **$96.90**
   - Current Month Spent: **$3.10**

---

## 📊 View Real-Time Data on Dashboard

### **Billing Overview Tab**
URL: `http://localhost:3000/dashboard/settings/billing?tab=overview`

You'll see:
- 💰 **Wallet Balance** - Current balance (updates in real-time)
- 📊 **Current Month Spent** - Spending for current month
- 📈 **Total Spent** - All-time spending
- 🔄 **Auto-Recharge** - On/Off toggle
- 💳 **Payment Method** - If configured

### **Usage Tab**
URL: `http://localhost:3000/dashboard/settings/billing?tab=usage`

Shows breakdown by service:
- CV Parsing: Count + Cost
- Question Generation: Count + Cost
- Video Interviews: Minutes + Cost

---

## 🔄 Auto-Recharge System

### **How It Works**
When wallet balance is insufficient:
1. System checks if `auto_recharge_enabled = true`
2. If yes: Automatically adds $100 to wallet
3. If no: Shows error but doesn't block the action

### **Enable Auto-Recharge**
```sql
UPDATE company_billing
SET auto_recharge_enabled = true
WHERE company_id = 'your-company-id';
```

### **Test Auto-Recharge**
```sql
-- Set wallet to $0.10
UPDATE company_billing
SET wallet_balance = 0.10
WHERE company_id = 'your-company-id';

-- Now upload a CV ($0.50 cost)
-- System should auto-recharge to $100.00
-- Then deduct $0.50
-- Final balance: $99.50
```

---

## 📝 Verify Everything is Working

### **Check Wallet Balance**
```sql
SELECT 
  wallet_balance,
  current_month_spent,
  total_spent,
  auto_recharge_enabled
FROM company_billing
WHERE company_id = 'your-company-id';
```

### **Check Recent Transactions**
```sql
SELECT 
  entry_type,
  description,
  amount,
  balance_before,
  balance_after,
  created_at
FROM usage_ledger
WHERE company_id = 'your-company-id'
ORDER BY created_at DESC
LIMIT 10;
```

### **Check Usage Records**
```sql
-- CV Parsing
SELECT COUNT(*) as count, SUM(cost) as total_cost
FROM cv_parsing_usage
WHERE company_id = 'your-company-id';

-- Question Generation
SELECT COUNT(*) as count, SUM(cost) as total_cost
FROM question_generation_usage
WHERE company_id = 'your-company-id';

-- Video Interviews
SELECT COUNT(*) as count, SUM(cost) as total_cost
FROM video_interview_usage
WHERE company_id = 'your-company-id';
```

---

## 🎯 Console Logs to Watch For

### **Successful Wallet Deduction**
```
💳 [WALLET] Starting wallet deduction...
💰 [WALLET] Current Balance: $X.XX
💸 [WALLET] Amount to Deduct: $X.XX
✅ [WALLET] Deduction successful!
💰 [WALLET] New Balance: $X.XX
📝 [LEDGER] Entry created successfully
```

### **Insufficient Balance (Auto-Recharge Enabled)**
```
⚠️  [WALLET] Insufficient balance!
🔄 [WALLET] Auto-recharge enabled, attempting recharge...
✅ [WALLET] Auto-recharge successful!
💰 [WALLET] New Balance: $100.00
```

### **Insufficient Balance (Auto-Recharge Disabled)**
```
⚠️  [WALLET] Insufficient balance!
❌ [WALLET] Auto-recharge disabled, cannot proceed
⚠️  [WALLET] CV parsing succeeded but wallet was not charged
```

---

## ⚠️ Troubleshooting

### **Problem: Wallet not deducting**

**Check 1: Billing initialized?**
```sql
SELECT * FROM company_billing WHERE company_id = 'your-company-id';
```
If empty, run:
```sql
INSERT INTO company_billing (company_id, wallet_balance, auto_recharge_enabled)
VALUES ('your-company-id', 100.00, true);
```

**Check 2: Environment variables set?**
```env
CV_PARSING_PRICE=0.50
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.10
```

**Check 3: Server restarted?**
- Stop server (Ctrl+C)
- Start again: `npm run dev`

### **Problem: Dashboard not showing updated balance**

**Solution:** Refresh the page
- The API fetches real-time data from database
- If not updating, check browser console for errors

### **Problem: Auto-recharge not working**

**Check:**
```sql
SELECT auto_recharge_enabled FROM company_billing WHERE company_id = 'your-company-id';
```
Should be `true`. If not:
```sql
UPDATE company_billing SET auto_recharge_enabled = true WHERE company_id = 'your-company-id';
```

---

## 📚 Full Documentation

For detailed information, see:
- **WALLET_DEDUCTION_SYSTEM.md** - Complete system architecture
- **ENV_PRICING_CONFIGURATION.md** - Pricing configuration guide

---

## 🎉 You're All Set!

The wallet balance system is now fully operational:

✅ Automatic deductions on CV upload, question generation, and video interviews
✅ Real-time balance tracking on dashboard
✅ Auto-recharge when balance is low
✅ Complete audit trail in usage_ledger table
✅ Configurable pricing via .env file

Start testing by uploading a CV or creating a job with questions!
