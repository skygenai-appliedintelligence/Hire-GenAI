# Company API Client Usage Guide

## Overview

The `CompanyAPIClient` automatically uses each company's service account key for all API calls. This ensures:
- ✅ Usage is tracked at the company's project level in OpenAI
- ✅ Each company has isolated API credentials
- ✅ Billing and usage analytics are per-company

## Basic Usage

### 1. Initialize the Client

```typescript
import { createCompanyAPIClient } from '@/lib/company-api-client'

// In your API route or server action
const client = await createCompanyAPIClient(companyId)
```

### 2. Make API Calls

#### Simple GET Request
```typescript
const response = await client.fetch('https://api.openai.com/v1/models')
const data = await response.json()
```

#### POST Request with JSON
```typescript
const result = await client.fetchJSON('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
})
```

#### Get Company Credentials
```typescript
const serviceAccountKey = client.getServiceAccountKey()
const projectId = await client.getProjectId()

console.log(`Using project: ${projectId}`)
console.log(`Service account key: ${serviceAccountKey?.substring(0, 20)}…`)
```

## Real-World Examples

### Example 1: CV Evaluation with Company Tracking

```typescript
// app/api/applications/evaluate-cv/route.ts
import { createCompanyAPIClient } from '@/lib/company-api-client'

export async function POST(req: Request) {
  const { companyId, cvText } = await req.json()

  // Initialize client with company's service account key
  const client = await createCompanyAPIClient(companyId)

  // All API calls now use the company's service account key
  const evaluation = await client.fetchJSON(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Evaluate this CV:\n${cvText}`,
          },
        ],
      }),
    }
  )

  // Usage is automatically tracked at company's project level
  return Response.json(evaluation)
}
```

### Example 2: Question Generation with Company Tracking

```typescript
// app/api/ai/generate-questions/route.ts
import { createCompanyAPIClient } from '@/lib/company-api-client'

export async function POST(req: Request) {
  const { companyId, jobDescription } = await req.json()

  const client = await createCompanyAPIClient(companyId)

  const questions = await client.fetchJSON(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `Generate interview questions for:\n${jobDescription}`,
          },
        ],
      }),
    }
  )

  return Response.json(questions)
}
```

### Example 3: Error Handling

```typescript
import { createCompanyAPIClient } from '@/lib/company-api-client'

export async function POST(req: Request) {
  const { companyId, prompt } = await req.json()

  try {
    const client = await createCompanyAPIClient(companyId)

    const response = await client.fetchJSON(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
        }),
      }
    )

    return Response.json({ success: true, data: response })
  } catch (error: any) {
    console.error(`[Company API] Error for company ${companyId}:`, error.message)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

## Console Logs

When using the client, you'll see:

```
[CompanyAPIClient] ✅ Initialized for company: Acme Corp (550e8400-e29b-41d4-a716-446655440000)
[CompanyAPIClient] 📤 API Call: POST https://api.openai.com/v1/chat/completions
[CompanyAPIClient] 📥 Response: 200 OK (Company: 550e8400-e29b-41d4-a716-446655440000)
```

## Usage Tracking

All API calls made through `CompanyAPIClient` are:
- ✅ Tracked at the company's OpenAI project level
- ✅ Visible in OpenAI dashboard under the company's project
- ✅ Billed to the company's project

## Database Requirements

Ensure the company record has:
- `openai_project_id` - Project ID (created during signup)
- `openai_service_account_key` - Service account API key (created during signup)

```sql
SELECT name, openai_project_id, openai_service_account_key 
FROM companies 
WHERE id = 'company-id-here';
```

## Migration Path

### Before (No Project Tracking)
```typescript
// All companies share the same API key
const response = await fetch('https://api.openai.com/v1/...', {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  }
})
// Usage not tracked per-company
```

### After (Per-Company Tracking)
```typescript
// Each company uses their own service account key
const client = await createCompanyAPIClient(companyId)
const response = await client.fetch('https://api.openai.com/v1/...')
// Usage tracked at company's project level
```

## Troubleshooting

### "Service account key not available"
- Ensure company was created after service account implementation
- Check database: `SELECT openai_service_account_key FROM companies WHERE id = '...'`
- If NULL, run backfill to create service accounts for existing companies

### "Company not found"
- Verify the `companyId` is correct
- Check if company exists: `SELECT id, name FROM companies WHERE id = '...'`

### API Calls Failing
- Check console logs for the exact error
- Verify service account key is valid in OpenAI dashboard
- Ensure the project hasn't been archived

## Next Steps

1. **Update existing API endpoints** to use `CompanyAPIClient`
2. **Test with a company** that has service account key
3. **Monitor OpenAI dashboard** to verify usage is tracked per-project
4. **Backfill service accounts** for existing companies (if needed)
