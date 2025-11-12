#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function verifyTable() {
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
    console.log('✅ Connected to database\n');

    // Check if admin_sessions table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'admin_sessions'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.error('❌ admin_sessions table does NOT exist');
      process.exit(1);
    }

    console.log('✅ admin_sessions table EXISTS\n');

    // Get table structure
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'admin_sessions' 
      ORDER BY ordinal_position
    `);

    console.log('📋 Table Structure:');
    console.log('─'.repeat(80));
    columns.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });

    // Get indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'admin_sessions'
    `);

    console.log('\n📊 Indexes:');
    console.log('─'.repeat(80));
    indexes.rows.forEach(row => {
      console.log(`  ✓ ${row.indexname}`);
    });

    // Get row count
    const rowCount = await client.query('SELECT COUNT(*) FROM admin_sessions');
    console.log(`\n📈 Current Rows: ${rowCount.rows[0].count}`);

    console.log('\n✅ admin_sessions table is properly configured!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyTable();
