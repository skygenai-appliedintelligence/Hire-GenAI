# OpenAI Admin API Key Setup Guide

## The Issue
You're getting a **404 Not Found** error because the OpenAI Usage API requires an **Admin API Key**, not a regular API key.

## Quick Fix (5 minutes)

### Step 1: Get an Admin API Key
1. Go to: https://platform.openai.com/settings/organization/admin-keys
2. Click **"Create new admin key"**
3. Give it a name (e.g., "HireGenAI Admin Key")
4. Copy the key (starts with `sk-proj-...`)

### Step 2: Update Your Environment Variable
1. Open your `.env.local` file
2. Replace the existing `OPENAI_API_KEY` value with your new Admin key:
   ```env
   OPENAI_API_KEY=sk-proj-YOUR_NEW_ADMIN_KEY_HERE
   ```
3. Save the file

### Step 3: Restart Your Development Server
```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 4: Test the Integration
1. Visit: http://localhost:3000/dashboard/settings/billing?tab=usage
2. You should now see real usage data from OpenAI
3. No more 404 errors!

## What's the Difference?

| Feature | Regular API Key | Admin API Key |
|---------|----------------|---------------|
| Make API calls (completions, embeddings, etc.) | ✅ Yes | ✅ Yes |
| Access usage data | ❌ No (404 error) | ✅ Yes |
| Access billing information | ❌ No | ✅ Yes |
| View organization metrics | ❌ No | ✅ Yes |

## Security Note
Admin keys have more permissions than regular keys. Keep them secure:
- ✅ Store in `.env.local` (not committed to git)
- ✅ Use environment variables in production
- ❌ Don't share or expose in client-side code
- ❌ Don't commit to version control

## Verification
After setup, check your browser console. You should see:
- ✅ No 404 errors
- ✅ Usage data displayed on the billing page
- ✅ Real token counts and costs

## Still Having Issues?
If you still get errors after using an Admin key:
1. Verify the key is copied correctly (no extra spaces)
2. Make sure you restarted the dev server
3. Check that your organization has usage data in the selected date range
4. Try a longer date range (30 or 90 days)

## Need Help?
Check the full documentation: `OPENAI_PLATFORM_USAGE_INTEGRATION.md`
