# Environment Setup Guide

This guide will help you set up the required environment variables for the HireGenAI application to work with your PostgreSQL database.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration (Required for Database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (Optional - for AI features)
OPENAI_API_KEY=your_openai_api_key

# Database Configuration (Alternative to Supabase)
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database
```

## Setting up Supabase

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be ready

2. **Get Your Project URL and Keys:**
   - Go to Settings → API
   - Copy the Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Run the Database Schema:**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `scripts/database-schema.sql`
   - Run the script to create all necessary tables

## Database Schema

The application uses the following main tables:
- `companies` - Company information
- `users` - User accounts linked to companies
- `user_roles` - User role assignments
- `otp_challenges` - OTP verification for authentication
- `email_identities` - Email verification records
- `sessions` - User session management

## Authentication Flow

1. **Signup Process:**
   - User provides email, full name, and company name
   - System creates OTP challenge in `otp_challenges` table
   - User verifies OTP
   - System creates company (if new) and user records
   - Session is created for the user

2. **Login Process:**
   - User provides email
   - System checks if user exists
   - OTP challenge is created
   - User verifies OTP
   - New session is created

## Testing the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser
3. Try signing up with a new email
4. Check the console for the OTP code (development mode)
5. Complete the verification process

## Troubleshooting

- **"No valid OTP found"**: Check that your database connection is working and the `otp_challenges` table exists
- **"User already exists"**: The email is already registered, use login instead
- **"Database connection failed"**: Verify your Supabase credentials and database URL
- **Missing tables**: Run the database schema script in your Supabase SQL editor

## Security Notes

- Never commit `.env.local` to version control
- Use strong, unique passwords for database access
- Regularly rotate your API keys
- The service role key has admin access - keep it secure
