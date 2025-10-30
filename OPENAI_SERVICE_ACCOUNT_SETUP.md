# OpenAI Project & Service Account Setup

## Overview

When a new company registers, the system now:
1. **Creates an OpenAI Project** with the company name
2. **Creates a Service Account** for that project
3. **Stores both IDs** in the database
4. **Uses the service account key** for all company API calls

This ensures usage tracking happens at the project level for each company.

## Database Schema

### New Column
```sql
ALTER TABLE companies
ADD COLUMN openai_service_account_key TEXT;
```

### Columns Used
- `companies.openai_project_id` - OpenAI project ID (e.g., `proj_xxx`)
- `companies.openai_service_account_key` - Service account API key (e.g., `sk-proj-xxx`)

## Implementation Files

### New Files Created
1. **`lib/openai-service-accounts.ts`** - Service account creation helper
   - Function: `createServiceAccount(projectId)`
   - Endpoint: `POST https://api.openai.com/v1/organization/projects/{project_id}/service_accounts`
   - Returns: `{ id, api_key, name }`

2. **`migrations/add_openai_service_account_key.sql`** - Database migration

### Modified Files
1. **`lib/database.ts`**
   - Added import for `createServiceAccount`
   - Updated `createCompanyFromSignup()` to:
     - Create project → get `proj_xxx`
     - Create service account → get `sk-proj-xxx`
     - Store both in database

2. **`app/api/test-openai-create/route.ts`**
   - Updated test endpoint to create both project and service account
   - Returns both responses for verification

## Configuration

Ensure `.env.local` contains:
```env
OPENAI_ADMIN_KEY=sk-admin-...
OPENAI_ORG_ID=org-oUvAeyk7PS4KxxpVGDBHFvnf
```

## Flow Diagram

```
Company Registration
    ↓
Create OpenAI Project
    ↓ (get proj_xxx)
Create Service Account
    ↓ (get sk-proj-xxx)
Store Both in Database
    ↓
Use sk-proj-xxx for all API calls
    ↓
Usage tracked at project level
```

## Testing

### 1. Test Endpoint
```
GET http://localhost:3000/api/test-openai-create?name=TestCompany
```

Response:
```json
{
  "success": true,
  "status": 201,
  "project": {
    "id": "proj_xxx",
    "name": "TestCompany",
    "created_at": 1234567890
  },
  "serviceAccount": {
    "id": "sa_xxx",
    "api_key": "sk-proj-xxx",
    "name": "default"
  }
}
```

### 2. Register a New Company
- Go through signup flow
- Check database:
  ```sql
  SELECT name, openai_project_id, openai_service_account_key 
  FROM companies 
  ORDER BY created_at DESC LIMIT 1;
  ```
- Both columns should be populated

## Console Logs

When a company registers, you'll see:
```
[Company Signup] 🔨 Attempting to create OpenAI project for: CompanyName
[Company Signup] 📝 Project description: Project for CompanyName - Industry
[OpenAI Projects] Creating project: CompanyName
[OpenAI Projects] Response status: 201
[Company Signup] ✅ OpenAI project created: proj_xxx for CompanyName
[Company Signup] 🔑 Creating service account for project: proj_xxx
[OpenAI Service Account] Creating service account for project: proj_xxx
[OpenAI Service Account] Response status: 201
[Company Signup] ✅ Service account created for project: proj_xxx
```

## Using Service Account Key

To use the service account key for company API calls:

```typescript
const company = await getCompany(companyId)
const serviceAccountKey = company.openai_service_account_key

// Use for API calls
const response = await fetch('https://api.openai.com/v1/...', {
  headers: {
    'Authorization': `Bearer ${serviceAccountKey}`,
  }
})
```

## Benefits

✅ **Per-Company Isolation** - Each company has its own project and API key  
✅ **Usage Tracking** - OpenAI tracks usage per project  
✅ **Security** - Service account keys are scoped to specific projects  
✅ **Scalability** - Easy to manage multiple companies  
✅ **Audit Trail** - All API calls are tied to a specific company project

## Troubleshooting

### Service Account Creation Fails
- Check that `OPENAI_ADMIN_KEY` is valid
- Verify `OPENAI_ORG_ID` is correct
- Ensure Projects API is enabled for your organization

### Database Column Missing
Run the migration:
```bash
psql $DATABASE_URL < migrations/add_openai_service_account_key.sql
```

### Service Account Key is NULL
- Check console logs for errors during signup
- Verify project was created successfully first
- Check OpenAI dashboard for service account creation
