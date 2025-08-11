# 🚀 Environment Setup Guide

This guide will help you set up the environment variables needed for the AI features to work properly.

## 📋 Prerequisites

1. **OpenAI API Key** (Required for AI features)
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign up or log in to your account
   - Create a new API key
   - Copy the key (it starts with `sk-`)

2. **Supabase Configuration** (Optional - for database features)
   - Visit [Supabase](https://supabase.com)
   - Create a new project
   - Get your project URL and anon key

## 🔧 Environment Variables Setup

### Step 1: Create Environment File

Create a new file called `.env.local` in the root directory of your project:

```bash
# In your project root directory
touch .env.local
```

### Step 2: Add Environment Variables

Add the following content to your `.env.local` file:

```env
# OpenAI Configuration (REQUIRED for AI features)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (OPTIONAL - for database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Environment
NODE_ENV=development
```

### Step 3: Replace Placeholder Values

1. **Replace `your_openai_api_key_here`** with your actual OpenAI API key
   - Example: `OPENAI_API_KEY=sk-1234567890abcdef...`

2. **Replace Supabase values** (if using database features)
   - Example: `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
   - Example: `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`

## 🎯 AI Features Configuration

### What Works Without OpenAI Key

- ✅ Mock questions generation
- ✅ Basic functionality
- ✅ UI and interface
- ✅ Demo mode

### What Requires OpenAI Key

- 🤖 Real AI question generation
- 🤖 Dynamic question creation based on job descriptions
- 🤖 Intelligent interview question suggestions
- 🤖 AI-powered candidate screening

## 🔍 Verification

### Check if AI is Enabled

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to the AI Question Generator**:
   - Go to `http://localhost:3000/dashboard/ai-question-generator`
   - Or use the AI Generate button on the selected-agents page

3. **Test AI Generation**:
   - Enter a job description
   - Select an agent type
   - Click "Generate Questions"
   - If AI is working, you'll see dynamic, contextual questions
   - If not, you'll see mock questions (still functional)

### Debug Information

You can check the AI status in the browser console:

```javascript
// Open browser console and run:
console.log('AI Enabled:', window.location.href.includes('localhost') ? 'Check .env.local file' : 'Check environment variables')
```

## 🛠️ Troubleshooting

### Common Issues

1. **"AI not working"**
   - ✅ Check if `.env.local` file exists in project root
   - ✅ Verify `OPENAI_API_KEY` is set correctly
   - ✅ Restart the development server after adding environment variables
   - ✅ Check browser console for errors

2. **"Questions are still static"**
   - ✅ Ensure OpenAI API key is valid
   - ✅ Check if API key has sufficient credits
   - ✅ Verify the key starts with `sk-`

3. **"Environment variables not loading"**
   - ✅ File should be named exactly `.env.local`
   - ✅ File should be in the project root (same level as `package.json`)
   - ✅ No spaces around the `=` sign in the file
   - ✅ Restart the development server

### Error Messages

- **"Failed to generate questions"**: Usually means OpenAI API key is missing or invalid
- **"Mock questions returned"**: Normal behavior when no AI key is configured
- **"Network error"**: Check internet connection and API key validity

## 📞 Support

If you're still having issues:

1. **Check the console** for error messages
2. **Verify your OpenAI API key** is active and has credits
3. **Restart the development server** after making changes
4. **Check the network tab** in browser dev tools for API calls

## 🎉 Success Indicators

When everything is working correctly:

- ✅ AI Generate button produces dynamic, contextual questions
- ✅ Questions are relevant to the job description
- ✅ Different agent types generate different question styles
- ✅ No error messages in console
- ✅ Fast response times (1-3 seconds)

---

**Happy coding! 🚀**
