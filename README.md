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
- SwitchBranch — switch to an existing branch
- WhichBranchIamIn — print current branch, tracking remote, and dirty status
- CheckInToGithub — commit + push
- CreatePullRequest — open/create a GitHub Pull Request for the current branch
- MergeToMain — merge feature -> main
- UpdateFromMain — bring main -> feature
- 7ReleaseToMain — merge to main + tag (+ optional push)
- RollbackRelease — delete release tag and optionally revert the merge on main

### Recommended Git workflow sequence (feature lifecycle)

1. **CreateBranch**: Start a new feature branch from `main`.
2. **SwitchBranch**: Move between branches as needed.
3. Code, commit locally using your IDE or with **CheckInToGithub**.
4. Periodically **UpdateFromMain** to get latest `main` into your feature branch (reduce merge conflicts).
5. When feature is ready, create a Pull Request with **CreatePullRequest** (opens browser or uses GitHub CLI).
6. After review and approval, you can merge via GitHub UI; or locally with **MergeToMain** (optionally `-NoFF`) and push.
7. If you need a tagged release, run **ReleaseToMain** (choose tag strategy and push).
8. If a release must be undone, use **RollbackRelease** (delete tag and optionally revert merge).

Why this order?
- **Stability**: Working off a feature branch isolates changes from `main`.
- **Fresh base**: Regularly updating from `main` keeps your branch current.
- **Traceability**: Merges and tags create a clear project history.
- **Safety**: Rollback paths exist if something goes wrong.

### Command reference (what/when/why)

- **CreateBranch** (`CreateBranch.ps1/.cmd`)
  - Purpose: Create and/or switch to a new branch off `main`.
  - Use when: Starting any new feature, fix, or spike.
  - Why: Keeps work isolated and reviewable; aligns with trunk-based or GitFlow-lite.
  - Example: `./CreateBranch.cmd "feature/login-flow"`

- **SwitchBranch** (`SwitchBranch.ps1/.cmd`)
  - Purpose: Checkout an existing local branch.
  - Use when: You need to move between feature branches or go back to `main`.
  - Why: Fast context switching without recreating branches.
  - Example: `./SwitchBranch.cmd "Signup"`

- **WhichBranchIamIn** (`WhichBranchIamIn.ps1/.cmd`)
  - Purpose: Show current branch, upstream tracking, and workspace dirtiness.
  - Use when: Before merges, releases, or any action where current branch matters.
  - Why: Prevents mistakes like merging from the wrong branch.
  - Example: `./WhichBranchIamIn.cmd`

- **CheckInToGithub** (`CheckInToGithub.ps1/.cmd`)
  - Purpose: Stage all changes, commit with a message, and push to upstream.
  - Use when: Saving progress or sharing work.
  - Why: Standardizes push flow; supports flags like `-NoVerify`.
  - Example: `./CheckInToGithub.cmd "Fix tests"`

- **CreatePullRequest** (`CreatePullRequest.ps1/.cmd`)
  - Purpose: Create or open a GitHub Pull Request for the current branch against `main` (or custom base).
  - Use when: You've pushed your feature branch and want to start code review.
  - Why: Automates the "Compare & pull request" and "Create pull request" steps. Uses GitHub CLI if available, otherwise opens the compare URL in your browser.
  - Examples:
    - `./CreatePullRequest.ps1` (auto-detects head branch, base=main)
    - `./CreatePullRequest.ps1 -Base main -Title "Add JD" -Body "New job description flow" -Open`
    - `./CreatePullRequest.ps1 -Draft -Reviewers "alice,bob" -Labels "feature,backend"`
    - CMD wrapper: `./CreatePullRequest.cmd -Open`

- **UpdateFromMain** (`UpdateFromMain.ps1/.cmd`)
  - Purpose: Bring the latest `main` into your current branch (merge or rebase).
  - Use when: Regularly during development and before final merge.
  - Why: Minimizes conflicts and surprises; keeps branch up to date.
  - Example: `./UpdateFromMain.cmd "Signup" -Rebase -Push`

