# OpenAI Project Integration

## Overview
Automatically creates an OpenAI project for each company during registration and stores the project ID in the database.

## Implementation

### 1. Database Schema
The `companies` table includes an `openai_project_id` column:
```sql
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS openai_project_id TEXT;
```

### 2. Company Registration Flow
When a new company registers via `DatabaseService.createCompanyFromSignup()`:

1. **OpenAI Project Creation**: Calls `createOpenAIProject()` with company name
2. **Project Description**: Auto-generated as `"Project for {CompanyName} - {Industry}"`
3. **Store Project ID**: Saved in `companies.openai_project_id` column
4. **Graceful Fallback**: If OpenAI API fails, company creation continues with `null` project ID

### 3. Code Flow
```typescript
// lib/database.ts - createCompanyFromSignup()

// Step 1: Create OpenAI project
const project = await createOpenAIProject(companyName, description)
const openaiProjectId = project?.id || null

// Step 2: Insert company with project ID
INSERT INTO companies (..., openai_project_id, ...)
VALUES (..., $12, ...)

// Step 3: Log success/failure
console.log(`✅ OpenAI project created: ${project.id}`)
```

### 4. Helper Methods

#### Update Project ID
```typescript
await DatabaseService.updateCompanyOpenAIProject(companyId, projectId)
```

#### Get Project ID
```typescript
const projectId = await DatabaseService.getCompanyOpenAIProject(companyId)
```

## Environment Variables
```env
# Required for OpenAI project creation
OPENAI_API_KEY=sk-xxxxx

# Optional: Organization ID
OPENAI_ORG_ID=org-xxxxx
```

## API Reference
Uses OpenAI Projects API v2:
- **Endpoint**: `https://api.openai.com/v1/projects`
- **Method**: POST
- **Headers**: 
  - `Authorization: Bearer {API_KEY}`
  - `OpenAI-Beta: projects=v2`
  - `OpenAI-Organization: {ORG_ID}` (optional)

## Error Handling
- **API Key Missing**: Skips project creation, logs warning
- **API Failure**: Logs error, continues with company creation
- **Empty Name**: Skips project creation
- **Network Error**: Catches exception, continues with company creation

## Logging
```
✅ [Company Signup] OpenAI project created: proj_xxxxx for Acme Corp
⚠️ [Company Signup] OpenAI project creation skipped for Acme Corp
❌ [Company Signup] Failed to create OpenAI project for Acme Corp: [error]
```

## Testing

### 1. Test with Valid API Key
```bash
# Set environment variable
OPENAI_API_KEY=sk-xxxxx

# Register a new company
# Check console for: ✅ OpenAI project created: proj_xxxxx

# Verify in database
SELECT name, openai_project_id FROM companies WHERE name = 'Test Company';
```

### 2. Test without API Key
```bash
# Remove or comment out OPENAI_API_KEY
# Register a new company
# Check console for: ⚠️ OpenAI project creation skipped

# Verify company still created
SELECT name, openai_project_id FROM companies WHERE name = 'Test Company';
# openai_project_id should be NULL
```

### 3. Verify on OpenAI Platform
1. Go to https://platform.openai.com/settings/organization/projects
2. Find project with matching name
3. Verify project ID matches database

## Benefits
✅ **Automatic**: No manual project creation needed
✅ **Isolated**: Each company gets its own OpenAI project
✅ **Trackable**: Project ID stored for future API calls
✅ **Resilient**: Company creation succeeds even if OpenAI fails
✅ **Auditable**: Clear logging for debugging

## Future Enhancements
- Associate API keys with specific projects
- Track usage per project
- Implement project-level billing
- Add project management UI in dashboard
- Bulk backfill for existing companies

## Related Files
- `lib/database.ts` - Company creation with project integration
- `lib/openai-projects.ts` - OpenAI project creation logic
- `migrations/20251028_add_openai_project_id.sql` - Database schema
- `app/api/admin/openai/projects/backfill/route.ts` - Backfill endpoint
