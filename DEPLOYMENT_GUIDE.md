# Owner Login System - Deployment Guide

## 🚀 Quick Deployment (10 minutes)

### Prerequisites
- PostgreSQL database running
- Node.js 18+ installed
- `.env.local` file configured

### Step 1: Configure Environment Variables

Add to `.env.local`:

```env
# Owner email for admin access
OWNER_EMAIL=support@hire-genai.com

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hire-genai.com
```

**Gmail Setup:**
1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use generated password as `SMTP_PASSWORD`

### Step 2: Apply Database Migration

```bash
# Option 1: Using Prisma (Recommended)
npx prisma migrate deploy

# Option 2: Using psql directly
psql -U postgres -d hire_genai -f migrations/20251112_create_admin_sessions.sql
```

**Verify migration:**
```bash
psql -U postgres -d hire_genai -c "\d admin_sessions"
```

### Step 3: Restart Application

```bash
# Development
npm run dev

# Production
npm run build
npm run start
```

### Step 4: Test Login Flow

1. Visit `http://localhost:3000`
2. Click "Admin" in footer
3. Enter owner email
4. Check email for OTP
5. Enter OTP code
6. Verify redirect to admin dashboard

## 📋 Pre-Deployment Checklist

### Database
- [ ] PostgreSQL running
- [ ] `hire_genai` database exists
- [ ] Connection string in `.env.local`
- [ ] Backup created: `pg_dump hire_genai > backup.sql`

### Environment
- [ ] `OWNER_EMAIL` configured
- [ ] `SMTP_HOST` configured
- [ ] `SMTP_PORT` configured
- [ ] `SMTP_USER` configured
- [ ] `SMTP_PASSWORD` configured
- [ ] `SMTP_FROM` configured
- [ ] All variables in `.env.local` (not committed)

### Code
- [ ] All new files created
- [ ] All modified files updated
- [ ] No TypeScript errors: `npm run lint`
- [ ] No console errors in dev tools

### Dependencies
- [ ] `nodemailer` installed (check `package.json`)
- [ ] `@supabase/supabase-js` installed
- [ ] All imports resolve

## 🔍 Verification Steps

### 1. Database Verification

```bash
# Connect to database
psql -U postgres -d hire_genai

# Check table exists
SELECT * FROM admin_sessions LIMIT 1;

# Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'admin_sessions';
```

### 2. API Endpoint Verification

```bash
# Test send-otp endpoint
curl -X POST http://localhost:3000/api/admin/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"support@hire-genai.com"}'

# Expected response:
# {"ok":true,"message":"OTP sent to email"}
```

### 3. Email Verification

1. Check email inbox for OTP
2. Verify subject: "HireGenAI Admin Login - OTP Code"
3. Verify OTP code is 6 digits
4. Verify email is HTML formatted

### 4. Frontend Verification

```bash
# Check page loads
curl http://localhost:3000/owner-login

# Check for no errors in browser console
# Check for proper styling and layout
```

## 🐛 Troubleshooting

### Migration Fails

**Error:** `relation "admin_sessions" already exists`
```bash
# Check if table exists
psql -U postgres -d hire_genai -c "\d admin_sessions"

# If exists, migration already applied
```

**Error:** `permission denied for schema public`
```bash
# Ensure user has proper permissions
psql -U postgres -d hire_genai -c "GRANT ALL ON SCHEMA public TO your_user;"
```

### OTP Not Received

**Check SMTP Configuration:**
```bash
# Verify SMTP settings in .env.local
# Check email spam folder
# Review server logs for errors
```

**Test SMTP Connection:**
```javascript
// Create test file: test-smtp.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Error:', error);
  } else {
    console.log('SMTP Connected:', success);
  }
});
```

### Session Not Persisting

**Check Browser Cookies:**
1. Open DevTools → Application → Cookies
2. Look for `admin_session` cookie
3. Verify it has correct domain and path
4. Check expiration time

**Check Database:**
```sql
SELECT * FROM admin_sessions WHERE revoked_at IS NULL;
```

### "Access Restricted" for Owner Email

**Verify Email Configuration:**
```bash
# Check OWNER_EMAIL in .env.local
echo $OWNER_EMAIL

# Email comparison is case-insensitive but whitespace matters
# Ensure no leading/trailing spaces
```

## 📊 Production Deployment

### Pre-Production Testing

1. **Staging Environment**
   ```bash
   # Deploy to staging
   # Run full test suite
   # Verify all features
   ```

2. **Load Testing**
   ```bash
   # Test with multiple concurrent logins
   # Verify database performance
   # Check email delivery rate
   ```

3. **Security Testing**
   - [ ] Test OTP expiration
   - [ ] Test max attempts
   - [ ] Test session expiration
   - [ ] Test CSRF protection
   - [ ] Test XSS protection

### Production Deployment

1. **Backup Database**
   ```bash
   pg_dump hire_genai > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Apply Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Update Environment**
   - Add all required variables to production `.env`
   - Verify `NODE_ENV=production`
   - Verify `HTTPS` is enabled

4. **Deploy Application**
   ```bash
   npm run build
   npm run start
   ```

5. **Verify Production**
   - [ ] Login page loads
   - [ ] OTP email received
   - [ ] Login successful
   - [ ] Admin dashboard accessible
   - [ ] Logout works
   - [ ] No errors in logs

### Post-Deployment Monitoring

1. **Monitor Logs**
   ```bash
   # Check for errors
   tail -f logs/error.log
   tail -f logs/access.log
   ```

2. **Monitor Database**
   ```sql
   -- Check active sessions
   SELECT COUNT(*) FROM admin_sessions
   WHERE revoked_at IS NULL AND expires_at > NOW();

   -- Check failed attempts
   SELECT COUNT(*) FROM otp_challenges
   WHERE tries_used >= max_tries;
   ```

3. **Monitor Email Delivery**
   - Check email service logs
   - Monitor bounce rate
   - Verify no spam complaints

## 🔐 Security Checklist

- [ ] HTTPS enabled in production
- [ ] Secure cookies set (HttpOnly, Secure, SameSite)
- [ ] OTP hashing verified
- [ ] Session token hashing verified
- [ ] No credentials in code
- [ ] No credentials in logs
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] SQL injection protection verified
- [ ] XSS protection verified

## 📈 Performance Optimization

### Database Indexes
```sql
-- Verify indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'admin_sessions';

-- Should show:
-- idx_admin_sessions_owner_email
-- idx_admin_sessions_token_hash
-- idx_admin_sessions_expires_at
```

### Query Performance
```sql
-- Check query execution time
EXPLAIN ANALYZE
SELECT * FROM admin_sessions
WHERE session_token_hash = 'some_hash';

-- Should use index, not sequential scan
```

## 🆘 Support

### Documentation
- `OWNER_LOGIN_SETUP.md` - Comprehensive setup guide
- `OWNER_LOGIN_QUICKSTART.md` - Quick start guide
- `OWNER_LOGIN_VERIFICATION.md` - Testing guide
- `OWNER_LOGIN_IMPLEMENTATION_SUMMARY.md` - Implementation details

### Common Issues
See `OWNER_LOGIN_SETUP.md` → Troubleshooting section

### Contact
Email: support@hire-genai.com

## ✅ Deployment Success Criteria

✅ Database migration applied
✅ Environment variables configured
✅ Application starts without errors
✅ Login page loads
✅ OTP email received
✅ Login successful
✅ Admin dashboard accessible
✅ Logout works
✅ Session persists across refreshes
✅ No errors in logs

---

**Last Updated:** 2025-11-12
**Version:** 1.0
**Status:** Ready for Deployment
