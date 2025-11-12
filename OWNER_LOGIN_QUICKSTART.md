# Owner Login - Quick Start

## 5-Minute Setup

### Step 1: Update `.env.local`

Add these variables:

```env
OWNER_EMAIL=support@hire-genai.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hire-genai.com
```

### Step 2: Run Migration

```bash
# Apply the migration
npx prisma migrate deploy

# Or manually:
psql -U postgres -d hire_genai -f migrations/20251112_create_admin_sessions.sql
```

### Step 3: Restart Server

```bash
npm run dev
```

### Step 4: Test It

1. Go to `http://localhost:3000`
2. Click "Admin" in footer
3. Enter owner email
4. Check email for OTP
5. Enter OTP
6. Access admin dashboard

## What Changed

| Component | Change |
|-----------|--------|
| Footer | Admin link now goes to `/owner-login` |
| Admin Panel | Requires valid session cookie |
| Database | New `admin_sessions` table |
| API | New endpoints: `/api/admin/send-otp`, `/api/admin/verify-otp`, `/api/admin/logout` |

## Key Features

✅ OTP-based login
✅ Owner-only access
✅ Restriction popup for non-owners
✅ Secure session management
✅ Auto-logout after 24 hours
✅ Email notifications

## Troubleshooting

**OTP not received?**
- Check SMTP settings
- Verify email in spam folder
- Check server logs

**"Access restricted" error?**
- Verify `OWNER_EMAIL` matches exactly
- Restart server after changing `.env.local`

**Session expired?**
- Check server time
- Verify database connection
- Check browser cookies

## Files Modified

- `app/page.tsx` - Footer Admin link
- `app/admin-hiregenai/layout.tsx` - Logout handler
- `app/api/admin/auth-check/route.ts` - Session verification
- `prisma/schema.prisma` - Added admin_sessions model

## Files Created

- `app/owner-login/page.tsx` - Login page
- `app/api/admin/send-otp/route.ts` - OTP send endpoint
- `app/api/admin/verify-otp/route.ts` - OTP verify endpoint
- `app/api/admin/logout/route.ts` - Logout endpoint
- `migrations/20251112_create_admin_sessions.sql` - Database migration

## Next Steps

1. ✅ Configure environment variables
2. ✅ Run database migration
3. ✅ Test login flow
4. ✅ Deploy to production

For detailed documentation, see `OWNER_LOGIN_SETUP.md`
