# Owner Login - Implementation Verification

## ✅ Pre-Deployment Checklist

### Database
- [ ] Migration file exists: `migrations/20251112_create_admin_sessions.sql`
- [ ] Prisma model added: `admin_sessions` in `prisma/schema.prisma`
- [ ] Migration applied: `npx prisma migrate deploy`
- [ ] Table created: `SELECT * FROM admin_sessions LIMIT 1;`
- [ ] Indexes created: Check with `\d admin_sessions` in psql

### Environment Variables
- [ ] `OWNER_EMAIL` set to correct email
- [ ] `SMTP_HOST` configured
- [ ] `SMTP_PORT` set (usually 587)
- [ ] `SMTP_USER` set
- [ ] `SMTP_PASSWORD` set (app password for Gmail)
- [ ] `SMTP_FROM` set
- [ ] All variables in `.env.local` (not committed to git)

### Frontend Files
- [ ] `app/owner-login/page.tsx` exists
- [ ] `app/page.tsx` updated (footer Admin link)
- [ ] `app/admin-hiregenai/layout.tsx` updated (logout handler)

### API Endpoints
- [ ] `app/api/admin/send-otp/route.ts` exists
- [ ] `app/api/admin/verify-otp/route.ts` exists
- [ ] `app/api/admin/logout/route.ts` exists
- [ ] `app/api/admin/auth-check/route.ts` updated

### Dependencies
- [ ] `nodemailer` installed (check `package.json`)
- [ ] `@supabase/supabase-js` installed
- [ ] All imports resolve without errors

### Documentation
- [ ] `OWNER_LOGIN_SETUP.md` created
- [ ] `OWNER_LOGIN_QUICKSTART.md` created
- [ ] `OWNER_LOGIN_IMPLEMENTATION_SUMMARY.md` created

## 🧪 Manual Testing Steps

### Test 1: Page Load
1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Admin" in footer
4. Verify `/owner-login` page loads
5. Check for no console errors

### Test 2: Non-Owner Email
1. Enter any email except owner email
2. Click "Send OTP"
3. Verify "Access restricted" popup appears
4. Verify "Try Another Email" button works

### Test 3: Owner Email - OTP Send
1. Enter owner email (e.g., `support@hire-genai.com`)
2. Click "Send OTP"
3. Check email inbox for OTP
4. Verify OTP code received (6 digits)
5. Verify email subject: "HireGenAI Admin Login - OTP Code"

### Test 4: Owner Email - OTP Verify
1. Copy OTP from email
2. Enter OTP in form (auto-formats to 6 digits)
3. Click "Verify OTP"
4. Verify success message
5. Verify redirect to `/admin-hiregenai/overview`
6. Verify admin dashboard loads

### Test 5: Session Persistence
1. After login, refresh page
2. Verify admin dashboard still loads
3. Check browser DevTools → Cookies
4. Verify `admin_session` cookie exists
5. Verify cookie is HttpOnly (cannot access via JS)

### Test 6: Logout
1. Click "Logout" button in sidebar
2. Verify redirect to `/owner-login`
3. Check browser DevTools → Cookies
4. Verify `admin_session` cookie deleted
5. Try to access `/admin-hiregenai/overview` directly
6. Verify redirect to home page

### Test 7: Invalid OTP
1. Go to `/owner-login`
2. Enter owner email, click "Send OTP"
3. Enter wrong OTP (e.g., "000000")
4. Click "Verify OTP"
5. Verify error message: "Invalid code"
6. Verify can try again

### Test 8: Max Attempts
1. Go to `/owner-login`
2. Enter owner email, click "Send OTP"
3. Enter wrong OTP 5 times
4. On 6th attempt, verify error: "Too many attempts"
5. Request new OTP and verify it works

### Test 9: OTP Expiration
1. Go to `/owner-login`
2. Enter owner email, click "Send OTP"
3. Wait 10+ minutes
4. Enter OTP
5. Verify error: "Code expired"

