# Email Debug Guide - OTP Not Receiving

## Problem
UI shows success but OTP emails are not being received in inbox.

## Debugging Steps

### Step 1: Test Basic SMTP Connection
1. **Visit**: `http://localhost:3000/test-email`
2. **Use the yellow SMTP test section** at the top
3. **Enter your email** and click "Test SMTP"
4. **Check console logs** for detailed SMTP debug info

### Step 2: Check Console Logs
When testing, look for these log messages in your terminal:

#### ✅ Success Logs:
```
📧 sendMail called with: { to: "email@example.com", subject: "...", ... }
🔧 SMTP Configuration: { host: "smtp.hostinger.com", port: 465, ... }
📤 Attempting to send email...
✅ Email sent successfully: { messageId: "...", accepted: [...], rejected: [] }
```

#### ❌ Error Logs:
```
❌ Failed to send email: { error: "...", code: "...", command: "..." }
```

### Step 3: Common Issues & Solutions

#### Issue 1: Authentication Failed
**Error**: `Invalid login: 535 authentication failed`
**Solution**: 
- Check `SMTP_USER` and `SMTP_PASS` in `.env.local`
- Verify credentials in Hostinger control panel
- Make sure email account exists and password is correct

#### Issue 2: Connection Timeout
**Error**: `Connection timeout` or `ECONNREFUSED`
**Solution**:
- Check `SMTP_HOST=smtp.hostinger.com`
- Check `SMTP_PORT=465`
- Verify firewall/network settings

#### Issue 3: SSL/TLS Issues
**Error**: `SSL/TLS connection failed`
**Solution**:
- Ensure `SMTP_SECURE=true` in `.env.local`
- Try port 587 with `SMTP_SECURE=false` (STARTTLS)

#### Issue 4: Email Going to Spam
**Symptoms**: No error logs, but email not in inbox
**Solution**:
- Check spam/junk folder
- Check email client's blocked senders
- Verify sender reputation (new domains often go to spam)

### Step 4: Environment Variables Check

Make sure your `.env.local` has exactly these values:
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=support@hire-genai.com
SMTP_PASS=SKYnet@12345
EMAIL_FROM="HireGenAI <support@hire-genai.com>"
```

### Step 5: Test OTP Flow

1. **Visit**: `http://localhost:3000/test-otp-email`
2. **Test signup OTP** with your email
3. **Check console logs** for:
   - `✅ Signup OTP sent via email to: your@email.com`
   - OR `❌ Failed to send OTP email:` (with error details)

### Step 6: Alternative Testing

If SMTP test fails, try the contact form:
1. **Visit**: `http://localhost:3000/test-email`
2. **Fill the contact form** (bottom section)
3. **Submit** and check logs

## Troubleshooting Commands

### Check if server is running:
```bash
npm run dev
```

### Check environment variables are loaded:
Add this to any API route temporarily:
```javascript
console.log("ENV CHECK:", {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  EMAIL_FROM: process.env.EMAIL_FROM,
});
```

## Quick Fixes

### Fix 1: Restart Development Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Fix 2: Clear Node Modules (if needed)
```bash
rm -rf node_modules
npm install
npm run dev
```

### Fix 3: Test with Different Email Provider
Try sending to:
- Gmail account
- Yahoo account  
- Different domain

## Expected Behavior

### When Working Correctly:
1. **UI**: Shows "OTP sent successfully"
2. **Console**: Shows `✅ Signup OTP sent via email to: email@domain.com`
3. **Email**: Receives professional HTML email with OTP code
4. **Timing**: Email arrives within 1-2 minutes

### When Failing:
1. **UI**: May still show success (fallback behavior)
2. **Console**: Shows `❌ Failed to send OTP email:` with error details
3. **Console**: Shows fallback OTP in console logs
4. **Email**: No email received

## Next Steps

1. **Run SMTP test first** - this will tell us if basic email sending works
2. **Check console logs** - look for the specific error messages
3. **Verify credentials** - double-check Hostinger email account
4. **Test with different email** - rule out recipient-side issues

## Contact Information

If emails still don't work after these steps, provide:
- Console log output from SMTP test
- Your `.env.local` values (hide the password)
- Which email provider you're testing with
- Any error messages from the browser console
