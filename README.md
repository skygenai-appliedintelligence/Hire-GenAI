# 🚀 HireGenAI - AI-Powered Recruitment Platform

A modern, AI-powered recruitment and hiring platform built with Next.js 15, React 19, and TypeScript.

## ✨ Features

- 🤖 **AI-Powered Interview Question Generation**
- 👥 **Candidate Management**
- 📊 **Interview Pipeline Management**
- 🎯 **Automated Interview Agents**
- 📈 **Analytics & Reporting**
- 🔐 **User Authentication**
- 🎨 **Modern UI/UX with Tailwind CSS**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hire-genai-saas
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Run the setup script
   pnpm setup
   
   # Or manually create .env.local file
   cp .env.example .env.local
   ```

4. **Configure your OpenAI API key**
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add it to your `.env.local` file:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Use demo credentials:
     - Email: `demo@company.com`
     - Password: `demo123`

## 🔧 Environment Variables

### Required for AI Features

```env
# OpenAI Configuration (REQUIRED for AI features)
OPENAI_API_KEY=your_openai_api_key_here
```

### Optional for Database Features

```env
# Supabase Configuration (OPTIONAL)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 🗄️ Database Setup

This project supports PostgreSQL via Prisma. To enable DB features:

1. Create `.env.local` with your Postgres URLs:
```env
DATABASE_URL=postgres://user:password@host:5432/db?sslmode=require
DIRECT_URL=postgres://user:password@host:5432/db?sslmode=require
```
2. Apply schema using Prisma (recommended):
```bash
pnpm prisma migrate dev --name init
```
Or apply raw SQL schema/seed:
```bash
node scripts/db-apply.js
```
3. Optional seed data lives in `scripts/003-insert-dummy-data.sql`.

### New schema elements added
- `companies.slug` (unique) for public company URLs: `/{slug}`
- `email_otps` for OTP issuance/verification
- Default `job_descriptions.status` set to `open`

## 🎯 AI Features

### AI Question Generator

- **Dynamic Question Generation**: Creates contextual questions based on job descriptions
- **Agent-Specific Questions**: Different question types for different interview stages
- **Smart Fallbacks**: Mock questions when AI is unavailable

### How to Use AI Features

1. **Navigate to AI Question Generator**
   - Go to `/dashboard/ai-question-generator`
   - Or use the AI Generate button on `/selected-agents`

2. **Generate Questions**
   - Enter a job description
   - Select an agent type (Screening, Technical, Behavioral, etc.)
   - Choose number of questions
   - Click "Generate Questions"

3. **View Results**
   - Questions are automatically added to your selected agent
   - Questions are contextual and role-specific

## 📁 Project Structure

```
hire-genai-saas/
├── app/                    # Next.js 15 app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── selected-agents/   # Agent management
├── components/            # Reusable components
├── lib/                   # Utility functions
│   ├── ai-service.ts      # AI service functions
│   └── config.ts          # Configuration
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
└── scripts/               # Setup scripts
```

## 🛠️ Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# Setup
pnpm setup        # Set up environment variables
```

### Key Technologies

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **AI**: OpenAI GPT-4
- **Database**: Supabase (optional)
- **Authentication**: Custom auth with mock fallback

## 🎨 UI Components

Built with modern design principles using:
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **Lucide React** for icons
- **Custom components** for specific functionality

## 🔐 Authentication

### Demo Credentials

- **Email**: `demo@company.com`
- **Password**: `demo123`

- **Email**: `sandeep@gmail.com`
- **Password**: `Demo@12345`

### Mock Authentication

The platform uses mock authentication for demo purposes. In production, you can integrate with:
- Supabase Auth
- NextAuth.js
- Custom authentication

## 📊 Features Overview

### Dashboard
- Overview statistics
- Quick access to key features
- Recent activity

### AI Agents
- Create and manage interview agents
- Configure interview rounds
- Set up question types

### Candidate Management
- Track candidate progress
- Manage interview pipelines
- View candidate profiles

### Interview Pipeline
- Multi-stage interview process
- AI-powered question generation
- Automated scoring and feedback

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Add environment variables**
4. **Deploy**

### Other Platforms

- **Netlify**: Compatible with Next.js
- **Railway**: Easy deployment with environment variables
- **Docker**: Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🛠️ Git Workflow Summary

You now have:

- CreateBranch — create/switch branch
- CheckInToGithub — commit + push
- MergeToMain — merge feature -> main
- UpdateFromMain — bring main -> feature
- ReleaseToMain — merge to main + tag (+ optional push)
- RollbackRelease — delete release tag and optionally revert the merge on main

### Examples

- CreateBranch
  ```powershell
  CreateBranch "Signup"
  # or
  .\CreateBranch.ps1 "feature/login-flow"
  ```

- CheckInToGithub
  ```powershell
  CheckInToGithub "Initial commit"
  CheckInToGithub "Fix tests" -NoVerify -Force
  ```

- MergeToMain
  ```powershell
  .\MergeToMain.ps1 "Signup"
  .\MergeToMain.ps1 "Signup" -NoFF -Push
  ```

- UpdateFromMain
  ```powershell
  .\UpdateFromMain.ps1                 # merge main into current branch
  .\UpdateFromMain "Signup" -Rebase -Push
  ```

- ReleaseToMain
  ```powershell
  .\ReleaseToMain "Signup"                    # timestamp tag
  ReleaseToMain "Signup" -UsePackageVersion -Push
  ReleaseToMain "Signup" -Tag v1.2.3 -NoFF -Push
  ```

- RollbackRelease
  ```powershell
  .\RollbackRelease -Tag v1.2.3
  RollbackRelease -Tag v1.2.3 -DeleteRemote
  RollbackRelease -Tag v1.2.3 -RevertMerge -Push
  ```

## 🆘 Support

- **Documentation**: See `SETUP.md` for detailed setup instructions
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

## 🎉 Acknowledgments

- Built with Next.js 15 and React 19
- AI powered by OpenAI
- UI components from Radix UI
- Icons from Lucide React

---

**Happy coding! 🚀**