### Test 10: Session Expiration
1. Login successfully
2. Wait 24+ hours (or manually update database)
3. Refresh page
4. Verify redirect to home page
5. Verify cannot access admin dashboard

## 🔍 Database Verification

### Check admin_sessions Table
```sql
-- Verify table exists
\d admin_sessions

-- Check structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_sessions'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'admin_sessions';
```

### Check Active Sessions
```sql
SELECT id, owner_email, issued_at, expires_at, revoked_at
FROM admin_sessions
WHERE revoked_at IS NULL
ORDER BY issued_at DESC;
```

### Check OTP Challenges
```sql
SELECT email, purpose, tries_used, max_tries, expires_at
FROM otp_challenges
WHERE purpose = 'admin_login'
ORDER BY created_at DESC
LIMIT 10;
```

## 🔐 Security Verification

### Verify OTP Hashing
```sql
-- OTP should be hashed, not plain text
SELECT code_hash FROM otp_challenges LIMIT 1;
-- Should see long hex string, not 6 digits
```

### Verify Session Token Hashing
```sql
-- Session token should be hashed
SELECT session_token_hash FROM admin_sessions LIMIT 1;
-- Should see long hex string
```

### Verify Cookie Security
1. Login successfully
2. Open DevTools → Application → Cookies
3. Click `admin_session` cookie
4. Verify:
   - HttpOnly: ✓ (checked)
   - Secure: ✓ (checked in production)
   - SameSite: Lax
   - Path: /
   - Max-Age: 86400 (24 hours)

## 🐛 Common Issues

### Issue: Migration fails
```bash
# Check migration status
npx prisma migrate status

# Reset migrations (dev only!)
npx prisma migrate reset
```

### Issue: OTP not received
```bash
# Check SMTP configuration
# Verify credentials in .env.local
# Check email spam folder
# Review server logs for errors
```

### Issue: "Cannot find module" errors
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

### Issue: Session not persisting
```bash
# Check database connection
# Verify admin_sessions table exists
# Check browser cookies are enabled
# Clear browser cache and cookies
```

## 📊 Performance Checks

### Database Query Performance
```sql
-- Check index usage
EXPLAIN ANALYZE
SELECT * FROM admin_sessions
WHERE session_token_hash = 'some_hash';

-- Should use index, not sequential scan
```

### API Response Time
```bash
# Test send-otp endpoint
time curl -X POST http://localhost:3000/api/admin/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"support@hire-genai.com"}'

# Should respond in < 1 second
```

## 📝 Sign-Off Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] No database errors
- [ ] Email delivery working
- [ ] Session persistence verified
- [ ] Logout functionality working
- [ ] Security features verified
- [ ] Documentation complete
- [ ] Ready for production deployment

## 🚀 Deployment Verification

After deploying to production:

1. [ ] Database migration applied
2. [ ] Environment variables configured
3. [ ] Application restarted
4. [ ] Login page loads
5. [ ] OTP email received
6. [ ] Login successful
7. [ ] Admin dashboard accessible
8. [ ] Logout works
9. [ ] No errors in production logs
10. [ ] Session persists across page refreshes

## 📞 Support Contacts

- **Database Issues**: Check PostgreSQL logs
- **Email Issues**: Check SMTP configuration and Gmail app password
- **Session Issues**: Check browser cookies and database connection
- **General Issues**: Review `OWNER_LOGIN_SETUP.md`

## ✨ Success Criteria

✅ Owner can login with OTP
✅ Non-owners see restriction message
✅ Sessions persist across refreshes
✅ Logout clears session
✅ OTP expires after 10 minutes
✅ Sessions expire after 24 hours
✅ Max 5 OTP attempts enforced
✅ All security features working
✅ No errors in logs
✅ Documentation complete

---

**Last Updated**: 2025-11-12
**Version**: 1.0
**Status**: Ready for Deployment
