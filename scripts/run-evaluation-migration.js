/**
 * Script to run database migration for adding evaluation column to applications
 * 
 * Usage:
 *   node scripts/run-evaluation-migration.js
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
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_evaluation_to_applications.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('🚀 Running migration: add_evaluation_to_applications.sql')
    
    // Execute migration
    await pool.query(migrationSQL)
    
    console.log('✅ Migration completed successfully!')
    console.log('✅ Added evaluation and status columns to applications table')
    
    // Verify the columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'applications' 
      AND column_name IN ('evaluation', 'status')
      ORDER BY column_name
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Verified columns exist:')
      result.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
