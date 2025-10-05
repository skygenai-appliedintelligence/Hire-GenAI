# Signup Error Fix - Duplicate Company Name

## Error Encountered

```
Error: Database connection failed: 
Invalid `prisma.$queryRawUnsafe()` invocation:
Raw query failed. Code: `23505`. Message: `Key (name)=(consulting) already exists.`
```

## Root Cause

The `companies` table has a **unique constraint** on the `name` column (PostgreSQL error code `23505` = unique violation). When a user tries to sign up with a company name that already exists in the database, the INSERT fails.

## Solution Applied

Updated `DatabaseService.createCompanyFromSignup()` to:

1. **Check if company name exists** before inserting
2. **Make name unique** by appending domain and timestamp if duplicate found
3. **Prevent constraint violations** gracefully

### Code Changes

```typescript
// Check if company name already exists and make it unique if needed
let finalCompanyName = signupData.companyName
const checkNameQuery = `
  SELECT COUNT(*) as count FROM companies WHERE name = $1
`
const nameCheck = await this.query(checkNameQuery, [finalCompanyName]) as any[]

if (nameCheck[0].count > 0) {
  // Append domain or timestamp to make name unique
  const timestamp = Date.now()
  finalCompanyName = `${signupData.companyName} (${domain.split('.')[0]}-${timestamp})`
}
```

## How It Works

### Example 1: First Company
- User enters: "Consulting"
- Database check: No existing "Consulting" found
- Stored as: "Consulting"

### Example 2: Duplicate Company
- User enters: "Consulting"
- Database check: "Consulting" already exists
- Stored as: "Consulting (example-1728045678123)"

The suffix includes:
- Email domain prefix (e.g., "example" from "user@example.com")
- Timestamp for uniqueness

## Alternative Solutions

### Option 1: Remove Unique Constraint (Not Recommended)
```sql
-- Remove unique constraint from companies.name
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_name_key;
```
**Pros:** Allows duplicate names
**Cons:** Multiple companies with same name can cause confusion

### Option 2: Use Company + Domain as Unique Key (Better)
```sql
-- Create composite unique constraint
ALTER TABLE companies ADD CONSTRAINT companies_name_domain_unique 
UNIQUE (name, primary_country);
```
**Pros:** Allows same company name in different countries
**Cons:** Requires schema change

### Option 3: Current Solution (Implemented)
**Pros:** 
- No schema changes needed
- Prevents duplicates
- User-friendly (shows original name with suffix)
**Cons:** 
- Company name might look odd with suffix

## Testing

### Test Case 1: New Company Name
```bash
# First signup with "TechCorp"
curl -X POST http://localhost:3000/api/signup/complete \
  -H "Content-Type: application/json" \
  -d '{"companyName": "TechCorp", ...}'
# Result: Creates "TechCorp"
```

### Test Case 2: Duplicate Company Name
```bash
# Second signup with "TechCorp"
curl -X POST http://localhost:3000/api/signup/complete \
  -H "Content-Type: application/json" \
  -d '{"companyName": "TechCorp", ...}'
# Result: Creates "TechCorp (example-1728045678123)"
```

## Verification

Check if the fix is working:

```sql
-- View all companies with similar names
SELECT id, name, created_at 
FROM companies 
WHERE name LIKE 'Consulting%'
ORDER BY created_at DESC;
```

Expected output:
```
id                                   | name                              | created_at
-------------------------------------|-----------------------------------|-------------------------
abc-123...                           | Consulting (example-1728045678123)| 2025-10-04 17:00:00
def-456...                           | Consulting                        | 2025-10-04 16:00:00
```

## Future Improvements

1. **Better Naming Strategy**: Use legal company name + registration number as unique identifier
2. **User Feedback**: Show warning if company name is taken
3. **Merge Companies**: Allow admin to merge duplicate companies
4. **Domain-based Uniqueness**: Make company unique per domain/country

## Related Files

- `lib/database.ts` - Contains the fix
- `app/api/signup/complete/route.ts` - Signup endpoint
- `prisma/schema.prisma` - Database schema

## Status

✅ **FIXED** - Signup now handles duplicate company names gracefully
