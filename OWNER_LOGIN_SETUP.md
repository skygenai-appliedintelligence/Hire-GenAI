# Owner Login Setup Guide

## Overview

This document describes the OTP-based owner login system for the HireGenAI admin panel. The system restricts access to only the owner email and provides a secure OTP verification flow.

## Features

- **OTP-Based Authentication**: Owner receives a 6-digit OTP via email
- **Email Restriction**: Only the owner email (configured in `.env`) can access the admin panel
- **Restriction Popup**: Non-owner emails see a clear access denied message
- **Session Management**: Secure session tokens stored in `admin_sessions` table
- **Auto-Logout**: Sessions expire after 24 hours
- **Secure Cookies**: Session tokens stored in HTTP-only cookies

## Database Setup

### 1. Run Migration

Execute the migration to create the `admin_sessions` table:

```bash
# Using psql
psql -U postgres -d hire_genai -f migrations/20251112_create_admin_sessions.sql

# Or using Prisma
npx prisma migrate deploy
```

### 2. Verify Table Creation

```sql
SELECT * FROM admin_sessions LIMIT 1;
```

## Environment Configuration

### Required Environment Variables

Add these to your `.env.local` file:

```env
# Owner email for admin access
OWNER_EMAIL=support@hire-genai.com

# SMTP Configuration (for sending OTP emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hire-genai.com
```

### Gmail Setup (if using Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the generated password as `SMTP_PASSWORD`

## How It Works

### 1. Footer Admin Link
- Changed from `/admin-hiregenai` to `/owner-login`
- Located in `app/page.tsx` (line 397)

### 2. Owner Login Flow

**Step 1: Email Entry**
```
User visits /owner-login
↓
Enters email address
↓
Clicks "Send OTP"
```

**Step 2: OTP Verification**
- API: `POST /api/admin/send-otp`
- Checks if email matches `OWNER_EMAIL`
- If not owner: Returns 403 with `restricted: true` → Shows restriction popup
- If owner: Generates OTP, stores in `otp_challenges` table, sends email

**Step 3: OTP Entry**
```
User receives OTP email
↓
Enters 6-digit code
↓
Clicks "Verify OTP"
```

**Step 4: Session Creation**
- API: `POST /api/admin/verify-otp`
- Validates OTP against `otp_challenges` table
- Creates session in `admin_sessions` table
- Sets secure HTTP-only cookie: `admin_session`
- Redirects to `/admin-hiregenai/overview`

### 3. Admin Panel Access

**Auth Check Flow**
- Every admin page checks `/api/admin/auth-check`
- Validates `admin_session` cookie
- Verifies session exists, not expired, not revoked
- Returns user info or 401 Unauthorized

**Logout Flow**
- Sidebar "Logout" button calls `/api/admin/logout`
- Revokes session in `admin_sessions` table
- Clears `admin_session` cookie
- Redirects to `/owner-login`

## File Structure

### New Files Created

```
app/
├── owner-login/
│   └── page.tsx                 # Owner login page with OTP flow
├── api/admin/
│   ├── send-otp/
│   │   └── route.ts            # Send OTP endpoint
│   ├── verify-otp/
│   │   └── route.ts            # Verify OTP endpoint
│   └── logout/
│       └── route.ts            # Logout endpoint

migrations/
└── 20251112_create_admin_sessions.sql  # Database migration

prisma/
└── schema.prisma               # Updated with admin_sessions model
```

### Modified Files

```
app/
├── page.tsx                    # Updated footer Admin link
└── admin-hiregenai/
    ├── layout.tsx              # Updated logout handler
    └── auth-check/
        └── route.ts            # Updated auth verification

prisma/
└── schema.prisma               # Added admin_sessions model
```

## API Endpoints

### 1. Send OTP
```
POST /api/admin/send-otp
Content-Type: application/json

{
  "email": "support@hire-genai.com"
}

Response (Owner):
{
  "ok": true,
  "message": "OTP sent to email"
}

Response (Non-Owner):
{
  "error": "Access restricted",
  "restricted": true
}
Status: 403
```

### 2. Verify OTP
```
POST /api/admin/verify-otp
Content-Type: application/json

{
  "email": "support@hire-genai.com",
  "code": "123456"
}

Response (Success):
{
  "ok": true,
  "message": "Login successful",
  "sessionToken": "..."
}
Set-Cookie: admin_session=...; HttpOnly; Secure; SameSite=Lax

Response (Invalid):
{
  "error": "Invalid code"
}
Status: 400
```

