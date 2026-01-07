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

    // Get migration filename from command line args or use default
    const migrationFile = process.argv[2] || 'recreate_question_generation_usage.sql';
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Running migration...');
    await client.query(migrationSql);
    console.log('✅ Migration completed successfully!');

    // Verify table structure
    // Extract table name from the migration file (simplistic approach)
    const tableNameMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS (\w+)|CREATE TABLE (\w+)/i);
    const tableName = tableNameMatch ? (tableNameMatch[1] || tableNameMatch[2]) : null;
    
    let result = { rows: [] };
    if (tableName) {
      result = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        ORDER BY ordinal_position
      `);
    }

    console.log('\n📋 New table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
