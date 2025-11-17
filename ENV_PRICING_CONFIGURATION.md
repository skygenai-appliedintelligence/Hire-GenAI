# 💰 Environment Variable Pricing Configuration

## 📋 Required Environment Variables

Add these to your `.env.local` file to configure wallet deduction pricing:

```env
# ============================================
# BILLING PRICES
# ============================================

# CV Parsing Price (per CV)
# Default: $0.50 per CV
CV_PARSING_PRICE=0.50

# Video Interview Price (per minute)
# Default: $0.50 per minute
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50

# Question Generation Price (per 10 questions)
# Default: $0.10 per 10 questions
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.10

# Profit Margin Percentage (optional)
# Default: 0 (no markup)
# Set to 20 for 20% markup, 25 for 25% markup, etc.
PROFIT_MARGIN_PERCENTAGE=0
```

---

## 🎯 How Pricing Works

### **1. CV Parsing**
```
Cost = CV_PARSING_PRICE
Example: $0.50 per CV uploaded
```

**When Charged:**
- User uploads CV via application form
- Recruiter uploads CV for candidate
- CV is parsed and evaluated

**Console Log:**
```
💰 Final Cost: $0.50
💸 [WALLET] Amount to Deduct: $0.50
```

---

### **2. Question Generation**
```
Cost = (questionCount / 10) × QUESTION_GENERATION_PRICE_PER_10_QUESTIONS
Example: 10 questions = $0.10
         20 questions = $0.20
         5 questions = $0.05
```

**When Charged:**
- Creating new job with AI-generated questions
- Regenerating questions for existing job
- Only charged for saved jobs (not drafts)

**Console Log:**
```
💰 Final Cost: $0.10 (for 10 questions)
💵 Rate: $0.10 per 10 questions
❓ Questions: 10
```

---

### **3. Video Interview**
```
Cost = durationMinutes × VIDEO_INTERVIEW_PRICE_PER_MINUTE
Example: 5 minutes = $2.50
         10 minutes = $5.00
         1.5 minutes = $0.75
```

**When Charged:**
- Video interview is completed
- Duration calculated from start to end time
- Minimum 1 minute charged

**Console Log:**
```
💰 Final Cost: $5.00
⏱️  Duration: 10 minutes
⏱️  Cost per Minute: $0.50
```

---

## 🔧 Configuration Examples

### **Low-Cost Configuration**
```env
CV_PARSING_PRICE=0.25
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.25
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.05
PROFIT_MARGIN_PERCENTAGE=0
```

**Result:**
- CV: $0.25 per upload
- Questions: $0.05 per 10 questions
- Video: $0.25 per minute

---

### **Standard Configuration (Default)**
```env
CV_PARSING_PRICE=0.50
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.50
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.10
PROFIT_MARGIN_PERCENTAGE=0
```

**Result:**
- CV: $0.50 per upload
- Questions: $0.10 per 10 questions
- Video: $0.50 per minute

---

### **Premium Configuration**
```env
CV_PARSING_PRICE=1.00
VIDEO_INTERVIEW_PRICE_PER_MINUTE=1.00
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.20
PROFIT_MARGIN_PERCENTAGE=25
```

**Result (with 25% markup):**
- CV: $1.25 per upload ($1.00 + 25%)
- Questions: $0.25 per 10 questions ($0.20 + 25%)
- Video: $1.25 per minute ($1.00 + 25%)

---

## 📊 Cost Calculation Examples

### **Example 1: Small Company**
**Activity:**
- 10 CVs uploaded
- 1 job with 10 questions
- 2 interviews (5 minutes each)

**Cost Breakdown (Standard Pricing):**
```
CVs:        10 × $0.50 = $5.00
Questions:  1 × $0.10 = $0.10
Interviews: 10 min × $0.50 = $5.00
-----------------------------------
Total:                    $10.10
```

---

### **Example 2: Medium Company**
**Activity:**
- 50 CVs uploaded
- 5 jobs with 10 questions each
- 10 interviews (8 minutes average)

**Cost Breakdown (Standard Pricing):**
```
CVs:        50 × $0.50 = $25.00
Questions:  5 × $0.10 = $0.50
Interviews: 80 min × $0.50 = $40.00
-----------------------------------
Total:                    $65.50
```

---

### **Example 3: Large Company**
**Activity:**
- 200 CVs uploaded
- 20 jobs with 10 questions each
- 50 interviews (10 minutes average)

**Cost Breakdown (Standard Pricing):**
```
CVs:        200 × $0.50 = $100.00
Questions:  20 × $0.10 = $2.00
Interviews: 500 min × $0.50 = $250.00
-----------------------------------
Total:                    $352.00
```

---

## 🔄 Changing Prices

### **Step 1: Update .env.local**
```env
# Change prices
CV_PARSING_PRICE=0.75
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.60
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.15
```

### **Step 2: Restart Server**
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### **Step 3: Verify**
```
1. Check console logs for new prices
2. Perform a test action (upload CV)
3. Verify wallet deduction matches new price
```

---

## ⚠️ Important Notes

### **Price Changes**
- New prices apply immediately after server restart
- Old usage records keep their original prices
- Historical data is not affected

### **Profit Margin**
- Currently set to 0 (no markup)
- Can be changed to add percentage markup
- Applied on top of base prices
- Example: 20% margin on $0.50 = $0.60 final cost

### **Minimum Charges**
- Video interviews: Minimum 1 minute charged
- Questions: Charged per 10 questions (fractional allowed)
- CV: Always $0.50 per CV (no fractional)

### **Draft Jobs**
- Question generation for draft jobs is NOT charged
- Only charged when job is saved
- Prevents charging for abandoned drafts

---

## 🧪 Testing Price Changes

### **Test 1: CV Parsing**
```bash
# Set price to $0.75
CV_PARSING_PRICE=0.75

# Restart server
# Upload CV
# Check console: Should show $0.75 deduction
```

### **Test 2: Question Generation**
```bash
# Set price to $0.15
QUESTION_GENERATION_PRICE_PER_10_QUESTIONS=0.15

# Restart server
# Create job with 10 questions
# Check console: Should show $0.15 deduction
```

### **Test 3: Video Interview**
```bash
# Set price to $0.60
VIDEO_INTERVIEW_PRICE_PER_MINUTE=0.60

# Restart server
# Complete 5-minute interview
# Check console: Should show $3.00 deduction (5 × $0.60)
```

---

## 📝 Verification Queries

### **Check Current Prices in Use**
```sql
-- Check recent CV parsing costs
SELECT cost, created_at 
FROM cv_parsing_usage 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent question generation costs
SELECT cost, question_count, created_at 
FROM question_generation_usage 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent video interview costs
SELECT cost, duration_minutes, created_at 
FROM video_interview_usage 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🎉 Summary

✅ **Flexible pricing** via environment variables
✅ **No code changes** needed to adjust prices
✅ **Instant updates** after server restart
✅ **Historical data preserved** with original prices
✅ **Optional profit margin** for markup
✅ **Clear cost breakdown** in console logs
✅ **Real-time wallet deduction** based on configured prices

Configure your prices in `.env.local` and restart the server to apply changes!
