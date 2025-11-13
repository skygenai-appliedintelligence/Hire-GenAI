#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('📋 Checking Supabase Configuration...\n');

// Extract Supabase variables
const supabaseUrl = envContent
  .split('\n')
  .find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_URL='))
  ?.split('=')[1]
  ?.trim();

const supabaseAnonKey = envContent
  .split('\n')
  .find(line => line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY='))
  ?.split('=')[1]
  ?.trim();

console.log('✅ NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '❌ Missing');
console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('\n⚠️  Missing Supabase credentials!');
  console.log('\nTo fix, add these to .env.local:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

console.log('\n✅ Supabase is properly configured!');
console.log('\nYou can now use Supabase for OTP verification.');
