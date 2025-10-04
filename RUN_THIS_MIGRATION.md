# Run This Migration to Enable Resume Text Storage

## What This Does

Adds the `resume_text` column to the `applications` table so parsed resume content can be stored in the database.

## How to Run

### Option 1: Using psql (Recommended)

```bash
# Connect to your database and run the migration
psql -h <your-host> -U <your-user> -d <your-database> -f scripts/add-qualification-columns.sql
```

### Option 2: Using Database GUI (pgAdmin, TablePlus, etc.)

1. Open your database GUI
2. Connect to your database
3. Open `scripts/add-qualification-columns.sql`
4. Execute the SQL script

### Option 3: Copy-paste SQL

Connect to your database and run this SQL:

```sql
-- Add resume_text column (parsed resume content)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS resume_text TEXT;

-- Add qualification_score column (0-100)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_score INTEGER;

-- Add is_qualified column (boolean result)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_qualified BOOLEAN;

-- Add qualification_threshold_used column (audit trail)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_threshold_used INTEGER;

-- Add qualification_explanations column (JSON with reasoning, matches, gaps)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS qualification_explanations JSONB;

-- Add parsing_status column (success, failed, pending)
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS parsing_status VARCHAR(20);

-- Add min_qualification_score to jobs table (per-job threshold override)
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS min_qualification_score INTEGER DEFAULT 40;

-- Add index for quick filtering by qualification status
CREATE INDEX IF NOT EXISTS idx_applications_is_qualified ON applications(is_qualified);
CREATE INDEX IF NOT EXISTS idx_applications_qualification_score ON applications(qualification_score);
CREATE INDEX IF NOT EXISTS idx_applications_parsing_status ON applications(parsing_status);
```

## Verify It Worked

After running the migration, verify the column exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name = 'resume_text';
```

You should see:
```
 column_name | data_type 
-------------+-----------
 resume_text | text
```

## What Happens Next

Once the migration is complete:

1. ✅ Resume parsing will automatically save parsed text to `applications.resume_text`
2. ✅ You can query resume content directly from the database
3. ✅ Resume content persists even if file storage fails
4. ✅ Full-text search on resumes becomes possible

## Test It

1. Apply to a job with a resume
2. Check the database:

```sql
SELECT id, resume_text 
FROM applications 
WHERE resume_text IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

You should see the parsed resume text!
