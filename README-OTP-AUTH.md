# OTP-Based Authentication System

A clean, production-ready OTP-based signup and authentication flow for Next.js applications.

## Features

- **OTP-based signup**: Email/phone verification with 6-digit codes
- **Rate limiting**: IP + identifier-based throttling with lockout protection
- **Security**: bcrypt hashing, JWT tokens, HttpOnly cookies
- **Flexible**: Support for both email and phone verification
- **Production-ready**: Error handling, validation, logging

## Quick Start

### 1. Install Dependencies

```bash
npm install bcryptjs jose @types/bcryptjs
```

### 2. Environment Setup

Create `.env.local` with:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/hire_genai"
DIRECT_URL="postgresql://username:password@localhost:5432/hire_genai"

# JWT Configuration
JWT_SECRET="your-long-random-secret-key-at-least-32-characters"

# OTP Configuration
OTP_TTL_MINUTES=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=5
```

### 3. Database Migration

```bash
npx prisma migrate dev --name add-otp-auth
```

### 4. Start Development Server

```bash
npm run dev
```

## API Endpoints

### 1. POST /api/auth/start
Start OTP verification process.

**Input:**
```json
{
  "email": "user@example.com"
}
```
or
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Codes:**
- `USER_EXISTS` (409): Account already exists, please login
- `RATE_LIMITED` (429): Too many attempts
- `VALIDATION_ERROR` (400): Invalid input

### 2. POST /api/auth/verify-otp
Verify OTP and complete account setup.

**Input:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "ok": true,
  "userId": "user_id_here"
}
```

**Error Codes:**
- `INVALID_OTP` (400): Wrong OTP code
- `OTP_EXPIRED` (400): OTP has expired
- `RATE_LIMITED` (429): Too many failed attempts

### 3. POST /api/auth/set-password (Optional)
Set password for password-based login.

**Input:**
```json
{
  "userId": "user_id_here",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "ok": true
}
```

### 4. POST /api/auth/login
Login with email/phone and password.

**Input:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "jwt_token_here"
}
```

**Error Codes:**
- `INVALID_CREDENTIALS` (401): Wrong email/password
- `UNVERIFIED` (401): Account not verified

## Frontend Flow

### 1. Start Page (`/start`)
- User enters email or phone
- Calls `/api/auth/start`
- Redirects to `/verify?to=email&type=email`

### 2. Verify Page (`/verify`)
- User enters 6-digit OTP
- Calls `/api/auth/verify-otp`
- On success, redirects to `/set-password?userId=...`

### 3. Set Password Page (`/set-password`) - Optional
- User sets password (optional)
- Calls `/api/auth/set-password`
- Redirects to `/login`

### 4. Login Page (`/login`)
- User enters email/phone + password
- Calls `/api/auth/login`
- Sets JWT cookie and redirects to dashboard

## Security Features

### Rate Limiting
- **OTP Start**: 5 requests per minute per IP + identifier
- **OTP Verify**: 5 attempts per 15 minutes, then 15-minute lockout
- In-memory storage (replace with Redis in production)

### OTP Security
- 6-digit codes, avoiding leading zeros
- bcrypt hashing (salt rounds: 10)
- 10-minute expiry (configurable)
- Never stored in plain text

### JWT Security
- HS256 algorithm
- HttpOnly, Secure cookies
- 7-day expiry
- Configurable secret

## Error Handling

All endpoints return consistent error responses:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable message"
}
```

Common error codes:
- `USER_EXISTS`: Account already exists
- `UNVERIFIED`: Account not verified
- `INVALID_CREDENTIALS`: Wrong login details
- `RATE_LIMITED`: Too many attempts
- `INVALID_OTP`: Wrong OTP code
- `OTP_EXPIRED`: OTP has expired

## Production Deployment

### 1. Replace Mock OTP Sender

Update `lib/send-otp.ts`:

```typescript
// For SMS (Twilio)
import { TwilioOtpSender } from './send-otp'
export const sendOtp = new TwilioOtpSender().sendOtp

// For Email (SendGrid)
import { SendGridOtpSender } from './send-otp'
export const sendOtp = new SendGridOtpSender().sendOtp
```

### 2. Replace Rate Limiting

Replace in-memory storage with Redis:

```typescript
// lib/rate-limit.ts
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

// Update RateLimiter class to use Redis instead of Map
```

### 3. Environment Variables

Set production environment variables:

```env
JWT_SECRET="your-production-secret-key"
DATABASE_URL="your-production-database-url"
OTP_TTL_MINUTES=10
RATE_LIMIT_PER_MINUTE=5
```

## Testing

### Manual Testing

1. **Start Flow:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/start \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

2. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "otp": "123456"}'
   ```

3. **Set Password:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/set-password \
     -H "Content-Type: application/json" \
     -d '{"userId": "user_id", "password": "password123"}'
   ```

4. **Login:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

## Bug Fix Explanation

**Original Issue:** The "Let's Start" button was calling login endpoints or returning "user not found" messages.

**Root Cause:** The auth flow was treating new users as login attempts instead of signup attempts.

**Solution:** 
1. `/api/auth/start` now creates/updates pending users with OTP
2. `/api/auth/verify-otp` verifies and activates accounts
3. `/api/auth/login` only works for verified users with passwords
4. Clear separation between signup and login flows

## File Structure

```
lib/
├── otp.ts              # OTP generation, hashing, verification
├── jwt.ts              # JWT signing and verification
├── rate-limit.ts       # Rate limiting utilities
├── send-otp.ts         # OTP delivery (mock/providers)
├── validation.ts       # Zod schemas
└── errors.ts           # Error handling utilities

app/api/auth/
├── start/route.ts      # Start OTP process
├── verify-otp/route.ts # Verify OTP
├── set-password/route.ts # Set password
└── login/route.ts      # Password login

app/(auth)/
├── start/page.tsx      # Start form
├── verify/page.tsx     # OTP form
├── set-password/page.tsx # Password form
└── login/page.tsx      # Login form

middleware.ts           # IP handling
prisma/schema.prisma    # User model
```

## Support

For issues or questions, please check the error logs and ensure all environment variables are properly configured.
