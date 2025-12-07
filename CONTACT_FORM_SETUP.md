# Contact Form Database Setup

## Overview
The contact form on `/contact` page now saves all submissions to a Supabase database table called `contact_messages` and sends an automatic confirmation email to the user.

## Email Configuration

### Automatic Confirmation Email
When a user submits the contact form:
1. Message is saved to database
2. Confirmation email is sent within 10-20 seconds
3. Email is sent from: `hii@hire-genai.com`

### Required Environment Variables
Add these to your `.env.local` file:

```env
# Hostinger SMTP configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@hire-genai.com
SMTP_PASS=your_password_here
EMAIL_FROM="HireGenAI <no-reply@hire-genai.com>"

# Additional email for contact form (if different credentials needed)
# If using same SMTP account, the above settings will work for both
```

### Email Address Usage
- **`no-reply@hire-genai.com`** - Used for:
  - Interview invitations
  - Application confirmations
  - Custom messages to candidates
  - Contact form confirmation emails

**Note:** All emails are sent from `no-reply@hire-genai.com` using the Hostinger SMTP configuration. If you want to use `hii@hire-genai.com` separately, you'll need to set up separate SMTP credentials for that email address.

## Database Schema

### Table: `contact_messages`

```sql
CREATE TABLE contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  work_email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  agreed_to_terms BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new'
);
```

### Columns:
- **id**: Unique identifier (UUID)
- **full_name**: Full name of the person submitting the form (required)
- **work_email**: Work email address (required)
- **company_name**: Company name (required)
- **phone_number**: Phone number (optional)
- **subject**: Subject of the message (required)
- **message**: Message content (required)
- **agreed_to_terms**: Whether they agreed to terms & conditions (boolean)
- **status**: Message status (new, read, responded, spam)
- **created_at**: Timestamp when message was created
- **updated_at**: Timestamp when message was last updated

### Indexes:
- `idx_contact_messages_work_email`: For faster email lookups
- `idx_contact_messages_created_at`: For sorting by date
- `idx_contact_messages_status`: For filtering by status

## Setup Instructions

### 1. Run the Migration
Execute the SQL migration file to create the table:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and paste the contents of: migrations/20251207_create_contact_messages_table.sql
```

### 2. Verify Environment Variables
Make sure these are set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test the Form
1. Navigate to `http://localhost:3000/contact`
2. Fill out the form with:
   - Full Name
   - Work Email
   - Company Name
   - Phone Number (optional)
   - Subject
   - Message
3. Check the "I agree to the Terms & Conditions and Privacy Policy" checkbox
4. Click "Send Message"
5. You should see a success message

### 4. Verify Database Entry
Check Supabase dashboard:
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run: `SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 10;`
4. You should see your test submission

## API Endpoints

### POST /api/contact
Submit a new contact message.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "workEmail": "john@company.com",
  "companyName": "Acme Corp",
  "phoneNumber": "+1 (555) 123-4567",
  "subject": "Interested in HireGenAI",
  "message": "We would like to learn more about your platform.",
  "agreedToTerms": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Your message has been received. We will get back to you soon.",
  "data": [
    {
      "id": "uuid-here",
      "full_name": "John Doe",
      "work_email": "john@company.com",
      "company_name": "Acme Corp",
      "phone_number": "+1 (555) 123-4567",
      "subject": "Interested in HireGenAI",
      "message": "We would like to learn more about your platform.",
      "agreed_to_terms": true,
      "status": "new",
      "created_at": "2025-12-07T12:20:00Z"
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "Missing required fields"
}
```

### GET /api/contact
Retrieve contact messages (admin endpoint).

**Query Parameters:**
- `status`: Filter by status (new, read, responded, spam)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Example:**
```
GET /api/contact?status=new&limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

## Form Fields

The contact form includes:
1. **Full Name** (required) - Text input
2. **Work Email** (required) - Email input with validation
3. **Company Name** (required) - Text input
4. **Phone Number** (optional) - Tel input
5. **Subject** (required) - Text input
6. **Message** (required) - Textarea
7. **Terms & Conditions** (required) - Checkbox

## Features

✅ Form validation on frontend and backend
✅ Email format validation
✅ Required field validation
✅ Database persistence
✅ Automatic timestamps
✅ Message status tracking
✅ Indexed for fast queries
✅ Error handling and user feedback

## Future Enhancements

- [ ] Send confirmation email to user
- [ ] Send notification email to admin
- [ ] Add CAPTCHA for spam prevention
- [ ] Add rate limiting
- [ ] Add message templates for responses
- [ ] Create admin dashboard to manage messages
- [ ] Add export functionality (CSV, PDF)
- [ ] Add automated responses based on subject
