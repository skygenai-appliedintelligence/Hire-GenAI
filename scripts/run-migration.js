/**
 * Script to run database migration for adding configuration column to job_rounds
 * 
 * Usage:
 *   node scripts/run-migration.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  // Load DATABASE_URL from .env.local
  require('dotenv').config({ path: '.env.local' })
  
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in .env.local')
    console.error('Please set DATABASE_URL in your .env.local file')
    process.exit(1)
  }

  console.log('📦 Connecting to database...')
  const pool = new Pool({
    connectionString: databaseUrl,
  })

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_configuration_to_job_rounds.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Running migration: add_configuration_to_job_rounds.sql')
    
    // Execute migration
    await pool.query(migrationSQL)
    
    console.log('✅ Migration completed successfully!')
    console.log('✅ Added configuration column to job_rounds table')
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'job_rounds' 
      AND column_name = 'configuration'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: configuration column exists')
      console.log(`   Type: ${result.rows[0].data_type}`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
