import { DatabaseService } from '@/lib/database'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_post_interview_photo_columns...')
    
    const sql = `
      ALTER TABLE interviews 
      ADD COLUMN IF NOT EXISTS post_interview_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS post_interview_photo_captured_at TIMESTAMP WITH TIME ZONE;
    `
    
    await (DatabaseService as any).query(sql)
    
    console.log('✅ Migration completed successfully!')
    console.log('✅ Columns added:')
    console.log('   - post_interview_photo_url (TEXT)')
    console.log('   - post_interview_photo_captured_at (TIMESTAMP WITH TIME ZONE)')
    
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
