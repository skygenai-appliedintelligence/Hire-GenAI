# Database Migration: Add Configuration to job_rounds

## Problem
The `job_rounds` table is missing the `configuration` column needed to store interview questions and evaluation criteria.

**Error:** 
```
column "configuration" of relation "job_rounds" does not exist
```

## Solution

Run the migration script to add the `configuration` column to the `job_rounds` table.

## Steps to Run Migration

### Option 1: Using Node.js Script (Recommended)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install pg dotenv
   ```

2. **Run the migration script**:
   ```bash
   node scripts/run-migration.js
   ```

3. **Verify success**:
   You should see:
   ```
   ✅ Migration completed successfully!
   ✅ Added configuration column to job_rounds table
   ✅ Verified: configuration column exists
   ```

### Option 2: Manual SQL Execution

If you prefer to run SQL manually:

1. **Connect to your database** using psql, pgAdmin, or your database GUI

2. **Run this SQL**:
   ```sql
   ALTER TABLE job_rounds 
   ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;

   COMMENT ON COLUMN job_rounds.configuration IS 'Stores interview questions and evaluation criteria as JSON: {"questions": [...], "criteria": [...]}';

   CREATE INDEX IF NOT EXISTS idx_job_rounds_configuration ON job_rounds USING GIN (configuration);
   ```

3. **Verify the column was added**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'job_rounds' 
   AND column_name = 'configuration';
   ```

## After Migration

Once the migration is complete:

1. ✅ Restart your Next.js development server
2. ✅ Try creating a job with interview questions again
3. ✅ Questions will now be saved to the database

## What This Migration Does

- **Adds** `configuration` column to `job_rounds` table
- **Type**: JSONB (JSON Binary format)
- **Default**: Empty JSON object `{}`
- **Index**: GIN index for faster JSON queries
- **Purpose**: Store interview questions and evaluation criteria

## Data Structure

The `configuration` column stores data in this format:

```json
{
  "questions": [
    "Tell me about yourself and your relevant experience.",
    "Why are you interested in this position?",
    "What motivates you in your work?",
    ...
  ],
  "criteria": [
    "Communication",
    "Culture fit",
    "Technical",
    "Team player"
  ]
}
```

## Troubleshooting

### Error: "DATABASE_URL not found"
- Make sure you have `.env.local` file with `DATABASE_URL` set
- Example: `DATABASE_URL=postgresql://user:password@host:5432/database`

### Error: "Permission denied"
- Your database user needs ALTER TABLE permissions
- Contact your database administrator

### Error: "Column already exists"
- The migration is safe to run multiple times
- If column exists, it will be skipped (IF NOT EXISTS)

### Still getting errors?
1. Check database connection: `psql $DATABASE_URL`
2. Verify table exists: `SELECT * FROM job_rounds LIMIT 1;`
3. Check user permissions: `SELECT current_user;`

## Rollback (if needed)

If you need to remove the column:

```sql
ALTER TABLE job_rounds DROP COLUMN IF EXISTS configuration;
DROP INDEX IF EXISTS idx_job_rounds_configuration;
```

⚠️ **Warning**: This will delete all stored questions and criteria!

## Support

If you encounter issues:
1. Check the migration logs in console
2. Verify your DATABASE_URL is correct
3. Ensure you have database admin permissions
4. Check PostgreSQL version (should be 9.4+)
