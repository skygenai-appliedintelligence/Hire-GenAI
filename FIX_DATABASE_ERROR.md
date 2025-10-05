# 🔧 Quick Fix: Database Configuration Column Missing

## The Problem
```
❌ Error: column "configuration" of relation "job_rounds" does not exist
```

Your database is missing the `configuration` column needed to store interview questions.

## ⚡ Quick Fix (2 minutes)

### Step 1: Install dependencies
```bash
npm install pg dotenv
```

### Step 2: Run migration
```bash
node scripts/run-migration.js
```

### Step 3: Restart dev server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 4: Test
1. Go to `http://localhost:3000/dashboard/jobs/new`
2. Fill job form → Interview tab
3. Click "Generate Questions"
4. Click "Create Job & Setup Agents"
5. ✅ Questions should save without errors!

---

## Alternative: Manual SQL (if script doesn't work)

1. **Open your database** (pgAdmin, psql, etc.)

2. **Run this SQL**:
```sql
ALTER TABLE job_rounds 
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_job_rounds_configuration 
ON job_rounds USING GIN (configuration);
```

3. **Restart** your Next.js server

---

## ✅ Success Indicators

After migration, you should see:
- ✅ No more "column does not exist" errors
- ✅ Questions saved successfully in console
- ✅ Job created and redirected to jobs list

---

## 📖 Detailed Instructions

See `MIGRATION_INSTRUCTIONS.md` for:
- Troubleshooting steps
- Manual SQL execution
- Rollback instructions
- Data structure details

---

## 🆘 Still Having Issues?

1. **Check DATABASE_URL**: Make sure it's set in `.env.local`
2. **Check permissions**: Database user needs ALTER TABLE rights
3. **Check connection**: Try `psql $DATABASE_URL`
4. **View logs**: Check terminal for detailed error messages
