# Admin Pages Setup Guide

## Overview
The admin pages are now fully configured to work like hiregenai 14. All pages require authentication via OTP login.

## Admin Pages

### 1. Overview Page
**URL**: `http://localhost:3000/admin-hiregenai/overview`
- Displays executive summary with KPIs
- Shows revenue, expenses, and profit metrics
- Displays spend trends and interview trends
- Shows system alerts

### 2. Jobs Page
**URL**: `http://localhost:3000/admin-hiregenai/jobs`
- Lists all job postings
- Shows job status and metrics
- Allows job management

### 3. Companies Page
**URL**: `http://localhost:3000/admin-hiregenai/companies`
- Lists all companies
- Shows company details and usage
- Displays company billing information

### 4. Settings Page
**URL**: `http://localhost:3000/admin-hiregenai/settings`
- Admin configuration options
- System settings management

### 5. Billing Page
**URL**: `http://localhost:3000/admin-hiregenai/billing`
- Displays billing and usage metrics
- Shows cost breakdown by feature
- Monthly spending trends

## Authentication Flow

### Step 1: Login
1. Navigate to `http://localhost:3000/owner-login`
2. Enter owner email (from `OWNER_EMAIL` env var)
3. Receive OTP via email
4. Enter 6-digit OTP
5. Session token stored in HTTP-only cookie

### Step 2: Access Admin Pages
1. Admin layout checks authentication via `/api/admin/auth-check-direct`
2. Validates session token from cookie
3. Checks session expiration (24 hours)
4. Allows access to admin pages

### Step 3: Logout
1. Click logout button in admin sidebar
2. Session revoked via `/api/admin/logout-direct`
3. Cookie cleared
4. Redirected to `/owner-login`

## Required Environment Variables

```env
# Owner email (only this email can access admin)
OWNER_EMAIL=support@hire-genai.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hire-genai.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hiregenai

# Node environment
NODE_ENV=development
```

## API Endpoints

### Authentication
- `POST /api/admin/send-otp-direct` - Send OTP to email
- `POST /api/admin/verify-otp-direct` - Verify OTP and create session
- `GET /api/admin/auth-check-direct` - Check if session is valid
- `POST /api/admin/logout-direct` - Logout and revoke session

### Data Endpoints
- `GET /api/admin/overview` - Get overview KPIs and trends
- `GET /api/admin/jobs` - Get jobs list
- `GET /api/admin/companies` - Get companies list
- `GET /api/admin/billing` - Get billing information
- `GET /api/admin/settings` - Get settings

## Database Tables Required

### admin_sessions
```sql
CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY,
  owner_email VARCHAR(255) NOT NULL,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### otp_challenges
```sql
CREATE TABLE otp_challenges (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  principal_type VARCHAR(50),
  purpose VARCHAR(50) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  tries_used INT DEFAULT 0,
  max_tries INT DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ
);
```

## Setup Steps

### 1. Database Migration
```bash
# Run migration to create tables
npx prisma migrate deploy

# Or manually execute SQL
psql $DATABASE_URL -f migrations/20251112_create_admin_sessions.sql
```

### 2. Environment Configuration
Add to `.env.local`:
```env
OWNER_EMAIL=support@hire-genai.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@hire-genai.com
DATABASE_URL=postgresql://...
```

### 3. Start Application
```bash
npm run dev
```

### 4. Test Login Flow
1. Go to `http://localhost:3000/owner-login`
2. Enter owner email
3. Check console for OTP (in development)
4. Enter OTP
5. Access admin pages

## Troubleshooting

### Admin Pages Show "Verifying admin access..."
- Check if session token is in cookie
- Verify `/api/admin/auth-check-direct` is working
- Check database connection

### "No session token" Error
- Login again at `/owner-login`
- Make sure cookies are enabled
- Check if session expired (24 hours)

### "Session not found" Error
- Session was revoked or expired
- Login again at `/owner-login`

### API Returns 500 Error
- Check database connection
- Verify tables exist
- Check server logs for details

### Can't Access Admin Pages
- Make sure you're logged in
- Check if email matches `OWNER_EMAIL`
- Clear cookies and login again

## Files Structure

```
app/admin-hiregenai/
├── layout.tsx                 # Admin layout with auth check
├── page.tsx                   # Main admin page
├── overview/
│   └── page.tsx              # Overview page
├── jobs/
│   └── page.tsx              # Jobs page
├── companies/
│   └── page.tsx              # Companies page
├── settings/
│   └── page.tsx              # Settings page
├── billing/
│   └── page.tsx              # Billing page
├── anomalies/
│   └── page.tsx              # Anomalies page
├── _components/
│   ├── OverviewTab.tsx       # Overview component
│   ├── JobsTab.tsx           # Jobs component
│   ├── CompaniesTab.tsx      # Companies component
│   ├── SettingsTab.tsx       # Settings component
│   ├── BillingTab.tsx        # Billing component
│   └── AnomaliesTab.tsx      # Anomalies component
└── _layout/
    └── AdminHeader.tsx       # Admin header component

app/api/admin/
├── send-otp-direct/route.ts           # Send OTP
├── verify-otp-direct/route.ts         # Verify OTP
├── auth-check-direct/route.ts         # Check auth
├── logout-direct/route.ts             # Logout
├── overview/route.ts                  # Overview data
├── jobs/route.ts                      # Jobs data
├── companies/route.ts                 # Companies data
├── billing/route.ts                   # Billing data
└── settings/route.ts                  # Settings data
```

## Security Features

✅ OTP-based authentication
✅ SHA-256 hashing for tokens
✅ HTTP-only secure cookies
✅ CSRF protection (SameSite=Lax)
✅ Session expiration (24 hours)
✅ Max 5 OTP attempts
✅ IP and user-agent logging
✅ Session revocation on logout

## Next Steps

1. ✅ Run database migration
2. ✅ Configure environment variables
3. ✅ Restart application
4. ✅ Test login at `/owner-login`
5. ✅ Access admin pages
6. ✅ Verify all data displays correctly
