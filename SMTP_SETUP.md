# SMTP Email Configuration

## Environment Variables

Add the following variables to your `.env.local` file:

```env
# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=yourStrongPassword
EMAIL_FROM="Your Brand <no-reply@yourdomain.com>"
EMAIL_TO=support@yourdomain.com
```

## Setup Instructions

1. **Create Email Account on Hostinger:**
   - Login to your Hostinger control panel
   - Go to Email → Email Accounts
   - Create a new email account (e.g., `no-reply@yourdomain.com`)
   - Set a strong password

2. **Configure Environment Variables:**
   - Replace `yourdomain.com` with your actual domain
   - Replace `yourStrongPassword` with the email account password
   - Replace `support@yourdomain.com` with your support email

3. **Test the Configuration:**
   - Start your development server: `npm run dev`
   - Make a POST request to `/api/send-contact` with test data

## Usage Example

```javascript
// Frontend usage
const response = await fetch("/api/send-contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    message: "Hello, I'm interested in your services."
  }),
});

const result = await response.json();
console.log(result); // { ok: true, id: "message-id" }
```

## Security Notes

- Never commit `.env.local` to version control
- Use strong passwords for email accounts
- Consider using app-specific passwords if available
- SSL encryption is enabled by default (port 465)

## Troubleshooting

- **Authentication failed:** Check SMTP_USER and SMTP_PASS
- **Connection timeout:** Verify SMTP_HOST and SMTP_PORT
- **SSL errors:** Ensure SMTP_SECURE=true for port 465
- **Domain issues:** Make sure your domain is properly configured with Hostinger
