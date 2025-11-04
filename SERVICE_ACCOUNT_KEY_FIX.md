# 🔧 Service Account Key Storage Fix

## समस्या (Problem)

Service account key database में NULL show हो रहा था, जबकि project ID सही से encrypted होकर store हो रहा था।

## मूल कारण (Root Cause)

OpenAI API service account create करते समय `api_key` को object के रूप में return करता है:

```json
{
  "id": "svc_abc123",
  "name": "default",
  "api_key": {
    "value": "sk-service-proj-abc123...",
    "created_at": 1234567890
  }
}
```

हमारा code सिर्फ `data.api_key` को access कर रहा था, जो एक object है, string नहीं। इसलिए encryption fail हो रहा था और NULL store हो रहा था।

## समाधान (Solution)

Updated `lib/openai-service-accounts.ts` to properly extract the API key:

```typescript
// Before (WRONG):
return { id: data.id, api_key: data.api_key, name: data.name }

// After (CORRECT):
const apiKey = data.api_key?.value || data.api_key
if (!apiKey) {
  console.error('[OpenAI Service Account] ❌ No API key in response:', data)
  return null
}
return { id: data.id, api_key: apiKey, name: data.name }
```

## अब क्या होगा (What Happens Now)

### 1. नए Signups के लिए
जब कोई नया user signup करेगा:

1. ✅ OpenAI project बनेगा
2. ✅ Service account बनेगा
3. ✅ API key properly extract होगी (`api_key.value`)
4. ✅ API key **encrypted** होकर database में store होगी
5. ✅ Project ID भी **encrypted** होकर store होगी

### 2. Database में Storage

```sql
-- Encrypted format में store होगा:
openai_project_id: "Xk9pL2M3...==:Ym5jdG...==:ZGF0YQ...=="
openai_service_account_key: "dGVzdA...==:cGFzc3...==:a2V5ZGF...=="
```

### 3. Retrieval के समय

जब भी company data fetch होगा, automatically decrypt हो जाएगा:

```typescript
const company = await DatabaseService.getCompanyById(companyId)
// company.openai_project_id = "proj_abc123" (decrypted)
// company.openai_service_account_key = "sk-service-proj-abc..." (decrypted)
```

## Existing Companies के लिए

अगर पहले से companies हैं जिनमें service account key NULL है, तो backfill करना होगा:

### Option 1: Admin UI (Recommended)
```
Visit: http://localhost:3000/admin/openai-backfill
```

### Option 2: API Endpoint
```bash
POST /api/admin/openai/projects/backfill-all
```

## Testing

### Test New Signup:
1. नया user signup करें
2. Console logs देखें:
   ```
   ✅ [Company Signup] OpenAI project created and encrypted: proj_xxx
   ✅ [Company Signup] Service account created and encrypted for project: proj_xxx
   ```
3. Database check करें:
   ```sql
   SELECT 
     openai_project_id, 
     openai_service_account_key 
   FROM companies 
   WHERE name = 'Test Company';
   ```
4. दोनों fields में encrypted strings होनी चाहिए (NULL नहीं)

### Verify Encryption:
```typescript
// In your code
const company = await DatabaseService.getCompanyById(companyId)
console.log('Project ID:', company.openai_project_id) // Should be decrypted
console.log('Service Key:', company.openai_service_account_key) // Should be decrypted
```

## Security Benefits

✅ **Project ID encrypted** - Database में plain text नहीं दिखेगा
✅ **Service Account Key encrypted** - API key secure रहेगी
✅ **AES-256-GCM encryption** - Military-grade security
✅ **Automatic decryption** - Application में use करते समय auto-decrypt

## Environment Variables Required

```env
# OpenAI Configuration
OPENAI_ADMIN_KEY=sk-admin-xxxxx
OPENAI_ORG_ID=org-xxxxx

# Encryption (REQUIRED)
ENCRYPTION_KEY=your_generated_key_here
```

## Files Modified

- `lib/openai-service-accounts.ts` - Fixed API key extraction
- `lib/database.ts` - Already has encryption/decryption (no changes needed)
- `lib/encryption.ts` - Already exists (no changes needed)

## Next Steps

1. ✅ Fix applied - Service account key will now be extracted correctly
2. ✅ Encryption already in place - Will be encrypted before storage
3. ✅ Decryption already in place - Will be decrypted on retrieval
4. 🔄 Test with new signup to verify
5. 🔄 Backfill existing companies if needed

## Summary

**पहले:** Service account key NULL store हो रहा था
**अब:** Service account key properly encrypted होकर store होगा

**Security Level:** 🔒🔒🔒 Maximum (AES-256-GCM encrypted)