- **MergeToMain** (`MergeToMain.ps1/.cmd`)
  - Purpose: Merge a finished feature branch into `main`.
  - Use when: Feature is reviewed and ready.
  - Why: Integrates work; optional `-NoFF` preserves a merge commit for history clarity.
  - Example: `./MergeToMain.cmd "Signup" -NoFF -Push`

- **ReleaseToMain** (`ReleaseToMain.ps1/.cmd`)
  - Purpose: Create a release tag on `main` and optionally push.
  - Use when: Cutting a release (versioned or timestamped).
  - Why: Immutable tag marks a deployable snapshot; aids rollbacks and changelogs.
  - Example: `./ReleaseToMain.cmd "Signup" -Tag v1.2.3 -NoFF -Push`

- **RollbackRelease** (`RollbackRelease.ps1/.cmd`)
  - Purpose: Remove a mistaken release tag and optionally revert the merge on `main`.
  - Use when: A release needs to be withdrawn.
  - Why: Restores repo state to pre-release condition; can also delete remote tag.
  - Example: `./RollbackRelease.cmd -Tag v1.2.3 -RevertMerge -Push`

Tip: Use `OpenGitBash.ps1/.cmd` to quickly open a Git Bash shell at the repo root if you prefer bash.

### How to run these scripts

- PowerShell: run from repo root with `./Script.ps1` syntax.
- CMD wrapper: use the matching `.cmd` file, e.g. `./Script.cmd ...`.

If PowerShell blocks execution, run once in the current shell:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Examples

- CreateBranch
  ```powershell
  .\CreateBranch.ps1 "Signup"
  .\CreateBranch.ps1 "feature/login-flow"
  # or via CMD wrapper
  .\CreateBranch.cmd "Signup"
  ```

- SwitchBranch
  ```powershell
  .\SwitchBranch.ps1 "Signup"
  # or via CMD wrapper
  .\SwitchBranch.cmd "Signup"
  ```

- WhichBranchIamIn
  ```powershell
  .\WhichBranchIamIn.ps1
  # or via CMD wrapper
  .\WhichBranchIamIn.cmd
  ```

- CheckInToGithub
  ```powershell
  .\CheckInToGithub.ps1 "Initial commit"
  .\CheckInToGithub.ps1 "Fix tests" -NoVerify -Force
  # or via CMD wrapper
  .\CheckInToGithub.cmd "Initial commit"
  ```

- MergeToMain
  ```powershell
  .\MergeToMain.ps1 "Signup"
  .\MergeToMain.ps1 "Signup" -NoFF -Push
  # or via CMD wrapper
  .\MergeToMain.cmd "Signup" -NoFF -Push
  ```

- UpdateFromMain
  ```powershell
  .\UpdateFromMain.ps1                 # merge main into current branch
  .\UpdateFromMain.ps1 "Signup" -Rebase -Push
  # or via CMD wrapper
  .\UpdateFromMain.cmd "Signup" -Rebase -Push
  ```

- ReleaseToMain
  ```powershell
  .\ReleaseToMain.ps1 "Signup"                    # timestamp tag
  .\ReleaseToMain.ps1 "Signup" -UsePackageVersion -Push
  .\ReleaseToMain.ps1 "Signup" -Tag v1.2.3 -NoFF -Push
  # or via CMD wrapper
  .\ReleaseToMain.cmd "Signup" -Tag v1.2.3 -NoFF -Push
  ```

- RollbackRelease
  ```powershell
  .\RollbackRelease.ps1 -Tag v1.2.3
  .\RollbackRelease.ps1 -Tag v1.2.3 -DeleteRemote
  .\RollbackRelease.ps1 -Tag v1.2.3 -RevertMerge -Push
  # or via CMD wrapper
  .\RollbackRelease.cmd -Tag v1.2.3 -RevertMerge -Push
  ```

- OpenGitBash
  ```powershell
  # Opens a new Git Bash window in the repository directory
  .\OpenGitBash.ps1
  # or via CMD wrapper
  .\OpenGitBash.cmd
  ```

### Use Git Bash as the default terminal (VS Code)

- Open Command Palette: Ctrl+Shift+P
- Run: Terminal: Select Default Profile
- Choose: Git Bash
- Open a new terminal: Terminal -> New Terminal (it will start as Git Bash)

If Git Bash is not listed, install Git for Windows: https://git-scm.com/download/win

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
