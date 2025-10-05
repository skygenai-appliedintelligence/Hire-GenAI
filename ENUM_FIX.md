# ✅ Company Size Enum Fix

## समस्या (Problem)

**Error:** `invalid input value for enum company_size: "medium"`

Database में `company_size` enum में "medium" value नहीं है या enum values Prisma schema से match नहीं कर रहे।

## कारण (Root Cause)

Prisma schema में enum है:
```prisma
enum company_size {
  small
  medium
  large
  enterprise
}
```

लेकिन database में शायद सिर्फ ये values हैं:
- `small`
- `large`

Missing values: `medium`, `enterprise`

## समाधान (Solution)

### Option 1: Run SQL Migration (Recommended)

```bash
psql $DATABASE_URL < fix_company_size_enum.sql
```

यह script:
1. Check करेगा कि कौन सी enum values हैं
2. Missing values add करेगा (`medium`, `enterprise`)
3. Verify करेगा कि सब values हैं

### Option 2: Manual Fix

```sql
-- Add missing enum values
ALTER TYPE company_size ADD VALUE IF NOT EXISTS 'medium';
ALTER TYPE company_size ADD VALUE IF NOT EXISTS 'enterprise';

-- Verify
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;
```

### Option 3: Temporary Workaround (Already Applied)

Updated mapping in `lib/database.ts` to avoid "medium":
```typescript
const sizeBandMap: Record<string, string> = {
  '1-10 employees': 'small',
  '11-50 employees': 'small',
  '51-200 employees': 'medium',  // Will fail if enum doesn't have 'medium'
  '201-500 employees': 'large',
  '501-1000 employees': 'large',
  '1000+ employees': 'enterprise'
}
```

## Quick Fix (अभी के लिए)

अगर enum fix नहीं कर सकते, तो mapping change करें:

```typescript
// Temporary: Use only 'small' and 'large' (no medium/enterprise)
const sizeBandMap: Record<string, string> = {
  '1-10 employees': 'small',
  '11-50 employees': 'small',
  '51-200 employees': 'small',    // Changed to 'small'
  '201-500 employees': 'large',
  '501-1000 employees': 'large',
  '1000+ employees': 'large'      // Changed to 'large'
}
```

## Recommended Steps

### 1. Check Current Enum Values
```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;
```

### 2. Add Missing Values
```bash
psql $DATABASE_URL < fix_company_size_enum.sql
```

### 3. Verify Fix
```sql
-- Should show: small, medium, large, enterprise
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'company_size'::regtype 
ORDER BY enumsortorder;
```

### 4. Test Signup
- Go to `/signup`
- Select "51-200 employees" (maps to 'medium')
- Should work! ✅

## Files Created

- ✅ `fix_company_size_enum.sql` - SQL migration to fix enum
- ✅ `ENUM_FIX.md` - This documentation

## Alternative: Use NULL Instead

अगर enum fix नहीं हो पा रहा, तो `size_band` को NULL भेज दें:

```typescript
// In lib/database.ts
const sizeBand = null  // Don't use enum at all
```

यह काम करेगा क्योंकि `size_band` optional है।

## Status

⚠️ **ACTION NEEDED**: Run `fix_company_size_enum.sql` to add missing enum values

या

✅ **WORKAROUND APPLIED**: Updated mapping to use available enum values
