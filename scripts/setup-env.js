#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Environment Setup Script');
console.log('============================\n');

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('⚠️  .env.local file already exists!');
  console.log('Please check the existing file and update it manually if needed.\n');
  
  const currentContent = fs.readFileSync(envPath, 'utf8');
  console.log('Current content:');
  console.log('----------------');
  console.log(currentContent);
} else {
  console.log('📝 Creating .env.local file...\n');
  
  const envContent = `# OpenAI Configuration (REQUIRED for AI features)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (OPTIONAL - for database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Database URL (Prisma / Postgres). Replace with your Supabase URI
# Example: postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
DATABASE_URL=postgres://postgres:YOUR_SUPABASE_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require

# Environment
NODE_ENV=development
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.local file created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Open the .env.local file in your project root');
    console.log('2. Replace "your_openai_api_key_here" with your actual OpenAI API key');
    console.log('3. (Optional) Add your Supabase credentials if using database features');
    console.log('4. Restart your development server: pnpm dev');
    console.log('\n🔗 Get your OpenAI API key from: https://platform.openai.com/api-keys');
  } catch (error) {
    console.error('❌ Error creating .env.local file:', error.message);
  }
}

console.log('\n📖 For more information, see SETUP.md');
