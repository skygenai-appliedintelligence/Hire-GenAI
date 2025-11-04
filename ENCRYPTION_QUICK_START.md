# 🔐 Encryption Quick Start Guide

## For New Developers

If you're setting up this project for the first time, follow these steps:

### Step 1: Generate Encryption Key

```bash
npx tsx scripts/generate-encryption-key.ts
```

### Step 2: Copy the Key

You'll see output like this:

```
✅ Encryption key generated successfully!

Add this to your .env.local file:

────────────────────────────────────────────────────────────
ENCRYPTION_KEY=Xk9pL2M3dGVzdGtleWZvcmVuY3J5cHRpb24xMjM0NTY3ODk=
────────────────────────────────────────────────────────────
```

### Step 3: Add to .env.local

Open or create `.env.local` and add the key:

```env
# Database
DATABASE_URL=your_database_url

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_ADMIN_KEY=your_admin_key
OPENAI_ORG_ID=your_org_id

# Encryption (REQUIRED for security)
ENCRYPTION_KEY=Xk9pL2M3dGVzdGtleWZvcmVuY3J5cHRpb24xMjM0NTY3ODk=

# Other settings...
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

### Step 5: Test It

1. Sign up a new user
2. Check the database - credentials should be encrypted
3. Log in - credentials should work (auto-decrypted)

## What Gets Encrypted?

When a new user signs up:
- ✅ **OpenAI Project ID** - Encrypted before storing
- ✅ **OpenAI Service Account Key** - Encrypted before storing

## Security Notes

⚠️ **IMPORTANT**:
- Keep `ENCRYPTION_KEY` secret
- Never commit it to Git (already in `.gitignore`)
- Use different keys for dev/staging/production
- Store production keys in secure secret managers

## Troubleshooting

### "ENCRYPTION_KEY not set" Warning

**Fix**: Add `ENCRYPTION_KEY` to your `.env.local` file

### Decryption Errors

**Fix**: Make sure you're using the same key that was used to encrypt the data

## Need Help?

See full documentation in `ENCRYPTION_SETUP.md`
