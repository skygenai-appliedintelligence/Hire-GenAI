# Company Service Key - Quick Setup Guide

## ✅ NOW IMPLEMENTED

All evaluations (CV parsing, interview evaluation, question generation) now use **company service account keys from the database** as the primary source.

---

## Quick Setup (3 Steps)

### Step 1: Create OpenAI API Key
```
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with sk-proj-)
```

### Step 2: Store in Database
```sql
UPDATE companies 
SET openai_service_account_key = jsonb_build_object(
  'value', 'sk-proj-xxxxxxxxxxxxx',
  'provider', 'openai',
  'created_at', NOW()
)
WHERE id = '{company-id}';
```

### Step 3: Verify
```sql
SELECT openai_service_account_key FROM companies WHERE id = '{company-id}';
```

---

## API Key Priority (All Evaluations)

```
1️⃣ Company service key (database) ← PRIMARY
2️⃣ OPENAI_API_KEY (.env.local) ← Fallback
3️⃣ OPENAI_EVAL_KEY (.env.local) ← CV parsing only
4️⃣ Mock evaluation ← Last resort
```

---

## Console Output

### With Company Key ✅
```
🔑 [CV PARSING] Using company service account key from database
🔑 [INTERVIEW EVALUATION] Using company service account key from database
```

### Fallback to Environment ⚠️
```
[CV Evaluator] Using environment OPENAI_API_KEY for evaluation
```

### Mock Evaluation ❌
```
⚠️ OPENAI_API_KEY not configured, using mock evaluation
```

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `app/api/resumes/parse/route.ts` | Lines 82-122, 217-224 | ✅ Done |
| `app/api/applications/[applicationId]/evaluate/route.ts` | Lines 203-227, 423 | ✅ Done |

---

## Testing

### Test CV Parsing
```
1. Set company service key in database
2. Upload resume
3. Check logs: "🔑 [CV PARSING] Using company service account key from database"
```

### Test Interview Evaluation
```
1. Set company service key in database
2. Complete video interview
3. Check logs: "🔑 [INTERVIEW EVALUATION] Using company service account key from database"
```

---

## Multi-Tenant Example

### Company A (Has Service Key)
```
Company A: openai_service_account_key = sk-proj-aaa...
  ↓
CV Parsing uses: sk-proj-aaa...
Interview Evaluation uses: sk-proj-aaa...
Question Generation uses: sk-proj-aaa...
```

### Company B (No Service Key)
```
Company B: openai_service_account_key = NULL
  ↓
CV Parsing uses: OPENAI_API_KEY from .env.local
Interview Evaluation uses: OPENAI_API_KEY from .env.local
Question Generation uses: OPENAI_API_KEY from .env.local
```

### Company C (No Key Anywhere)
```
Company C: openai_service_account_key = NULL
.env.local: OPENAI_API_KEY = NOT SET
  ↓
CV Parsing uses: Mock evaluation
Interview Evaluation uses: Mock evaluation
Question Generation uses: Mock evaluation
```

---

## Summary

✅ **CV Parsing** - Uses company key from database
✅ **Interview Evaluation** - Uses company key from database  
✅ **Question Generation** - Uses company key from database
✅ **Multi-Tenant** - Each company can have its own key
✅ **Fallback** - Works with environment variable or mock data

All evaluations now properly use company-specific OpenAI service account keys! 🎉
