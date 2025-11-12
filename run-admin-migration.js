#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Read DATABASE_URL from .env.local
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const databaseUrl = envContent
    .split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.trim()
    ?.replace(/"/g, '');

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  const client = new Client({ 
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '20251112_create_admin_sessions.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running admin_sessions migration...');
    await client.query(migrationSql);
    console.log('✅ Migration completed successfully!');

    // Verify table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'admin_sessions' 
      ORDER BY ordinal_position
    `);

    console.log('\n📋 admin_sessions table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    // Verify indexes
    const indexResult = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'admin_sessions'
    `);

    console.log('\n📊 Indexes created:');
    indexResult.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
