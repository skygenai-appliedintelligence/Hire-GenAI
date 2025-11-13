# OpenAI API Key - Quick Reference

## ⚡ Quick Answer

**OpenAI API key comes from `.env.local` file, NOT from database**

```
.env.local
    ↓
OPENAI_API_KEY=sk-proj-xxxxx
    ↓
CVEvaluator reads it
    ↓
Calls OpenAI GPT-4o
    ↓
Returns evaluation score
```

---

## 📍 Where It's Stored

### ✅ Stored Here (Environment Variables)
```
.env.local
├── OPENAI_API_KEY=sk-proj-xxxxx (Primary)
├── OPENAI_EVAL_KEY=sk-proj-yyyyy (Fallback)
└── OPENAI_ADMIN_KEY=sk-admin-zzzzz (Optional)
```

### ❌ NOT Stored Here (Database)
```
Database Tables:
├── company_billing ❌ (No API key here)
├── companies ❌ (No API key here)
├── applications ❌ (No API key here)
└── evaluations ❌ (No API key here)
```

---

## 🔄 API Key Priority Order

```
1️⃣ Company Service Account Key (from database)
   └─ SELECT openai_service_account_key FROM companies
   
2️⃣ OPENAI_API_KEY (from .env.local)
   └─ process.env.OPENAI_API_KEY
   
3️⃣ OPENAI_EVAL_KEY (from .env.local)
   └─ process.env.OPENAI_EVAL_KEY
   
4️⃣ No Key Found
   └─ Use mock evaluation (random score)
```

---

## 📊 Flow Diagram

```
Resume Uploaded
    ↓
CV Evaluation Triggered
    ↓
┌─────────────────────────────────┐
│ Resolve API Key                 │
│                                 │
│ 1. Check database (company key) │
│ 2. Check .env.local             │
│ 3. Use mock data                │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
Key Found         No Key
    │                 │
    ▼                 ▼
OpenAI API      Mock Data
GPT-4o          Random Score
Real Score      (30-70%)
    │                 │
    └────────┬────────┘
             │
             ▼
    Store Evaluation
    Update applications table
```

---

## 🔑 Code Locations

### Where API Key is Read

**File 1: `lib/cv-evaluator.ts` (Line 199)**
```typescript
const apiKey = openaiClient?.apiKey || 
               process.env.OPENAI_API_KEY || 
               process.env.OPENAI_EVAL_KEY
```

**File 2: `app/api/applications/evaluate-cv/route.ts` (Lines 26-58)**
```typescript
// Priority 1: Company key from database
if (companyId) {
  const companyData = await DatabaseService.query(
    `SELECT openai_service_account_key FROM companies WHERE id = $1`,
    [companyId]
  )
  if (companyData[0]?.openai_service_account_key) {
    openaiApiKey = JSON.parse(companyData[0].openai_service_account_key).value
  }
}

// Priority 2: Environment variables
if (!openaiApiKey) {
  openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_EVAL_KEY
}
```

**File 3: `lib/config.ts` (Line 6)**
```typescript
openai: {
  apiKey: process.env.OPENAI_API_KEY || '',
  hasKey: !!(process.env.OPENAI_API_KEY),
}
```

---

## 🛠️ Setup

### Step 1: Get API Key
```
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with sk-proj-)
```

### Step 2: Add to .env.local
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### Step 3: Restart Server
```bash
npm run dev
```

### Step 4: Verify
```
Check logs for:
"Using environment OPENAI_API_KEY for evaluation"
```

---

## ✅ What Gets Evaluated

### CV Evaluation
```
Resume Text + Job Description
    ↓
OpenAI GPT-4o
    ↓
Returns Score (0-100)
    ↓
Stored in: applications.qualification_score
```

### Interview Evaluation
```
Interview Transcript + Job Details
    ↓
OpenAI GPT-4o
    ↓
Returns Score (0-100) with 4 categories
    ↓
Stored in: evaluations.overall_score
```

---

## 🔐 Security

✅ **Safe**:
- API key only in `.env.local` (not in git)
- API key only used server-side
- API key never exposed in logs
- API key never sent to frontend

❌ **Unsafe**:
- Committing `.env.local` to git
- Exposing API key in frontend code
- Logging API key in console
- Storing API key in database

---

## 🚨 Troubleshooting

### Problem: "No OpenAI API key configured"
```
Solution:
1. Add OPENAI_API_KEY to .env.local
2. Restart npm run dev
3. Verify key starts with sk-
```

### Problem: "OpenAI API key lacks required permissions"
```
Solution:
1. Go to https://platform.openai.com/api-keys
2. Edit the API key
3. Enable "api.responses.write" scope
4. Restart server
```

### Problem: Using Mock Data Instead of Real Evaluation
```
Solution:
1. Check if OPENAI_API_KEY is set in .env.local
2. Verify API key is valid
3. Check OpenAI account has credits
4. Check server logs for errors
```

---

## 📋 Checklist

- [ ] Have OpenAI account
- [ ] Created API key at https://platform.openai.com/api-keys
- [ ] API key starts with `sk-proj-`
- [ ] Added to `.env.local` as `OPENAI_API_KEY=sk-proj-xxxxx`
- [ ] Restarted development server
- [ ] Check logs for "Using environment OPENAI_API_KEY"
- [ ] Test CV evaluation on a resume
- [ ] Verify score is real (not mock data)

---

## 📊 Comparison

| Aspect | With API Key | Without API Key |
|--------|-------------|-----------------|
| **Evaluation** | Real AI (GPT-4o) | Mock data |
| **Score** | Accurate | Random (30-70%) |
| **Speed** | ~2-5 seconds | Instant |
| **Cost** | ~$0.01-0.05 | Free |
| **Reliability** | Depends on OpenAI | Always works |

---

## 🎯 Summary

### Key Points
1. **API key from**: `.env.local` file
2. **NOT from**: Database
3. **Priority**: Company key → Env var → Mock
4. **Used for**: CV and Interview evaluation
5. **Fallback**: Mock data if no key

### Files to Check
- `.env.local` - Add API key here
- `lib/cv-evaluator.ts` - Where key is used
- `lib/config.ts` - Configuration
- Server logs - Check if key is loaded

### Next Steps
1. Add `OPENAI_API_KEY` to `.env.local`
2. Restart development server
3. Test CV evaluation
4. Verify real scores (not mock)
