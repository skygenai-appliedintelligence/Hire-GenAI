# 🔐 Encryption Setup for Sensitive Data

## Overview

This application encrypts sensitive OpenAI credentials before storing them in the database:
- **OpenAI Project IDs** (`openai_project_id`)
- **OpenAI Service Account Keys** (`openai_service_account_key`)

## Encryption Method

- **Algorithm**: AES-256-GCM (Authenticated Encryption)
- **Key Derivation**: Scrypt
- **Storage Format**: `iv:authTag:encryptedData` (all base64 encoded)

## Setup Instructions

### 1. Generate Encryption Key

Run the key generation script:

```bash
npx tsx scripts/generate-encryption-key.ts
```

This will output a secure random key like:
```
ENCRYPTION_KEY=abc123xyz789...
```

### 2. Add to Environment Variables

Add the generated key to your `.env.local` file:

```env
# Encryption key for sensitive data (KEEP SECRET!)
ENCRYPTION_KEY=your_generated_key_here
```

### 3. Restart Your Application

After adding the key, restart your development server:

```bash
npm run dev
```

## Security Best Practices

### ✅ DO:
- **Generate a unique key** for each environment (dev, staging, production)
- **Store keys securely** in environment variables or secret managers
- **Backup your encryption key** in a secure password manager
- **Use different keys** for different databases
- **Rotate keys periodically** (requires re-encryption of existing data)

### ❌ DON'T:
- **Never commit** the encryption key to version control
- **Never share** the key in plain text (email, Slack, etc.)
- **Never use** the default development key in production
- **Never lose** the key (encrypted data cannot be recovered)

## How It Works

### During Signup (Encryption)

1. User signs up and company is created
2. OpenAI project and service account are created
3. **Project ID and API key are encrypted** using AES-256-GCM
4. Encrypted values are stored in the database

```typescript
// In lib/database.ts - createCompanyFromSignup()
const { encrypt } = await import('./encryption')
openaiProjectId = encrypt(project.id)
openaiServiceAccountKey = encrypt(serviceAccount.api_key)
```

### During Retrieval (Decryption)

1. Application queries company data from database
2. **Encrypted values are decrypted** before returning
3. Decrypted values are used for OpenAI API calls

```typescript
// In lib/database.ts - getCompanyById()
const { decrypt } = await import('./encryption')
result[0].openai_project_id = decrypt(result[0].openai_project_id)
result[0].openai_service_account_key = decrypt(result[0].openai_service_account_key)
```

## Database Storage

In the database, the encrypted values look like this:

```
openai_project_id: "Xk9pL2M3...==:Ym5jdG...==:ZGF0YQ...=="
                    └─ IV ─┘  └─ Tag ─┘  └─ Data ─┘
```

This is **not human-readable** and cannot be decrypted without the encryption key.

## Key Rotation (Advanced)

If you need to rotate your encryption key:

1. Generate a new encryption key
2. Create a migration script to:
   - Decrypt all existing data with the old key
   - Re-encrypt with the new key
   - Update the database
3. Update `ENCRYPTION_KEY` in all environments
4. Restart all services

**Note**: Key rotation requires careful planning and should be done during maintenance windows.

## Troubleshooting

### Error: "ENCRYPTION_KEY not set in environment"

**Solution**: Add `ENCRYPTION_KEY` to your `.env.local` file using the generated key.

### Error: "Decryption failed"

**Possible causes**:
1. Wrong encryption key in environment
2. Data was encrypted with a different key
3. Corrupted encrypted data

**Solution**: Verify you're using the correct encryption key for this database.

### Warning: "Using default key (NOT SECURE FOR PRODUCTION)"

**Solution**: This is fine for local development, but you **MUST** set a proper `ENCRYPTION_KEY` for production.

## Files Modified

- `lib/encryption.ts` - Encryption/decryption utilities
- `lib/database.ts` - Encrypt on write, decrypt on read
- `scripts/generate-encryption-key.ts` - Key generation script

## Testing

To verify encryption is working:

1. Sign up a new user
2. Check the database directly:
   ```sql
   SELECT openai_project_id, openai_service_account_key 
   FROM companies 
   WHERE id = 'your-company-id';
   ```
3. Values should be long encrypted strings (not plain text)
4. In your application, the values should be automatically decrypted

## Compliance

This encryption approach helps with:
- **GDPR**: Protecting sensitive personal/business data
- **PCI DSS**: Securing API keys and credentials
- **SOC 2**: Demonstrating data protection controls
- **ISO 27001**: Meeting information security standards

## Support

For questions or issues with encryption setup, please contact your development team.