### 3. Auth Check
```
GET /api/admin/auth-check
Cookie: admin_session=...

Response (Valid):
{
  "ok": true,
  "user": {
    "id": "owner",
    "email": "support@hire-genai.com",
    "role": "admin"
  }
}

Response (Invalid):
{
  "ok": false,
  "error": "No session found"
}
Status: 401
```

### 4. Logout
```
POST /api/admin/logout
Cookie: admin_session=...

Response:
{
  "ok": true,
  "message": "Logged out successfully"
}
```

## Security Features

1. **OTP Hashing**: OTPs are hashed with SHA-256 before storage
2. **Session Token Hashing**: Session tokens are hashed before storage
3. **HTTP-Only Cookies**: Session tokens cannot be accessed via JavaScript
4. **Secure Flag**: Cookies only sent over HTTPS in production
5. **SameSite Protection**: Prevents CSRF attacks
6. **Expiration**: OTPs expire after 10 minutes, sessions after 24 hours
7. **Max Tries**: OTP verification limited to 5 attempts
8. **Session Revocation**: Sessions can be revoked on logout
9. **IP Tracking**: IP address logged for audit purposes

## Testing

### 1. Test OTP Send
```bash
curl -X POST http://localhost:3000/api/admin/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"support@hire-genai.com"}'
```

### 2. Test OTP Verify
```bash
curl -X POST http://localhost:3000/api/admin/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"support@hire-genai.com","code":"123456"}'
```

### 3. Test Auth Check
```bash
curl -X GET http://localhost:3000/api/admin/auth-check \
  -H "Cookie: admin_session=YOUR_SESSION_TOKEN"
```

### 4. Manual Testing

1. Visit `http://localhost:3000`
2. Click "Admin" in footer
3. Enter non-owner email → See restriction popup
4. Enter owner email → Receive OTP
5. Enter OTP → Redirect to admin dashboard
6. Click "Logout" → Return to login page

## Troubleshooting

### Issue: OTP not received

**Solution:**
1. Check SMTP configuration in `.env.local`
2. Verify email address is correct
3. Check email spam folder
4. Review server logs for email errors

### Issue: "Access restricted" for owner email

**Solution:**
1. Verify `OWNER_EMAIL` in `.env.local` matches exactly
2. Email comparison is case-insensitive but whitespace matters
3. Restart server after changing `.env.local`

### Issue: Session expired immediately

**Solution:**
1. Check server time is correct
2. Verify `admin_sessions` table exists
3. Check `expires_at` column in database

### Issue: Admin panel shows loading forever

**Solution:**
1. Check browser console for errors
2. Verify `/api/admin/auth-check` returns valid response
3. Check `admin_session` cookie exists in browser DevTools

## Database Queries

### View Active Sessions
```sql
SELECT id, owner_email, issued_at, expires_at, last_activity_at
FROM admin_sessions
WHERE revoked_at IS NULL
  AND expires_at > NOW()
ORDER BY last_activity_at DESC;
```

### View All OTP Attempts
```sql
SELECT email, purpose, tries_used, max_tries, expires_at, created_at
FROM otp_challenges
WHERE purpose = 'admin_login'
ORDER BY created_at DESC
LIMIT 20;
```

### Revoke All Sessions
```sql
UPDATE admin_sessions
SET revoked_at = NOW()
WHERE revoked_at IS NULL;
```

### Clean Up Expired Sessions
```sql
DELETE FROM admin_sessions
WHERE expires_at < NOW() - INTERVAL '30 days';
```

## Production Checklist

- [ ] SMTP credentials configured and tested
- [ ] `OWNER_EMAIL` set to correct email
- [ ] Database migration applied
- [ ] Prisma schema synced with database
- [ ] HTTPS enabled (for secure cookies)
- [ ] NODE_ENV set to "production"
- [ ] Session duration appropriate for use case
- [ ] Email templates reviewed
- [ ] Error handling tested
- [ ] Logout functionality verified

## Future Enhancements

1. **Multi-Owner Support**: Allow multiple owner emails
2. **2FA**: Add TOTP-based 2FA
3. **Session Management**: Admin panel to view/revoke sessions
4. **Audit Logs**: Track all admin actions
5. **IP Whitelist**: Restrict access by IP address
6. **Device Fingerprinting**: Detect suspicious logins
7. **Email Notifications**: Alert on new logins
8. **Backup Codes**: Recovery codes for account access

## Support

For issues or questions, contact: support@hire-genai.com
