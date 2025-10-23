# Email Setup Guide

## Overview
The application now sends real emails to candidates when you click "Send Email" button, just like OTP emails.

## SMTP Configuration Required

Add these environment variables to your `.env.local` file:

```env
# SMTP Configuration (Required for sending emails)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your_email_password

# Email Settings
EMAIL_FROM="Your Company <no-reply@yourdomain.com>"
EMAIL_TO=support@yourdomain.com
```

## Popular SMTP Providers

### 1. **Gmail** (Free)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="Your Company <your-email@gmail.com>"
```

**Note:** You need to generate an "App Password" from Google Account settings:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that password in SMTP_PASS

### 2. **Hostinger** (Paid - Recommended for Production)
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your_password
EMAIL_FROM="Your Company <no-reply@yourdomain.com>"
```

### 3. **SendGrid** (Free tier available)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM="Your Company <verified@yourdomain.com>"
```

### 4. **Mailgun** (Free tier available)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your_mailgun_password
EMAIL_FROM="Your Company <no-reply@yourdomain.com>"
```

## How It Works

1. **User clicks "Send Email"** on qualified candidates page
2. **Modal opens** with pre-filled message from drafts
3. **User selects category**: Interview or New Job
4. **Message is customized** with placeholders replaced (candidate name, job title, etc.)
5. **User clicks "Send Email"** button
6. **Real email is sent** to candidate's email address using SMTP
7. **Success notification** appears

## Email Features

### Interview Email
- Green gradient header
- Professional formatting
- Includes interview link if present in message
- Subject: "Interview Invitation - [Job Title] at [Company]"

### New Job Email
- Blue gradient header
- Professional formatting
- Includes job details
- Subject: "New Opportunity - [Job Title] at [Company]"

## Testing

1. Configure SMTP settings in `.env.local`
2. Restart the development server: `npm run dev`
3. Go to `/dashboard/analytics/qualified`
4. Click "Send Email" on any candidate
5. Check the candidate's email inbox

## Troubleshooting

### Email not sending?
1. Check console logs for SMTP errors
2. Verify SMTP credentials are correct
3. Check if SMTP port is not blocked by firewall
4. For Gmail: Make sure App Password is used, not regular password

### Email goes to spam?
1. Use a custom domain email (not Gmail)
2. Set up SPF, DKIM, and DMARC records for your domain
3. Use a professional email service like Hostinger or SendGrid

### Environment variables not loading?
1. Make sure `.env.local` file exists in project root
2. Restart the development server after adding variables
3. Check for typos in variable names

## API Endpoint

**POST** `/api/emails/send-custom`

**Request Body:**
```json
{
  "candidateName": "John Doe",
  "candidateEmail": "john@example.com",
  "jobTitle": "Software Engineer",
  "companyName": "TATA",
  "messageContent": "Your custom message here...",
  "category": "interview"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Email sent successfully",
  "recipient": "john@example.com"
}
```

## Files Modified

1. **lib/email-service.ts** - Added `sendCustomMessage()` method
2. **app/api/emails/send-custom/route.ts** - New API endpoint
3. **app/dashboard/analytics/qualified/page.tsx** - Updated to call email API

## Security Notes

- Never commit `.env.local` file to Git
- Use environment variables for all sensitive data
- Use App Passwords for Gmail (not regular password)
- Consider using a dedicated email service for production
- Implement rate limiting to prevent email spam

## Next Steps

1. Add `.env.local` file with SMTP configuration
2. Test email sending with a real email address
3. Customize email templates in `lib/email-service.ts` if needed
4. Set up proper email domain with SPF/DKIM for production
